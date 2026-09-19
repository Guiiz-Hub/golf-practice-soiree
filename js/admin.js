import { supabaseClient } from './supabaseClient.js';
import { calculerClassement } from './classementData.js';
import { construireEquipes } from './tirage.js';

const MOT_DE_PASSE_ADMIN = 'DTEACREW2026';

document.getElementById('btn-deverrouiller').addEventListener('click', () => {
  const saisie = document.getElementById('input-mot-de-passe').value;

  if (saisie === MOT_DE_PASSE_ADMIN) {
    document.getElementById('verrou-admin').style.display = 'none';
    document.getElementById('contenu-admin').style.display = 'block';
    chargerListeBoxActuelle();
  } else {
    document.getElementById('message-erreur-mdp').style.display = 'block';
  }
});

async function chargerListeBoxActuelle() {
  const { data, error } = await supabaseClient
    .from('box')
    .select('numero, verrouillee')
    .order('numero');

  if (error) {
    console.error('Erreur chargement box :', error);
    return;
  }

  const liste = document.getElementById('liste-box-actuelle');
  if (data.length === 0) {
    liste.innerHTML = '<li>Aucune box configurée</li>';
    return;
  }

  liste.innerHTML = data
    .map(b => `<li>Box ${b.numero} ${b.verrouillee ? '(verrouillée)' : '(libre)'}</li>`)
    .join('');
}

async function trouverScoresIncomplets() {
  const { data: joueurs, error: erreurJoueurs } = await supabaseClient
    .from('joueur')
    .select('id, prenom, nom, box(numero)');

  if (erreurJoueurs) {
    console.error('Erreur chargement joueurs :', erreurJoueurs);
    return [];
  }

  const { data: scores, error: erreurScores } = await supabaseClient
    .from('score')
    .select('joueur_id');

  if (erreurScores) {
    console.error('Erreur chargement scores :', erreurScores);
    return [];
  }

  const incomplets = joueurs
    .map(joueur => {
      const nbCoups = scores.filter(s => s.joueur_id === joueur.id).length;
      return {
        boxNumero: joueur.box ? joueur.box.numero : '?',
        nom: `${joueur.prenom} ${joueur.nom}`,
        nbCoups,
      };
    })
    .filter(j => j.nbCoups < 5)
    .sort((a, b) => a.boxNumero - b.boxNumero);

  return incomplets;
}

document.getElementById('btn-deverrouiller').addEventListener('click', () => {
  const saisie = document.getElementById('input-mot-de-passe').value;

  if (saisie === MOT_DE_PASSE_ADMIN) {
    document.getElementById('verrou-admin').style.display = 'none';
    document.getElementById('contenu-admin').style.display = 'block';
    chargerListeBoxActuelle();
    chargerStatutScores();
  } else {
    document.getElementById('message-erreur-mdp').style.display = 'block';
  }
});

async function chargerStatutScores() {
  const { data, error } = await supabaseClient
    .from('etat_evenement')
    .select('scores_verrouilles')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erreur lecture etat evenement :', error);
    return;
  }

  afficherStatutScores(data.scores_verrouilles);
}

function afficherStatutScores(verrouille) {
  document.getElementById('statut-scores').textContent = verrouille ? 'Verrouillés' : 'Ouverts';
  document.getElementById('btn-verrouiller-scores').textContent =
    verrouille ? 'Déverrouiller les scores' : 'Verrouiller les scores globalement';
}

document.getElementById('btn-verrouiller-scores').addEventListener('click', async () => {
  const { data: etat, error: erreurLecture } = await supabaseClient
    .from('etat_evenement')
    .select('scores_verrouilles')
    .eq('id', 1)
    .single();

  if (erreurLecture) {
    alert('Erreur de lecture : ' + erreurLecture.message);
    return;
  }

  const nouveauStatut = !etat.scores_verrouilles;

  if (nouveauStatut) {
    const incomplets = await trouverScoresIncomplets();

    if (incomplets.length > 0) {
      const details = incomplets
        .map(j => `Box ${j.boxNumero} — ${j.nom} (${j.nbCoups}/5)`)
        .join('\n');

      const continuerQuandMeme = confirm(
        `Attention, ces joueurs n'ont pas terminé leurs 5 coups :\n\n${details}\n\nVerrouiller quand même ?`
      );
      if (!continuerQuandMeme) return;
    } else {
      const confirmation = confirm('Tous les joueurs ont leurs 5 scores. Verrouiller la saisie pour tout le monde ?');
      if (!confirmation) return;
    }
  } else {
    const confirmation = confirm('Déverrouiller à nouveau la saisie des scores ?');
    if (!confirmation) return;
  }

  const { error } = await supabaseClient
    .from('etat_evenement')
    .update({ scores_verrouilles: nouveauStatut })
    .eq('id', 1);

  if (error) {
    alert('Erreur : ' + error.message);
    return;
  }

  afficherStatutScores(nouveauStatut);
});

