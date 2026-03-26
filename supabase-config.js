const supabaseUrl = 'https://vhfxqcynubpkyabpnzbs.supabase.co';
const supabaseKey = 'sb_publishable_PXLO63jmMsmKxlwMMMZXUg_oMdNXUMY';

// Use the global supabase object from the CDN script
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
