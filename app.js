import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
/* === CONFIG FIREBASE ==== */
const firebaseConfig = {
    apiKey: "AIzaSyAthjJQtXHEGgKsyKdgnJPrUbXSjdpJtlg",
    authDomain: "respogame-e0653.firebaseapp.com",
    projectId: "respogame-e0653",
    storageBucket: "respogame-e0653.firebasestorage.app",
    messagingSenderId: "353645620029",
    appId: "1:353645620029:web:f89d625a4086bf0b65f354",
    databaseURL: "https://respogame-e0653-default-rtdb.europe-west1.firebasedatabase.app"
};

/* ════ MOT DE PASSE ADMIN ════ */
const MOT_DE_PASSE = "respo2025";

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth = getAuth(app);
await signInWithEmailAndPassword(auth, "primskatobi@gmail.com", "respo2025");
/* ════ ÉTAT ════ */
let convActive   = null;
let stopConvs    = null;
let stopMessages = null;
let toutesConvs  = {};

/* ════ CONNEXION ════ */
window.seConnecter = () => {
  const val = document.getElementById('mdp-input').value;
  if (val === MOT_DE_PASSE) {
    document.getElementById('ecran-login').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    demarrerEcoute();
  } else {
    document.getElementById('login-err').style.display = 'block';
    document.getElementById('mdp-input').value = '';
    document.getElementById('mdp-input').focus();
  }
};

window.seDeconnecter = () => {
  if (typeof stopConvs    === 'function') stopConvs();
  if (typeof stopMessages === 'function') stopMessages();
  stopConvs    = null;
  stopMessages = null;
  convActive   = null;
  toutesConvs  = {};
  document.getElementById('app').classList.remove('visible');
  document.getElementById('ecran-login').style.display = 'flex';
  document.getElementById('mdp-input').value = '';
};

window.retourListe = () => {
  document.querySelector('.zone-principale').classList.remove('ouverte');
  if (typeof stopMessages === 'function') { stopMessages(); stopMessages = null; }
  convActive = null;
};


/* ════ ÉCOUTE CONVERSATIONS ════ */
function demarrerEcoute() {
  const convsRef = ref(db, 'conversations');
  stopConvs = onValue(convsRef, snapshot => {
    toutesConvs = {};
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const meta = child.val().meta;
        if (meta) toutesConvs[child.key] = { id: child.key, ...meta };
      });
    }
    rafraichirListe();
    mettreAJourStats();
  });
}

/* ════ LISTE ════ */
function rafraichirListe(filtre = '') {
  const liste = document.getElementById('liste-conversations');
  const convs = Object.values(toutesConvs)
    .filter(c => !filtre || c.jeuNom?.toLowerCase().includes(filtre.toLowerCase()))
    .sort((a, b) => (b.timestampDernier || b.timestamp || 0) - (a.timestampDernier || a.timestamp || 0));

  document.getElementById('compteur-conv').textContent = convs.length;

  if (!convs.length) {
    liste.innerHTML = `<div class="sidebar-vide"><i class="fa-solid fa-comments"></i><p>${filtre ? 'Aucun résultat' : 'En attente de messages…<br>Les clients apparaîtront ici.'}</p></div>`;
    return;
  }

  liste.innerHTML = '';
  convs.forEach(c => {
    const div = document.createElement('div');
    div.className = `conv-item${c.id === convActive ? ' actif' : ''}${c.nonLu ? ' non-lu' : ''}`;
    div.dataset.id = c.id;
    const heure = c.timestampDernier
      ? new Date(c.timestampDernier).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
      : '';

    // ✅ CORRECTION : icône plateforme propre, sans injection d'attributs dans la string
    let iconeHtml;
    if (c.jeuPlateforme === 'pc') {
      iconeHtml = '<i class="fa-solid fa-computer"></i>';
    } else if (c.jeuPlateforme === 'xbox') {
      iconeHtml = '<i class="fa-brands fa-xbox"></i>';
    } else {
      iconeHtml = '<i class="fa-brands fa-playstation"></i>';
    }

    div.innerHTML = `
      <div class="conv-entete">
        <div class="conv-plateforme ${c.jeuPlateforme}">${iconeHtml}</div>
        <span class="conv-jeu">${c.jeuNom || 'Jeu inconnu'}</span>
        <span class="conv-heure">${heure}</span>
      </div>
      <div class="conv-client"><i class="fa-solid fa-user" style="font-size:10px;margin-right:4px"></i>${c.pseudoClient || 'Client'}</div>
      <div class="conv-apercu">${c.dernierMessage || 'Nouvelle conversation'}</div>`;
    div.addEventListener('click', () => ouvrirConversation(c.id));
    liste.appendChild(div);
  });
}

window.filtrerConversations = v => rafraichirListe(v);

