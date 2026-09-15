import { supabaseClient, SERVICES } from './supabaseClient.js';

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

let boxIdCourante = null;
let joueursActuels = [];

document.getElementById('box-select').addEventListener('change', async (event) => {
  const section = document.getElementById('section-joueurs');
  boxIdCourante = event.target.value ? parseInt(event.target.value, 10) : null;

  if (!boxIdCourante) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  remplirOptionsServices();
  await chargerEtatBox();
  ecouterChangementsTempsReel();
});

function remplirOptionsServices() {
  const select = document.getElementById('input-service');
  select.innerHTML = '<option value="">-- Service --</option>' +
    SERVICES.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function chargerEtatBox() {
  document.getElementById('bloc-ajout-joueur').style.display = 'block';
  document.getElementById('message-box-verrouillee').style.display = 'none';

  const { data: box } = await supabaseClient
    .from('box')
    .select('verrouillee')
    .eq('id', boxIdCourante)
    .single();

  if (box.verrouillee) {
    afficherBoxVerrouillee();
    return;
  }

  const { data: joueurs, error } = await supabaseClient
    .from('joueur')
    .select('id, prenom, nom')
    .eq('box_id', boxIdCourante);

  if (error) {
    console.error('Erreur chargement joueurs :', error);
    return;
  }

  joueursActuels = joueurs;
  afficherListeJoueurs();
}

function afficherListeJoueurs() {
  const liste = document.getElementById('liste-joueurs');
  liste.innerHTML = joueursActuels
    .map(j => `<li>${j.prenom} ${j.nom}</li>`)
    .join('');

  const complet = joueursActuels.length >= 5;
  document.getElementById('btn-ajouter-joueur').disabled = complet;
  document.getElementById('btn-bonne-chance').disabled = joueursActuels.length === 0;
}

function afficherBoxVerrouillee() {
  document.getElementById('bloc-ajout-joueur').style.display = 'none';
  document.getElementById('message-box-verrouillee').style.display = 'block';
}

document.getElementById('btn-ajouter-joueur').addEventListener('click', async () => {
  const prenom = document.getElementById('input-prenom').value.trim();
  const nom = document.getElementById('input-nom').value.trim();
  const pseudo = document.getElementById('input-pseudo').value.trim();
  const service = document.getElementById('input-service').value;

  if (!prenom || !nom || !service) {
    alert('Merci de remplir prénom, nom et service.');
    return;
  }

  const dejaPresent = joueursActuels.some(j =>
    j.prenom.toLowerCase() === prenom.toLowerCase() &&
    j.nom.toLowerCase() === nom.toLowerCase()
  );
  if (dejaPresent) {
    alert('Ce nom est déjà inscrit dans cette box. Si ce n\'est pas toi, vérifie l\'orthographe.');
    return;
  }

  const { error } = await supabaseClient
    .from('joueur')
    .insert([{ box_id: boxIdCourante, prenom, nom, pseudo: pseudo || null, service }]);

  if (error) {
    console.error('Erreur ajout joueur :', error);
    alert('Une erreur est survenue, réessaie.');
    return;
  }

  document.getElementById('input-prenom').value = '';
  document.getElementById('input-nom').value = '';
  document.getElementById('input-pseudo').value = '';
  document.getElementById('input-service').value = '';
});

document.getElementById('btn-bonne-chance').addEventListener('click', async () => {
  const confirmation = confirm('Êtes-vous sûrs d\'être au complet ? Une fois validé, plus aucune modification ne sera possible.');
  if (!confirmation) return;

  const { error } = await supabaseClient
    .from('box')
    .update({ verrouillee: true })
    .eq('id', boxIdCourante);

  if (error) {
    console.error('Erreur verrouillage box :', error);
  }
});

let canalActuel = null;

function ecouterChangementsTempsReel() {
  if (canalActuel) {
    supabaseClient.removeChannel(canalActuel);
  }

  canalActuel = supabaseClient
    .channel('box-' + boxIdCourante)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'joueur',
      filter: 'box_id=eq.' + boxIdCourante,
    }, (payload) => {
      joueursActuels.push(payload.new);
      afficherListeJoueurs();
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'box',
      filter: 'id=eq.' + boxIdCourante,
    }, (payload) => {
      if (payload.new.verrouillee) {
        afficherBoxVerrouillee();
      }
    })
    .subscribe();
}