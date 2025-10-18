import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, id, ids, data, search } = await req.json();

    switch (action) {
      case 'list': {
        const query = supabase.from('doctors').select('*').order('created_at', { ascending: false });
        const { data: rows, error } = search
          ? query.ilike('full_name', `%${search}%`)
          : query;
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, rows }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'create': {
        if (!data?.full_name || !data?.specialty) {
          return new Response(JSON.stringify({ ok: false, error: 'full_name and specialty are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: inserted, error } = await supabase.from('doctors').insert(data).select('*').maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, row: inserted }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'update': {
        if (!data?.id) {
          return new Response(JSON.stringify({ ok: false, error: 'id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: updated, error } = await supabase.from('doctors').update({
          full_name: data.full_name,
          specialty: data.specialty,
          bio: data.bio,
          location: data.location,
          photo_url: data.photo_url,
          consultation_fee: data.consultation_fee,
          rating: data.rating,
          phone: data.phone,
          qualifications: data.qualifications,
          certifications: data.certifications,
          address: data.address,
        }).eq('id', data.id).select('*').maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, row: updated }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'delete': {
        if (!id) {
          return new Response(JSON.stringify({ ok: false, error: 'id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase.from('doctors').delete().eq('id', id);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'bulkDelete': {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return new Response(JSON.stringify({ ok: false, error: 'ids array is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase.from('doctors').delete().in('id', ids);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, count: ids.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('admin-doctors error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});