/* ════  CONVERSATION ════ */
async function ouvrirConversation(id) {
  convActive = id;
  const c = toutesConvs[id];
  if (!c) return;
  document.querySelector('.zone-principale').classList.add('ouverte');

  // UI header
  document.getElementById('chat-img').src             = c.jeuImage || '';
  document.getElementById('chat-nom').textContent     = c.jeuNom || '';
  document.getElementById('chat-prix').textContent    = c.jeuPrix ? c.jeuPrix.toLocaleString('fr-FR') + ' FCFA' : '';
  document.getElementById('chat-client').textContent  = '👤 ' + (c.pseudoClient || 'Client');
  const plEl = document.getElementById('chat-plateforme');
  plEl.textContent = {ps:'PlayStation', xbox:'Xbox', pc:'PC'}[c.jeuPlateforme] || '';
  plEl.className   = `chat-plateforme ${c.jeuPlateforme}`;

  document.getElementById('zone-vide').style.display     = 'none';
  const zoneChat = document.getElementById('zone-chat');
  zoneChat.style.display       = 'flex';
  zoneChat.style.flexDirection = 'column';
  zoneChat.style.flex          = '1';
  zoneChat.style.overflow      = 'hidden';

  // marquer comme lu à l'ouverture
  await set(ref(db, `conversations/${id}/meta/nonLu`), false);

  // Mise à jour sidebar
  rafraichirListe(document.querySelector('.input-recherche')?.value || '');

 
  if (typeof stopMessages === 'function') { stopMessages(); stopMessages = null; }

  // Écoute messages
  const msgRef = ref(db, `conversations/${id}/messages`);
  stopMessages = onValue(msgRef, snapshot => {
    const conteneur = document.getElementById('chat-messages');
    conteneur.innerHTML = '';
    if (!snapshot.exists()) {
      conteneur.innerHTML = '<div class="chat-vide"><i class="fa-solid fa-comment-slash"></i><span>Aucun message</span></div>';
      return;
    }
    snapshot.forEach(child => {
      const m = child.val();
      afficherMessageAdmin(m.type, m.texte, m.timestamp, m.auteur);
    });
    conteneur.scrollTop = conteneur.scrollHeight;
  });

  document.getElementById('admin-input').focus();
}

function afficherMessageAdmin(type, texte, timestamp, auteur) {
  const conteneur = document.getElementById('chat-messages');
  const estAdmin  = type === 'admin';
  const heure     = timestamp
    ? new Date(timestamp).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
    : '';
  const div = document.createElement('div');
  div.className = `message ${estAdmin ? 'admin-msg' : 'client-msg'}`;
  div.innerHTML = `
    <div class="msg-avatar"><i class="fa-solid fa-${estAdmin ? 'headset' : 'user'}"></i></div>
    <div class="msg-corps">
      <div class="msg-nom">${estAdmin ? 'Toi (Admin)' : auteur || 'Client'}</div>
      <div class="msg-bulle">${texte}</div>
      <div class="msg-heure">${heure}</div>
    </div>`;
  conteneur.appendChild(div);
}

/* ==== ENVOYER RÉPONSE  ===== */
window.envoyerReponse = async () => {
  const input = document.getElementById('admin-input');
  const texte = input.value.trim();
  if (!texte || !convActive) return;
  input.value = '';
  input.style.height = 'auto';

  const ts = Date.now();
  await push(ref(db, `conversations/${convActive}/messages`), {
    auteur: 'Admin', texte, type: 'admin', timestamp: ts
  });
  await set(ref(db, `conversations/${convActive}/meta/nonLu`), false);
  await set(ref(db, `conversations/${convActive}/meta/dernierMessage`), '✓ Répondu : ' + texte.slice(0, 40));
  await set(ref(db, `conversations/${convActive}/meta/timestampDernier`), ts);

  afficherToast('Réponse envoyée', 'succes');
};

window.gererToucheAdmin = e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerReponse(); }
};

document.getElementById('admin-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

/* === ACTIONS === */
window.marquerLu = async () => {
  if (!convActive) return;
  await set(ref(db, `conversations/${convActive}/meta/nonLu`), false);
  afficherToast('Marqué comme lu', 'succes');
};

window.supprimerConversation = async () => {
  if (!convActive) return;
  if (!confirm('Supprimer cette conversation ?')) return;
  await remove(ref(db, `conversations/${convActive}`));
  convActive = null;
  document.getElementById('zone-vide').style.display = 'flex';
  document.getElementById('zone-chat').style.display = 'none';
  // ✅ CORRECTION : stopMessages remis à null après appel
  if (typeof stopMessages === 'function') { stopMessages(); stopMessages = null; }
  afficherToast('Conversation supprimée', 'info');
};

window.insererRaccourci = texte => {
  const input = document.getElementById('admin-input');
  input.value = texte;
  input.focus();
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
};

/* ════ STATS ════ */
function mettreAJourStats() {
  const convs   = Object.values(toutesConvs);
  const total   = convs.length;
  const nonLu   = convs.filter(c => c.nonLu).length;
  const repondu = convs.filter(c => c.dernierMessage?.startsWith('✓')).length;

  const ps   = convs.filter(c => c.jeuPlateforme === 'ps').length;
  const xbox  = convs.filter(c => c.jeuPlateforme === 'xbox').length;
  const pc    = convs.filter(c => c.jeuPlateforme === 'pc').length;
  const max   = Math.max(ps, xbox, pc, 1);

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-nonlu').textContent   = nonLu;
  document.getElementById('stat-repondu').textContent = repondu;
  document.getElementById('nb-ps').textContent        = ps;
  document.getElementById('nb-xbox').textContent      = xbox;
  document.getElementById('nb-pc').textContent        = pc;
  document.getElementById('bar-ps').style.width       = (ps   / max * 100) + '%';
  document.getElementById('bar-xbox').style.width     = (xbox / max * 100) + '%';
  document.getElementById('bar-pc').style.width       = (pc   / max * 100) + '%';
}

/* ════ TOAST ════ */
function afficherToast(msg, type = 'succes') {
  const t = document.getElementById('toast');
  const i = t.querySelector('i');
  i.className = type === 'succes' ? 'fa-solid fa-check' : 'fa-solid fa-circle-info';
  t.className = `toast ${type}`;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2500);
}