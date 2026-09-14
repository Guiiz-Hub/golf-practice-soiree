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

const SERVICES = ['MOS', 'EWIS', 'CE', 'ASV', 'Pyro', 'HAF', 'ELEC', 'VEF', 'GCONF', 'DIR'];
let nombreJoueurs = 0;

function creerBlocJoueur(numero) {
  const bloc = document.createElement('div');
  bloc.className = 'joueur-bloc';

  const optionsServices = SERVICES
    .map(s => `<option value="${s}">${s}</option>`)
    .join('');

  bloc.innerHTML = `
    <p class="joueur-titre">Joueur ${numero}</p>
    <input type="text" placeholder="Prénom" class="input-prenom">
    <input type="text" placeholder="Nom" class="input-nom">
    <input type="text" placeholder="Pseudo (optionnel)" class="input-pseudo">
    <select class="input-service">
      <option value="">-- Service --</option>
      ${optionsServices}
    </select>
  `;

  return bloc;
}

document.getElementById('btn-ajouter-joueur').addEventListener('click', () => {
  if (nombreJoueurs >= 5) return;

  nombreJoueurs++;
  const container = document.getElementById('joueurs-container');
  container.appendChild(creerBlocJoueur(nombreJoueurs));

  if (nombreJoueurs === 5) {
    document.getElementById('btn-ajouter-joueur').disabled = true;
  }
});

document.getElementById('box-select').addEventListener('change', (event) => {
  const section = document.getElementById('section-joueurs');
  section.style.display = event.target.value ? 'block' : 'none';
});

document.getElementById('btn-ajouter-joueur').addEventListener('click', () => {
  document.getElementById('btn-bonne-chance').disabled = false;
});

document.getElementById('btn-bonne-chance').addEventListener('click', async () => {
  const confirmation = confirm('Êtes-vous sûrs d\'être au complet ? Une fois validé, plus aucune modification ne sera possible.');
  if (!confirmation) return;

  const boxId = parseInt(document.getElementById('box-select').value, 10);
  const blocs = document.querySelectorAll('.joueur-bloc');

  const joueursAEnregistrer = [];

  for (const bloc of blocs) {
    const prenom = bloc.querySelector('.input-prenom').value.trim();
    const nom = bloc.querySelector('.input-nom').value.trim();
    const pseudo = bloc.querySelector('.input-pseudo').value.trim();
    const service = bloc.querySelector('.input-service').value;

    if (!prenom || !nom || !service) {
      alert('Merci de remplir prénom, nom et service pour chaque joueur avant de lancer le jeu.');
      return;
    }

    joueursAEnregistrer.push({
      box_id: boxId,
      prenom,
      nom,
      pseudo: pseudo || null,
      service,
    });
  }

  const { error: erreurInsertion } = await supabaseClient
    .from('joueur')
    .insert(joueursAEnregistrer);

  if (erreurInsertion) {
    console.error('Erreur lors de l\'enregistrement des joueurs :', erreurInsertion);
    alert('Une erreur est survenue, réessaie.');
    return;
  }

  const { error: erreurVerrouillage } = await supabaseClient
    .from('box')
    .update({ verrouillee: true })
    .eq('id', boxId);

  if (erreurVerrouillage) {
    console.error('Erreur lors du verrouillage de la box :', erreurVerrouillage);
    return;
  }

  verrouillerFormulaire();
});

function verrouillerFormulaire() {
  document.getElementById('box-select').disabled = true;
  document.querySelectorAll('.joueur-bloc input, .joueur-bloc select').forEach(champ => {
    champ.disabled = true;
  });
  document.getElementById('btn-ajouter-joueur').style.display = 'none';
  document.getElementById('btn-bonne-chance').style.display = 'none';
  document.getElementById('message-verrouillage').style.display = 'block';
}