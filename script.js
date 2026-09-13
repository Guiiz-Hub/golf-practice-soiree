const SUPABASE_URL = "sb_publishable_CERIGKSYwpKLsQzyAk5fIw_pJiGo1F9";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cHF4eWZnYnB2YnBuYWdmbGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzM2ODAsImV4cCI6MjEwNDgwOTY4MH0._LA4boUDX75d6K6KtR_KepqeOpC8v9iupjx7h_v8Xq8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function chargerBoxes() {
  const { data, error } = await supabase
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