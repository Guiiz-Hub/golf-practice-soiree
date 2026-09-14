const SUPABASE_URL = "https://kupqxyfgbpvbpnagfldi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CERIGKSYwpKLsQzyAk5fIw_pJiGo1F9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function chargerBoxes() {
  const { data, error } = await supabaseClient
    .from('box')
    .select('id, numero')
    .order('numero');

  if (error) {
    console.error('Erreur lors du chargement des box :', error);
    return;
  }

  const select = document.getElementById('box-select');
  data.forEach(box => {
    const option = document.createElement('option');
    option.value = box.id;
    option.textContent = `Box n°${box.numero}`;
    select.appendChild(option);
  });
}

chargerBoxes();