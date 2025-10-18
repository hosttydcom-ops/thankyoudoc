
import { createClient } from '@supabase/supabase-js';
import { verify, createRemoteJWKSet } from 'https://deno.land/x/djwt@v2.4/mod.ts';

// Initialize Supabase client for the Edge Function
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
);

// Create a JWKS (JSON Web Key Set) for Google's public keys
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { id_token } = await req.json();

    if (!id_token) {
        return new Response(JSON.stringify({ error: 'Missing ID token' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Verify the Google ID token
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const jwtPayload = await verify(id_token, JWKS, {
            audience: googleClientId,
            issuer: "https://accounts.google.com",
        });

        const { email, given_name, family_name, picture } = jwtPayload;

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email not found in ID token' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Attempt to sign in/up with Supabase using the ID token
        const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
            options: {
                data: {
                    first_name: given_name,
                    last_name: family_name,
                    avatar_url: picture,
                },
            },
        });

        if (error) {
            console.error('Error during Supabase sign-in/up with ID token', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ user: data.user, session: data.session }), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
        });

    } catch (error) {
        console.error('Error during Google auth', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