document.getElementById('btn-configurer-box').addEventListener('click', async () => {
  const texte = document.getElementById('textarea-box').value;
  const numeros = texte
    .split('\n')
    .map(ligne => ligne.trim())
    .filter(ligne => ligne !== '')
    .map(ligne => parseInt(ligne, 10));

  if (numeros.length === 0) {
    alert('Entre au moins un numéro de box.');
    return;
  }

  if (numeros.some(isNaN)) {
    alert('Un des numéros saisis n\'est pas valide.');
    return;
  }

  const confirmation = confirm(
    `Cette action va SUPPRIMER tous les joueurs et scores existants, et remplacer la liste des box par : ${numeros.join(', ')}.\n\nConfirmer ?`
  );
  if (!confirmation) return;

  const { error: erreurScores } = await supabaseClient.from('score').delete().gte('id', 0);
  if (erreurScores) {
    console.error('Erreur suppression scores :', erreurScores);
    alert('Échec à la suppression des scores : ' + erreurScores.message);
    return;
  }

  const { error: erreurJoueurs } = await supabaseClient.from('joueur').delete().gte('id', 0);
  if (erreurJoueurs) {
    console.error('Erreur suppression joueurs :', erreurJoueurs);
    alert('Échec à la suppression des joueurs : ' + erreurJoueurs.message);
    return;
  }

  const { error: erreurSuppressionBox } = await supabaseClient.from('box').delete().gte('id', 0);
  if (erreurSuppressionBox) {
    console.error('Erreur suppression box :', erreurSuppressionBox);
    alert('Échec à la suppression des box : ' + erreurSuppressionBox.message);
    return;
  }

  const nouvellesBox = numeros.map(numero => ({ numero, verrouillee: false }));
  const { error } = await supabaseClient.from('box').insert(nouvellesBox);

  if (error) {
    console.error('Erreur création box :', error);
    alert('Erreur lors de la création des box : ' + error.message);
    return;
  }

  alert('Liste des box mise à jour.');
  chargerListeBoxActuelle();
});

let tirageEnCours = null;

document.getElementById('btn-generer-tirage').addEventListener('click', async () => {
  const classement = (await calculerClassement()).filter(j => j.moyenne !== null);

  if (classement.length < 5) {
    alert('Il faut au moins 5 joueurs ayant un score pour lancer un tirage.');
    return;
  }

  const { data: boxes } = await supabaseClient.from('box').select('id, numero').order('numero');
  const nbEquipesAttendu = Math.ceil(classement.length / 5);

  if (!boxes || boxes.length !== nbEquipesAttendu) {
    alert(
      `Ce tirage va former ${nbEquipesAttendu} équipes, mais tu as ${boxes ? boxes.length : 0} box configurées. ` +
      `Reconfigure la liste des box (section plus haut) pour qu'elle contienne exactement ${nbEquipesAttendu} numéros avant de publier.`
    );
  }

  tirageEnCours = construireEquipes(classement);
  afficherApercuTirage(tirageEnCours);
  document.getElementById('btn-publier-tirage').style.display = 'block';
});

function afficherApercuTirage(equipes) {
  const conteneur = document.getElementById('apercu-tirage');
  conteneur.innerHTML = equipes
    .map((equipe, index) => `
      <div class="equipe-apercu">
        <strong>Équipe ${index + 1}</strong> (${equipe.membres.length} joueurs)
        <ul>
          ${equipe.membres.map(m => `<li>${m.nom} — ${m.service}</li>`).join('')}
        </ul>
      </div>
    `)
    .join('');
}

document.getElementById('btn-publier-tirage').addEventListener('click', async () => {
  if (!tirageEnCours) return;

  const confirmation = confirm('Publier ce tirage ? Chaque joueur verra la box vers laquelle se diriger.');
  if (!confirmation) return;

  const { data: boxes, error: erreurBoxes } = await supabaseClient
    .from('box')
    .select('id, numero')
    .order('numero');

  if (erreurBoxes || !boxes || boxes.length !== tirageEnCours.length) {
    alert('Le nombre de box ne correspond plus au nombre d\'équipes. Reconfigure les box et régénère un tirage.');
    return;
  }

  await supabaseClient.from('equipe_membre').delete().gte('id', 0);
  await supabaseClient.from('equipe_finale').delete().gte('id', 0);

  for (let i = 0; i < tirageEnCours.length; i++) {
    const { data: nouvelleEquipe, error: erreurEquipe } = await supabaseClient
      .from('equipe_finale')
      .insert({ box_id: boxes[i].id })
      .select()
      .single();

    if (erreurEquipe) {
      alert('Erreur création équipe : ' + erreurEquipe.message);
      return;
    }

    const membresAInserer = tirageEnCours[i].membres.map(m => ({
      equipe_id: nouvelleEquipe.id,
      joueur_id: m.id,
    }));

    const { error: erreurMembres } = await supabaseClient
      .from('equipe_membre')
      .insert(membresAInserer);

    if (erreurMembres) {
      alert('Erreur ajout des membres : ' + erreurMembres.message);
      return;
    }
  }

  alert('Tirage publié ! Chaque joueur peut maintenant voir sa nouvelle box.');
});

document.getElementById('btn-reset-donnees').addEventListener('click', async () => {
  const confirmation = confirm('Supprimer tous les joueurs et scores, et déverrouiller toutes les box ?');
  if (!confirmation) return;

  const { error: erreurScores } = await supabaseClient.from('score').delete().gte('id', 0);
  if (erreurScores) {
    console.error('Erreur suppression scores :', erreurScores);
    alert('Échec à la suppression des scores : ' + erreurScores.message);
    return;
  }

  const { error: erreurJoueurs } = await supabaseClient.from('joueur').delete().gte('id', 0);
  if (erreurJoueurs) {
    console.error('Erreur suppression joueurs :', erreurJoueurs);
    alert('Échec à la suppression des joueurs : ' + erreurJoueurs.message);
    return;
  }

  const { error: erreurBox } = await supabaseClient
    .from('box')
    .update({ verrouillee: false })
    .gte('id', 0);

  if (erreurBox) {
    console.error('Erreur réinitialisation box :', erreurBox);
    alert('Échec à la réinitialisation des box : ' + erreurBox.message);
    return;
  }

  alert('Données réinitialisées.');
  chargerListeBoxActuelle();
  chargerStatutScores();
});