
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'; // Use a CDN URL for Deno Edge Functions
import { verify, createRemoteJWKSet } from 'https://deno.land/x/djwt@v2.4/mod.ts';

// Firebase project ID (can be retrieved from Firebase console)
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');

// Supabase client with service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// Create a JWKS (JSON Web Key Set) for Firebase's public keys
const FIREBASE_JWKS = createRemoteJWKSet(new URL(`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`));

Deno.serve(async (req) => {
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Temporarily allow all origins for debugging
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 204,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { firebase_id_token } = await req.json();

  if (!firebase_id_token) {
    return new Response(JSON.stringify({ error: 'Missing Firebase ID token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify the Firebase ID token
    const firebasePayload = await verify(firebase_id_token, FIREBASE_JWKS, {
      audience: FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    });

    const { email, sub: firebaseUid, name, picture } = firebasePayload;

    if (!email || !firebaseUid) {
      return new Response(JSON.stringify({ error: 'Invalid Firebase ID token payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if a user with this Firebase UID already exists in Supabase
    const { data: existingSupabaseUser, error: fetchError } = await supabaseAdmin
      .from('users') // Assuming 'users' is the table where auth.users are mirrored or profiles are stored, based on previous migration files.
      .select('id, email')
      .eq('id', firebaseUid)
      .single();

    let supabaseUser;
    let session;

    if (existingSupabaseUser) {
      // User exists in Supabase, generate a session link for them
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signIn',
        email: existingSupabaseUser.email,
      });

      if (error) throw error;
      supabaseUser = data.user;
      session = data.session; // This might be null for signIn type links, but the URL will have the token.

    } else {
      // New user: create them in Supabase auth and then generate a session link
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        id: firebaseUid, // Use Firebase UID as Supabase user ID
        email_confirm: true, // Auto-confirm email for Firebase users
        user_metadata: {
          full_name: name,
          avatar_url: picture,
        },
      });

      if (createUserError) throw createUserError;

      // After creating the user, generate a sign-in link to get a session
      const { data, error: generateLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signIn',
        email: newUser.user.email, // Use email from the newly created user
      });

      if (generateLinkError) throw generateLinkError;
      supabaseUser = data.user;
      session = data.session; // Again, session might be null, but the URL is key.

      // Set default role for new user
      await supabaseAdmin.rpc('set_user_role', { user_id: firebaseUid, role_name: 'user' });
    }

    return new Response(JSON.stringify({ user: supabaseUser, session }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error during Firebase auth processing', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
