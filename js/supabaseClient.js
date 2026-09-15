const SUPABASE_URL = "https://kupqxyfgbpvbpnagfldi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CERIGKSYwpKLsQzyAk5fIw_pJiGo1F9";

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const SERVICES = ['MOS', 'EWIS', 'CE', 'ASV', 'Pyro', 'HAF', 'ELEC', 'VEF', 'GCONF', 'DIR'];