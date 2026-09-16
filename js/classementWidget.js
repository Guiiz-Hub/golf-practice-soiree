import { supabaseClient } from './supabaseClient.js';
import { calculerClassement, rendreLignesClassement } from './classementData.js';

export function initClassementWidget() {
  injecterHtmlWidget();

  const bulle = document.getElementById('classement-bulle');
  const panneau = document.getElementById('classement-panneau');
  const btnFermer = document.getElementById('classement-fermer');

  bulle.addEventListener('click', () => panneau.classList.toggle('ouvert'));
  btnFermer.addEventListener('click', () => panneau.classList.remove('ouvert'));

  actualiser();

  supabaseClient
    .channel('classement-widget')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'score' }, actualiser)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'joueur' }, actualiser)
    .subscribe();
}

async function actualiser() {
  const classement = await calculerClassement();
  const corps = document.getElementById('corps-classement');
  if (corps) corps.innerHTML = rendreLignesClassement(classement);
}

function injecterHtmlWidget() {
  const conteneur = document.createElement('div');
  conteneur.innerHTML = `
    <button id="classement-bulle" class="classement-bulle" type="button" title="Voir le classement">🏆</button>
    <div id="classement-panneau" class="classement-panneau">
      <div class="classement-panneau-header">
        <h2>Classement en direct</h2>
        <button id="classement-fermer" class="classement-fermer" type="button">×</button>
      </div>
      <div class="classement-panneau-corps">
        <table id="table-classement">
          <thead>
            <tr><th>Rang</th><th>Joueur</th><th>Box</th><th>Score</th></tr>
          </thead>
          <tbody id="corps-classement"></tbody>
        </table>
      </div>
    </div>
  `;
  document.body.appendChild(conteneur);
}