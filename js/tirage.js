const PRIORITE_CHAPEAUX_COURTS = [2, 1, 3, 0, 4];

function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function construireChapeaux(classement) {
  const N = classement.length;
  const nbEquipes = Math.ceil(N / 5);
  const deficit = nbEquipes * 5 - N;
  const chapeauxCourts = new Set(PRIORITE_CHAPEAUX_COURTS.slice(0, deficit));

  const tailles = [0, 1, 2, 3, 4].map(j => chapeauxCourts.has(j) ? nbEquipes - 1 : nbEquipes);

  const chapeaux = [];
  let curseur = 0;
  for (const taille of tailles) {
    chapeaux.push(classement.slice(curseur, curseur + taille));
    curseur += taille;
  }

  return { chapeaux, nbEquipes, chapeauxCourts };
}

export function construireEquipes(classement) {
  const { chapeaux, nbEquipes, chapeauxCourts } = construireChapeaux(classement);

  const toutesLesEquipes = Array.from({ length: nbEquipes }, () => ({ membres: [], services: {} }));

  const chapeauxCourtsListe = [...chapeauxCourts];
  const ciblesSkip = melanger([...Array(nbEquipes).keys()]).slice(0, chapeauxCourtsListe.length);
  const skipParChapeau = {};
  chapeauxCourtsListe.forEach((chapIndex, i) => {
    skipParChapeau[chapIndex] = ciblesSkip[i];
  });

  chapeaux.forEach((membresChapeau, chapIndex) => {
    const poolDisponible = melanger(membresChapeau);
    let slotsCibles = [...Array(nbEquipes).keys()];
    if (chapIndex in skipParChapeau) {
      slotsCibles = slotsCibles.filter(t => t !== skipParChapeau[chapIndex]);
    }
    slotsCibles = melanger(slotsCibles);

    slotsCibles.forEach(equipeIndex => {
      const equipe = toutesLesEquipes[equipeIndex];

      const candidatsSansConflit = poolDisponible.filter(
        j => (equipe.services[j.service] || 0) < 2
      );
      const source = candidatsSansConflit.length > 0 ? candidatsSansConflit : poolDisponible;

      const choisiIndex = Math.floor(Math.random() * source.length);
      const joueurChoisi = source[choisiIndex];

      poolDisponible.splice(poolDisponible.indexOf(joueurChoisi), 1);
      equipe.membres.push(joueurChoisi);
      equipe.services[joueurChoisi.service] = (equipe.services[joueurChoisi.service] || 0) + 1;
    });
  });

  return toutesLesEquipes;
}