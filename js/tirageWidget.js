import { supabaseClient } from './supabaseClient.js';

let boxIdCourante = null;
let canalTirage = null;
let dernierResultat = null;

export function initTirageWidget(boxId) {
  boxIdCourante = boxId;
  injecterHtmlPopupTirage();
  verifierTirageDejaPublie();
  ecouterPublicationTirage();
}

async function verifierTirageDejaPublie() {
  const resultats = await recupererAffectationsBox();
  if (resultats.length > 0) {
    dernierResultat = resultats;
    afficherPopupTirage(resultats);
  }
}

async function recupererAffectationsBox() {
  const { data: joueurs, error: erreurJoueurs } = await supabaseClient
    .from('joueur')
    .select('id, prenom, nom')
    .eq('box_id', boxIdCourante);

  if (erreurJoueurs || !joueurs || joueurs.length === 0) return [];

  const idsJoueurs = joueurs.map(j => j.id);

  const { data: affectations, error: erreurAffectations } = await supabaseClient
    .from('equipe_membre')
    .select('joueur_id, equipe_finale(box(numero))')
    .in('joueur_id', idsJoueurs);

  if (erreurAffectations || !affectations || affectations.length === 0) return [];

  return affectations.map(a => {
    const joueur = joueurs.find(j => j.id === a.joueur_id);
    return {
      nom: `${joueur.prenom} ${joueur.nom}`,
      nouvelleBox: a.equipe_finale && a.equipe_finale.box ? a.equipe_finale.box.numero : '?',
    };
  });
}

function injecterHtmlPopupTirage() {
  const conteneur = document.createElement('div');
  conteneur.innerHTML = `
    <div id="popup-tirage-fond" class="popup-tirage-fond">
      <div class="popup-tirage-carte">
        <h2>Bravo à tous, les prochaines équipes sont faites !</h2>
        <p>Votre prochain emplacement se trouve ci-dessous :</p>
        <ul id="popup-tirage-liste"></ul>
        <button id="popup-tirage-fermer" type="button">Compris, j'y vais !</button>
      </div>
    </div>
    <button id="bulle-tirage" class="bulle-tirage" type="button" style="display: none;">
      Next <span class="fleche-tirage">→</span>
    </button>
  `;
  document.body.appendChild(conteneur);

  document.getElementById('popup-tirage-fermer').addEventListener('click', () => {
    document.getElementById('popup-tirage-fond').classList.remove('ouvert');
    document.getElementById('bulle-tirage').style.display = 'flex';
  });

  document.getElementById('bulle-tirage').addEventListener('click', () => {
    if (dernierResultat) {
      afficherPopupTirage(dernierResultat);
    }
  });
}

function afficherPopupTirage(resultats) {
  const liste = document.getElementById('popup-tirage-liste');
  liste.innerHTML = resultats
    .map(r => `<li>${r.nom} <span class="fleche-tirage">→</span> Box ${r.nouvelleBox}</li>`)
    .join('');

  document.getElementById('popup-tirage-fond').classList.add('ouvert');
  document.getElementById('bulle-tirage').style.display = 'none';
}

function ecouterPublicationTirage() {
  if (canalTirage) {
    supabaseClient.removeChannel(canalTirage);
  }

  canalTirage = supabaseClient
    .channel('tirage-box-' + boxIdCourante)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'equipe_membre' }, async () => {
      const resultats = await recupererAffectationsBox();
      if (resultats.length > 0) {
        dernierResultat = resultats;
        afficherPopupTirage(resultats);
      }
    })
    .subscribe();
}