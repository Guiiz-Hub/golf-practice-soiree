import { supabaseClient } from './supabaseClient.js';
import { initClassementWidget } from './classementWidget.js';

initClassementWidget();

let boxIdCourante = null;
let canalActuel = null;

async function chargerBoxesDemarrees() {
  const { data, error } = await supabaseClient
    .from('box')
    .select('id, numero')
    .eq('verrouillee', true)
    .order('numero');

  if (error) {
    console.error('Erreur chargement box :', error);
    return;
  }

  const select = document.getElementById('box-select');
  data.forEach(box => {
    const option = document.createElement('option');
    option.value = box.id;
    option.textContent = `Box n°${box.numero}`;
    select.appendChild(option);
  });

  const params = new URLSearchParams(window.location.search);
  const boxIdDepuisUrl = params.get('box');

  if (boxIdDepuisUrl && data.some(box => String(box.id) === boxIdDepuisUrl)) {
    select.value = boxIdDepuisUrl;
    select.disabled = true;
    select.dispatchEvent(new Event('change'));
  }
}

chargerBoxesDemarrees();

document.getElementById('box-select').addEventListener('change', async (event) => {
  boxIdCourante = event.target.value ? parseInt(event.target.value, 10) : null;
  const section = document.getElementById('section-scores');

  if (!boxIdCourante) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  await chargerJoueursEtScores();
  ecouterChangementsScores();
});

async function chargerJoueursEtScores() {
  const { data: joueurs, error: erreurJoueurs } = await supabaseClient
    .from('joueur')
    .select('id, prenom, nom')
    .eq('box_id', boxIdCourante);

  if (erreurJoueurs) {
    console.error('Erreur chargement joueurs :', erreurJoueurs);
    return;
  }

  const container = document.getElementById('joueurs-scores-container');
  container.innerHTML = '';

  for (const joueur of joueurs) {
    const { data: scores } = await supabaseClient
      .from('score')
      .select('numero_coup, distance_m')
      .eq('joueur_id', joueur.id);

    container.appendChild(creerBlocScore(joueur, scores || []));
  }
}

function creerBlocScore(joueur, scores) {
  const bloc = document.createElement('div');
  bloc.className = 'joueur-score-bloc';
  bloc.dataset.joueurId = joueur.id;

  let inputsHtml = '';
  for (let coup = 1; coup <= 5; coup++) {
  const scoreExistant = scores.find(s => s.numero_coup === coup);
  const valeur = scoreExistant ? scoreExistant.distance_m : '';
  inputsHtml += `
    <div class="coup-wrapper">
      <span class="coup-label">Coup ${coup}</span>
      <input type="text" inputmode="numeric" pattern="[0-9]*"
      class="input-distance"
      data-joueur-id="${joueur.id}"
      data-coup="${coup}"
      placeholder="m"
      value="${valeur}">
    </div>
  `;
}

  bloc.innerHTML = `
    <p class="joueur-titre">${joueur.prenom} ${joueur.nom}</p>
    <div class="distances-container">${inputsHtml}</div>
    <p class="score-moyenne" id="moyenne-${joueur.id}"></p>
  `;
 
  bloc.querySelectorAll('.input-distance').forEach(input => {
    input.addEventListener('blur', enregistrerDistance);
    empecherCaracteresNonNumeriques(input);
  });
  calculerEtAfficherMoyenne(joueur.id, scores);

  return bloc;
}

async function enregistrerDistance(event) {
  const input = event.target;
  const joueurId = parseInt(input.dataset.joueurId, 10);
  const numeroCoup = parseInt(input.dataset.coup, 10);
  const valeur = input.value.trim();

  if (valeur === '') return;

  const distance = parseInt(valeur, 10);
  if (isNaN(distance) || distance < 0 || distance > 350) {
    alert('La distance doit être comprise entre 0 et 350 mètres.');
    input.value = '';
    return;
  }

  const { error } = await supabaseClient
    .from('score')
    .upsert(
      { joueur_id: joueurId, numero_coup: numeroCoup, distance_m: distance },
      { onConflict: 'joueur_id,numero_coup' }
    );

  if (error) {
    console.error('Erreur enregistrement score :', error);
    alert('Une erreur est survenue, réessaie.');
  }
}

function empecherCaracteresNonNumeriques(input) {
  input.addEventListener('keydown', (event) => {
    if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '');
  });
}

function calculerEtAfficherMoyenne(joueurId, scores) {
  const el = document.getElementById(`moyenne-${joueurId}`);
  if (!el) return;

  if (scores.length === 0) {
    el.textContent = 'Aucun coup enregistré';
    return;
  }

  const distances = scores.map(s => s.distance_m).sort((a, b) => b - a);

  let moyenne;
  if (distances.length >= 5) {
    const quatreMeilleurs = distances.slice(0, 4);
    moyenne = quatreMeilleurs.reduce((a, b) => a + b, 0) / 4;
  } else {
    moyenne = distances.reduce((a, b) => a + b, 0) / distances.length;
  }

  el.textContent = `Moyenne : ${moyenne.toFixed(1)} m (${distances.length}/5 coups)`;
}

function ecouterChangementsScores() {
  if (canalActuel) {
    supabaseClient.removeChannel(canalActuel);
  }

  canalActuel = supabaseClient
    .channel('scores-box-' + boxIdCourante)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'score',
    }, async (payload) => {
      const joueurId = payload.new?.joueur_id || payload.old?.joueur_id;
      const bloc = document.querySelector(`.joueur-score-bloc[data-joueur-id="${joueurId}"]`);
      if (!bloc) return;

      const { data: scores } = await supabaseClient
        .from('score')
        .select('numero_coup, distance_m')
        .eq('joueur_id', joueurId);

      scores.forEach(s => {
        const input = bloc.querySelector(`.input-distance[data-coup="${s.numero_coup}"]`);
        if (input && document.activeElement !== input) {
          input.value = s.distance_m;
        }
      });

      calculerEtAfficherMoyenne(joueurId, scores);
    })
    .subscribe();
}