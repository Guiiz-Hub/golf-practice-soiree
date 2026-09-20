import { CONTENU_BIENVENUE } from './bienvenueContenu.js';

export function initPopupBienvenue() {
  injecterHtmlPopupBienvenue();
  document.getElementById('popup-bienvenue-fond').classList.add('ouvert');

  document.getElementById('popup-bienvenue-fermer').addEventListener('click', () => {
    document.getElementById('popup-bienvenue-fond').classList.remove('ouvert');
  });
}

function injecterHtmlPopupBienvenue() {
  const sectionsHtml = CONTENU_BIENVENUE.sections
    .map(s => `<h3>${s.titre}</h3><p>${s.texte}</p>`)
    .join('');

  const conteneur = document.createElement('div');
  conteneur.innerHTML = `
    <div id="popup-bienvenue-fond" class="popup-tirage-fond">
      <div class="popup-tirage-carte">
        <h2>${CONTENU_BIENVENUE.titre}</h2>
        ${sectionsHtml}
        <p class="signature-bienvenue">${CONTENU_BIENVENUE.signature}</p>
        <button id="popup-bienvenue-fermer" type="button">${CONTENU_BIENVENUE.texteBouton}</button>
      </div>
    </div>
  `;
  document.body.appendChild(conteneur);
}