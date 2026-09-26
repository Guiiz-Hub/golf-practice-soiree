export function initEnteteAviation() {
  const carte = document.querySelector('.carte-score');
  if (!carte) return;

  const entete = document.createElement('div');
  entete.innerHTML = `
    <div class="statut-barre">
      <span id="horloge-statut"></span>
      <span class="statut-connexion">
        <span class="point-live"></span>
        LIVE · DTEA
      </span>
    </div>
    <div class="marque-barre">
      <div class="marque-groupe">
        <div class="marque-logo">→</div>
        <div class="marque-texte">
          <p class="marque-nom">DTEA EVENT</p>
          <p class="marque-sous-titre">GOLF NIGHT · 13 Octobre 2026</p>
        </div>
      </div>
    </div>
  `;
  carte.insertBefore(entete, carte.firstChild);

  const horloge = document.getElementById('horloge-statut');
  const mettreAJourHorloge = () => {
    const maintenant = new Date();
    horloge.textContent = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  mettreAJourHorloge();
  setInterval(mettreAJourHorloge, 10000);
}