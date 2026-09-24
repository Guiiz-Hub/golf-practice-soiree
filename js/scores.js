import { supabaseClient } from './supabaseClient.js';
import { initClassementWidget } from './classementWidget.js';
import { initTirageWidget } from './tirageWidget.js';
import { initEnteteAviation } from './enteteAviation.js';

initClassementWidget();
initEnteteAviation();

let boxIdCourante = null;
let canalActuel = null;
let scoresVerrouillesGlobalement = false;

async function verifierVerrouillageGlobal() {
  const { data, error } = await supabaseClient
    .from('etat_evenement')
    .select('scores_verrouilles')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erreur lecture etat evenement :', error);
    return;
  }

  scoresVerrouillesGlobalement = data.scores_verrouilles;
  appliquerVerrouillageGlobal();
}

function appliquerVerrouillageGlobal() {
  document.getElementById('message-scores-verrouilles').style.display =
    scoresVerrouillesGlobalement ? 'block' : 'none';

  document.querySelectorAll('.input-distance').forEach(input => {
    input.disabled = scoresVerrouillesGlobalement;
  });
}

verifierVerrouillageGlobal();

supabaseClient
  .channel('etat-evenement-scores')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'etat_evenement' }, (payload) => {
    scoresVerrouillesGlobalement = payload.new.scores_verrouilles;
    appliquerVerrouillageGlobal();
  })
  .subscribe();

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
  const boxCorrespondante = data.find(box => String(box.id) === boxIdDepuisUrl);

  if (boxCorrespondante) {
    afficherBoxEnLectureSeule(boxCorrespondante.numero);
    select.value = boxIdDepuisUrl;
    select.dispatchEvent(new Event('change'));
  }
}

function afficherBoxEnLectureSeule(numero) {
  document.getElementById('box-select').style.display = 'none';
  document.getElementById('label-box-select').style.display = 'none';

  const badge = document.getElementById('badge-box');
  badge.innerHTML = `<span class="point-live"></span> BOX ${String(numero).padStart(2, '0')}`;
  badge.style.display = 'inline-flex';
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
  initTirageWidget(boxIdCourante);
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

  const bloc = creerBlocScore(joueur, scores || []);
  container.appendChild(bloc);
  calculerEtAfficherMoyenne(joueur.id, scores || []);
}

  appliquerVerrouillageGlobal();
}

function creerBlocScore(joueur, scores) {
  const bloc = document.createElement('div');
  bloc.className = 'joueur-score-carte';
  bloc.dataset.joueurId = joueur.id;

  let tuilesHtml = '';
  for (let coup = 1; coup <= 5; coup++) {
    const scoreExistant = scores.find(s => s.numero_coup === coup);
    const valeur = scoreExistant ? scoreExistant.distance_m : '';
    tuilesHtml += `
      <div class="tuile-coup ${valeur === '' ? 'tuile-coup-vide' : ''}">
        <span class="tuile-coup-label">COUP ${coup}</span>
        <div class="tuile-coup-valeur">
          <input type="text" inputmode="numeric" pattern="[0-9]*"
            class="input-distance"
            data-joueur-id="${joueur.id}"
            data-coup="${coup}"
            value="${valeur}"
            placeholder="—">
          <span class="tuile-coup-unite">m</span>
        </div>
      </div>
    `;
  }

  bloc.innerHTML = `
    <p class="joueur-score-nom">${joueur.prenom} ${joueur.nom}</p>
    <div class="grille-coups">${tuilesHtml}</div>
    <div class="carte-moyenne" id="moyenne-carte-${joueur.id}">
      <p class="moyenne-label">MOYENNE</p>
      <p class="moyenne-valeur" id="moyenne-${joueur.id}">—</p>
    </div>
  `;

  bloc.querySelectorAll('.input-distance').forEach(input => {
    input.addEventListener('blur', enregistrerDistance);
    empecherCaracteresNonNumeriques(input);
  });

  return bloc;
}

async function enregistrerDistance(event) {
  if (scoresVerrouillesGlobalement) return;

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
  const carte = document.getElementById(`moyenne-carte-${joueurId}`);
  if (!el || !carte) return;

  if (scores.length === 0) {
    el.innerHTML = `— <span class="moyenne-unite">m</span>`;
    carte.classList.remove('carte-moyenne-complete');
    return;
  }

  const distances = scores.map(s => s.distance_m).sort((a, b) => b - a);
  let moyenne;
  if (distances.length >= 5) {
    const quatreMeilleurs = distances.slice(0, 4);
    moyenne = quatreMeilleurs.reduce((a, b) => a + b, 0) / 4;
    carte.classList.add('carte-moyenne-complete');
  } else {
    moyenne = distances.reduce((a, b) => a + b, 0) / distances.length;
    carte.classList.remove('carte-moyenne-complete');
  }

  el.innerHTML = `${moyenne.toFixed(1).replace('.', ',')} <span class="moyenne-unite">m</span>`;
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
      const bloc = document.querySelector(`.joueur-score-carte[data-joueur-id="${joueurId}"]`);
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