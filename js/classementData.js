import { supabaseClient } from './supabaseClient.js';

export async function calculerClassement() {
  const { data: joueurs, error: erreurJoueurs } = await supabaseClient
    .from('joueur')
    .select('id, prenom, nom, box(numero)');

  if (erreurJoueurs) {
    console.error('Erreur chargement joueurs :', erreurJoueurs);
    return [];
  }

  const { data: scores, error: erreurScores } = await supabaseClient
    .from('score')
    .select('joueur_id, distance_m');

  if (erreurScores) {
    console.error('Erreur chargement scores :', erreurScores);
    return [];
  }

  const classement = joueurs.map(joueur => {
    const scoresJoueur = scores
      .filter(s => s.joueur_id === joueur.id)
      .map(s => s.distance_m)
      .sort((a, b) => b - a);

    let moyenne = null;
    if (scoresJoueur.length > 0) {
      const retenus = scoresJoueur.length >= 5 ? scoresJoueur.slice(0, 4) : scoresJoueur;
      moyenne = retenus.reduce((a, b) => a + b, 0) / retenus.length;
    }

    return {
      nom: `${joueur.prenom} ${joueur.nom}`,
      boxNumero: joueur.box ? joueur.box.numero : '?',
      nbCoups: scoresJoueur.length,
      moyenne,
    };
  });

  classement.sort((a, b) => {
    if (a.moyenne === null) return 1;
    if (b.moyenne === null) return -1;
    return b.moyenne - a.moyenne;
  });

  return classement;
}

export function rendreLignesClassement(classement) {
  return classement.map((ligne, index) => `
    <tr class="${index < 3 ? 'podium' : ''}">
      <td>${index + 1}</td>
      <td>${ligne.nom}</td>
      <td>Box ${ligne.boxNumero}</td>
      <td>${ligne.moyenne !== null ? ligne.moyenne.toFixed(1) + ' m' : '—'} <span class="nb-coups">(${ligne.nbCoups}/5)</span></td>
    </tr>
  `).join('');
}