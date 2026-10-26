

// === UTILISATEURS & AUTH ===
var utilisateurActuel = null;
var pinSaisi = "";
var estConnecte = false;
var USERS_DEFAUT = [
  {id:"alex", nom:"Alexandre", initiale:"A", pin:"0407", role:"Gerant"},
  {id:"guil", nom:"Guillaume",  initiale:"G", pin:"3010", role:"Gerant"}
];

// Nom complet pour les signatures de mail selon le profil connecte
function nomComplet() {
  var u = utilisateurActuel;
  if (!u) return "Crea Nature";
  if (u.id === "alex") return "Alexandre Rossit";
  if (u.id === "guil") return "Guillaume Boucher";
  return u.nom || "Crea Nature";
}

function chargerUtilisateurs(cb) {
  db.collection("config").doc("users").get().then(function(doc) {
    var users = doc.exists && doc.data().liste ? doc.data().liste : USERS_DEFAUT;
    cb(users);
  }).catch(function() { cb(USERS_DEFAUT); });
}

function sauverUtilisateurs(users) {
  db.collection("config").doc("users").set({liste: users}).catch(function(){});
}

function afficherChoixUsers() {
  ["ecran-users","ecran-login","ecran-accueil"].forEach(function(id) {
    var e = document.getElementById(id);
    if (e) e.classList.remove("cache");
    if (id !== "ecran-users") e && e.classList.add("cache");
  });
  document.getElementById("app").style.display = "none";
  chargerUtilisateurs(function(users) {
    var liste = document.getElementById("liste-users");
    if (!liste) return;
    liste.innerHTML = "";
    users.forEach(function(u) {
      var card = document.createElement("div");
      card.className = "user-card";
      card.innerHTML =
        "<div class='user-avatar'>" + echapper(u.initiale) + "</div>" +
        "<div><div class='user-nom'>" + echapper(u.nom) + "</div>" +
        "<div class='user-role'>" + echapper(u.role) + "</div></div>" +
        "<div style='margin-left:auto;color:#6E6E73;font-size:20px'>&#x203A;</div>";
      (function(user) { card.onclick = function() { selectionnerUser(user); }; })(u);
      liste.appendChild(card);
    });
    majInfoStats();
  });
}

function selectionnerUser(user) {
  utilisateurActuel = user;
  pinSaisi = "";
  majPinDisplay();
  var eu = document.getElementById("ecran-users");
  var el = document.getElementById("ecran-login");
  if (eu) eu.classList.add("cache");
  if (el) el.classList.remove("cache");
  var av = document.getElementById("avatar-login");
  var nm = document.getElementById("nom-login");
  if (av) av.textContent = user.initiale;
  if (nm) nm.textContent = user.nom;
  document.getElementById("login-erreur").textContent = "";
}

function pinTouche(c) {
  if (pinSaisi.length >= 4) return;
  pinSaisi += c;
  majPinDisplay();
  if (pinSaisi.length === 4) setTimeout(verifierPin, 100);
}

function pinEff() {
  pinSaisi = pinSaisi.slice(0, -1);
  majPinDisplay();
  document.getElementById("login-erreur").textContent = "";
}

function majPinDisplay() {
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById("pd" + i);
    if (dot) dot.classList.toggle("plein", i < pinSaisi.length);
  }
}

function verifierPin() {
  if (!utilisateurActuel) return;
  if (pinSaisi === utilisateurActuel.pin) {
    estConnecte = true;
    localStorage.setItem("cn_user", utilisateurActuel.id);
    localStorage.setItem("cn_connecte", "1");
    document.getElementById("ecran-login").classList.add("cache");
    ouvrirAccueil();
  } else {
    document.getElementById("login-erreur").textContent = "Code incorrect";
    pinSaisi = "";
    majPinDisplay();
  }
}

function ouvrirAccueil() {
  estConnecte = true;
  document.getElementById("app").style.display = "none";
  var ea = document.getElementById("ecran-accueil");
  if (ea) { ea.classList.remove("cache"); construireAccueil(); }
}

function ouvrirApp() { ouvrirAccueil(); }

function lancerCalculateur() {
  var ea = document.getElementById("ecran-accueil");
  if (ea) ea.classList.add("cache");
  var eu = document.getElementById("ecran-users");
  if (eu) eu.classList.add("cache");
  var ep = document.getElementById("ecran-login");
  if (ep) ep.classList.add("cache");
  document.getElementById("app").style.display = "flex";
  allerVers("calc");
  majCompteurDevis();
  masquerBottomNav();
  initAutocompleteClient();
}

// Met a jour le compteur de devis dans la banniere et le numero
function majCompteurDevis() {
  if (!db) return;
  db.collection("devis").get().then(function(snap) {
    var total = snap.size || 0;
    var cptBan = trouverEl("cpt-devis-banniere");
    if (cptBan) cptBan.textContent = total + " devis";
    // Calculer le prochain numero a partir du plus grand numero de l'annee en cours
    var yyyy = String(new Date().getFullYear());
    var maxNum = 0;
    snap.forEach(function(doc) {
      var d = doc.data();
      var n = String(d.num || "");
      // Format attendu : AAAA-XXX ; on prend le suffixe numerique de l'annee courante
      var m = n.match(/(\d{4})-(\d+)/);
      if (m && m[1] === yyyy) {
        var suffixe = parseInt(m[2], 10);
        if (suffixe > maxNum) maxNum = suffixe;
      } else {
        // Ancien format sans annee : on tente juste le nombre
        var seul = parseInt(n.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(seul) && seul > maxNum) maxNum = seul;
      }
    });
    var dNum = trouverEl("d-num");
    if (dNum) {
      dNum.value = yyyy + "-" + String(maxNum + 1).padStart(3,"0");
    }
  }).catch(function(){});
}

function retourAccueil() {
  // Fermer tous les panneaux et overlays ouverts (sinon ils cachent l'accueil)
  fermerTousLesPanneaux();
  document.getElementById("app").style.display = "none";
  var ea = document.getElementById("ecran-accueil");
  if (ea) { ea.classList.remove("cache"); construireAccueil(); }
  afficherBottomNav("accueil");
}

// Ferme tous les panneaux/overlays superposes
function fermerTousLesPanneaux() {
  var ids = ["panneau-tresor","panneau-planning","panneau-stats","panneau-clients","panneau-memo","panneau-bi","panneau-campagne","panneau-ia","panneau-mois","panneau-semaine","overlay-devis","overlay-voir-devis","planning-ia-result"];
  ids.forEach(function(id){ var el = document.getElementById(id); if (el) el.remove(); });
  // Filet de securite : tout element dont l'id commence par panneau- ou overlay-
  var tous = document.querySelectorAll("[id^='panneau-'],[id^='overlay-']");
  tous.forEach(function(el){ el.remove(); });
  if (typeof memoPolling !== "undefined" && memoPolling) { clearInterval(memoPolling); memoPolling = null; }
}

// Barre de navigation flottante
function afficherBottomNav(actif) {
  var nav = document.getElementById("bottom-nav");
  if (!nav) return;
  nav.classList.remove("cache");
  var items = nav.querySelectorAll(".nav-item");
  items.forEach(function(it) {
    if (it.getAttribute("data-nav") === actif) it.classList.add("actif");
    else it.classList.remove("actif");
  });
}
function masquerBottomNav() {
  var nav = document.getElementById("bottom-nav");
  if (nav) nav.classList.add("cache");
}

// Animation de comptage des chiffres KPI
function animerNombre(el, valeurFinale, suffixe, duree) {
  if (!el) return;
  suffixe = suffixe || "";
  duree = duree || 900;
  var debut = performance.now();
  var valDebut = 0;
  function frame(now) {
    var p = Math.min((now - debut) / duree, 1);
    // easing out cubic
    var eased = 1 - Math.pow(1 - p, 3);
    var val = Math.round(valDebut + (valeurFinale - valDebut) * eased);
    el.textContent = val.toLocaleString("fr-FR") + suffixe;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function navGoTo(dest) {
  if (dest === "accueil") { retourAccueil(); return; }
  // Fermer les panneaux ouverts avant d'ouvrir le nouveau (evite l'empilement)
  fermerTousLesPanneaux();
  if (dest === "tresorerie") { if (typeof ouvrirPanneauTresorerie === "function") { ouvrirPanneauTresorerie(); afficherBottomNav("tresorerie"); } return; }
  if (dest === "planning") { if (typeof ouvrirPlanning === "function") { ouvrirPlanning(); afficherBottomNav("planning"); } return; }
  if (dest === "historique") { if (typeof afficherStats === "function") { afficherStats(); afficherBottomNav("historique"); } return; }
}

function deconnecter() {
  estConnecte = false;
  utilisateurActuel = null;
  localStorage.removeItem("cn_connecte");
  localStorage.removeItem("cn_user");
  afficherChoixUsers();
}

function connexionFaceID() {}

function construireAccueil() {
  var ea = document.getElementById("ecran-accueil");
  if (!ea) return;
  var user = utilisateurActuel || {nom: "Equipe", initiale: "C"};
  var moisNoms = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  var moisNom = moisNoms[new Date().getMonth()];

  ea.innerHTML =
    "<div class='acc-header' style='width:100%;flex-shrink:0'>" +
      "<div class='acc-user-bar'>" +
        "<div><div class='acc-bienvenue'>Bonjour,</div><div class='acc-nom'>" + echapper(user.nom) + "</div></div>" +
        "<div style='display:flex;gap:8px;align-items:center'>" +
          "<button onclick='location.reload()' style='background:rgba(255,255,255,.08);border:none;width:32px;height:32px;border-radius:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#86868B'><svg width='16' height='16' viewBox='0 0 24 24' fill='none'><path d='M23 4v6h-6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M1 20v-6h6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg></button>" +
          "<button onclick='ouvrirReglages()' style='background:rgba(200,146,62,.15);border:none;width:36px;height:36px;border-radius:18px;cursor:pointer;display:flex;align-items:center;justify-content:center'>" + "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"#D4AF37\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z\" fill=\"#D4AF37\" opacity=\".7\"/></svg>" + "</button>" +
          "<div class='acc-avatar' onclick='deconnecter()' title='Deconnexion'>" + echapper(user.initiale) + "</div>" +
        "</div>" +
      "</div>" +
      "<div class='acc-logo-row'>" +
        "<img src='data:image/png;base64,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' alt='Crea Nature' style='height:44px;object-fit:contain'/>" +
      "</div>" +
      "<div class='acc-stat-row'>" +
        "<div class='acc-stat'><div class='acc-stat-val' id='acc-nb-devis'>-</div><div class='acc-stat-lbl'>Devis</div></div>" +
        "<div class='acc-stat acc-stat-main'>" +
          "<div class='acc-stat-val acc-stat-ca' id='acc-ca'>-</div>" +
          "<div class='acc-stat-lbl-row'>" +
            "<span class='acc-stat-lbl'>Previsionnel</span>" +
            "<span class='acc-stat-mois'>" + moisNom + "</span>" +
          "</div>" +
        "</div>" +
      "</div>" +
      "<div class='acc-stat-row' style='margin-top:10px'>" +
        "<div class='acc-stat'><div class='acc-stat-val acc-stat-ca' id='acc-ca-mois'>-</div><div class='acc-stat-lbl'>CA HT " + moisNom + "</div></div>" +
        "<div class='acc-stat'><div class='acc-stat-val' id='acc-ca-annee' style='color:#0071E3'>-</div><div class='acc-stat-lbl'>CA HT " + new Date().getFullYear() + "</div></div>" +
      "</div>" +
    "</div>" +
    "<div class='acc-body'>" +
      "<div class='acc-section'>Actions rapides</div>" +
      "<div class='acc-grid'>" +
        "<button class='acc-btn acc-btn-gold' onclick='lancerCalculateur()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\" fill=\"white\" opacity=\".9\"/><path d=\"M14 2v6h6\" fill=\"none\" stroke=\"white\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"13\" x2=\"16\" y2=\"13\" stroke=\"rgba(0,0,0,.3)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"17\" x2=\"13\" y2=\"17\" stroke=\"rgba(0,0,0,.3)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg></span><span class='acc-lbl'>Nouveau devis</span><span class='acc-desc'>Calculer et generer</span></button>" +
        "<button class='acc-btn acc-btn-dark' onclick='ouvrirPanneauClients()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"9\" cy=\"7\" r=\"4\" fill=\"white\"/><path d=\"M2 21v-1a7 7 0 0 1 7-7 7 7 0 0 1 7 7v1\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"18\" cy=\"8\" r=\"3\" fill=\"white\" opacity=\".7\"/><path d=\"M22 21v-1a5 5 0 0 0-4-4.9\" stroke=\"white\" stroke-width=\"1.8\" stroke-linecap=\"round\" opacity=\".7\"/></svg></span><span class='acc-lbl'>Mes clients</span><span class='acc-desc'>Base de donnees</span></button>" +
        "<button class='acc-btn acc-btn-green' onclick='afficherStats()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"3\" y=\"14\" width=\"4\" height=\"7\" rx=\"1.5\" fill=\"white\" opacity=\".6\"/><rect x=\"10\" y=\"9\" width=\"4\" height=\"12\" rx=\"1.5\" fill=\"white\" opacity=\".8\"/><rect x=\"17\" y=\"5\" width=\"4\" height=\"16\" rx=\"1.5\" fill=\"white\"/></svg></span><span class='acc-lbl'>Historique</span><span class='acc-desc'>Devis et CA</span></button>" +
        "<button class=\'acc-btn\' style=\'background:linear-gradient(135deg,#18181F,#111116);color:#0071E3\' onclick=\'ouvrirPlanning()\'><span class=\'acc-ico\'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"3\" fill=\"white\" opacity=\".15\"/><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"3\" stroke=\"white\" stroke-width=\"1.8\"/><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\" stroke=\"white\" stroke-width=\"1.5\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\"/><rect x=\"7\" y=\"13\" width=\"3\" height=\"3\" rx=\"1\" fill=\"white\" opacity=\".8\"/><rect x=\"14\" y=\"13\" width=\"3\" height=\"3\" rx=\"1\" fill=\"white\"/></svg></span><span class=\'acc-lbl\'>Planning</span><span class=\'acc-desc\'>52 semaines</span></button>" +
        
        "<button class='acc-btn acc-btn-purple' onclick='ouvrirPanneauMemo()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2.5\" fill=\"white\" opacity=\".15\"/><rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2.5\" stroke=\"white\" stroke-width=\"1.8\"/><line x1=\"8\" y1=\"8\" x2=\"16\" y2=\"8\" stroke=\"white\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\" stroke=\"white\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"16\" x2=\"12\" y2=\"16\" stroke=\"white\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg></span><span class='acc-lbl'>Memo partage</span><span class='acc-desc'>Notes et taches</span></button>" +
        "<button class='acc-btn acc-btn-terrain' onclick='ouvrirPanneauBI()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\" fill=\"white\" opacity=\".15\"/><rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\" stroke=\"white\" stroke-width=\"1.8\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"4\" rx=\"1.5\" fill=\"white\"/><path d=\"M9 12.5l2 2 4-4\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span><span class='acc-lbl'>Bon d'intervention</span><span class='acc-desc'>Generer et envoyer</span></button>" +
      
        "<button class='acc-btn' style='background:linear-gradient(135deg,#18181F,#111116);color:#0071E3' onclick='ouvrirCampagneMail()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M22 2L11 13\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M22 2l-7 20-4-9-9-4 20-7z\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span><span class='acc-lbl'>Campagne mail</span><span class='acc-desc'>Demarcher vos clients</span></button>" +
        "<button class='acc-btn' style='background:linear-gradient(135deg,#18181F,#111116);color:#16A34A' onclick='ouvrirPanneauTresorerie()'><span class='acc-ico'><svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\" fill=\"white\" opacity=\".15\"/><rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\" stroke=\"white\" stroke-width=\"1.8\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"4\" rx=\"1.5\" fill=\"white\"/><path d=\"M9 12.5l2 2 4-4\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span><span class='acc-lbl'>Tresorerie</span><span class='acc-desc'>Encaissements et avances</span></button>" +
      "</div>" +
      "<div class='acc-devis-list' id='acc-derniers-devis'></div>" +
    "</div>";

  var now2 = new Date();

  var _now = new Date();
  var _y = _now.getFullYear(), _m = _now.getMonth();
  db.collection("devis").orderBy("timestamp","desc").limit(200).get().then(function(snap) {
    var nb = 0, total = 0;
    snap.forEach(function(doc) {
      var d = doc.data(); nb++;
      var ts = new Date(d.timestamp||0);
      // Previsionnel = devis du mois PAS ENCORE attribues a la tresorerie
      if (ts.getFullYear()===_y && ts.getMonth()===_m && !d.allocatedTo) total += d.totalTTC||0;
    });
    var elD = document.getElementById("acc-nb-devis");
    if (elD) elD.textContent = nb;
    var elCA = document.getElementById("acc-ca");
    if (elCA) elCA.textContent = total.toLocaleString("fr-FR",{minimumFractionDigits:2}) + " \u20AC";
  }).catch(function(){});

  majCAAccueil();
  afficherBottomNav("accueil");
  }


// Calcul du chiffre d'affaires pour l'accueil (tresorerie + contrats)
function majCAAccueil() {
  if (!db) return;
  var now = new Date();
  var moisCourant = now.getMonth();
  var anneeCourante = now.getFullYear();
  db.collection("tresorerie").get().then(function(snap) {
    var caMois = 0, caAnnee = 0;
    snap.forEach(function(doc) {
      var d = doc.data();
      var tous = [];
      (d.encaissements || []).forEach(function(e){ tous.push(e); });
      if (d.archives) { Object.keys(d.archives).forEach(function(an){ (d.archives[an]||[]).forEach(function(e){ tous.push(e); }); }); }
      tous.forEach(function(e) {
        // Alexandre/Guillaume = 2 EI sans TVA : montant net (pas de conversion)
        var montant = e.montant || 0;
        var parts = (e.date || "").split("/");
        if (parts.length === 3) {
          var mm = parseInt(parts[1],10) - 1;
          var yyyy = parseInt(parts[2],10);
          if (yyyy === anneeCourante) {
            caAnnee += montant;
            if (mm === moisCourant) caMois += montant;
          }
        }
      });
    });
    db.collection("contrats").get().then(function(snapC) {
      var mensuelTotalHT = 0, ponctuelMoisHT = 0, ponctuelAnneeHT = 0;
      snapC.forEach(function(doc) {
        var ct = doc.data();
        if (ct.type === "ponctuel") {
          var mHT = montantHT(ct.montant || 0, tauxTVA(ct.libelle));
          if (ct.annee === anneeCourante) {
            ponctuelAnneeHT += mHT;
            if (ct.mois === moisCourant) ponctuelMoisHT += mHT;
          }
        } else {
          mensuelTotalHT += montantHT(ct.montantMensuel || 0, tauxTVA(ct.client));
        }
      });
      // CA HT mois = encaissements HT du mois + contrats HT (1 mois) + ponctuels HT du mois
      var totalMois = caMois + mensuelTotalHT + ponctuelMoisHT;
      // CA HT annee = encaissements HT annee + contrats HT x12 + ponctuels HT annee
      var totalAnnee = caAnnee + (mensuelTotalHT * 12) + ponctuelAnneeHT;
      var elM = document.getElementById("acc-ca-mois");
      var elA = document.getElementById("acc-ca-annee");
      if (elM) animerNombre(elM, Math.round(totalMois), " \u20AC");
      if (elA) animerNombre(elA, Math.round(totalAnnee), " \u20AC");
    }).catch(function() {
      var elM = document.getElementById("acc-ca-mois");
      var elA = document.getElementById("acc-ca-annee");
      if (elM) elM.textContent = Math.round(caMois).toLocaleString("fr-FR") + " \u20AC";
      if (elA) elA.textContent = Math.round(caAnnee).toLocaleString("fr-FR") + " \u20AC";
    });
  }).catch(function(){});
}


function ouvrirReglages() {
  var panneau = document.createElement("div");
  panneau.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif;overflow-y:auto";
  var barre = document.createElement("div");
  barre.style.cssText = "background:linear-gradient(135deg,#18181F,#111116);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px)+8px)";
  barre.innerHTML = "<span style='font-size:17px;font-weight:700;color:var(--blanc)'>Reglages</span>";
  var bf = document.createElement("button");
  bf.style.cssText = "background:rgba(0,0,0,.12);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  bf.textContent = "Fermer";
  bf.onclick = function() { panneau.remove(); };
  barre.appendChild(bf);
  var corps = document.createElement("div");
  corps.style.cssText = "padding:16px";

  // ===== SOCIETE (nom + logo) =====
  var secSoc = document.createElement("div");
  secSoc.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secSoc.textContent = "Identite de la societe";
  corps.appendChild(secSoc);
  var carteSoc = document.createElement("div");
  carteSoc.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:18px";
  // Apercu logo
  var apercuWrap = document.createElement("div");
  apercuWrap.style.cssText = "display:flex;align-items:center;gap:14px;margin-bottom:14px";
  var apercuLogo = document.createElement("div");
  apercuLogo.style.cssText = "width:60px;height:60px;border-radius:14px;background:var(--fond);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid rgba(0,0,0,.1)";
  if (SOCIETE_LOGO) {
    apercuLogo.innerHTML = "<img src='" + SOCIETE_LOGO + "' style='width:100%;height:100%;object-fit:contain'/>";
  } else {
    apercuLogo.innerHTML = "<span style='font-size:11px;color:var(--txt-3)'>Logo</span>";
  }
  apercuWrap.appendChild(apercuLogo);
  var apercuTxt = document.createElement("div");
  apercuTxt.style.cssText = "flex:1;font-size:13px;color:var(--txt-3);line-height:1.4";
  apercuTxt.textContent = "Logo affiche dans l'app, les devis et les mails. Format PNG conseille.";
  apercuWrap.appendChild(apercuTxt);
  carteSoc.appendChild(apercuWrap);
  // Input fichier cache
  var inpLogo = document.createElement("input");
  inpLogo.type = "file";
  inpLogo.accept = "image/png,image/jpeg,image/*";
  inpLogo.style.cssText = "display:none";
  inpLogo.onchange = function() {
    var f = inpLogo.files && inpLogo.files[0];
    if (!f) return;
    if (f.size > 1500000) { afficherToast("Image trop lourde (max 1.5 Mo)"); return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      SOCIETE_LOGO = ev.target.result;
      apercuLogo.innerHTML = "<img src='" + SOCIETE_LOGO + "' style='width:100%;height:100%;object-fit:contain'/>";
      afficherToast("Logo charge, pense a enregistrer");
    };
    reader.readAsDataURL(f);
  };
  carteSoc.appendChild(inpLogo);
  // Bouton choisir logo
  var btnLogo = document.createElement("button");
  btnLogo.style.cssText = "width:100%;height:42px;border-radius:11px;background:rgba(100,181,246,.15);border:none;color:var(--bleu);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:12px";
  btnLogo.textContent = "Choisir un logo (PNG)";
  btnLogo.onclick = function() { inpLogo.click(); };
  carteSoc.appendChild(btnLogo);
  // Champ nom
  var labNom = document.createElement("div");
  labNom.style.cssText = "font-size:11px;color:var(--txt-3);margin-bottom:6px";
  labNom.textContent = "Nom de la societe";
  carteSoc.appendChild(labNom);
  var inpNomSoc = document.createElement("input");
  inpNomSoc.type = "text";
  inpNomSoc.value = SOCIETE_NOM;
  inpNomSoc.placeholder = "Crea Nature";
  inpNomSoc.style.cssText = "width:100%;padding:11px 13px;border:1px solid rgba(0,0,0,.1);border-radius:11px;font-size:15px;color:var(--blanc);background:var(--fond);outline:none;font-family:-apple-system,sans-serif;-webkit-appearance:none;box-sizing:border-box;margin-bottom:12px";
  carteSoc.appendChild(inpNomSoc);
  // Bouton enregistrer
  var btnSvSoc = document.createElement("button");
  btnSvSoc.style.cssText = "width:100%;height:46px;border-radius:11px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif";
  btnSvSoc.textContent = "Enregistrer l'identite";
  btnSvSoc.onclick = function() {
    var nom = inpNomSoc.value.trim() || "Crea Nature";
    SOCIETE_NOM = nom;
    localStorage.setItem("cn_societe_nom", nom);
    if (SOCIETE_LOGO) localStorage.setItem("cn_societe_logo", SOCIETE_LOGO);
    btnSvSoc.disabled = true; btnSvSoc.textContent = "Enregistrement...";
    if (db) {
      db.collection("config").doc("societe").set({ nom: nom, logo: SOCIETE_LOGO || "" }).then(function() {
        appliquerSociete();
        afficherToast("Identite enregistree !");
        btnSvSoc.disabled = false; btnSvSoc.textContent = "Enregistrer l'identite";
      }).catch(function() {
        appliquerSociete();
        afficherToast("Enregistre en local");
        btnSvSoc.disabled = false; btnSvSoc.textContent = "Enregistrer l'identite";
      });
    } else {
      appliquerSociete();
      afficherToast("Enregistre en local");
      btnSvSoc.disabled = false; btnSvSoc.textContent = "Enregistrer l'identite";
    }
  };
  carteSoc.appendChild(btnSvSoc);
  corps.appendChild(carteSoc);

  // ===== SAUVEGARDE DES DONNEES =====
  var secBkp = document.createElement("div");
  secBkp.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secBkp.textContent = "Sauvegarde des donnees";
  corps.appendChild(secBkp);
  var carteBkp = document.createElement("div");
  carteBkp.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:18px";
  var bkpTxt = document.createElement("div");
  bkpTxt.style.cssText = "font-size:13px;color:var(--txt-3);line-height:1.5;margin-bottom:14px";
  bkpTxt.textContent = "Exporte tous tes clients, devis, tresorerie, memos et plannings dans un fichier de sauvegarde. Garde-le en lieu sur.";
  carteBkp.appendChild(bkpTxt);
  var btnDl = document.createElement("button");
  btnDl.style.cssText = "width:100%;height:46px;border-radius:11px;background:linear-gradient(135deg,var(--succes),#2EA043);border:none;color:var(--blanc);font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:10px";
  btnDl.textContent = "Telecharger la sauvegarde";
  btnDl.onclick = function() { exporterToutesDonnees("download"); };
  carteBkp.appendChild(btnDl);
  var btnMail = document.createElement("button");
  btnMail.style.cssText = "width:100%;height:46px;border-radius:11px;background:rgba(100,181,246,.15);border:none;color:var(--bleu);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnMail.textContent = "Envoyer par mail + telecharger";
  btnMail.onclick = function() { exporterToutesDonnees("mail"); };
  carteBkp.appendChild(btnMail);
  corps.appendChild(carteBkp);


  // Changer PIN
  var sec1 = document.createElement("div");
  sec1.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  sec1.textContent = "Changer mon PIN - " + ((utilisateurActuel || {}).nom || "");
  corps.appendChild(sec1);

  var cartePin = document.createElement("div");
  cartePin.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px";
  cartePin.innerHTML =
    "<input id='rg-pin-a' type='password' inputmode='numeric' maxlength='4' placeholder='PIN actuel' style='width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:16px;font-family:-apple-system,sans-serif;margin-bottom:8px;outline:none;-webkit-appearance:none;display:block'/>" +
    "<input id='rg-pin-n' type='password' inputmode='numeric' maxlength='4' placeholder='Nouveau PIN' style='width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:16px;font-family:-apple-system,sans-serif;margin-bottom:8px;outline:none;-webkit-appearance:none;display:block'/>" +
    "<input id='rg-pin-c' type='password' inputmode='numeric' maxlength='4' placeholder='Confirmer PIN' style='width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:16px;font-family:-apple-system,sans-serif;margin-bottom:10px;outline:none;-webkit-appearance:none;display:block'/>" +
    "<button id='rg-btn-pin' style='width:100%;height:44px;border-radius:11px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;font-size:14px;font-weight:600;color:#FFFFFF;cursor:pointer;font-family:-apple-system,sans-serif'>Changer le PIN</button>" +
    "<div id='rg-msg' style='text-align:center;font-size:12px;margin-top:8px;min-height:16px'></div>";
  corps.appendChild(cartePin);

  cartePin.querySelector("#rg-btn-pin").onclick = function() {
    var a = cartePin.querySelector("#rg-pin-a").value;
    var n2 = cartePin.querySelector("#rg-pin-n").value;
    var c2 = cartePin.querySelector("#rg-pin-c").value;
    var msg = cartePin.querySelector("#rg-msg");
    if (!utilisateurActuel) return;
    if (a !== utilisateurActuel.pin) { msg.style.color="var(--erreur)"; msg.textContent="PIN actuel incorrect"; return; }
    if (n2.length !== 4 || isNaN(Number(n2))) { msg.style.color="var(--erreur)"; msg.textContent="4 chiffres requis"; return; }
    if (n2 !== c2) { msg.style.color="var(--erreur)"; msg.textContent="Les PIN ne correspondent pas"; return; }
    chargerUtilisateurs(function(users) {
      var u = users.find(function(x) { return x.id === utilisateurActuel.id; });
      if (u) { u.pin = n2; utilisateurActuel.pin = n2; sauverUtilisateurs(users); }
      msg.style.color="var(--succes)"; msg.textContent="PIN change !";
    });
  };

  // Equipe
  var sec2 = document.createElement("div");
  sec2.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  sec2.textContent = "Equipe";
  corps.appendChild(sec2);
  chargerUtilisateurs(function(users) {
    users.forEach(function(u) {
      var cu = document.createElement("div");
      cu.style.cssText = "background:var(--blanc);border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px";
      cu.innerHTML =
        "<div style='width:40px;height:40px;border-radius:20px;background:linear-gradient(135deg,#D4AF37,#B8860B);display:flex;align-items:center;justify-content:center;font-size:18px;color:#FFFFFF;font-weight:700;flex-shrink:0'>" + echapper(u.initiale) + "</div>" +
        "<div><div style='font-size:15px;font-weight:600;color:#1D1D1F'>" + echapper(u.nom) + "</div>" +
        "<div style='font-size:12px;color:#86868B'>" + echapper(u.role) + "</div></div>";
      corps.appendChild(cu);
    });
  });

  // === API IA ===
  var secAPI = document.createElement("div");
  secAPI.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secAPI.textContent = "Assistant IA";
  corps.appendChild(secAPI);
  var carteAPI = document.createElement("div");
  carteAPI.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px";
  var apiVal = localStorage.getItem("creanature_api_key") || "";
  var apiInfoEl = document.createElement("div");
  apiInfoEl.style.cssText = "font-size:12px;margin-bottom:8px;color:" + (apiVal ? "var(--succes)" : "var(--erreur)");
  apiInfoEl.textContent = apiVal ? "Cle API configuree" : "Cle API manquante - IA inactive";
  var apiNoteEl = document.createElement("div");
  apiNoteEl.style.cssText = "font-size:11px;color:var(--txt-2);margin-bottom:10px";
  apiNoteEl.textContent = "Obtenir sur console.anthropic.com > API Keys";
  var inpAPIEl = document.createElement("input");
  inpAPIEl.type = "password";
  inpAPIEl.placeholder = "sk-ant-api03-...";
  inpAPIEl.value = apiVal;
  inpAPIEl.style.cssText = "width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;margin-bottom:8px;display:block";
  var btnSvAPI = document.createElement("button");
  btnSvAPI.style.cssText = "width:100%;height:44px;border-radius:11px;background:linear-gradient(135deg,var(--violet),var(--violet-2));border:none;color:var(--blanc);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:6px;display:block";
  btnSvAPI.textContent = "Sauvegarder la cle";
  btnSvAPI.onclick = function() {
    var v = inpAPIEl.value.trim();
    localStorage.setItem("creanature_api_key", v);
    apiInfoEl.textContent = v ? "Cle API configuree" : "Cle API manquante - IA inactive";
    apiInfoEl.style.color = v ? "var(--succes)" : "var(--erreur)";
    afficherToast(v ? "Cle API sauvegardee !" : "Cle supprimee");
  };
  var btnTstAPI = document.createElement("button");
  btnTstAPI.style.cssText = "width:100%;height:40px;border-radius:11px;background:rgba(110,64,201,.15);border:none;color:#9B59D0;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;display:block";
  btnTstAPI.textContent = "Tester la connexion IA";
  btnTstAPI.onclick = function() {
    var k = inpAPIEl.value.trim();
    if (!k) { afficherToast("Entre une cle d'abord"); return; }
    btnTstAPI.textContent = "Test..."; btnTstAPI.disabled = true;
    fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+k},
      body:JSON.stringify({model:"gpt-4o-mini",max_tokens:5,messages:[{role:"user",content:"ok"}]})
    }).then(function(r){return r.json();})
    .then(function(d){ btnTstAPI.textContent="Tester la connexion IA"; btnTstAPI.disabled=false; afficherToast(d.content ? "IA connectee !" : "Erreur API"); })
    .catch(function(){ btnTstAPI.textContent="Tester la connexion IA"; btnTstAPI.disabled=false; afficherToast("Echec - verifier la cle"); });
  };
  carteAPI.appendChild(apiInfoEl); carteAPI.appendChild(apiNoteEl);
  carteAPI.appendChild(inpAPIEl); carteAPI.appendChild(btnSvAPI); carteAPI.appendChild(btnTstAPI);
  corps.appendChild(carteAPI);



  // Tarif horaire
  var secTarif = document.createElement("div");
  secTarif.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:16px 0 8px 2px";
  secTarif.textContent = "Tarif horaire";
  corps.appendChild(secTarif);
  var carteTarif = document.createElement("div");
  carteTarif.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px";
  var tarifActuel = parseInt(localStorage.getItem("creanature_tarif") || "72");
  carteTarif.innerHTML =
    "<div style='font-size:13px;color:#86868B;margin-bottom:10px'>Tarif actuel : <span style='color:#D4AF37;font-weight:700'>" + tarifActuel + " EUR HT/h</span></div>" +
    "<div style='display:flex;gap:8px;align-items:center'>" +
      "<input id='rg-tarif' type='number' value='" + tarifActuel + "' min='1' max='999' style='flex:1;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:16px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none'/>" +
      "<span style='color:#86868B;font-size:13px'>EUR HT / heure</span>" +
    "</div>" +
    "<button id='rg-btn-tarif' style='width:100%;height:44px;border-radius:11px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;font-size:14px;font-weight:600;color:#FFFFFF;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:10px'>Sauvegarder le tarif</button>" +
    "<div id='rg-msg-tarif' style='text-align:center;font-size:12px;margin-top:8px;min-height:16px'></div>";
  corps.appendChild(carteTarif);
  carteTarif.querySelector("#rg-btn-tarif").onclick = function() {
    var v = parseInt(carteTarif.querySelector("#rg-tarif").value);
    var msg = carteTarif.querySelector("#rg-msg-tarif");
    if (!v || v < 1) { msg.style.color="var(--erreur)"; msg.textContent="Tarif invalide"; return; }
    localStorage.setItem("creanature_tarif", String(v));
    TARIF_HORAIRE = v;
    msg.style.color="var(--succes)"; msg.textContent="Tarif mis a jour : " + v + " EUR HT/h";
    calculer();
  };

  // Email soci\u00E9t\u00E9
  var secEmail = document.createElement("div");
  secEmail.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secEmail.textContent = "Informations societe";
  corps.appendChild(secEmail);
  var carteEmail = document.createElement("div");
  carteEmail.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px";
  var emailSoc = localStorage.getItem("creanature_email") || "creanature@ymail.com";
  var telSoc = localStorage.getItem("creanature_tel") || "06 19 30 40 93";
  carteEmail.innerHTML =
    "<label style='font-size:12px;color:#86868B;display:block;margin-bottom:4px'>Email</label>" +
    "<input id='rg-email' type='email' value='" + emailSoc + "' style='width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:14px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;margin-bottom:10px;display:block'/>" +
    "<label style='font-size:12px;color:#86868B;display:block;margin-bottom:4px'>Telephone</label>" +
    "<input id='rg-tel' type='tel' value='" + telSoc + "' style='width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:14px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;margin-bottom:10px;display:block'/>" +
    "<button id='rg-btn-email' style='width:100%;height:44px;border-radius:11px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;font-size:14px;font-weight:600;color:#FFFFFF;cursor:pointer;font-family:-apple-system,sans-serif'>Sauvegarder</button>" +
    "<div id='rg-msg-email' style='text-align:center;font-size:12px;margin-top:8px;min-height:16px'></div>";
  corps.appendChild(carteEmail);
  carteEmail.querySelector("#rg-btn-email").onclick = function() {
    var em = carteEmail.querySelector("#rg-email").value.trim();
    var tel = carteEmail.querySelector("#rg-tel").value.trim();
    var msg2 = carteEmail.querySelector("#rg-msg-email");
    if (!em) { msg2.style.color="var(--erreur)"; msg2.textContent="Email invalide"; return; }
    localStorage.setItem("creanature_email", em);
    localStorage.setItem("creanature_tel", tel);
    msg2.style.color="var(--succes)"; msg2.textContent="Informations sauvegardees !";
  };

  // TVA
  var secTVA = document.createElement("div");
  secTVA.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secTVA.textContent = "TVA";
  corps.appendChild(secTVA);
  var carteTVA = document.createElement("div");
  carteTVA.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px";
  var tvaActuelle = localStorage.getItem("creanature_tva") || "20";
  carteTVA.innerHTML =
    "<span style='font-size:14px;color:#FFFFFF'>Taux de TVA</span>" +
    "<div style='display:flex;align-items:center;gap:8px'>" +
      "<input id='rg-tva' type='number' value='" + tvaActuelle + "' min='0' max='100' style='width:70px;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:rgba(0,0,0,.12);color:#FFFFFF;font-size:15px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;text-align:center'/>" +
      "<span style='color:#86868B;font-size:14px'>%</span>" +
      "<button id='rg-btn-tva' style='padding:8px 14px;border-radius:9px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;font-size:13px;font-weight:600;color:#FFFFFF;cursor:pointer;font-family:-apple-system,sans-serif'>OK</button>" +
    "</div>";
  corps.appendChild(carteTVA);
  carteTVA.querySelector("#rg-btn-tva").onclick = function() {
    var v2 = parseFloat(carteTVA.querySelector("#rg-tva").value);
    if (isNaN(v2)) return;
    localStorage.setItem("creanature_tva", String(v2));
    TAUX_TVA = v2 / 100;
    afficherToast("TVA mise a jour : " + v2 + "%");
    calculer();
  };

  // Mode sombre toggle
  var secMode = document.createElement("div");
  secMode.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secMode.textContent = "Apparence";
  corps.appendChild(secMode);
  var carteMode = document.createElement("div");
  carteMode.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between";
  carteMode.innerHTML =
    "<span style='font-size:14px;color:#FFFFFF'>Mode sombre</span>" +
    "<button onclick='toggleDark()' style='background:linear-gradient(135deg,#7C3AED,#9333EA);border:none;color:#FFFFFF;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif'>Basculer</button>";
  corps.appendChild(carteMode);

  // Planning
  var secPlan2 = document.createElement("div");
  secPlan2.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secPlan2.textContent = "Planning";
  corps.appendChild(secPlan2);
  var cartePlan2 = document.createElement("div");
  cartePlan2.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:8px";
  var nbClients = (JSON.parse(localStorage.getItem('creanature_planning')||'[]').length || PLANNING_DEFAUT.length);
  var infoPlan = document.createElement("div");
  infoPlan.style.cssText = "font-size:13px;color:var(--txt-3)";
  infoPlan.textContent = nbClients + " clients dans le planning";
  var btnOuvPlan2 = document.createElement("button");
  btnOuvPlan2.style.cssText = "height:40px;border-radius:10px;background:rgba(100,181,246,.15);border:none;color:var(--bleu);font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnOuvPlan2.textContent = "Ouvrir le planning 52 semaines";
  btnOuvPlan2.onclick = function() { panneau.remove(); ouvrirPlanning(); };
  var btnRazPlan2 = document.createElement("button");
  btnRazPlan2.style.cssText = "height:40px;border-radius:10px;background:rgba(255,59,48,.15);border:none;color:var(--erreur);font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnRazPlan2.textContent = "Reinitialiser (donnees PDF d'origine)";
  btnRazPlan2.onclick = function() { if (confirm("Reinitialiser le planning ?")) { localStorage.removeItem('creanature_planning'); afficherToast("Planning reinitialise"); panneau.remove(); } };
  cartePlan2.appendChild(infoPlan); cartePlan2.appendChild(btnOuvPlan2); cartePlan2.appendChild(btnRazPlan2);
  corps.appendChild(cartePlan2);

  // Raccourcis
  var secRacc = document.createElement("div");
  secRacc.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--txt-3);margin:0 0 8px 2px";
  secRacc.textContent = "Raccourcis";
  corps.appendChild(secRacc);
  var carteRacc = document.createElement("div");
  carteRacc.style.cssText = "background:var(--blanc);border-radius:14px;padding:16px;margin-bottom:24px;display:flex;flex-direction:column;gap:8px";
  var btns3 = [
    {label:"Historique", fn:function(){ panneau.remove(); afficherStats(); }},
    {label:"Tresorerie", fn:function(){ panneau.remove(); ouvrirPanneauTresorerie(); }},
    {label:"Assistant IA", fn:function(){ panneau.remove(); ouvrirAssistantIA(); }}
  ];
  btns3.forEach(function(b) {
    var btn3 = document.createElement("button");
    btn3.style.cssText = "height:40px;border-radius:10px;background:rgba(255,255,255,.06);border:none;color:var(--blanc);font-size:13px;font-weight:500;cursor:pointer;font-family:-apple-system,sans-serif;text-align:left;padding:0 14px";
    btn3.textContent = b.label + " \u203A";
    btn3.onclick = b.fn;
    carteRacc.appendChild(btn3);
  });
  corps.appendChild(carteRacc);

  panneau.appendChild(barre);
  panneau.appendChild(corps);
  document.body.appendChild(panneau);
}

// === MODE SOMBRE ===
var modeSombre = false;

function toggleDark() {
  modeSombre = !modeSombre;
  document.body.classList.toggle("dark", modeSombre);
  localStorage.setItem("cn_dark", modeSombre ? "1" : "0");
  var btn = document.getElementById("btn-dark");
  if (btn) btn.textContent = modeSombre ? "\u2600\uFE0F" : "\u1F319";
}

// === HISTORIQUE DEVIS ===
function sauverDevisDansHistorique(numDevis, nomClient, auteur3) {
  var n = new Date();
  var date = ("0"+n.getDate()).slice(-2)+"/"+("0"+(n.getMonth()+1)).slice(-2)+"/"+n.getFullYear();
  var auteurSave = utilisateurActuel ? utilisateurActuel.nom : "";
  var t = calculer();
  var snap = {
    prests: etat.prests.slice(),
    autre: etat.autre,
    autreTexte: etat.autreTexte,
    interv: etat.interv,
    heures: etat.heures,
    fournitures: etat.fournitures,
    designation: lireChamp("main-designation")
  };
  var data = {
    num: numDevis, client: nomClient || "Sans nom", date: date,
    totalHT: parseFloat(t.ht.toFixed(2)),
    totalTTC: parseFloat(t.ttc.toFixed(2)),
    timestamp: n.getTime(), auteur: auteurSave,
    adresse: lireChamp("c-adresse") || "",
    email: lireChamp("c-email") || "",
    tel: lireChamp("c-tel") || "",
    snapshot: snap
  };
  db.collection("devis").add(data).catch(function(e) {
    console.log("Erreur historique:", e);
  });
}

// === STATS / INFO PERSISTANCE ===
function majInfoStats() {
  // Afficher nb clients + dernier devis pour rassurer que les donnees existent
  db.collection("clients").get().then(function(snap) {
    var nb = snap.size;
    db.collection("devis").orderBy("timestamp","desc").limit(1).get().then(function(dSnap) {
      var dernierDevis = dSnap.empty ? null : dSnap.docs[0].data();
      var infos = nb + " clients enregistres";
      if (dernierDevis) infos += " \u00B7 Dernier devis : N" + dernierDevis.num + " (" + dernierDevis.date + ")";
      var el = document.getElementById("login-info");
      if (el) el.textContent = infos;
    });
  }).catch(function() {});
}

function afficherStats() {
  db.collection("devis").orderBy("timestamp","desc").limit(200).get().then(function(snap) {
    var devis = [];
    snap.forEach(function(doc) { devis.push(Object.assign({_id:doc.id}, doc.data())); });

    var panneau = document.createElement("div");
    panneau.id = "panneau-stats";
    panneau.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--gris3);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

    // Barre
    var barre = document.createElement("div");
    barre.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));color:var(--blanc);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px) + 6px)";
    barre.innerHTML = "<div><div style='font-size:17px;font-weight:700'>Historique</div><div style='font-size:12px;font-weight:500;opacity:.85;margin-top:1px'>" + devis.length + " devis enregistre" + (devis.length>1?"s":"") + "</div></div>";
    var btnF = document.createElement("button");
    btnF.style.cssText = "background:rgba(255,255,255,.25);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    btnF.textContent = "Fermer";
    btnF.onclick = function() { panneau.remove(); afficherBottomNav("accueil"); };
    barre.appendChild(btnF);

    // Recherche
    var searchBar = document.createElement("div");
    searchBar.style.cssText = "padding:10px 14px;background:var(--blanc);border-bottom:.5px solid var(--bord);flex-shrink:0";
    var searchInp = document.createElement("input");
    searchInp.type = "text";
    searchInp.placeholder = "Rechercher un client...";
    searchInp.style.cssText = "width:100%;padding:9px 14px;border:1.5px solid var(--bord);border-radius:10px;font-size:15px;font-family:-apple-system,sans-serif;outline:none;background:var(--fond);-webkit-appearance:none";
    searchInp.oninput = function() { afficherContenu(this.value.trim()); };
    searchBar.appendChild(searchInp);

    // Corps
    var liste = document.createElement("div");
    liste.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";

    panneau.appendChild(barre);
    var modeHisto = "devis";
    // Onglets Devis / Factures
    var ongletsHisto = document.createElement("div");
    ongletsHisto.style.cssText = "display:flex;gap:8px;padding:10px 14px;background:rgba(17,17,22,.7);flex-shrink:0";
    var ongDevis = document.createElement("button");
    ongDevis.id = "ong-histo-devis";
    ongDevis.style.cssText = "flex:1;padding:10px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--or-2),var(--or));color:#18181F;font-size:13px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif";
    ongDevis.textContent = "Devis";
    var ongFactures = document.createElement("button");
    ongFactures.id = "ong-histo-factures";
    ongFactures.style.cssText = "flex:1;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--txt-3);font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    ongFactures.textContent = "Devis Valide";
    var ongContrats = document.createElement("button");
    ongContrats.id = "ong-histo-contrats";
    ongContrats.style.cssText = "flex:1;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--txt-3);font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    ongContrats.textContent = "Contrats & CA";
    function majOngletsHisto() {
      var inactif = "rgba(255,255,255,.04)";
      var inactifBord = "1px solid rgba(255,255,255,.1)";
      // reset
      [ongDevis, ongFactures, ongContrats].forEach(function(o){ o.style.background = inactif; o.style.color = "var(--txt-3)"; o.style.border = inactifBord; });
      if (modeHisto === "devis") {
        ongDevis.style.background = "linear-gradient(135deg,var(--or-2),var(--or))"; ongDevis.style.color = "#18181F"; ongDevis.style.border = "none";
      } else if (modeHisto === "factures") {
        ongFactures.style.background = "linear-gradient(135deg,var(--violet),var(--violet-2))"; ongFactures.style.color = "var(--blanc)"; ongFactures.style.border = "none";
      } else {
        ongContrats.style.background = "linear-gradient(135deg,var(--bleu),#3A6FD8)"; ongContrats.style.color = "var(--blanc)"; ongContrats.style.border = "none";
      }
    }
    ongDevis.onclick = function() { modeHisto = "devis"; majOngletsHisto(); afficherContenu(searchInp.value.trim()); };
    ongFactures.onclick = function() { modeHisto = "factures"; majOngletsHisto(); afficherContenu(searchInp.value.trim()); };
    ongContrats.onclick = function() { modeHisto = "contrats"; majOngletsHisto(); afficherContenu(searchInp.value.trim()); };
    ongletsHisto.appendChild(ongDevis);
    ongletsHisto.appendChild(ongFactures);
    ongletsHisto.appendChild(ongContrats);


    panneau.appendChild(searchBar);
    panneau.appendChild(ongletsHisto);
    panneau.appendChild(liste);
    document.body.appendChild(panneau);

    var MOIS_NOMS = ["Jan","Fev","Mar","Avr","Mai","Jun","Jul","Aou","Sep","Oct","Nov","Dec"];

    function afficherContenu(filtre) {
      liste.innerHTML = "";
      // Mode special : Contrats & CA (affiche contrats + totaux factures tresorerie)
      if (modeHisto === "contrats") {
        afficherContenuContrats();
        return;
      }
      // Filtrer selon le mode : "factures" = uniquement les devis attribues a la tresorerie
      var base = (modeHisto === "factures")
        ? devis.filter(function(d){ return d.allocatedTo; })
        : devis;
      var filtered = filtre
        ? base.filter(function(d){ return (d.client||"").toLowerCase().indexOf(filtre.toLowerCase())>=0; })
        : base;

      if (!filtered.length) {
        liste.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:40px;font-size:14px'>Aucun devis trouve</div>";
        return;
      }

      var now = new Date();
      var totalMois = 0;
      filtered.forEach(function(d){
        var ts = new Date(d.timestamp||0);
        if (ts.getMonth()===now.getMonth()&&ts.getFullYear()===now.getFullYear()) totalMois+=d.totalTTC||0;
      });

      // Carte total mois
      var carte = document.createElement("div");
      carte.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border-radius:16px;padding:20px;margin-bottom:14px;color:var(--blanc)";
      carte.innerHTML = "<div style='font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:4px'>Total devis du mois</div><div style='font-size:36px;font-weight:200'>"+totalMois.toLocaleString("fr-FR",{minimumFractionDigits:2})+" EUR</div><div style='font-size:12px;opacity:.7;margin-top:4px'>"+filtered.length+" devis au total</div>";
      liste.appendChild(carte);

      if (!filtre) {
        // Graphique mini (6 mois)
        var graphDiv = document.createElement("div");
        graphDiv.style.cssText = "background:var(--blanc);border-radius:14px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.07)";
        var graphLbl = document.createElement("div");
        graphLbl.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin-bottom:10px";
        graphLbl.textContent = "6 derniers mois";
        graphDiv.appendChild(graphLbl);
        var mois6 = [];
        for (var i=5;i>=0;i--) {
          var dd=new Date(now.getFullYear(),now.getMonth()-i,1);
          var tot=0;
          filtered.forEach(function(dv){ var ts=new Date(dv.timestamp||0); if(ts.getFullYear()===dd.getFullYear()&&ts.getMonth()===dd.getMonth()) tot+=dv.totalTTC||0; });
          mois6.push({lbl:MOIS_NOMS[dd.getMonth()],tot:tot,cur:i===0});
        }
        var maxG=Math.max.apply(null,mois6.map(function(m){return m.tot;}))||1;
        var barContainer = document.createElement("div");
        barContainer.style.cssText = "display:flex;align-items:flex-end;gap:6px;height:60px";
        mois6.forEach(function(m) {
          var col = document.createElement("div");
          col.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;gap:3px";
          var h = m.tot>0 ? Math.max(6,Math.round((m.tot/maxG)*50)) : 3;
          var bar = document.createElement("div");
          bar.style.cssText = "width:100%;border-radius:4px 4px 0 0;background:"+(m.cur?"var(--or-2)":"#E8D5B7")+";height:"+h+"px";
          var lbl = document.createElement("div");
          lbl.style.cssText = "font-size:9px;color:var(--txt-3);font-family:-apple-system,sans-serif";
          lbl.textContent = m.lbl;
          var val = document.createElement("div");
          val.style.cssText = "font-size:8px;color:"+(m.cur?"var(--or-2)":"#AEAEB2")+";font-family:-apple-system,sans-serif;font-weight:600";
          val.textContent = m.tot>0 ? (m.tot>=1000?(m.tot/1000).toFixed(1)+"k":Math.round(m.tot)+"") : "";
          col.appendChild(val); col.appendChild(bar); col.appendChild(lbl);
          barContainer.appendChild(col);
        });
        graphDiv.appendChild(barContainer);
        liste.appendChild(graphDiv);

        // Grouper par annee/mois
        var parMois = {};
        filtered.forEach(function(d){
          var ts=new Date(d.timestamp||0);
          var key=ts.getFullYear()+"-"+ts.getMonth();
          if(!parMois[key]) parMois[key]={y:ts.getFullYear(),m:ts.getMonth(),items:[]};
          parMois[key].items.push(d);
        });
        var parAnnee = {};
        Object.values(parMois).forEach(function(g){
          if(!parAnnee[g.y]) parAnnee[g.y]=[];
          parAnnee[g.y].push(g);
        });
        Object.keys(parAnnee).sort(function(a,b){return b-a;}).forEach(function(annee){
          var secLabel = document.createElement("div");
          secLabel.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--txt-3);padding:10px 2px 6px";
          var totAnnee = parAnnee[annee].reduce(function(s,g){return s+g.items.reduce(function(ss,d){return ss+(d.totalTTC||0);},0);},0);
          secLabel.textContent = annee + "  \u2014  " + totAnnee.toLocaleString("fr-FR",{minimumFractionDigits:2}) + " EUR";
          liste.appendChild(secLabel);
          parAnnee[annee].sort(function(a,b){return b.m-a.m;}).forEach(function(grp){
            // En-t\u00EAte mois cliquable
            var moisHdr = document.createElement("div");
            moisHdr.style.cssText = "background:var(--blanc);border-radius:10px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06)";
            var totM2 = grp.items.reduce(function(s,d){return s+(d.totalTTC||0);},0);
            moisHdr.innerHTML = "<div><div style='font-size:14px;font-weight:600;color:#1C1C1E'>"+MOIS_NOMS[grp.m]+" "+grp.y+"</div><div style='font-size:11px;color:var(--txt-3);margin-top:1px'>"+grp.items.length+" devis</div></div><div style='display:flex;align-items:center;gap:8px'><div style='font-size:14px;font-weight:700;color:var(--or-2)'>"+totM2.toLocaleString("fr-FR",{minimumFractionDigits:2})+" EUR</div><span style='color:var(--txt-3);font-size:16px'>\u203A</span></div>";
            var subListe = document.createElement("div");
            subListe.style.display = "none";
            var ouvert = false;
            moisHdr.onclick = function(){
              ouvert=!ouvert;
              subListe.style.display = ouvert?"block":"none";
              moisHdr.querySelector("span").style.transform = ouvert?"rotate(90deg)":"";
            };
            liste.appendChild(moisHdr);
            afficherListeDevis(grp.items, subListe);
            liste.appendChild(subListe);
          });
        });
      } else {
        // Mode recherche : liste directe
        afficherListeDevis(filtered, liste);
      }
    }

    function afficherContenuContrats() {
      liste.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:30px;font-size:14px'>Chargement...</div>";
      // Charger contrats + tresorerie en parallele
      Promise.all([
        db.collection("contrats").get(),
        db.collection("tresorerie").get()
      ]).then(function(res) {
        var snapC = res[0], snapT = res[1];
        var contrats = [];
        snapC.forEach(function(doc){ contrats.push(doc.data()); });
        liste.innerHTML = "";

        // Bouton Recap du mois
        var btnRecap = document.createElement("button");
        btnRecap.style.cssText = "width:100%;padding:14px;border-radius:16px;border:none;background:linear-gradient(135deg,var(--or-2),var(--or));color:#18181F;font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:18px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(212,175,55,.3)";
        btnRecap.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6M8 13h8M8 17h5'/></svg> Recap du mois (PDF)";
        btnRecap.onclick = function(){ if (typeof genererRecapMensuel === "function") genererRecapMensuel(); };
        liste.appendChild(btnRecap);

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 GRAPHIQUES PILOTAGE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        var anneeGraph = new Date().getFullYear();
        var moisLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
        var moisNomsC = ["Jan","Fev","Mar","Avr","Mai","Juin","Juil","Aou","Sep","Oct","Nov","Dec"];

        // --- Donnees : CA net par mois (encaissements gerants) ---
        var caParMois = new Array(12).fill(0);
        var caParClient = {};
        var totalAlex = 0, totalGuil = 0;
        snapT.forEach(function(doc){
          var d = doc.data();
          var estAlex = (doc.id === "alex");
          var tousEnc = [];
          (d.encaissements || []).forEach(function(e){ tousEnc.push(e); });
          if (d.archives) { Object.keys(d.archives).forEach(function(an){ (d.archives[an]||[]).forEach(function(e){ tousEnc.push(e); }); }); }
          tousEnc.forEach(function(e){
            var montant = e.montant || 0;
            if (estAlex) totalAlex += montant; else totalGuil += montant;
            var parts = (e.date || "").split("/");
            if (parts.length === 3 && parseInt(parts[2],10) === anneeGraph) {
              var mm = parseInt(parts[1],10) - 1;
              if (mm >= 0 && mm < 12) caParMois[mm] += montant;
            }
            var cl = (e.client || "Autre").trim() || "Autre";
            caParClient[cl] = (caParClient[cl] || 0) + montant;
          });
        });
        // Ajouter les contrats Crea au CA mensuel (equivalent mensuel HT)
        var totalCreaHT = 0;
        contrats.forEach(function(ct){
          if (ct.type === "ponctuel") {
            var mHT = montantHT(ct.montant||0, tauxTVA(ct.libelle));
            totalCreaHT += mHT;
            if (ct.annee === anneeGraph && typeof ct.mois === "number") caParMois[ct.mois] += mHT;
          } else {
            var mensuelHT = montantHT(ct.montantMensuel||0, tauxTVA(ct.client));
            totalCreaHT += mensuelHT * 12;
            for (var mo = 0; mo < 12; mo++) caParMois[mo] += mensuelHT;
          }
        });

        // ===== GRAPHIQUE 1 : Evolution CA 12 mois (barres) =====
        var titreG1 = document.createElement("div");
        titreG1.style.cssText = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin:4px 2px 12px";
        titreG1.textContent = "Evolution du CA " + anneeGraph;
        liste.appendChild(titreG1);

        var carteG1 = document.createElement("div");
        carteG1.style.cssText = "background:linear-gradient(160deg,rgba(24,24,31,.9),rgba(17,17,22,.9));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px 14px;margin-bottom:20px";
        var maxCA = Math.max.apply(null, caParMois) || 1;
        var moisActuel = new Date().getMonth();
        var barresHTML = "<div style='display:flex;align-items:flex-end;gap:4px;height:120px;margin-bottom:8px'>";
        caParMois.forEach(function(val, i){
          var h = Math.round((val / maxCA) * 100);
          if (h < 2 && val > 0) h = 2;
          var estMoisActuel = (i === moisActuel);
          var couleur = estMoisActuel ? "linear-gradient(180deg,var(--violet-2),var(--violet))" : (val > 0 ? "linear-gradient(180deg,var(--or-2),var(--or))" : "rgba(255,255,255,.05)");
          barresHTML += "<div style='flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%'>" +
            "<div style='width:100%;height:" + h + "%;background:" + couleur + ";border-radius:4px 4px 0 0;min-height:2px;transition:height .5s ease'></div>" +
            "<div style='font-size:8px;color:#52525B;margin-top:4px'>" + moisLabels[i] + "</div>" +
          "</div>";
        });
        barresHTML += "</div>";
        var totalAnnuel = caParMois.reduce(function(a,b){return a+b;},0);
        barresHTML += "<div style='display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)'>" +
          "<span style='font-size:11px;color:#86868B'>Total " + anneeGraph + "</span>" +
          "<span style='font-size:16px;font-weight:700;color:#D4AF37'>" + Math.round(totalAnnuel).toLocaleString('fr-FR') + " EUR</span></div>";
        carteG1.innerHTML = barresHTML;
        liste.appendChild(carteG1);

        // ===== GRAPHIQUE 2 : Repartition Alexandre / Guillaume / Crea =====
        var titreG2 = document.createElement("div");
        titreG2.style.cssText = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin:4px 2px 12px";
        titreG2.textContent = "Repartition des revenus";
        liste.appendChild(titreG2);

        var carteG2 = document.createElement("div");
        carteG2.style.cssText = "background:linear-gradient(160deg,rgba(24,24,31,.9),rgba(17,17,22,.9));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:20px";
        var totalRepart = totalAlex + totalGuil + totalCreaHT;
        if (totalRepart <= 0) totalRepart = 1;
        var segments = [
          { nom: "Alexandre", val: totalAlex, coul: "var(--or-2)" },
          { nom: "Guillaume", val: totalGuil, coul: "#F59E0B" },
          { nom: "Crea Nature", val: totalCreaHT, coul: "var(--violet)" }
        ];
        // Barre horizontale empilee
        var barStack = "<div style='display:flex;height:16px;border-radius:8px;overflow:hidden;margin-bottom:14px;background:rgba(255,255,255,.04)'>";
        segments.forEach(function(s){
          var pct = (s.val / totalRepart) * 100;
          if (pct > 0) barStack += "<div style='width:" + pct + "%;background:" + s.coul + "'></div>";
        });
        barStack += "</div>";
        // Legende
        segments.forEach(function(s){
          var pct = Math.round((s.val / totalRepart) * 100);
          barStack += "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:8px'>" +
            "<div style='display:flex;align-items:center;gap:8px'><span style='width:10px;height:10px;border-radius:3px;background:" + s.coul + "'></span><span style='font-size:13px;color:#E4E4E7'>" + s.nom + "</span></div>" +
            "<div style='text-align:right'><span style='font-size:13px;font-weight:700;color:#1D1D1F'>" + Math.round(s.val).toLocaleString('fr-FR') + " EUR</span><span style='font-size:11px;color:#86868B;margin-left:6px'>" + pct + "%</span></div>" +
          "</div>";
        });
        carteG2.innerHTML = barStack;
        liste.appendChild(carteG2);

        // ===== GRAPHIQUE 3 : Top clients =====
        var titreG3 = document.createElement("div");
        titreG3.style.cssText = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin:4px 2px 12px";
        titreG3.textContent = "Top clients";
        liste.appendChild(titreG3);

        var carteG3 = document.createElement("div");
        carteG3.style.cssText = "background:linear-gradient(160deg,rgba(24,24,31,.9),rgba(17,17,22,.9));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:20px";
        var clientsTries = Object.keys(caParClient).map(function(k){ return { nom: k, val: caParClient[k] }; })
          .sort(function(a,b){ return b.val - a.val; }).slice(0, 5);
        if (clientsTries.length === 0) {
          carteG3.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Aucun encaissement</div>";
        } else {
          var maxClient = clientsTries[0].val || 1;
          var clientsHTML = "";
          clientsTries.forEach(function(cl, i){
            var pct = Math.round((cl.val / maxClient) * 100);
            var medaille = ["var(--or-2)","var(--txt-3)","#CD7F32","#52525B","#52525B"][i];
            clientsHTML += "<div style='margin-bottom:" + (i < clientsTries.length-1 ? "12px" : "0") + "'>" +
              "<div style='display:flex;justify-content:space-between;margin-bottom:4px'>" +
                "<span style='font-size:13px;color:#E4E4E7;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%'>" + echapper(cl.nom) + "</span>" +
                "<span style='font-size:13px;font-weight:700;color:" + medaille + "'>" + Math.round(cl.val).toLocaleString('fr-FR') + " EUR</span>" +
              "</div>" +
              "<div style='height:6px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden'><div style='width:" + pct + "%;height:100%;background:" + medaille + ";border-radius:3px'></div></div>" +
            "</div>";
          });
          carteG3.innerHTML = clientsHTML;
        }
        liste.appendChild(carteG3);
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FIN GRAPHIQUES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550


        // ===== SECTION TOTAUX FACTURES PAR PERSONNE =====
        var totauxParPersonne = {};
        snapT.forEach(function(doc){
          var d = doc.data();
          var nom = (doc.id === "alex") ? "Alexandre" : (doc.id === "guil") ? "Guillaume" : doc.id;
          var tousEnc = [];
          (d.encaissements || []).forEach(function(e){ tousEnc.push(e); });
          if (d.archives) { Object.keys(d.archives).forEach(function(an){ (d.archives[an]||[]).forEach(function(e){ tousEnc.push(e); }); }); }
          var totalNet = 0;
          tousEnc.forEach(function(e){
            totalNet += (e.montant || 0);
          });
          totauxParPersonne[nom] = { net: totalNet, nb: tousEnc.length };
        });

        var secTitre1 = document.createElement("div");
        secTitre1.style.cssText = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin:4px 2px 10px";
        secTitre1.textContent = "Total facture par personne";
        liste.appendChild(secTitre1);

        var grandTotalNet = 0;
        ["Alexandre", "Guillaume"].forEach(function(nom){
          var t = totauxParPersonne[nom] || { net: 0, nb: 0 };
          grandTotalNet += t.net;
          var carte = document.createElement("div");
          carte.style.cssText = "background:linear-gradient(160deg,rgba(24,24,31,.9),rgba(17,17,22,.9));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:10px";
          carte.innerHTML =
            "<div style='display:flex;align-items:center;justify-content:space-between'>" +
              "<div style='display:flex;align-items:center;gap:10px'>" +
                "<div style='width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#D4AF37,#B8860B);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#18181F'>" + nom.charAt(0) + "</div>" +
                "<div><div style='font-size:15px;font-weight:700;color:#1D1D1F'>" + nom + "</div><div style='font-size:11px;color:#86868B'>" + t.nb + " encaissement" + (t.nb>1?"s":"") + " \u00B7 EI sans TVA</div></div>" +
              "</div>" +
              "<div style='text-align:right'><div style='font-size:11px;color:#86868B'>Net encaisse</div><div style='font-size:18px;font-weight:700;color:#16A34A'>" + t.net.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + " EUR</div></div>" +
            "</div>";
          liste.appendChild(carte);
        });

        // Total combine
        var carteTotal = document.createElement("div");
        carteTotal.style.cssText = "background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.25);border-radius:18px;padding:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center";
        carteTotal.innerHTML =
          "<div><div style='font-size:12px;font-weight:700;color:#9333EA;text-transform:uppercase;letter-spacing:.05em'>Total encaisse (2 gerants)</div><div style='font-size:11px;color:#86868B;margin-top:2px'>Net, sans TVA (2 EI)</div></div>" +
          "<div style='font-size:22px;font-weight:800;color:#9333EA'>" + grandTotalNet.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:0}) + " EUR</div>";
        liste.appendChild(carteTotal);

        // ===== SECTION CONTRATS RECURRENTS =====
        var secTitre2 = document.createElement("div");
        secTitre2.style.cssText = "font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin:4px 2px 10px";
        secTitre2.textContent = "Contrats recurrents";
        liste.appendChild(secTitre2);

        var contratsRec = contrats.filter(function(ct){ return ct.type !== "ponctuel"; });
        var ponctuels = contrats.filter(function(ct){ return ct.type === "ponctuel"; });

        if (contratsRec.length === 0 && ponctuels.length === 0) {
          var vide = document.createElement("div");
          vide.style.cssText = "text-align:center;color:var(--txt-3);padding:20px;font-size:13px";
          vide.textContent = "Aucun contrat enregistre";
          liste.appendChild(vide);
        }

        var totalContratsHT = 0, totalContratsTTC = 0;
        contratsRec.forEach(function(ct){
          var mensuel = ct.montantMensuel || 0;
          var tva = tauxTVA(ct.client);
          var annuelTTC = mensuel * 12;
          var annuelHT = montantHT(mensuel, tva) * 12;
          totalContratsHT += annuelHT; totalContratsTTC += annuelTTC;
          var estTrim = ct.periodicite === "trimestriel";
          var carte = document.createElement("div");
          carte.style.cssText = "background:linear-gradient(160deg,rgba(24,24,31,.9),rgba(17,17,22,.9));border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 15px;margin-bottom:8px";
          var badge = estTrim ? "<span style='font-size:9px;font-weight:700;color:var(--violet-2);background:rgba(168,85,247,.15);padding:1px 6px;border-radius:6px;margin-left:6px'>TRIM</span>" : "";
          carte.innerHTML =
            "<div style='display:flex;justify-content:space-between;align-items:flex-start'>" +
              "<div style='flex:1;min-width:0'><div style='font-size:14px;font-weight:600;color:#1D1D1F'>" + echapper(ct.client||"") + badge + "</div>" +
              "<div style='font-size:11px;color:#86868B;margin-top:2px'>" + mensuel.toFixed(2) + " EUR TTC/mois</div></div>" +
              "<div style='text-align:right'><div style='font-size:15px;font-weight:700;color:#16A34A'>" + annuelHT.toFixed(0) + " HT</div><div style='font-size:10px;color:#86868B'>" + annuelTTC.toFixed(0) + " TTC/an</div></div>" +
            "</div>";
          liste.appendChild(carte);
        });

        // Ponctuels
        var totalPonctuelsHT = 0, totalPonctuelsTTC = 0;
        ponctuels.forEach(function(ct){
          var m = ct.montant || 0;
          var mHT = montantHT(m, tauxTVA(ct.libelle));
          totalPonctuelsHT += mHT; totalPonctuelsTTC += m;
          var carte = document.createElement("div");
          carte.style.cssText = "background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:13px 15px;margin-bottom:8px";
          carte.innerHTML =
            "<div style='display:flex;justify-content:space-between;align-items:flex-start'>" +
              "<div style='flex:1;min-width:0'><div style='font-size:14px;font-weight:600;color:#1D1D1F'>" + echapper(ct.libelle||"Divers") + "</div>" +
              "<div style='font-size:11px;color:#86868B;margin-top:2px'>Ponctuel \u00B7 " + echapper(ct.periode||"") + "</div></div>" +
              "<div style='text-align:right'><div style='font-size:15px;font-weight:700;color:#16A34A'>" + mHT.toFixed(0) + " HT</div><div style='font-size:10px;color:#86868B'>" + m.toFixed(0) + " TTC</div></div>" +
            "</div>";
          liste.appendChild(carte);
        });

        // Total contrats + ponctuels
        var carteTotalC = document.createElement("div");
        carteTotalC.style.cssText = "background:rgba(91,141,239,.12);border:1px solid rgba(91,141,239,.25);border-radius:18px;padding:16px;margin-top:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center";
        carteTotalC.innerHTML =
          "<div><div style='font-size:12px;font-weight:700;color:#0071E3;text-transform:uppercase;letter-spacing:.05em'>Total contrats + ponctuels</div><div style='font-size:11px;color:#86868B;margin-top:2px'>TTC " + (totalContratsTTC + totalPonctuelsTTC).toLocaleString('fr-FR',{maximumFractionDigits:0}) + " EUR/an</div></div>" +
          "<div style='font-size:20px;font-weight:800;color:#0071E3'>" + (totalContratsHT + totalPonctuelsHT).toLocaleString('fr-FR',{maximumFractionDigits:0}) + " EUR<span style='font-size:12px;font-weight:600;color:#86868B'> HT</span></div>";
        liste.appendChild(carteTotalC);

      }).catch(function(e){
        liste.innerHTML = "<div style='text-align:center;color:var(--erreur);padding:30px;font-size:14px'>Erreur: " + e.message + "</div>";
      });
    }


    afficherContenu("");
  }).catch(function(e){ alert("Erreur: "+e.message); });
}


function ouvrirDetailMois(nomMois, devisListe, tousDevis) {
  var ancien = document.getElementById("panneau-mois");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-mois";
  pn.style.cssText = "position:fixed;inset:0;z-index:9999999;background:var(--gris3);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";
  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));color:var(--blanc);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px) + 6px)";
  hdr.innerHTML = "<span style='font-size:17px;font-weight:700'>" + nomMois + "</span>";
  var btnF2 = document.createElement("button");
  btnF2.style.cssText = "background:rgba(255,255,255,.25);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF2.textContent = "Retour";
  btnF2.onclick = function() { pn.remove(); };
  hdr.appendChild(btnF2);
  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";
  // Total du mois
  var totalM = devisListe.reduce(function(s,d){return s+(d.totalTTC||0);},0);
  var carteM = document.createElement("div");
  carteM.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border-radius:14px;padding:16px;margin-bottom:14px;color:var(--blanc)";
  carteM.innerHTML = "<div style='font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:4px'>Total " + nomMois + "</div><div style='font-size:30px;font-weight:200'>" + totalM.toLocaleString("fr-FR",{minimumFractionDigits:2}) + " EUR</div><div style='font-size:12px;opacity:.7;margin-top:4px'>" + devisListe.length + " devis</div>";
  body.appendChild(carteM);
  afficherListeDevis(devisListe, body);
  pn.appendChild(hdr); pn.appendChild(body);
  document.body.appendChild(pn);
}

function afficherListeDevis(devisListe, container) {
  devisListe.forEach(function(d) {
    var item = document.createElement("div");
    item.style.cssText = "background:var(--blanc);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.07)";
    var inf = document.createElement("div"); inf.style.cssText = "flex:1;min-width:0";
    inf.innerHTML = "<div style='font-size:13px;font-weight:600;color:#1C1C1E;overflow-wrap:break-word;word-break:normal;line-height:1.3'>" + echapper(d.client||"") + "</div><div style='font-size:11px;color:var(--txt-3);margin-top:2px'>N" + echapper(d.num||"") + " \u00B7 " + echapper(d.date||"") + (d.auteur?" \u00B7 "+echapper(d.auteur):"") + "</div>";
    var mo = document.createElement("div"); mo.style.cssText = "text-align:right;flex-shrink:0";
    mo.innerHTML = "<div style='font-size:14px;font-weight:600;color:var(--or-2)'>" + (d.totalTTC||0).toFixed(2) + " EUR</div><div style='font-size:10px;color:var(--txt-3)'>TTC</div>";
    // Bouton Voir
    var bC = document.createElement("button");
    bC.style.cssText = "background:rgba(100,181,246,.15);border:none;color:var(--bleu);padding:4px 9px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0;white-space:nowrap";
    bC.textContent = "Voir";
    (function(dv){ bC.onclick=function(e){ e.stopPropagation(); voirDevisPDF(dv); }; })(d);
    // Bouton Dupliquer
    var bD = document.createElement("button");
    bD.style.cssText = "background:rgba(76,217,100,.15);border:none;color:var(--succes);padding:4px 9px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0;white-space:nowrap";
    bD.textContent = "Dupliquer";
    (function(dv){ bD.onclick=function(e){ e.stopPropagation(); var p=document.getElementById("panneau-stats"); if(p) p.remove(); var p2=document.getElementById("panneau-mois"); if(p2) p2.remove(); dupliquerDevis(dv); }; })(d);
    // Bouton Tresorerie
    var alloue = d.allocatedTo || "";
    var bT = document.createElement("button");
    bT.id = "bt-" + (d._id||"");
    bT.style.cssText = "border:none;padding:4px 9px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0;white-space:nowrap;background:" + (alloue?"rgba(52,199,89,.2)":"rgba(200,146,62,.2)") + ";color:" + (alloue?"var(--succes)":"var(--or-2)");
    bT.textContent = alloue ? alloue.substring(0,4)+"." : "+ Tres.";
    (function(dv){ bT.onclick=function(e){ e.stopPropagation(); ajouterDevisATresorerie(dv); }; })(d);
    // Bouton Supprimer
    var bX = document.createElement("button");
    bX.style.cssText = "background:rgba(255,59,48,.1);border:none;color:var(--erreur);width:30px;height:30px;border-radius:15px;font-size:18px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
    bX.textContent = "\u00D7";
    (function(id,nm){ bX.onclick=function(e){ e.stopPropagation(); if(!confirm("Supprimer le devis de "+nm+" ?"))return; db.collection("devis").doc(id).delete().then(function(){ item.remove(); afficherToast("Devis supprime"); }).catch(function(err){ afficherToast("Erreur: "+err.message); }); }; })(d._id, d.client||"ce client");
    var ligne1 = document.createElement("div"); ligne1.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:10px";
    ligne1.appendChild(inf); ligne1.appendChild(mo);
    var ligne2 = document.createElement("div"); ligne2.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    ligne2.appendChild(bC); ligne2.appendChild(bD); ligne2.appendChild(bT); ligne2.appendChild(bX);
    item.appendChild(ligne1); item.appendChild(ligne2);
    container.appendChild(item);
  });
}


function voirHistoriqueClient(nomClient) {
  db.collection("devis").where("client","==",nomClient).orderBy("timestamp","desc").get().then(function(snap) {
    var devis = [];
    snap.forEach(function(doc) { devis.push(Object.assign({_id:doc.id}, doc.data())); });

    var msg = "Historique de " + nomClient + " :\n\n";
    if (devis.length === 0) {
      msg += "Aucun devis";
    } else {
      devis.forEach(function(d) {
        msg += "N" + d.num + " \u00B7 " + d.date + " \u00B7 " + (d.totalTTC||0).toFixed(2) + " EUR TTC\n";
      });
    }
    alert(msg);
  }).catch(function(e) {
    alert("Erreur : " + e.message);
  });
}

// === ETAT ===
var TARIF_HORAIRE = parseInt(localStorage.getItem("creanature_tarif")||"72");
var TAUX_TVA = (parseFloat(localStorage.getItem("creanature_tva")||"20"))/100;
var etat = {
  prests: [],
  interv: 0,
  heures: "",
  fournitures: "",
  autre: false,
  autreTexte: "",
  photos: []
};
var lignes = [];
var compteurLigne = 0;
var champActif = null;
var valeurs = {};

// === HORLOGE ===
function majHorloge() {
  var d = new Date();
  var h = ("0" + d.getHours()).slice(-2);
  var m = ("0" + d.getMinutes()).slice(-2);
  var elH = document.getElementById("horloge"); if (elH) elH.textContent = h + ":" + m;
}
majHorloge();
setInterval(majHorloge, 60000);

// === UTILITAIRES ===
function euros(n) {
  if (!isFinite(n) || isNaN(n)) n = 0;
  return n.toLocaleString("fr-FR", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " EUR";
}

function echapper(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lireChamp(id) {
  var e = document.getElementById(id);
  return e ? e.value : "";
}

function ecrire(id, v) {
  var e = document.getElementById(id);
  if (e) e.textContent = v;
}

function trouverEl(id) {
  return document.getElementById(id);
}

// === NAVIGATION ===
function allerVers(ecran) {
  if(ecran==="calc"){ var _t=trouverEl("total-ttc"); if(_t&&_t.textContent!=="0,00 EUR") afficherBandeauRAZ(); }
  var ec = ["calc", "devis"];
  for (var i = 0; i < ec.length; i++) {
    var s = trouverEl("ec-" + ec[i]);
    var o = trouverEl("ong-" + ec[i]);
    if (s) s.classList.toggle("actif", ec[i] === ecran);
    if (o) o.classList.toggle("actif", ec[i] === ecran);
  }
  var _tp=trouverEl("titre-page"); if(_tp) _tp.textContent = ecran === "calc" ? "Calculateur" : "Devis";
  if (ecran === "devis") {
    syncTotaux2();
    // Numero sauve au moment de la visualisation
  }
  fermerPave();
  // Retour en haut de page
  var contenu = trouverEl("contenu");
  if (contenu) contenu.scrollTop = 0;
}

// === PRESTATIONS ===
var nomPrests = {
  "haie": "Taille de haie",
  "tonte": "Tonte",
  "elagage": "Elagage",
  "abattage": "Abattage",
  "evac": "Evacuation / Compostage"
};

function togglePrest(p) {
  var idx = etat.prests.indexOf(p);
  if (idx >= 0) {
    etat.prests.splice(idx, 1);
  } else {
    etat.prests.push(p);
  }
  var liste = ["haie", "tonte", "elagage", "abattage", "evac"];
  for (var i = 0; i < liste.length; i++) {
    var b = trouverEl("bp-" + liste[i]);
    if (b) b.classList.toggle("actif", etat.prests.indexOf(liste[i]) >= 0);
  }
  calculer();
}

function toggleAutre(cle) {
  if (cle === "main") {
    etat.autre = !etat.autre;
    var b = trouverEl("bp-autre");
    var z = trouverEl("zone-autre-main");
    if (b) b.classList.toggle("actif", etat.autre);
    if (z) {
      z.classList.toggle("visible", etat.autre);
      if (etat.autre) {
        var inp = trouverEl("txt-autre-main");
        if (inp) inp.focus();
      }
    }
  } else {
    var lg = lignes.find(function(l) { return l.id === cle; });
    if (!lg) return;
    lg.autre = !lg.autre;
    var b2 = trouverEl("lbp-autre-" + cle);
    var z2 = trouverEl("lzone-autre-" + cle);
    if (b2) b2.classList.toggle("actif", lg.autre);
    if (z2) {
      z2.classList.toggle("visible", lg.autre);
      if (lg.autre) {
        var inp2 = trouverEl("ltxt-autre-" + cle);
        if (inp2) inp2.focus();
      }
    }
  }
  calculer();
}

// === INTERVENANTS ===
function setInterv(n) {
  etat.interv = n;
  for (var i = 1; i <= 4; i++) {
    var b = trouverEl("bi-" + i);
    if (b) b.classList.toggle("actif", i === n);
  }
  calculer();
}

function setIntervLigne(cle, n) {
  var lg = lignes.find(function(l) { return l.id === cle; });
  if (!lg) return;
  lg.interv = n;
  for (var i = 1; i <= 4; i++) {
    var b = trouverEl("lbi-" + cle + "-" + i);
    if (b) b.classList.toggle("actif", i === n);
  }
  calculer();
}

// === PAVE NUMERIQUE ===
function ouvrirPave(champId, cardId, curId) {
  fermerPave();
  champActif = champId;
  if (!valeurs[champId]) valeurs[champId] = "";
  var pave = trouverEl("pave");
  if (pave) pave.classList.add("visible");
  var card = trouverEl(cardId);
  if (card) card.classList.add("actif");
  var cur = trouverEl(curId);
  if (cur) cur.style.display = "inline-block";
  // Donner assez d'espace en bas pour scroller le champ au-dessus du pave
  var contenu = trouverEl("contenu");
  setTimeout(function() {
    var paveH = pave ? pave.offsetHeight : 280;
    if (contenu) contenu.style.paddingBottom = (paveH + 40) + "px";
    var ca = trouverEl(cardId);
    if (ca && contenu) {
      // Position du champ relative au conteneur scrollable
      var champTop = ca.offsetTop;
      var champH = ca.offsetHeight;
      var visibleH = contenu.clientHeight - paveH;
      // Scroller pour que le champ soit juste au-dessus du pave
      var cible = champTop - visibleH + champH + 20;
      contenu.scrollTo({ top: cible > 0 ? cible : 0, behavior: "smooth" });
    }
  }, 100);
}

function fermerPave() {
  champActif = null;
  var pave = trouverEl("pave");
  if (pave) pave.classList.remove("visible");
  var contenu = trouverEl("contenu");
  if (contenu) contenu.style.paddingBottom = "120px";
  var champs = document.querySelectorAll(".champ-tap");
  for (var i = 0; i < champs.length; i++) champs[i].classList.remove("actif");
  var curseurs = document.querySelectorAll(".curseur");
  for (var i = 0; i < curseurs.length; i++) curseurs[i].style.display = "none";
}

function appuyerTouche(k) {
  if (!champActif) return;
  var v = valeurs[champActif] || "";
  if (k === "X") {
    v = v.slice(0, -1);
  } else if (k === "." && v.indexOf(".") >= 0) {
    return;
  } else {
    var parties = v.split(".");
    if (parties[0].length >= 5 && k !== ".") return;
    v = v + k;
  }
  valeurs[champActif] = v;
  mettreAJourAffichage(champActif, v);
  calculer();
}

function mettreAJourAffichage(champId, v) {
  if (champId === "h") {
    etat.heures = v;
    var el = trouverEl("cv-h");
    if (el) { el.textContent = v || "0"; el.classList.toggle("vide", !v); }
    var w = etat.interv < 1 ? 1 : etat.interv;
    ecrire("cr-h", euros((parseFloat(v) || 0) * 72 * w));
  } else if (champId === "s") {
    etat.fournitures = v;
    var el2 = trouverEl("cv-s");
    if (el2) { el2.textContent = v || "0"; el2.classList.toggle("vide", !v); }
  } else {
    // champId = "lh-ID" ou "ls-ID"
    var parties = champId.split("-");
    if (parties.length === 2) {
      var type = parties[0];
      var cle = parties[1];
      var lg = lignes.find(function(l) { return l.id === cle; });
      if (lg) {
        if (type === "lh") {
          lg.heures = v;
          var elh = trouverEl("lcv-h-" + cle);
          if (elh) { elh.textContent = v || "0"; elh.classList.toggle("vide", !v); }
          var w2 = lg.interv < 1 ? 1 : lg.interv;
          ecrire("lcr-h-" + cle, euros((parseFloat(v) || 0) * 72 * w2));
        } else if (type === "ls") {
          lg.fournitures = v;
          var els = trouverEl("lcv-s-" + cle);
          if (els) { els.textContent = v || "0"; els.classList.toggle("vide", !v); }
        }
      }
    }
  }
}

// === PHOTOS ===
function ajouterPhotos(cle, input) {
  var arr = cle === "main" ? etat.photos : (lignes.find(function(l) { return l.id === cle; }) || {photos: []}).photos;
  var fichiers = Array.from(input.files || []);
  var dispo = 4 - arr.length;
  fichiers.slice(0, dispo).forEach(function(f) {
    var r = new FileReader();
    r.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement("canvas");
        var MAX = 800;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        arr.push(canvas.toDataURL("image/jpeg", 0.6));
        afficherPhotos(cle);
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(f);
  });
  input.value = "";
}

function supprimerPhoto(cle, i) {
  var arr = cle === "main" ? etat.photos : (lignes.find(function(l) { return l.id === cle; }) || {photos: []}).photos;
  arr.splice(i, 1);
  afficherPhotos(cle);
}

function afficherPhotos(cle) {
  var grilleId = cle === "main" ? "photos-main" : "photos-lg-" + cle;
  var inputId = cle === "main" ? "input-photo-main" : "input-photo-lg-" + cle;
  var arr = cle === "main" ? etat.photos : (lignes.find(function(l) { return l.id === cle; }) || {photos: []}).photos;
  var grille = trouverEl(grilleId);
  if (!grille) return;
  grille.innerHTML = "";
  for (var i = 0; i < arr.length; i++) {
    var wrap = document.createElement("div");
    wrap.className = "photo-wrap";
    var img = document.createElement("img");
    img.className = "photo-img";
    img.src = arr[i];
    var btn = document.createElement("button");
    btn.className = "photo-suppr";
    btn.textContent = "X";
    (function(idx, k) {
      btn.onclick = function() { supprimerPhoto(k, idx); };
    })(i, cle);
    wrap.appendChild(img);
    wrap.appendChild(btn);
    grille.appendChild(wrap);
  }
  if (arr.length < 4) {
    var ajout = document.createElement("button");
    ajout.className = "btn-ajout-photo";
    ajout.innerHTML = "&#x1F4F7;<br/>Ajouter";
    (function(k) {
      ajout.onclick = function() {
        var inp = trouverEl("input-photo-" + (k === "main" ? "main" : "lg-" + k));
        if (inp) inp.click();
      };
    })(cle);
    grille.appendChild(ajout);
  }
}

// === LIGNES SUPPLEMENTAIRES ===
function ajouterLigne() {
  fermerPave();
  compteurLigne++;
  var cle = "lg" + compteurLigne;
  lignes.push({
    id: cle,
    prests: [],
    interv: 0,
    heures: "",
    fournitures: "",
    autre: false,
    autreTexte: "",
    designation: "",
    photos: []
  });
  valeurs["lh-" + cle] = "";
  valeurs["ls-" + cle] = "";
  afficherLignes();
  setTimeout(function() {
    var e = trouverEl("bloc-" + cle);
    if (e) e.scrollIntoView({behavior: "smooth", block: "start"});
  }, 150);
}

function supprimerLigne(cle) {
  lignes = lignes.filter(function(l) { return l.id !== cle; });
  afficherLignes();
  calculer();
}

function afficherLignes() {
  var liste = trouverEl("liste-desig");
  if (!liste) return;
  liste.innerHTML = "";

  for (var idx = 0; idx < lignes.length; idx++) {
    var lg = lignes[idx];
    var num = idx + 2;
    var cle = lg.id;

    var bloc = document.createElement("div");
    bloc.className = "bloc-desig";
    bloc.id = "bloc-" + cle;

    // Tete
    var tete = document.createElement("div");
    tete.className = "bloc-desig-tete";
    tete.innerHTML = "<span class=\"bloc-desig-titre\">Prestation " + num + "</span>";
    var btnSuppr = document.createElement("button");
    btnSuppr.style.cssText = "background:none;border:none;color:var(--erreur);font-size:20px;cursor:pointer;line-height:1;font-family:-apple-system,sans-serif;padding:0 2px";
    btnSuppr.textContent = "X";
    (function(k) { btnSuppr.onclick = function() { supprimerLigne(k); }; })(cle);
    tete.appendChild(btnSuppr);
    bloc.appendChild(tete);

    // Corps
    var corps = document.createElement("div");
    corps.className = "bloc-desig-corps";

    // -- Prests
    var t1 = document.createElement("div");
    t1.className = "titre-bloc";
    t1.textContent = "Type de prestation";
    corps.appendChild(t1);

    var grillePrest = document.createElement("div");
    grillePrest.className = "grille2";

    var plist = ["haie", "tonte", "elagage", "abattage"];
    var pico = ["&#x2702;", "&#x1F33F;", "&#x1F333;", "&#x1FA93;"];
    var pnom = ["Taille de haie", "Tonte", "Elagage", "Abattage"];
    for (var pi = 0; pi < plist.length; pi++) {
      var btnP = document.createElement("button");
      btnP.className = "btn-prest" + (lg.prests.indexOf(plist[pi]) >= 0 ? " actif" : "");
      btnP.id = "lbp-" + plist[pi] + "-" + cle;
      btnP.innerHTML = pico[pi] + " " + pnom[pi];
      (function(k, p) { btnP.onclick = function() { togglePrestLigne(k, p); }; })(cle, plist[pi]);
      grillePrest.appendChild(btnP);
    }
    var btnAutre = document.createElement("button");
    btnAutre.className = "btn-prest plein" + (lg.autre ? " actif" : "");
    btnAutre.id = "lbp-autre-" + cle;
    btnAutre.innerHTML = "&#x270F; Autre - saisie libre";
    (function(k) { btnAutre.onclick = function() { toggleAutre(k); }; })(cle);
    grillePrest.appendChild(btnAutre);
    corps.appendChild(grillePrest);

    var zoneAutre = document.createElement("div");
    zoneAutre.className = "zone-autre" + (lg.autre ? " visible" : "");
    zoneAutre.id = "lzone-autre-" + cle;
    var inputAutre = document.createElement("input");
    inputAutre.className = "input-texte";
    inputAutre.id = "ltxt-autre-" + cle;
    inputAutre.type = "text";
    inputAutre.placeholder = "Decris la prestation...";
    inputAutre.value = lg.autreTexte || "";
    (function(k) { inputAutre.oninput = function() {
      var lg2 = lignes.find(function(l) { return l.id === k; });
      if (lg2) { lg2.autreTexte = this.value; calculer(); }
    }; })(cle);
    zoneAutre.appendChild(inputAutre);
    corps.appendChild(zoneAutre);

    // -- Intervenants
    var t2 = document.createElement("div");
    t2.className = "titre-bloc";
    t2.textContent = "Intervenants";
    corps.appendChild(t2);

    var grilleInterv = document.createElement("div");
    grilleInterv.className = "grille4";
    for (var ni = 1; ni <= 4; ni++) {
      var btnI = document.createElement("button");
      btnI.className = "btn-interv" + (lg.interv === ni ? " actif" : "");
      btnI.id = "lbi-" + cle + "-" + ni;
      btnI.textContent = ni;
      (function(k, n) { btnI.onclick = function() { setIntervLigne(k, n); }; })(cle, ni);
      grilleInterv.appendChild(btnI);
    }
    corps.appendChild(grilleInterv);

    // -- Heures
    var t3 = document.createElement("div");
    t3.className = "titre-bloc";
    t3.textContent = "Heures de travail";
    corps.appendChild(t3);

    var champH = document.createElement("div");
    champH.className = "champ-tap";
    champH.id = "lct-h-" + cle;
    var hv = valeurs["lh-" + cle] || "";
    var w = lg.interv < 1 ? 1 : lg.interv;
    champH.innerHTML = "<div class=\"champ-lbl\">Nombre d heures</div>" +
      "<div class=\"champ-ligne\">" +
      "<span class=\"champ-val" + (hv ? "" : " vide") + "\" id=\"lcv-h-" + cle + "\">" + (hv || "0") + "</span>" +
      "<span class=\"champ-unite\">h x 72 EUR =</span>" +
      "<span class=\"champ-res\" id=\"lcr-h-" + cle + "\">" + euros((parseFloat(hv) || 0) * 72 * w) + "</span>" +
      "<span class=\"curseur\" id=\"lcur-h-" + cle + "\"></span>" +
      "</div>";
    (function(k) { champH.onclick = function() { ouvrirPave("lh-" + k, "lct-h-" + k, "lcur-h-" + k); }; })(cle);
    corps.appendChild(champH);

    // -- Fournitures
    var t4 = document.createElement("div");
    t4.className = "titre-bloc";
    t4.textContent = "Achats et fournitures";
    corps.appendChild(t4);

    var champS = document.createElement("div");
    champS.className = "champ-tap";
    champS.id = "lct-s-" + cle;
    var sv = valeurs["ls-" + cle] || "";
    champS.innerHTML = "<div class=\"champ-lbl\">Montant</div>" +
      "<div class=\"champ-ligne\">" +
      "<span class=\"champ-val" + (sv ? "" : " vide") + "\" id=\"lcv-s-" + cle + "\">" + (sv || "0") + "</span>" +
      "<span class=\"champ-unite\">EUR</span>" +
      "<span class=\"curseur\" id=\"lcur-s-" + cle + "\"></span>" +
      "</div>";
    (function(k) { champS.onclick = function() { ouvrirPave("ls-" + k, "lct-s-" + k, "lcur-s-" + k); }; })(cle);
    corps.appendChild(champS);

    // -- Designation
    var t5 = document.createElement("div");
    t5.className = "titre-bloc";
    t5.textContent = "Designation libre (optionnel)";
    corps.appendChild(t5);

    var inputDesig = document.createElement("input");
    inputDesig.className = "input-texte";
    inputDesig.id = "ldesig-" + cle;
    inputDesig.type = "text";
    inputDesig.placeholder = "Precision...";
    inputDesig.value = lg.designation || "";
    inputDesig.style.marginBottom = "8px";
    (function(k) { inputDesig.oninput = function() {
      var lg2 = lignes.find(function(l) { return l.id === k; });
      if (lg2) { lg2.designation = this.value; calculer(); }
    }; })(cle);
    corps.appendChild(inputDesig);

    // -- Photos
    var t6 = document.createElement("div");
    t6.className = "titre-bloc";
    t6.textContent = "Photos (optionnel)";
    corps.appendChild(t6);

    var grillePhotos = document.createElement("div");
    grillePhotos.className = "grille-photos";
    grillePhotos.id = "photos-lg-" + cle;
    corps.appendChild(grillePhotos);

    var inputPhoto = document.createElement("input");
    inputPhoto.type = "file";
    inputPhoto.id = "input-photo-lg-" + cle;
    inputPhoto.accept = "image/*";
    inputPhoto.multiple = true;
    inputPhoto.style.display = "none";
    (function(k) { inputPhoto.onchange = function() { ajouterPhotos(k, this); }; })(cle);
    corps.appendChild(inputPhoto);

    // -- Sous-total
    var stot = document.createElement("div");
    stot.className = "sous-total";
    stot.innerHTML = "<span style=\"font-size:12px;color:var(--txt-3)\">Sous-total HT</span><span style=\"font-size:15px;font-weight:700;color:var(--or)\" id=\"lstot-" + cle + "\">" + euros(0) + "</span>";
    corps.appendChild(stot);

    bloc.appendChild(corps);
    liste.appendChild(bloc);
    afficherPhotos(cle);
  }
  calculer();
}

function togglePrestLigne(cle, p) {
  var lg = lignes.find(function(l) { return l.id === cle; });
  if (!lg) return;
  var idx = lg.prests.indexOf(p);
  if (idx >= 0) {
    lg.prests.splice(idx, 1);
  } else {
    lg.prests.push(p);
  }
  var plist = ["haie", "tonte", "elagage", "abattage"];
  for (var i = 0; i < plist.length; i++) {
    var b = trouverEl("lbp-" + plist[i] + "-" + cle);
    if (b) b.classList.toggle("actif", lg.prests.indexOf(plist[i]) >= 0);
  }
  calculer();
}

// === CALCUL ===
function htLigne(h, w, s) {
  return (parseFloat(h) || 0) * 72 * (w < 1 ? 1 : w) + (parseFloat(s) || 0);
}

function calculer() {
  var w = etat.interv < 1 ? 1 : etat.interv;
  var h = parseFloat(etat.heures) || 0;
  var s = parseFloat(etat.fournitures) || 0;
  var htPrincipal = h * 72 * w + s;
  ecrire("cr-h", euros(h * 72 * w));

  var el_h = trouverEl("cv-h");
  if (el_h) { el_h.textContent = etat.heures || "0"; el_h.classList.toggle("vide", !etat.heures); }
  var el_s = trouverEl("cv-s");
  if (el_s) { el_s.textContent = etat.fournitures || "0"; el_s.classList.toggle("vide", !etat.fournitures); }

  var htLignes = 0;
  for (var i = 0; i < lignes.length; i++) {
    var lg = lignes[i];
    var lw = lg.interv < 1 ? 1 : lg.interv;
    var lh = parseFloat(lg.heures) || 0;
    var ls = parseFloat(lg.fournitures) || 0;
    var ht = lh * 72 * lw + ls;
    htLignes += ht;
    ecrire("lstot-" + lg.id, euros(ht));
    ecrire("lcr-h-" + lg.id, euros(lh * 72 * lw));
  }

  var totalHT = htPrincipal + htLignes;
  var tva = totalHT * 0.2;
  var ttc = totalHT + tva;

  ecrire("total-ht", euros(totalHT));
  ecrire("total-tva", euros(tva));
  ecrire("total-ttc", euros(ttc));
  return {ht: totalHT, tva: tva, ttc: ttc};
}

function syncTotaux2() {
  var t = calculer();
  ecrire("total-ht2", euros(t.ht));
  ecrire("total-tva2", euros(t.tva));
  ecrire("total-ttc2", euros(t.ttc));
}

function reinitialiser() {
  etat = {prests: [], interv: 0, heures: "", fournitures: "", autre: false, autreTexte: "", photos: []};
  lignes = [];
  compteurLigne = 0;
  valeurs = {};
  // Recharger le prochain numero depuis Firebase
  var dNum2 = trouverEl("d-num");
  if (dNum2) {
    var n2 = new Date();
    var yyyy3 = String(n2.getFullYear());
    // Numero = annee + (nombre total de devis + 1)
    db.collection("devis").get().then(function(snap2) {
      var total2 = snap2.size || 0;
      var nextStr = String(total2 + 1).padStart(3,"0");
      if (dNum2) dNum2.value = yyyy3 + "-" + nextStr;
      var cptBan = trouverEl("cpt-devis-banniere");
      if (cptBan) cptBan.textContent = total2 + " devis";
    }).catch(function() {
      if (dNum2) dNum2.value = yyyy3 + "-001";
    });
  }
  var plist = ["haie", "tonte", "elagage", "abattage", "evac"];
  for (var i = 0; i < plist.length; i++) {
    var b = trouverEl("bp-" + plist[i]);
    if (b) b.classList.remove("actif");
  }
  var bAutre = trouverEl("bp-autre");
  var zAutre = trouverEl("zone-autre-main");
  var tAutreInp = trouverEl("txt-autre-main");
  var mainDesig = trouverEl("main-designation");
  if (bAutre) bAutre.classList.remove("actif");
  if (zAutre) zAutre.classList.remove("visible");
  if (tAutreInp) tAutreInp.value = "";
  if (mainDesig) mainDesig.value = "";
  for (var i = 1; i <= 4; i++) {
    var b2 = trouverEl("bi-" + i);
    if (b2) b2.classList.remove("actif");
  }
  afficherLignes();
  afficherPhotos("main");
  fermerPave();
  calculer();
}

// === CONSTRUCTION LIGNES DEVIS ===
function construireRangees() {
  var rangees = [];
  var h = parseFloat(etat.heures) || 0;
  var w = etat.interv < 1 ? 1 : etat.interv;
  var s = parseFloat(etat.fournitures) || 0;
  var designation = lireChamp("main-designation");

  // Prestation principale : heures + fournitures = une seule ligne
  var totalPrincipal = h * 72 * w + s;
  if (totalPrincipal > 0) {
    var pn = etat.prests.map(function(p) { return nomPrests[p] || p; });
    if (etat.autre && etat.autreTexte) pn.push(etat.autreTexte);
    var lbl = pn.length > 0 ? pn.join(", ") : "Prestation";
    if (designation) lbl = lbl + " - " + designation;
    rangees.push({label: lbl, total: totalPrincipal});
  }

  // Lignes supplementaires : idem, tout regroupe
  for (var i = 0; i < lignes.length; i++) {
    var lg = lignes[i];
    var lh = parseFloat(lg.heures) || 0;
    var lw = lg.interv < 1 ? 1 : lg.interv;
    var ls = parseFloat(lg.fournitures) || 0;
    var totalLigne = lh * 72 * lw + ls;
    if (totalLigne > 0) {
      var lpn = lg.prests.map(function(p) { return nomPrests[p] || p; });
      if (lg.autre && lg.autreTexte) lpn.push(lg.autreTexte);
      var llbl = lpn.length > 0 ? lpn.join(", ") : ("Prestation " + (i + 2));
      if (lg.designation) llbl = llbl + " - " + lg.designation;
      rangees.push({label: llbl, total: totalLigne});
    }
  }
  return rangees;
}

// === PDF ===
function construireDevis() {
  var t = calculer();
  var rangees = construireRangees();
  var num = lireChamp("d-num") || "001";
  var date = lireChamp("d-date") || "";
  var nom = lireChamp("c-nom");
  var adresse = lireChamp("c-adresse");
  var email = lireChamp("c-email");
  var tel = lireChamp("c-tel");

  var lignesHTML = "";
  for (var i = 0; i < rangees.length; i++) {
    var bg = i % 2 === 0 ? "var(--blanc)" : "#FAF8F5";
    lignesHTML += "<tr style='background:" + bg + "'>";
    lignesHTML += "<td style='padding:8px 12px;font-size:12px'>" + echapper(rangees[i].label) + "</td>";
    lignesHTML += "<td style='padding:8px 12px;text-align:right;font-weight:600;font-size:12px;white-space:nowrap'>" + rangees[i].total.toFixed(2) + " EUR</td>";
    lignesHTML += "</tr>";
  }

  var photosHTML = "";
  var groupesPhotos = [];
  if (etat.photos.length > 0) {
    var _tp=etat.prests.map(function(p){return nomPrests[p]||p;}); if(etat.autre&&etat.autreTexte)_tp.push(etat.autreTexte); groupesPhotos.push({titre:_tp.join(", ")||"Prestation principale",arr:etat.photos});
  }
  for (var i = 0; i < lignes.length; i++) {
    var lg = lignes[i];
    if (lg.photos && lg.photos.length > 0) {
      var lpn2 = lg.prests.map(function(p) { return nomPrests[p] || p; });
      if (lg.autre && lg.autreTexte) lpn2.push(lg.autreTexte);
      groupesPhotos.push({titre: lpn2.join(", ") || ("Prestation " + (i + 2)), arr: lg.photos});
    }
  }
  if (groupesPhotos.length > 0) {
    photosHTML = "<div style='margin-top:20px;border-top:1px solid var(--bord);padding-top:12px'>";
    photosHTML += "<div style='font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#B8860B;margin-bottom:8px'>Photos</div>";
    for (var g = 0; g < groupesPhotos.length; g++) {
      photosHTML += "<div style='margin-bottom:10px'>";
      if (groupesPhotos[g].titre) photosHTML += "<div style='font-size:9px;color:#86868B;margin-bottom:4px'>" + echapper(groupesPhotos[g].titre) + "</div>";
      photosHTML += "<div style='display:flex;flex-wrap:wrap;gap:5px'>";
      for (var p = 0; p < groupesPhotos[g].arr.length; p++) {
        photosHTML += '<img src="' + groupesPhotos[g].arr[p] + '" style="width:150px;height:120px;object-fit:cover;border-radius:5px;border:1px solid rgba(0,0,0,.08)"/>';
      }
      photosHTML += "</div></div>";
    }
    photosHTML += "</div>";
  }

  var logoSVG = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALgAAAA8CAIAAABacOdeAAAlBUlEQVR42u19d3yURf7/Z+YpW9M22WxCQiqhBQkSlCr1QEUsKIhn59CvqKfYUM/ze3qKnGD/CgdS5OQQIRZAbFQ5upSQkMQQU0mvm93NbrY8z8z8/piwbHr07o/facbXyxc8OzPPPDPveX/qDIgxBv2lv/RWxH+vOYcZAwaA2h4hQIDg8t/7y6+ioF/AKIwxYBQAIYx7rgQACOH+Wf7NAYVRCggh1MYWlKhel93dYvV5nAgYxljSGLRBJlGjF2VdAGYoQqifY34TQGGcQhACAEdDVU1xZn1ptq22qKWhgvg8WBA0Gi0QjyDJWkNQkMkcakkKjR4cGjvCaElpgwij0M8uv26gMEoQFgCg4sIPOYe2V/54UvG0aHU6WaMJiogJDh/gc1rd9hpz/AhBlFWPg3qbmc8hiaKsMwZHJpiHTguJHy/Ieo44QP3U8isECmOMIYSbqopPfLmm+My3wMjAoWO1emNt0ekpd/4lftQMUdY1VeT9a91D6bc8E59+i6q4ic/taa6qOrvN3VwpSRL12gzmJHPqnNDEawChfmr5byy4N5MGIYSzDmzLWPGHCyd2J4yYOPepDXOX/sMYZpF1xvi06aKsY5SGx6aak9IvntlJiSpKOo3BFBJ7RXjKZES9SdOfjBl7H1XcVcf+XnXsfcXVAAgDo/1T/ysxjxljCCGiKvs/eiX7wDZJq52y4JkxsxchhFWfu/zHY5akUaJGzxgFYIAgfvSc7J1/tZVnmxJGM6oCFozmQQghRnzm1BvDEic2XfjWVnRAcVREXbVIax7azyu/Bkbh8ogovq8/eP70dx9Fp6TJWp29vhwhzChpsda4HQ3muOG8KjeSo4eM14cOqMjaDQgBFhDCmiCLqAlyW0sZo6LeZBl9V8ykxxCw2hOrXJWn+nnl1yF6GAD7duOL2d9vG3LV7+Y9sy510tzsg1sv5hxGWGhpqkGUBofHXFZ0KJW0xgGpUxtLzribqxDCwJioNYpao7elASEMlACjxgFXRk9cgmVd47l/umuzfxZW6KXSTnu6VDpqVT3+1L/q/xmgUEoQwkc+fz9z39aEERNvWPymLsh01Q0PhFrij366kqoKAFBGdEGmAJ0YACBqyGSi+hoKj14yp0HQhRGvAwAAYQDEGBG1wYIoE0oas7Yojsq+YIVSyhjDl4qf8FBAAQBCSNtY2pd2qjtCCKF+rPwHgMIoxVgoyjx4fMdqc2zynIdW6INNRFUMIeYJtz5eX5ab969tss4AjGFB9GOEu19DogcbzYmNxT8wRvgTQdYTxX2pFkVIcJR+r7Y2hw2eRYnSlPUxIz4ABMB6QAnGGCFUVFR09OiRvNxcvt4A4Ha77XZ7dXV1dXU1AAiCwDHkcrlsNnt9fX1DQ4PVavX5fH4uUVXVbrejfvv831RmGWOAUKvDuv/jlYixKQueDotOpEQVRIkxOnTcjT+d3J25Z0P69Q9qjcFE9V4SUm0eOSzKEYnptbnfuK0V+vAEAEDAOLUwShEWvLaLzQV7ggaODRt2i9ra5Lx4vKX4QPDg64HRLp0rHCVnzpx+7rnnPB7v4CGDqyor3W7P2rVrU1NTX331lW3btk2bNs3haCktLV2yZMk999wDAPfec89PhYUjRoxgjBUWFj777LMLFixQFEWW5RdffPGTTz7Jzc0NCgri2no/An4ZozCE0PEv1zVVFWFBUBUv8/vHGCAsjJu7RPG48498igXsbmnozASm+FFM9Tqqc9tWWvUiLAFjCAvEY6s/s0HUBIcOvwWAMaqAILeUHlSdtYAwdBIHlFKE0IULF6ZMnjIwduD333+/6cNNe/fumzplyrFjxwDA4WixWpvXrFm7ZcuWCRPG33vvvQUFBQih6poaszli48aNGzZs2LVr15TJkxljkiQ1Nzd/9823lZWVGRnbA0VVf/l5QGGMIoRtDVVn9m6NHzrGkjgi51+fIgTcqEEYM0otiSOHjp/jaq4WABpKzgFcjuDwkHGQOUnUhzlq8vlD1dsiyHpASG1trD76juJsMKffJ2pDicfubirSW4YzpjpKDvRgn//tb3/zKcqq1atlWVYUBQBeXbZs/vz5AKDRaDQajSzLGo1m/PgJAOBwOABAFMXg4BC9Xm80GmNjY6OiowkhCKEPP/xw7LixDy9evHLlSsYYF1X95RcAhQFA5oEMe0Pl6Fl3X33DA1UFZxrKLyBAjNsaCABY2qw/6INMoqypuXC8qTwHYcwo4YoiAMhGkz40prWhhFFCVR/x2EVDuLe5pOLgaz5XU9S4R7Tm4QDMXZ9LPI6w1Ft15uGuqtPEYwOEAkmFLySl9NixY6mpqUajkbMC/yk0NBQAMMatrtbDhw/v2bPn1VdfvWH27CuvvBIA9Dr92bNnly5d+uCDDy5btox3RQjZuWPH8396/s8vvlhYWHT06NF+UvlFQGEMY8HnceUd+zIyfnBS2qTEERO0+pD8E7v9ighCmDEWFB47YOg41eclijfrq3dUrwthoc2OYAwhrAuL8bZaVbdNcTcTxeduLKr4foWojxg4/UV91EhgBABayk/KxgFyUIxuwBjV42itzQ5UdwKlj9fr0Wg0rD2GOLUwxgRRyNiecd11140bN+6rr79uM38oCTOFTZkyZerUqcOGDSOEAsDx48dz8/L27dv/5a4vGWNr/v73fgXllwCFr0R1cW5jZUl0/HCtIVRjCE5Mu6bk3AGi+hAW2laRMWAs7oqpGKglKa2lsfzsF69RogIwfwKKPjRa9ThVn9PnqAVKFHulITotdupzclAUoyogwWcr9zQWhiRNAQBNeIqoj/DU5fg5yW/HEkJEUUxNHVFQUMCHpygKIQRjLMsyV5BlWV61etWiRX/YuXNnWVkZlyaEkNjY2Dlz5tx111233XabKAoIofXr10+fPr2srOxi+cWbb775y927q6trOGn1g+DnAAUYAJTmnWSA6i7+2FRVyBhNGTOruba0tuQ8ADDK2twhCEUmpkkaXXhcavpNSy+e+zZ//1qEMGOUyw5tUARCTHE2ueouUKU1KGZk9LiHEBaBUYQEAHAU75f0YYaBY4FRQdJrwgd5mi9SpbVLO/mFF16w2+1/ffllhJAkSYIgHD9+Yu+ePQBAGfN4PISQt956G2O8YMECLkoYY6qi8uYul8vlctXW1GSePbt58+bly5cvX7589erVLpdr48YN/h3SX/oKFM7DVYU5stbQ2mI7s2czQnjg8PH6IFPpuf2BG50xpjWawmKGNJScGzjq2qHX3PXT0S1V579FWOBAkfQhkmxwNRTYK85qgyMso+8GJLR51RDyNpc4y48HD5qFJT0gDAjrI0cQr0N11ncQPny7T548OSMj4+OtW2fNnPnUU08uXLjw4YcfkmQZAGw2m6oqrS5XSEjIpk2bTp069eyzz1JKGaU//PDDrXPn3jB7dmpq6jfffL15y5bhqakGg8Hr9SqKMmDAgAkTJrz77rtWq1UQhH6s9KUgxhjPEVFV3+onrzcEmSwDE3IPf77wtR1RSWm7/+/RloayO17aiUXJ75FDGGd//X8V2XuufXIbFqUTHz3htlVOuP99Q0QiANircgr3rNCHmNXWxtix95oGz+T2FMdKzdE3gbGoSU8Tj0111gFxu5tKm3/aaxn7P4aYqzpHCrkrxePxHDl8uKKyMiIifOrUacHBwQBQVVXlcrmSEhMFUUQIlZSUeNzuYcOHl5eXO51Oj8eDEcKCkJiYaLPZjEZjWFiYH+4NDQ319fUJCQkGg6HfodJXhxvPjPa5nfbGuqj4oVPmP3Hh5LffrvvT3a98nnrNrV+veqShPM+SNIpDhO/6kOjk4pP2lvoSU3xa6rWP/rDl6cJ/bUyb+1eEBe4m97mshtDo0MRJ3DcDjAASbAVfepqKjbFjak++72sqBgZIlBjDSJCUVlvXjIcxIUSr1c6cNauD5RwTExP4JCkpif85Pj6+QyccWIHFbDabzeZANu0vfRE9DABcdquqeBhjwRExUxY8VVFw9rsPnjVFJxrDLKVZB4C1+Vi5yhlsTgAEzqZyABY28IrYtFn1hcetF88AAFG8DIBRNTRhHJZ0lxhLcFX+0PzTPhC0rqpMUL2hQ2+MHP9Y9JQXIkbfC4y22dhdeVMwxpRSVVW5MusnAMaYXxVFCPGQIWOMEEII8QcRu4sO+tsyxhivRXuRQbxV30tnoebvoVd5x2t2F8XsYSSEEFVV+UT9Ox/SobkIlyiltcWuKgrCmDF29fULPU7rsc/ecTbXaPWhlfkn4FaEBZFRwhfJGBEn60Kbq3+KG40AIG70zXX5B2vOfxueOJYobqqqssEYHHcVl1WARVd1Zu2ZzQCqwTw4JOU6XWTq5UETnz9XoQvRiHgsCfFwIHfX+n8KJAN8qYe+eNIC2yKE2ryG6Ge0+oWSvs899Fyzj/0QQjrPBt9pP/dDxID2hDLGZQcl6uTbnwmLHHhk+0qMQNZqT36+ctR1D2oNYQDAKJF1xiBzXEt9EWej4KgUc/LVTaVnVLed+Nyq16mPG6EJiWWMIiy21ubUntoAgCJG3BaSPAOQAACMqghhQNhR/D0lKhakLgM9L/zpTz+cOqXVar1e7+LFi+fNm6eqqiiKXX682+1+4IEHGhsbCSErVqxIT0/nnXT38Rx2hYWFjz/+uKqqMTExGzdu7Ny5v/8XX3zx7NmzkiR1YDX/pAuCwLnNP54lS5bMmTPH5/PJsrxx48bt27dzt5DP57vuuuueeuqpDiPkfz12/PjLL72k0+m8Xu/YsWNfeeUV/pwv/JYtWz766CONRsOdBYQQnvouCIIoiqGhoXFxcddcc820adNkWQ7sn49KVdXFixdXV1eLosh/5cPuwLIej+f1v72ePqZtDsV2swbMv8sYY1dMXWBJSD366crmqsK8wxkVOYdSp9yRfPVNGkMoAIRYkmvzDyluh6QLAYDIIVPq8w9Zy856XVZgJGjAFXyruhuLqk+sxRhFjf0ffVRaG8cAQ1hkRLH9uK2l/BgSNQh3sfYAUFFZcfDgQf7k6NGjXJntDitarTY/P//cuXPcwd/rLuFy7b333tuzZw9/ct99902bNo1S2mEj8ik+ffr03r17f9ZGvOWWW/jcAkBLS8u+ffv8P40bN86PjA5frdVo9u9vMzaTk5M7VFMUxf9rIO92EBajRo1auXLlzJkz/W05iCVJys/PP3HiRK+Dr368Oh3Sebdi4GQE8hHnlciEEdc+sPKz124PDh+oNQaf/Oz14lM7hl3z++Rxt0UNHnfxzI6WxoumgSMBwBR/pTYk0nrxLMZIlHXGyBQAprisVSfXM+KNHv+YLioNKAGEuF3js5c3ZX+i2IqDE6c5K06xTlkpfHyDU4bwjcJ34bx58w8cOJCWltaBVPlGEUVx0KBB58+ft0RaIiIi+oKS6urqLVu2iKIoSZLX612zZs306dO7a8IzFqKjo8PCwiwWi16vLy4uLioqavMaaLVjx44VBKGpsam+ob6lpcVms3k8Hv9CJiUlCYLAt6+qqomJid2J2qioqPDwcLvdzhgbMmRIhzr+fjh1bd++fdy4cYQQh8NRUlKyatX7+/btlyQpKyvrhhtuOHTo0IQJE/xYaZvVwYNPnTolSZKqqklJSdfPnk1UVVGUuro6j8fT3NxcU1NTXl5utVr9TdrvS9bOk4EFkVJiCIuKTklvLM+9/rG1tT/9kLP3g1OfLau+cCQ2dYogaR21RaaBIxlVZX1oSEyq9WKWrNVrQ6I0obEAqDYrw2Mtix2/SBeV5pc1wGhLyQFr/i6EJfPYP2rCkp0Xj0E3mldkpJkQgrFAiCoIQlNT09y5cw8dOhQXF9elWNHpdIQQURI5o/QgiTltrF+/3uFwYIy9Xi9jbPfu3QUFBYMHD+7QOVeon3766eXLlw8ZMiQkJITDdMWKFc8//zwPWAYHB+/cuZOHpdxud01NzdmzmXFxA/36k9Fo9EeXCCHcXO+cWsXpUBRFVVUBwG/VX1YXRJH3w4ESFWXxG4AjRoyYPXv2hAkTTp8+rdPp3G73c889d+jQoc5v4Y5vVVVHjRr17jvvdHiF0+k8f/48Nwz54AMnGgH4ZU/AI2DJY653NFbV/HQqYfT1v3tkXeqMhQ2l53P3rkGCaC3P5Z59AAgyD1LcLsXdoguNFTVBLVVZzUVHQuKvDh30O0ZVhEVA2GstrjvxbkPWJ9qIoQMmP6+zjKSKm3WfuYQu6bDcMBFFsbS09MYbb7RarXzxOtQPCgoCAEmSulQ1OtBJS0vLhg0bEEJcbxBF0ev1rl27tsssOIzxnDlzxo8fbzKZBEFQFIWTXCDy3G43b6jX65OTk2+/fT6XL3yuJUkMFBA9KE8ajYZHQPm39KDSAoDX66OUKopCKfV6vaIo3nXXXRyLCKFz587V1NR0OVd+mlRVlf/fb+wYjcYJEyakpKR0CRRgl3yvlBJKCaMUADEGscPGhVriCo59zijRBUem3fDklEXvhg0YShWluTLP29KIBQEA9OGxgAVGKc9aqs36HGEckXoTIIywqLqtTTkZ1UffUuwV5tH3Wsb9UTRauktZ6uwIkTUaSigXsefPn7/jjjs8Hg8XuoE1eRhIFISegcInMSMjo7KyMj4+/p233+Z2NULo448/bmpq6nJmueHNTdb2WZUo0JrgFbil2j7Jt4tl7pNR1pt95M8T5TJ6wIABfr5pbW11Op1divVAiuKFJxPy8XcwsLHfb86Auz8UhJAoyhgLCGOEMUJIow8eOuG2yvzj5TkHAYCqSkTClRPufSv2imkua2VF9jd8pjRBZkCIAdVHpjhr8hxVOaGJE3QRKcTrbC74pvpfK+3F3xsGXBk1+YWgxKnAaJsfFmEA1B2l8GmKiRmwZs3fBUngnClJ8r59++644/edfSSCIEIPmZUB8QFFUdasWYMQmjFjxkOLFw8aNIijsKGhYevWrV2Sil/D6LR4LHABeAVuTXRWVP3Ne/Bz9NF87dwDx3pVVRUAYCwghEwmE1fXAjtk7TtR2xeOb/6lXTjcKFFljb70x1Nb//aHAx8vP//99qqC0632RqL6ACDt2kWRSaN++HxFRc4B7s4XJO3IG54OjxtZcvIzt60WgAmyXhC1AFjShdTlfiVqgsIHz7CXHik/uLwx70uf22GMHmkadotoMLfFFwEAGEIBnoxuSmNT48KFC9euWcN1WEJUSZJ27dr58MMP81yTy1OGWK8TzWdzz549Z8+eRQjdfffdAMDTKHmrDz74wOfz9SAa+rhsPdfssycD9dobX1rGmCzLjLFPPvkEAERRYIxNmTIlIiIi0IbvABVZlkVR5P/3l87eF7H9cBAwKDx7sK7kvCyLxNcqy3KwyRIcHhUSOVDW6Jxe98mMZTX5RweNu9UUd4Ug60Zc/8Th9f9TdOSjK258DgsSZVRnNHmsZfbKPI0hrOrMPz2NxaIkSdoghHBLbW5rXa5sjNBZrjDGT5KMUTx41FGL7ry0Kqmurl606IGysovLli2TJImoRJKkdevWDRgw4KWXXuJ63+Uod29cDQCrV69GCE2cOHHy5MncMH7jjTdcLpcoinl5eXv37p0zZ06XDqv2a/jz/W/+u2T6hqte4cQ1az7O0tLSF154gVs0ra2tkZGRy5cv74xgPmwuFouLizMyMlRVBUCUUre7tbm5uaysbNmyZSaTye8xEv3NsCB5Pa5r5j5QX5bnqC///Z//wShtrCywVv5kqy201xSpikejD2JEKc38rubCEUvy6ITRN0QNmzJk6v0Fhz6MG3OzLiSKUsIYq8v/njDmdduozxaWNClowBWSIRwJMvU5lZYab9MFR9F+R+mh0JSZwUkzkagFRrubNf6NfiX/1VdfraurW79+vSRJhBBJkl5++WWLxbJ48WKPx8OlbM+blTupMjMzDxw4wBhbtGgRQsjr9cbHx8+aNeuLL77gtsDq1avnzJnT66YPXINer/Zoq4wgMLXjFxBVO9UB42eeeSYqKsrn89XV1WVnZ3ONRFGUCRMmrF+/fsiQIVxz79wDp5nMzMwFCxZ01txfe+21bhgFY0qIRh984+LX1z87e+srd864+0+Dx86G9MvROI+zubEsqzr/aE3BieqfTtUVno5MHhN7xXRJF/bT9x+mzn4SY8nrshGfS8BMa7QkTHpQbxnWfgxXAsxWHJW2ov3NF75qrc4KGXIDQ1L3vM0AQFVV/rWEkHXr1tnt9oyMDI4VQRAeeeSRyMjIW2+9tbOjrDtGWb16taIogwYNuvPOO7nVAwBLlizZtWuXoigY4wMHDpw/f37kyJG9kEqA75+xXnjR78nwxyV6AId/QjpX6/DkxIkTXq/X/5MgCCkpKevWrRs/frzf99ol1Ph8JiQkTJs2TVEURVHsDnuLo8VqtXbWf8V2mpoo2eorgkyWu/+ydc/G//387cUmS2xUwrCQyIGyrEUIPM4mt7XS52oiqqoLCkfAagqONZSd0xnDrBV5dRcOC5JW9XiZCKKkTZz+hC4sjnvS2lvxWAqONY++3xCT3pT1z/qzH1HaQ6ynzfLkPMlncNOmTTU1NUeOHJEkiW+Lu+++e8eOHddee23bXWHdwI7nz5aVlWVkfCoIgsfjmTt3LiEqY23mniRJHo9HkiRFUdatW7dq1aq+SpO+mSd91GkCgdKz6kMp3blzZ0pKyrvvvrtq1SruYqmoqOB2sqIoXVrXl5CKAWDMmDEffvhh4K+KolRUVBiNxsAxi5cDwiaLIMouu5UxFhk35J6/ZhSd+74s+5Ctpqgi9xgA0egMIeFR5sS08NhhIdHJuqBwSomjtqj4xKe26p8krf7imV3AKMKi6nVZrr5NFxbnv1ilK4nC9JYrpElL68986Gko7BzrCRQ9/onDGDPG9Hr9jh07pk2blpOTw81gt9t9++23Z2VlhYeH9zyt3MnmdLYAQGVlZWVlZXfa7pYtW/785z9HR0f3EDD6WUlPPXhEOhSPx+PzeXt1t/h1lOTk5Pfee+/kyZNnzpyRJcnlcs2fPz87O7s7t2QgwH0+n9/M4ciQJMmfs9EFo2iNIcaQcKetAYAxyhDGg66cNujKaQBAicIYw1jovOpGU2zkoKtPbf+LtTzHCyCIoihgQ1h01PBre4gJAxfnVJUM5rCUmVV1eVjU9BpzD8xQCQ8P51ipqKjgWrrD4bjpppvGjx/f3fpxOrHZbJs3b+ZW8QMPPOD1ev3OA1mWKyoqnnvuOUqpKIp2u33z5s38r7jH4HavoOHVDAaDfxiEkKamps6tuGByuVytrW4/DnqmK+5qwxi///77kyZNIpSKomiz2RYtWrR3797upiJwbNwSDowddlZrRD+9a3SG0MjYhsoSj8uhM4ZeutEPEBYCt3vA4QwuFYgo66+8aemRjY9S1YuwQFS3KXGMIOsZpb3c9IcwMEY8zVjUCJqQvit0giCoqpqcnPzFF19Mnz7d6XTyxc7Nzc3Pzw/UAzrwhCiK27Ztq6ysRAg9//zzM2bM6PyuL7/88siRI7z5pk2blixZwv22XS5VHxmFt7VYLBEREY2NjfyveXl5XcojSmlxcbHT6UQIGQyG1NTUXuUaxtjn840bN+6JJ5546623eOhq//79b7755tKlSzvHUHtWkrp0LvCFRPxgeuTAFHtDTWNVSVuM8DKFML8Fyx8ihNvOgAsio0QXYolJnap6WwEQIBwSM4JfmtKXKXQ3XxQkvWSI6NIW7G4luG0yZsyYjIwMPgt8Z/SsnaiqumH9eoTQ0KFDJ02a1MHR5PV6CSH3338/Xy1BEAoKCr7++mvu5eu78tFlBUqp2WxOTU31V/7mm284Tfq9vTw/C2P8xRdf8DpjxoyJjY3tjtJ4V7wT7kp+5ZVXhg8fznV/QRD+8pe/ZGdnc5W2Z20psPiznwJbtXt94oirFZ/74o8/dFohFHgosMt1iBw0FgkipUSU9frQ6D7dAYkwo6rPVi7qI7A2pEvnUpshR4hfse+Aleuuu+6DDz7ggcNABbADYrja8e13357NzGSMzZs3j1s6gV4mWZYFQbhl7i1RUVF8wRBCa9eu7UFRCNSdO9zK0WVGyx//+Me2YKwo5ufnv/POO4HeXoyxRqM5fPjwRx99xLNeHnnkUT8Uen47l556vX7dunV8w2CEPB7PfffdxyNQ3W2htv1+aQx+n7Lf19AOKBxiCcPGhEZEXTi9nxKChb76JRHCgFCQOVFjCKHEJ8l6fq9fL84oRgGY4qj2Oap1kUNRN/df1NXVA4Ciqtampu54ZeHCha+//rqqKn6vs/+CjA6m6Xvvvsd9kfPn3955+TlzhIWG3XrrrXz8CKFDhw5lZmZ2F1QLfNja2uq/OaHLoAGldN68eXfccYfP5xMEQZKkZ5555rHHHjtz5ozdbnc6nUVFRW+++eaNN97ITwvcdttt8+fP4wpTl3zQIRTAVZ+JEyc+/PDDhBBASJTE7OzspUuX8p+6Q5vH4+HnWux2e3Nzc35+/pEjR1atev+zzz673H8g4TDGtr6++MWbB5bnn+IExPpUKGNM8bj2v3/ndyvmHF33B6+ziffYYyPCGGvK/az4s4XuhgL/E3/h/PnII49wmH/99df+hx14kgdyn3jiCW5ZcMni8/n8H8VbnTp1iiNp4sSJHdJpA19KKT158iTf6DzE+PDDizu/uu2lTz7B3TAcmrm5uf5wWhdfTCkhpLW19c477wyEryxLcXFxiUlJ3CK9lPF0s9Pp7DBOPoavdu9GCHEWRAjt2rXL/xN/RXNzc0JCAt9I3NTy1+HVFixYwHvAGBuNQcnJyYmJiXFxcWaz2WQyabVaPrClS5f6v7TdIXUASJ+5QPV5zx349Gdc8tkGOMoYAEaUEUrVXt2NgBDxtrRWnNCYkjWm5IDoT7t9c+FCPp+joqKiLjcrp01CyDvvvDNv3jz+VfzMaYd988YbK/kSzpw5szu1g4ub9PT0QYMGEUI4Q2zevKW8vLzDsUI+lXm5eYwxr9fLV/TChQs96FUc8Tqd7uOPP968eXN6ejq3/n0+pby8vLSkxOl0iqKYlpa2YcOGHTt2ciups2GVm5cXuOrFxcUdBFBoaCiPd/KMdAC4//77CwsL+dcRQvjhS74rnM6W4uLi0tLS8vJyfqOMx+OhjAGA/6ACtL8+lAEDSsmm/72jriRn0es7LAnDLx3R6MXHjBByWauObnoMAZNk6erfrzBEJLYd5+lO7iDcnL+zOe8Ly9hH+anBLu/+y8vLdblcABATExMTE9uD9cE98efOnePJZqNGjeowxVlZWZxmkpKSIiMjez7OU1BQ0NzczN02iqqmDh8eFhbWuUlOTk6L08kVe0JIYmJidHR0zz0HrmhOTk5eXl5VVZXX6xUEIS4uLjU1NTV1BI/ndal1IoQuXrxYXV3tv2cqJiYmISEh8KX8z9nZ2S6XCyGEMPJ5fUlJSbGxsbzJuaxzik8JtH2435I35K9WVTUhIWHgwIFt6RPtzn9TgrBQnHVk81/vHD525u3PbWCMYYR7ZhcOCGtF3oktS2WtXkBkzO2vBQ8Y3i1QGAWEvbay6sMrtWEJUROfQlj4rV2A3nNkoNdgZF8iRP/Z80rt2R4LjNLkUdekz7wr5+hX5/Z9jLFAKeldjgC4nVbF5+HH2T3Oph6FDqaKqyFzMzBmGjEfYRFYT1dz9fEgjD/g3iFdqENXPR94CazsPxzUQ5M+VutStw00RAMTQXq9u8WfV9DDS7lBTtqmg3SodvknQgL/3KEENhE7v4ExNuPupVWF5/b+49VQy8CktKmUqJdubOu2uB0NwBggoIQoblu7eHp71YQx0nRus7epJOLKuzRhiT1fOPuzkkK4vvIf6aqPlX9uzsovyE76uZ/Zl7H9gmHjrnw4zBAcPvfxtwVJt+v9pysvnMaCSIkKPW4Xl7WG30bAGPW1MQrrJHEQo2rj2X/YS4+HDJoVMmhm/7XE/y2lS38fppREJabe9tQqn0/59I2HijIPYkEEhLo++IkwALisVZxAMBJ8bns7K4bfiIEw8dhrT/7dXnwwOHlGeNrt/f+Awn83UAAAY4FRkpR2zZ0vfChqDJ+tfPDEzlWq4uUefe7w8BMFQoiqSqujAQsiJYQB9jqt3B3PLkEEEHLVnK84tMJZmWkacVtk+n0Ii/3/UNh/URFefvnl7vytlJJQc2xK+oy6i/mZ+7bWFGYagk1hUQk847otQEgpIPC5HQVHtyOggiBijGSNFD18Jj+dCgh5mkrqsj6py8rACEddtTAkZSYg1JUK01/+/y2ot7wYgrGgKt6Tu9ef/maj4nYkp10zfOLNA4eNN5qi/NVstUUH1z0qS7IkSYKIjcEhY37/NhIER3WurewHZ8VZYGpo4njLqPlyUFS/xPkVAsXvJgGAxqqirP1bC09947bXh5qjzQmp0clpIZHxoZaEpoq8nL0f6A3BoigIoijJYpglQXXVe1vqZI3elJBuHnatccBIvxOlf95/hUC5hJa2LKQWa83FnCPlOUcaqwrcthqMAYuSIAgaWZZlUZY1kkaWJEmr1QVHxofFjzbFj9ZHJPs9v/1c8usGShtYgIHfo+9x2R0N5Y7GylZ7g+ppERAIItYYw3RBJkOoRRcSpQ22tLeN+4nktwGUS3BhXBj17SgbRQD9EPktAiUQMdD1AQV06b9+KdMPlP7yGyv/D94NI/kBavqoAAAAAElFTkSuQmCC" alt="Crea Nature" style="height:55px;object-fit:contain"/>';

  var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<title>Devis " + echapper(num) + "<\/title>";
  html += "<style>*{box-sizing:border-box;margin:0;padding:0}";
  html += "body{font-family:Arial,Helvetica,sans-serif;color:#1C1C1E;font-size:13px;padding:28px 30px}";
  html += "@page{size:A4;margin:10mm 10mm 0 10mm}@media print{body{padding:0}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
  html += "<\/style><\/head><body>";



  html += "<div style='display:flex;justify-content:space-between;align-items:flex-start'>" + logoSVG;
  html += "<div style='text-align:right'><div style='font-size:24px;font-weight:700;color:#B8860B'>DEVIS</div>";
  html += "<div style='font-size:11px;color:#86868B;margin-top:2px'>N&deg; " + echapper(num) + "</div>";
  html += "<div style='font-size:11px;color:#86868B'>Date : " + echapper(date) + "</div></div></div>";
  html += "<div style='height:2px;background:linear-gradient(90deg,#D4AF37,#B8860B);margin:12px 0'></div>";

  html += "<div style='display:flex;justify-content:space-between;gap:16px;margin-bottom:16px'>";
  html += "<div><div style='font-size:13px;font-weight:700;margin-bottom:3px'>CREA NATURE</div>";
  html += "<div style='font-size:10px;color:#6E6E73;line-height:1.8'>48, Rue Alfred et Edme Sommier<br/>77950 MAINCY FRANCE<br/>creanature@ymail.com</div></div>";
  html += "<div style='background:#FAF8F5;border-radius:8px;padding:12px 14px;min-width:185px'>";
  html += "<div style='font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#86868B;margin-bottom:5px'>Client</div>";
  if (nom) html += "<div style='font-size:13px;font-weight:700;margin-bottom:2px'>" + echapper(nom) + "</div>";
  if (adresse) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(adresse) + "</div>";
  if (email) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(email) + "</div>";
  if (tel) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(tel) + "</div>";
  html += "</div></div>";



  html += "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>";
  html += "<thead><tr style='background:#D4AF37'><th style='padding:8px 12px;text-align:left;color:#FFFFFF;font-size:11px;font-weight:600'>Designation</th><th style='padding:8px 12px;text-align:right;color:#FFFFFF;font-size:11px;font-weight:600'>Montant HT</th></tr></thead>";
  html += "<tbody>" + lignesHTML + "</tbody></table>";

  html += "<div style='display:flex;justify-content:flex-end;margin-bottom:18px'>";
  html += "<div style='width:220px;border:1px solid rgba(0,0,0,.08);border-radius:8px;overflow:hidden'>";
  html += "<div style='display:flex;justify-content:space-between;padding:8px 14px;border-bottom:.5px solid rgba(0,0,0,.08);font-size:13px'><span style='color:#6E6E73'>Total HT</span><span style='font-weight:600'>" + t.ht.toFixed(2) + " EUR</span></div>";
  html += "<div style='display:flex;justify-content:space-between;padding:8px 14px;border-bottom:.5px solid rgba(0,0,0,.08);font-size:13px'><span style='color:#6E6E73'>TVA (20%)</span><span style='font-weight:600'>" + t.tva.toFixed(2) + " EUR</span></div>";
  html += "<div style='display:flex;justify-content:space-between;padding:10px 14px;background:#D4AF37'><span style='color:#FFFFFF;font-weight:700;font-size:14px'>Total TTC</span><span style='color:#FFFFFF;font-weight:700;font-size:14px'>" + t.ttc.toFixed(2) + " EUR</span></div>";
  html += "</div></div>";

  html += photosHTML;

  html += "<div style='border-top:1px solid #ddd;padding-top:10px;margin-top:16px;text-align:center;font-size:8.5px;color:#86868B;line-height:1.8'>";
  html += "CREA NATURE &bull; 48, Rue Alfred et Edme Sommier, 77950 MAINCY FRANCE<br/>";
  html += "IBAN : FR7630087338610002058080347 &bull; Code NAF (APE) : 8810A<br/>";
  html += "SAS au capital social de 500 EUR &bull; Siret : 98194358200016 &bull; N&deg; TVA : FR25981943582";
  html += "</div>";

  html += "<div style='border-top:1px solid rgba(0,0,0,.08);padding-top:8px;margin-top:8px'>";
  html += "<div style='font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#aaa;margin-bottom:4px'>Conditions Generales</div>";
  html += "<div style='font-size:7.5px;color:#bbb;line-height:1.7;text-align:justify'>";
  html += "Le present devis est valable 30 jours. ";
  html += "Les travaux debuteront apres acceptation du devis. ";
  html += "Le reglement est exigible a reception de facture. ";
  html += "Toute prestation supplementaire fera l'objet d'une facturation complementaire. ";
  html += "Le client garantit lacces au chantier. ";
  html += "En cas dannulation, les fournitures commandees restent dues.";
  html += "</div></div>";
  html += "<\/body><\/html>";
  return html;
}

function envoyerDevisParMail() {
  var nom     = lireChamp("c-nom") || "";
  var email   = lireChamp("c-email") || "";
  var num     = lireChamp("d-num") || "001";
  var date    = lireChamp("d-date") || "";
  var t       = calculer();
  var ht      = t.ht.toFixed(2).replace(".", ",");
  var tva     = (t.ttc - t.ht).toFixed(2).replace(".", ",");
  var ttc     = t.ttc.toFixed(2).replace(".", ",");
  var auteur  = utilisateurActuel ? utilisateurActuel.nom : "Crea Nature";
  var prenom  = nom ? nom.split(" ")[0] : "Madame, Monsieur";

  // Detail des prestations
  var lignes2 = [];
  var rangees = construireRangees();
  for (var i = 0; i < rangees.length; i++) {
    var rg = rangees[i];
    if (rg.label) lignes2.push("  * " + rg.label + " : " + rg.total.toFixed(2).replace(".", ",") + " EUR HT");
  }

  var nl = "%0D%0A";
  var sujet = encodeURIComponent("Devis N" + num + " - Crea Nature - " + nom);

  // Corps construit ligne par ligne et encod\u00E9 manuellement
  var corps = encodeURIComponent("Bonjour " + prenom + ",") + nl + nl
    + encodeURIComponent("Veuillez trouver en piece jointe votre devis N" + num + " du " + date + ".") + nl + nl
    + encodeURIComponent("__________ RECAPITULATIF __________") + nl;

  for (var j = 0; j < lignes2.length; j++) {
    corps += nl + encodeURIComponent(lignes2[j]);
  }

  corps += nl + nl
    + encodeURIComponent("Total HT  : " + ht + " EUR") + nl
    + encodeURIComponent("TVA 20 %  : " + tva + " EUR") + nl
    + encodeURIComponent("Total TTC : " + ttc + " EUR") + nl + nl
    + encodeURIComponent("____________________________________") + nl + nl
    + encodeURIComponent("Pour valider ce devis, merci de nous retourner ce mail avec votre accord ecrit.") + nl + nl
    + encodeURIComponent("Nous restons disponibles pour toute question ou modification.") + nl + nl
    + encodeURIComponent("Cordialement,") + nl
    + encodeURIComponent(auteur) + nl
    + encodeURIComponent("Crea Nature") + nl
    + encodeURIComponent("Tel : 06 19 30 40 93") + nl
    + encodeURIComponent("creanature@ymail.com");

  // 1. Generer et telecharger le PDF
  var nomFichier = "Devis-" + num + "-" + nom.replace(/\\s+/g,"-") + ".pdf";
  var iframe = document.getElementById("iframe-devis");
  if (iframe && iframe.contentWindow) {
    try { iframe.contentWindow.document.title = nomFichier.replace(".pdf",""); } catch(e){}
    iframe.contentWindow.print();
  }
  // 2. Popup d'instruction claire avec bouton pour ouvrir le mail quand pret
  var lienMail = "mailto:" + encodeURIComponent(email) +
      "?cc=" + encodeURIComponent("creanature@ymail.com") +
      "&subject=" + sujet +
      "&body=" + corps;
  afficherPopupEnvoiMail(lienMail, nomFichier);
}

// Popup claire pour guider l'envoi du devis par mail
function afficherPopupEnvoiMail(lienMail, nomFichier) {
  var ancien = document.getElementById("popup-envoi-mail");
  if (ancien) ancien.remove();
  var ov = document.createElement("div");
  ov.id = "popup-envoi-mail";
  ov.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,sans-serif";
  ov.innerHTML =
    "<div style=\'background:#FFFFFF;border-radius:22px;padding:24px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)\'>" +
      "<div style=\'font-size:18px;font-weight:700;color:#1D1D1F;margin-bottom:6px\'>Envoyer le devis</div>" +
      "<div style=\'font-size:13px;color:#6E6E73;line-height:1.5;margin-bottom:18px\'>Suivez ces 2 etapes :</div>" +
      "<div style=\'display:flex;gap:12px;margin-bottom:14px\'>" +
        "<div style=\'width:26px;height:26px;border-radius:13px;background:#F3EEFF;color:#7C3AED;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0\'>1</div>" +
        "<div style=\'font-size:13px;color:#1D1D1F;line-height:1.45\'>Le PDF du devis vient de s\'ouvrir. Touchez <b>Partager</b> puis <b>Enregistrer dans Fichiers</b>.</div>" +
      "</div>" +
      "<div style=\'display:flex;gap:12px;margin-bottom:20px\'>" +
        "<div style=\'width:26px;height:26px;border-radius:13px;background:#F3EEFF;color:#7C3AED;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0\'>2</div>" +
        "<div style=\'font-size:13px;color:#1D1D1F;line-height:1.45\'>Ouvrez le mail (bouton ci-dessous), puis touchez le <b>trombone</b> et joignez le PDF enregistre.</div>" +
      "</div>" +
      "<a href=\'" + lienMail + "\' style=\'display:block;text-align:center;background:linear-gradient(135deg,#7C3AED,#9333EA);color:#fff;padding:14px;border-radius:14px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:8px\'>Ouvrir le mail</a>" +
      "<button onclick=\'document.getElementById(\"popup-envoi-mail\").remove()\' style=\'width:100%;background:none;border:none;color:#86868B;font-size:14px;padding:8px;cursor:pointer;font-family:-apple-system,sans-serif\'>Fermer</button>" +
    "</div>";
  document.body.appendChild(ov);
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
}

function visualiserDevis() {
  syncTotaux2();
  // Sauver le numero COURANT et preparer le SUIVANT dans Firebase
  var numInput = trouverEl("d-num");
  var numDevis = numInput ? numInput.value : "001";
  if (numInput && numInput.value) {
    var parties = numInput.value.split("-");
    var numVal = parseInt(parties[parties.length - 1]) || 0;
    var anneeVal = parties[0] || "";
    var moisVal = parties[1] || "";
    // Stocker le numero COURANT - init() lira ce num et fera +1
    db.collection("config").doc("devis").set({
      num: numVal, annee: anneeVal, mois: moisVal
    }).catch(function(e) { console.log("Erreur save num:", e); });
  }
  // Sauver dans historique
  var nomClient = lireChamp("c-nom") || "Sans nom";
  sauverDevisDansHistorique(numDevis, nomClient, utilisateurActuel ? utilisateurActuel.nom : "");
  var html = construireDevis();
  var ancien = document.getElementById("overlay-devis");
  if (ancien) ancien.remove();

  var overlay = document.createElement("div");
  overlay.id = "overlay-devis";
  overlay.style.cssText = "position:fixed;inset:0;z-index:999999;background:#FFFFFF;display:flex;flex-direction:column";

  // Barre du haut avec Fermer + Imprimer
  var barre = document.createElement("div");
  barre.style.cssText = "background:#D4AF37;color:#FFFFFF;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px) + 6px);gap:10px";

  var btnFermer = document.createElement("button");
  btnFermer.style.cssText = "background:rgba(255,255,255,.25);border:none;color:#FFFFFF;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;white-space:nowrap";
  btnFermer.textContent = "Fermer";
  btnFermer.onclick = function() { overlay.remove(); };

  var titre = document.createElement("span");
  titre.style.cssText = "font-size:15px;font-weight:700;flex:1;text-align:center";
  titre.textContent = "Apercu du devis";

  var btnImprimer = document.createElement("button");
  btnImprimer.style.cssText = "background:#FFFFFF;border:none;color:#B8860B;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;white-space:nowrap";
  btnImprimer.textContent = "Sauvegarder PDF";
  btnImprimer.onclick = function() {
    var iframe = document.getElementById("iframe-devis");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  var btnMail = document.createElement("button");
  btnMail.style.cssText = "background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.6);color:#FFFFFF;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;white-space:nowrap";
  btnMail.innerHTML = "&#x2709;&#xFE0F; Envoyer";
  btnMail.onclick = function() { envoyerDevisParMail(); };

  barre.appendChild(btnFermer);
  barre.appendChild(titre);
  barre.appendChild(btnImprimer);
  barre.appendChild(btnMail);

  var iframe = document.createElement("iframe");
  iframe.id = "iframe-devis";
  iframe.style.cssText = "flex:1;border:none;width:100%";
  iframe.srcdoc = html;

  overlay.appendChild(barre);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
}

function envoyerDevis() {
  syncTotaux2();
  var nom = lireChamp("c-nom");
  var email = lireChamp("c-email");
  var num = lireChamp("d-num") || "001";
  var corps = "Bonjour " + (nom || "") + ",\n\n";
  corps += "Veuillez trouver ci-joint votre devis.\n\n";
  corps += "Cordialement,\n"+SOCIETE_NOM+"\ncreanature@ymail.com";

  var sujet = "Devis "+SOCIETE_NOM+" N" + num;

  window.location.href = "mailto:" + encodeURIComponent(email) +
    "?cc=" + encodeURIComponent("creanature@ymail.com") +
    "&subject=" + encodeURIComponent(sujet) +
    "&body=" + encodeURIComponent(corps);
}

// === INIT ===
// === FIREBASE ===
var firebaseConfig = {
  apiKey: "AIzaSyBLPt84Nqv1NKygLIx5XNSecGESN0Y2oU0",
  authDomain: "creanature-c2ba0.firebaseapp.com",
  projectId: "creanature-c2ba0",
  storageBucket: "creanature-c2ba0.firebasestorage.app",
  messagingSenderId: "602609501333",
  appId: "1:602609501333:web:ffda7c8e38ad21d8b4c79c"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// === PERSISTANCE HORS-LIGNE ===
// Firestore garde les donnees en cache local (IndexedDB) : lecture hors-ligne,
// ecritures mises en file d'attente et synchronisees au retour du reseau.
try {
  db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
    // failed-precondition = plusieurs onglets ouverts ; unimplemented = navigateur non supporte
    if (err && err.code !== "failed-precondition" && err.code !== "unimplemented") {
      console.warn("Persistance hors-ligne indisponible:", err.code);
    }
  });
} catch (e) { /* ancienne version SDK */ }

// === GESTION HORS-LIGNE (indicateur + synchro) ===
var _etaitHorsLigne = false;
function majIndicateurReseau() {
  var badge = document.getElementById("offline-badge");
  if (!badge) return;
  var txt = document.getElementById("offline-txt");
  var dot = document.getElementById("offline-dot");
  if (!navigator.onLine) {
    // Hors ligne
    badge.style.display = "flex";
    badge.style.background = "rgba(239,68,68,.95)";
    if (txt) txt.textContent = "Hors ligne";
    if (dot) dot.style.background = "var(--blanc)";
    _etaitHorsLigne = true;
  } else {
    if (_etaitHorsLigne) {
      // Retour en ligne : afficher "Synchronise" brievement en vert
      badge.style.display = "flex";
      badge.style.background = "rgba(34,197,94,.95)";
      if (txt) txt.textContent = "Reconnecte - synchronisation";
      if (dot) dot.style.background = "var(--blanc)";
      setTimeout(function() {
        if (badge && navigator.onLine) badge.style.display = "none";
      }, 2500);
      _etaitHorsLigne = false;
    } else {
      badge.style.display = "none";
    }
  }
}
window.addEventListener("online", majIndicateurReseau);
window.addEventListener("offline", majIndicateurReseau);


// === SOCIETE (nom + logo personnalisables) ===
var SOCIETE_NOM = localStorage.getItem("cn_societe_nom") || "Crea Nature";
var SOCIETE_LOGO = localStorage.getItem("cn_societe_logo") || "";

function chargerSociete() {
  if (!db) { appliquerSociete(); return; }
  db.collection("config").doc("societe").get().then(function(doc) {
    if (doc.exists) {
      var d = doc.data();
      if (d.nom) { SOCIETE_NOM = d.nom; localStorage.setItem("cn_societe_nom", d.nom); }
      if (d.logo) { SOCIETE_LOGO = d.logo; localStorage.setItem("cn_societe_logo", d.logo); }
    }
    appliquerSociete();
  }).catch(function(){ appliquerSociete(); });
}

function appliquerSociete() {
  // Logo dans la navbar
  try {
    var imgs = document.querySelectorAll('img[alt="Crea Nature"]');
    for (var i = 0; i < imgs.length; i++) {
      if (SOCIETE_LOGO) imgs[i].src = SOCIETE_LOGO;
      imgs[i].alt = SOCIETE_NOM;
    }
  } catch(e){}
  // Nom dans l'accueil (acc-crea / acc-nature)
  try {
    var elCrea = document.querySelector(".acc-crea");
    var elNature = document.querySelector(".acc-nature");
    if (elCrea && elNature) {
      var parts = SOCIETE_NOM.split(" ");
      if (parts.length >= 2) {
        elCrea.textContent = parts[0];
        elNature.textContent = parts.slice(1).join(" ").toUpperCase();
      } else {
        elCrea.textContent = "";
        elNature.textContent = SOCIETE_NOM.toUpperCase();
      }
    }
    var epTitre = document.getElementById("ep-titre-soc");
    if (epTitre) epTitre.textContent = SOCIETE_NOM;
  } catch(e){}
}


// === SAUVEGARDE / EXPORT DE TOUTES LES DONNEES ===
function exporterToutesDonnees(modeEnvoi) {
  afficherToast("Preparation de la sauvegarde...");
  var collections = ["clients", "devis", "tresorerie", "memos", "planning", "bi_historique", "prev_historique", "config"];
  var backup = { _meta: { app: "Crea Nature", date: new Date().toISOString(), version: 1 } };
  var promesses = collections.map(function(col) {
    return db.collection(col).get().then(function(snap) {
      var arr = [];
      snap.forEach(function(doc) { arr.push(Object.assign({ _id: doc.id }, doc.data())); });
      backup[col] = arr;
    }).catch(function() { backup[col] = []; });
  });
  Promise.all(promesses).then(function() {
    var json = JSON.stringify(backup, null, 2);
    var dateStr = new Date().toISOString().slice(0,10);
    var nomFichier = "sauvegarde_creanature_" + dateStr + ".json";
    if (modeEnvoi === "mail") {
      // Compter les elements pour le resume
      var resume = collections.map(function(col){ return "- " + col + " : " + (backup[col] ? backup[col].length : 0); }).join("\n");
      var sujet = encodeURIComponent("Sauvegarde Crea Nature - " + dateStr);
      var corps = encodeURIComponent(
        "Sauvegarde des donnees Crea Nature du " + dateStr + "\n\n" +
        "Resume :\n" + resume + "\n\n" +
        "Le fichier de sauvegarde complet a aussi ete telecharge sur l'appareil.\n" +
        "Pour le restaurer, gardez le fichier .json en lieu sur.\n"
      );
      // Telecharger ET ouvrir le mail
      telechargerFichier(json, nomFichier);
      window.location.href = "mailto:?subject=" + sujet + "&body=" + corps;
      afficherToast("Fichier telecharge + mail prepare");
    } else {
      telechargerFichier(json, nomFichier);
      afficherToast("Sauvegarde telechargee !");
    }
  }).catch(function() {
    afficherToast("Erreur lors de la sauvegarde");
  });
}

function telechargerFichier(contenu, nomFichier) {
  try {
    var blob = new Blob([contenu], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  } catch(e) {
    afficherToast("Telechargement impossible sur cet appareil");
  }
}

// === TVA / HT ===
// Regle : "Crea au 05/2026" = TVA 10%, tout le reste = TVA 20%
function tauxTVA(libelleOuClient) {
  var t = (libelleOuClient || "").toLowerCase();
  if (t.indexOf("crea") >= 0 && t.indexOf("05/2026") >= 0) return 0.10;
  if (t.indexOf("crea au 05") >= 0) return 0.10;
  return 0.20;
}
function montantHT(ttc, taux) {
  if (taux === undefined) taux = 0.20;
  return ttc / (1 + taux);
}

// === CLIENTS ===
var cacheClients = [];

function chargerClients() {
  return cacheClients;
}

function chargerClientsDepuisFirebase(callback) {
  db.collection("clients").orderBy("nom").get().then(function(snapshot) {
    cacheClients = [];
    snapshot.forEach(function(doc) {
      cacheClients.push(Object.assign({id: doc.id}, doc.data()));
    });
    if (callback) callback(cacheClients);
  }).catch(function(e) {
    console.log("Erreur chargement clients:", e);
    if (callback) callback([]);
  });
}

function sauverClients(clients) {
  cacheClients = clients;
}

function sauverClientActuel() {
  var nom = lireChamp("c-nom").trim();
  if (!nom) { alert("Saisis au moins le nom du client."); return; }
  var emailPrincipal = lireChamp("c-email");
  var email2Saisi = lireChamp("c-email2");
  var data = {
    nom: nom,
    adresse: lireChamp("c-adresse"),
    email: emailPrincipal,
    email2: email2Saisi || emailPrincipal,
    tel: lireChamp("c-tel"),
    date: new Date().toLocaleDateString("fr-FR")
  };
  // Chercher si existe deja par nom
  db.collection("clients").where("nom", "==", nom).get().then(function(snapshot) {
    if (!snapshot.empty) {
      // Mettre a jour
      snapshot.docs[0].ref.update(data).then(function() {
        chargerClientsDepuisFirebase(null);
        afficherToast("Client mis a jour !");
      });
    } else {
      // Creer
      db.collection("clients").add(data).then(function() {
        chargerClientsDepuisFirebase(null);
        afficherToast("Client enregistre !");
      });
    }
  }).catch(function(e) {
    afficherToast("Erreur : " + e.message);
  });
}

function afficherToast(msg) {
  var t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:var(--fond);color:var(--txt);padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;font-family:-apple-system,sans-serif;white-space:nowrap";
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2000);
}



// === AUTOCOMPLETION CLIENT sur le champ nom du devis ===
function initAutocompleteClient() {
  var champ = document.getElementById("c-nom");
  var boite = document.getElementById("c-nom-suggestions");
  if (!champ || !boite) return;
  // Precharger les clients si le cache est vide
  if ((!cacheClients || cacheClients.length === 0) && typeof chargerClientsDepuisFirebase === "function") {
    chargerClientsDepuisFirebase(function(){});
  }
  // Eviter d'attacher plusieurs fois
  if (champ._autocompleteInit) return;
  champ._autocompleteInit = true;

  champ.addEventListener("input", function() {
    var q = champ.value.trim().toLowerCase();
    if (!q || !cacheClients || cacheClients.length === 0) { boite.style.display = "none"; return; }
    var resultats = cacheClients.filter(function(cl) {
      return (cl.nom || "").toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
    if (resultats.length === 0) { boite.style.display = "none"; return; }
    boite.innerHTML = "";
    resultats.forEach(function(cl) {
      var ligne = document.createElement("div");
      ligne.style.cssText = "padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.05);display:flex;align-items:center;gap:10px";
      ligne.innerHTML = "<div style='width:30px;height:30px;border-radius:9px;background:var(--violet-doux);color:var(--violet);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0'>" + (cl.nom||"?").charAt(0).toUpperCase() + "</div>" +
        "<div style='min-width:0'><div style='font-size:14px;font-weight:600;color:#1D1D1F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(cl.nom||"") + "</div>" +
        "<div style='font-size:11px;color:#86868B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(cl.adresse||cl.email||"") + "</div></div>";
      ligne.onmousedown = function(e) {
        e.preventDefault();
        remplirDevisAvecClient(cl);
        boite.style.display = "none";
      };
      boite.appendChild(ligne);
    });
    boite.style.display = "block";
  });
  // Masquer au clic ailleurs
  champ.addEventListener("blur", function() {
    setTimeout(function(){ boite.style.display = "none"; }, 150);
  });
}

// Remplir le formulaire de devis avec un client existant
function remplirDevisAvecClient(client) {
  if (!client) return;
  var setV = function(id, val) { var el = document.getElementById(id); if (el) el.value = val || ""; };
  setV("c-nom", client.nom);
  setV("c-adresse", client.adresse);
  setV("c-email", client.email);
  setV("c-email2", client.email2);
  setV("c-tel", client.tel);
  if (typeof afficherToast === "function") afficherToast("Client ajoute au devis");
}

// Ouvrir le panneau clients en mode selection (pour remplir un devis)
function ouvrirClientsPourDevis() {
  window._modeSelectionDevis = true;
  ouvrirPanneauClients();
}

function ouvrirPanneauClients() {
  var ancien = document.getElementById("panneau-clients");
  if (ancien) ancien.remove();

  // Afficher panneau avec chargement
  var panneau = document.createElement("div");
  panneau.id = "panneau-clients";
  panneau.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:flex-end;justify-content:center";
  panneau.innerHTML = "<div style='background:var(--fond);width:100%;max-width:430px;border-radius:22px 22px 0 0;padding:30px;text-align:center;font-family:-apple-system,sans-serif;color:var(--txt-3);font-size:14px'>Chargement...</div>";
  document.body.appendChild(panneau);
  panneau.onclick = function(e) { if (e.target === panneau) panneau.remove(); };

  chargerClientsDepuisFirebase(function(clients) {
    panneau.remove();
    _afficherPanneauClients(clients);
  });
}

function _afficherPanneauClients(clients) {
  var ancien = document.getElementById("panneau-clients");
  if (ancien) ancien.remove();

  var panneau = document.createElement("div");
  panneau.id = "panneau-clients";
  panneau.style.cssText = "position:fixed;inset:0;background:var(--fond);z-index:999999;display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  // En-tete
  var tete = document.createElement("div");
  tete.style.cssText = "background:linear-gradient(135deg,#18181F,#111116);padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  var titreTete = document.createElement("span");
  titreTete.id = "clients-titre";
  titreTete.style.cssText = "font-size:17px;font-weight:700;color:var(--blanc)";
  titreTete.textContent = "Mes clients";
  tete.appendChild(titreTete);
  var btnFermer = document.createElement("button");
  btnFermer.style.cssText = "background:rgba(255,255,255,.15);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnFermer.textContent = "Fermer";
  btnFermer.onclick = function() { panneau.remove(); window._modeSelectionDevis = false; };
  tete.appendChild(btnFermer);
  panneau.appendChild(tete);

  // Corps (contient soit la liste, soit l'edition)
  var corps = document.createElement("div");
  corps.id = "clients-corps";
  corps.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column";
  panneau.appendChild(corps);

  // ===== VUE LISTE =====
  function vueListe() {
    titreTete.textContent = "Mes clients";
    corps.innerHTML = "";
    // Barre recherche + bouton nouveau
    var rechWrap = document.createElement("div");
    rechWrap.style.cssText = "padding:12px 14px;background:var(--fond);border-bottom:.5px solid rgba(255,255,255,.08);flex-shrink:0;position:sticky;top:0;z-index:2;display:flex;gap:8px";
    var rechInp = document.createElement("input");
    rechInp.type = "text";
    rechInp.placeholder = "Rechercher un client...";
    rechInp.style.cssText = "flex:1;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:15px;color:var(--blanc);background:rgba(255,255,255,.06);outline:none;font-family:-apple-system,sans-serif;-webkit-appearance:none";
    rechWrap.appendChild(rechInp);
    var btnNouveau = document.createElement("button");
    btnNouveau.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);padding:0 16px;border-radius:10px;font-size:20px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0";
    btnNouveau.textContent = "+";
    btnNouveau.title = "Nouveau client";
    btnNouveau.onclick = function() { vueEdition(null); };
    rechWrap.appendChild(btnNouveau);
    corps.appendChild(rechWrap);

    var liste = document.createElement("div");
    liste.style.cssText = "padding:12px 14px";
    corps.appendChild(liste);

    function rendre(filtre) {
      liste.innerHTML = "";
      var filtered = filtre
        ? clients.filter(function(c) { return (c.nom||"").toLowerCase().indexOf(filtre.toLowerCase()) >= 0; })
        : clients;
      // Compteur
      var cpt = document.createElement("div");
      cpt.style.cssText = "font-size:11px;color:var(--txt-3);margin-bottom:10px;letter-spacing:.04em";
      cpt.textContent = filtered.length + " client" + (filtered.length>1?"s":"");
      liste.appendChild(cpt);
      if (filtered.length === 0) {
        var vide = document.createElement("div");
        vide.style.cssText = "text-align:center;color:var(--txt-3);font-size:14px;padding:30px 0";
        vide.textContent = "Aucun client";
        liste.appendChild(vide);
        return;
      }
      filtered.forEach(function(c) {
        var item = document.createElement("div");
        item.style.cssText = "background:var(--blanc);border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer";
        // Avatar initiale
        var av = document.createElement("div");
        av.style.cssText = "width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--or-2),var(--or));display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--blanc);flex-shrink:0";
        av.textContent = (c.nom||"?").charAt(0).toUpperCase();
        item.appendChild(av);
        // Infos
        var infos = document.createElement("div");
        infos.style.cssText = "flex:1;min-width:0";
        infos.innerHTML =
          "<div style='font-size:15px;font-weight:600;color:#1D1D1F;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(c.nom||"") + "</div>" +
          (c.email ? "<div style='font-size:12px;color:var(--txt-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(c.email) + "</div>" : "") +
          (c.tel ? "<div style='font-size:12px;color:var(--txt-3)'>" + echapper(c.tel) + "</div>" : "");
        item.appendChild(infos);
        // Chevron
        var chev = document.createElement("div");
        chev.style.cssText = "color:var(--txt-3);font-size:20px;flex-shrink:0";
        chev.innerHTML = "&#x203A;";
        item.appendChild(chev);
        // Clic = edition
        (function(client) {
          item.onclick = function() {
          if (window._modeSelectionDevis) {
            remplirDevisAvecClient(client);
            panneau.remove();
            window._modeSelectionDevis = false;
          } else {
            vueEdition(client);
          }
        };
        })(c);
        liste.appendChild(item);
      });
    }
    rechInp.oninput = function() { rendre(this.value); };
    rendre("");
    rechInp.focus && setTimeout(function(){ try { rechInp.focus(); } catch(e){} }, 100);
  }

  // ===== VUE EDITION (nouvel "onglet") =====
  function vueEdition(client) {
    var estNouveau = !client;
    titreTete.textContent = estNouveau ? "Nouveau client" : "Modifier le client";
    corps.innerHTML = "";
    var form = document.createElement("div");
    form.style.cssText = "padding:18px 16px;display:flex;flex-direction:column;gap:14px";

    function champ(label, val, placeholder, type) {
      var wrap = document.createElement("div");
      var lab = document.createElement("div");
      lab.style.cssText = "font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-3);margin-bottom:6px";
      lab.textContent = label;
      wrap.appendChild(lab);
      var inp = document.createElement("input");
      inp.type = type || "text";
      inp.value = val || "";
      inp.placeholder = placeholder || "";
      inp.style.cssText = "width:100%;padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:11px;font-size:15px;color:var(--blanc);background:rgba(255,255,255,.06);outline:none;font-family:-apple-system,sans-serif;-webkit-appearance:none;box-sizing:border-box";
      wrap.appendChild(inp);
      form.appendChild(wrap);
      return inp;
    }

    var iNom = champ("Nom du client", client ? client.nom : "", "Jean Dupont");
    var iAdresse = champ("Adresse", client ? client.adresse : "", "12 rue des Fleurs, Paris");
    var iEmail = champ("Email (factures)", client ? client.email : "", "client@email.com", "email");
    var iEmail2 = champ("Email bon d'intervention / prevention", client ? (client.email2 || "") : "", "Laisser vide = meme email", "email");
    var iTel = champ("Telephone", client ? client.tel : "", "06 00 00 00 00", "tel");

    // Bouton enregistrer
    var btnSave = document.createElement("button");
    btnSave.style.cssText = "width:100%;height:50px;border-radius:13px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;font-size:15px;font-weight:700;color:var(--blanc);cursor:pointer;font-family:-apple-system,sans-serif;margin-top:6px";
    btnSave.textContent = estNouveau ? "Creer le client" : "Enregistrer les modifications";
    btnSave.onclick = function() {
      var nom = iNom.value.trim();
      if (!nom) { afficherToast("Saisis au moins le nom"); return; }
      var emailP = iEmail.value.trim();
      var data = {
        nom: nom,
        adresse: iAdresse.value.trim(),
        email: emailP,
        email2: iEmail2.value.trim() || emailP,
        tel: iTel.value.trim(),
        date: new Date().toLocaleDateString("fr-FR")
      };
      btnSave.disabled = true;
      btnSave.textContent = "Enregistrement...";
      // Mise a jour si existe (par id ou par nom), sinon creation
      function apresSave() {
        chargerClientsDepuisFirebase(function(cl) {
          clients = cl; cacheClients = cl;
          afficherToast(estNouveau ? "Client cree !" : "Client modifie !");
          vueListe();
        });
      }
      if (client && client.id) {
        db.collection("clients").doc(client.id).set(data).then(apresSave).catch(function(){ btnSave.disabled=false; afficherToast("Erreur"); });
      } else {
        db.collection("clients").where("nom","==",nom).get().then(function(snap){
          if (!snap.empty) { snap.docs[0].ref.set(data).then(apresSave); }
          else { db.collection("clients").add(data).then(apresSave); }
        }).catch(function(){ btnSave.disabled=false; afficherToast("Erreur"); });
      }
    };
    form.appendChild(btnSave);

    // Bouton retour
    var btnRetour = document.createElement("button");
    btnRetour.style.cssText = "width:100%;height:46px;border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:14px;font-weight:600;color:#AEAEB2;cursor:pointer;font-family:-apple-system,sans-serif";
    btnRetour.textContent = "Retour a la liste";
    btnRetour.onclick = function() { vueListe(); };
    form.appendChild(btnRetour);

    // Pour un client existant : historique + suppression
    if (!estNouveau) {
      var btnHisto = document.createElement("button");
      btnHisto.style.cssText = "width:100%;height:46px;border-radius:13px;background:rgba(100,181,246,.15);border:none;font-size:14px;font-weight:600;color:var(--bleu);cursor:pointer;font-family:-apple-system,sans-serif";
      btnHisto.textContent = "Voir l'historique des devis";
      (function(nc){
        btnHisto.onclick = function() {
          panneau.remove();
          db.collection("devis").orderBy("timestamp","desc").limit(200).get().then(function(snap) {
            var devis = [];
            snap.forEach(function(doc){ devis.push(Object.assign({_id:doc.id}, doc.data())); });
            var filtered = devis.filter(function(d){ return (d.client||"").toLowerCase().indexOf(nc.toLowerCase())>=0; });
            ouvrirHistoriqueClient(nc, filtered, devis);
          });
        };
      })(client.nom);
      form.appendChild(btnHisto);

      var btnSuppr = document.createElement("button");
      btnSuppr.style.cssText = "width:100%;height:46px;border-radius:13px;background:rgba(255,59,48,.12);border:none;font-size:14px;font-weight:600;color:var(--erreur);cursor:pointer;font-family:-apple-system,sans-serif";
      btnSuppr.textContent = "Supprimer ce client";
      (function(cl){
        btnSuppr.onclick = function() {
          if (!confirm("Supprimer " + cl.nom + " ?")) return;
          function apres() {
            clients = clients.filter(function(x){ return x.nom !== cl.nom; });
            cacheClients = clients;
            afficherToast("Client supprime");
            vueListe();
          }
          if (cl.id) { db.collection("clients").doc(cl.id).delete().then(apres).catch(apres); }
          else { db.collection("clients").where("nom","==",cl.nom).get().then(function(snap){ if(!snap.empty){ snap.docs[0].ref.delete().then(apres); } else apres(); }).catch(apres); }
        };
      })(client);
      form.appendChild(btnSuppr);
    }

    corps.appendChild(form);
  }

  vueListe();
  document.body.appendChild(panneau);
}



// === BANDEAU RAZ ===
function afficherBandeauRAZ() {
  if (document.getElementById("bandeau-raz")) return;
  var div=document.createElement("div"); div.id="bandeau-raz";
  div.style.cssText="position:fixed;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:linear-gradient(135deg,var(--or-2),var(--or));color:var(--blanc);padding:10px 16px;padding-top:calc(env(safe-area-inset-top,44px)+4px);display:flex;justify-content:space-between;align-items:center;z-index:999999;font-family:-apple-system,sans-serif;gap:8px";
  var txt=document.createElement("span"); txt.style.cssText="font-size:13px;font-weight:500"; txt.textContent="Nouveau devis ?";
  var btns=document.createElement("div"); btns.style.cssText="display:flex;gap:8px";
  var bR=document.createElement("button"); bR.style.cssText="background:var(--blanc);border:none;color:var(--or);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif"; bR.textContent="Remettre a zero";
  bR.onclick=function(){ reinitialiser(); var b=document.getElementById("bandeau-raz"); if(b) b.remove(); };
  var bG=document.createElement("button"); bG.style.cssText="background:rgba(255,255,255,.2);border:none;color:var(--blanc);padding:6px 12px;border-radius:20px;font-size:13px;cursor:pointer;font-family:-apple-system,sans-serif"; bG.textContent="Garder";
  bG.onclick=function(){ var b=document.getElementById("bandeau-raz"); if(b) b.remove(); };
  btns.appendChild(bR); btns.appendChild(bG);
  div.appendChild(txt); div.appendChild(btns);
  document.body.appendChild(div);
  setTimeout(function(){ var b=document.getElementById("bandeau-raz"); if(b) b.remove(); }, 6000);
}

// === PANNEAU MEMO ===
var memoTypeCourant="tache"; var memoFiltreCourant="tout"; var memoPolling=null;

function ouvrirPanneauMemo() {
  masquerBottomNav();
  var ancien=document.getElementById("panneau-memo"); if(ancien) ancien.remove();
  var pn=document.createElement("div"); pn.id="panneau-memo";
  pn.style.cssText="position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";
  pn.innerHTML=
    "<div style='background:#2A1A3A;padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px) + 6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0'>"+
      "<span style='font-size:17px;font-weight:700;color:#FFFFFF'>Memo partage</span>"+
      "<button onclick='fermerPanneauMemo()' style='background:rgba(255,255,255,.1);border:none;color:#FFFFFF;padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif'>Fermer</button>"+
    "</div>"+
    "<div style='display:flex;gap:6px;padding:10px 14px;background:#F5F5F7;border-bottom:.5px solid #2C2C2E;flex-shrink:0;overflow-x:auto'>"+
      "<button class='memo-filtre-btn actif' id='mf-tout' onclick='setMemoFiltre(\"tout\")'>Tout</button>"+
      "<button class='memo-filtre-btn' id='mf-tache' onclick='setMemoFiltre(\"tache\")'>Taches</button>"+
      "<button class='memo-filtre-btn' id='mf-urgent' onclick='setMemoFiltre(\"urgent\")'>Urgent</button>"+
      "<button class='memo-filtre-btn' id='mf-note' onclick='setMemoFiltre(\"note\")'>Notes</button>"+
    "</div>"+
    "<div id='memo-liste' style='flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 14px'></div>"+
    "<div style='flex-shrink:0;background:#FFFFFF;border-top:.5px solid rgba(0,0,0,.12);padding:10px 14px;padding-bottom:calc(env(safe-area-inset-bottom,34px) + 8px)'>"+
      "<div style='display:flex;gap:6px;margin-bottom:8px'>"+
        "<button class='memo-type-btn actif' id='mt-tache' onclick='setMemoType(\"tache\")'>Tache</button>"+
        "<button class='memo-type-btn' id='mt-note' onclick='setMemoType(\"note\")'>Note</button>"+
        "<button class='memo-type-btn urgent' id='mt-urgent' onclick='setMemoType(\"urgent\")'>Urgent</button>"+
      "</div>"+
      "<div style='display:flex;gap:8px;align-items:flex-end'>"+
        "<textarea id='memo-input' rows='1' placeholder='Ecrire une note...' style='flex:1;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;color:#FFFFFF;background:rgba(0,0,0,.12);outline:none;resize:none;min-height:40px;max-height:90px;font-family:-apple-system,sans-serif;-webkit-appearance:none' oninput='this.style.height=\"auto\";this.style.height=Math.min(this.scrollHeight,90)+\"px\"'></textarea>"+
        "<button onclick='envoyerMemo()' style='width:42px;height:42px;border-radius:21px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;color:#FFFFFF;font-size:20px;cursor:pointer;flex-shrink:0'>&#x27A4;</button>"+
      "</div>"+
    "</div>";
  document.body.appendChild(pn);
  memoFiltreCourant="tout"; memoTypeCourant="note";
  chargerMemos();
  if(memoPolling) clearInterval(memoPolling);
  memoPolling=setInterval(chargerMemos,20000);
}
function fermerPanneauMemo() {
  if(memoPolling){ clearInterval(memoPolling); memoPolling=null; }
  var pn=document.getElementById("panneau-memo"); if(pn) pn.remove();
  afficherBottomNav("accueil");
}
function setMemoFiltre(f) {
  memoFiltreCourant=f;
  document.querySelectorAll(".memo-filtre-btn").forEach(function(b){ b.classList.remove("actif"); });
  var el=document.getElementById("mf-"+f); if(el) el.classList.add("actif");
  chargerMemos();
}
function setMemoType(t) {
  memoTypeCourant=t;
  document.querySelectorAll(".memo-type-btn").forEach(function(b){ b.classList.remove("actif"); });
  var el=document.getElementById("mt-"+t); if(el) el.classList.add("actif");
}
function chargerMemos() {
  var liste=document.getElementById("memo-liste"); if(!liste) return;
  db.collection("memos").orderBy("timestamp","desc").limit(50).get().then(function(snap) {
    var r=[]; snap.forEach(function(doc){ r.push(Object.assign({_id:doc.id},doc.data())); });
    if(memoFiltreCourant!=="tout") r=r.filter(function(x){ return x.type===memoFiltreCourant; });
    if(!r.length){ liste.innerHTML="<div style='text-align:center;color:var(--txt-3);padding:30px;font-size:14px'>Aucune note</div>"; return; }
    liste.innerHTML="";
    r.forEach(function(n) {
      var div=document.createElement("div");
      div.className="note-item"+(n.type==="urgent"?" urgent":n.type==="tache"?" tache":"");
      var d=new Date(n.timestamp||0);
      var ds=("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2)+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
      div.innerHTML="<div class='note-txt"+(n.fait?" barre":"")+"'>"+echapper(n.texte||"")+"</div><div class='note-meta'>"+echapper(n.auteur||"")+" - "+ds+"</div>";
      var acts=document.createElement("div"); acts.className="note-acts";
      if(n.type==="tache"||n.type==="urgent"){
        var bF=document.createElement("button"); bF.className="note-act-btn";
        bF.style.cssText="background:"+(n.fait?"rgba(100,100,100,.15)":"rgba(52,199,89,.15)")+";color:"+(n.fait?"var(--txt-3)":"var(--succes)");
        bF.textContent=n.fait?"Rouvrir":"Fait !";
        (function(id,f){ bF.onclick=function(){ db.collection("memos").doc(id).update({fait:!f}).then(chargerMemos); }; })(n._id,n.fait);
        acts.appendChild(bF);
      }
      var bS=document.createElement("button"); bS.className="note-act-btn";
      bS.style.cssText="background:rgba(255,59,48,.12);color:var(--erreur)"; bS.textContent="Supprimer";
      (function(id){ bS.onclick=function(){ db.collection("memos").doc(id).delete().then(chargerMemos); }; })(n._id);
      acts.appendChild(bS); div.appendChild(acts); liste.appendChild(div);
    });
  }).catch(function(){ var l=document.getElementById("memo-liste"); if(l) l.innerHTML="<div style='text-align:center;color:var(--erreur);padding:20px'>Erreur connexion</div>"; });
}
function envoyerMemo() {
  var inp=document.getElementById("memo-input"); if(!inp) return;
  var txt=inp.value.trim(); if(!txt) return;
  var auteur=utilisateurActuel?utilisateurActuel.nom:"Equipe";
  db.collection("memos").add({texte:txt,type:memoTypeCourant,auteur:auteur,timestamp:Date.now(),fait:false})
    .then(function(){ inp.value=""; inp.style.height="auto"; chargerMemos(); })
    .catch(function(){ afficherToast("Erreur envoi"); });
}

// === PANNEAU BON D'INTERVENTION ===
var biPrestsSelec=[]; var biClientSelec=null;
var BI_PRESTS=[
  {id:"taille",label:"Taille de haie"},
  {id:"tonte",label:"Tonte"},
  {id:"feuilles",label:"Ramassage feuilles"},
  {id:"fauchage",label:"Fauchage"},
  {id:"evac",label:"Evacuation dechets verts"},
];
function ouvrirPanneauBI() {
  biPrestsSelec=[]; biClientSelec=null;
  var ancien=document.getElementById("panneau-bi"); if(ancien) ancien.remove();
  var pn=document.createElement("div"); pn.id="panneau-bi";
  pn.style.cssText="position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif;overflow-y:auto";
  var grille=BI_PRESTS.map(function(p){
    var pl=p.id==="evac"?" plein":"";
    return "<button class='btn-prest"+pl+"' id='bip-"+p.id+"' onclick='toggleBIbtn(\""+p.id+"\")'>"+echapper(p.label)+"</button>";
  }).join("");
  pn.innerHTML=
    "<div style='background:#0D3D1A;padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px) + 6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0'>"+
      "<span style='font-size:17px;font-weight:700;color:#FFFFFF'>Terrain</span>"+
      "<button onclick='fermerPanneauBI()' style='background:rgba(255,255,255,.1);border:none;color:#FFFFFF;padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif'>Fermer</button>"+
    "</div>"+
    "<div style='display:flex;background:#0A2E14;border-bottom:.5px solid rgba(255,255,255,.1);flex-shrink:0'>"+
      "<button id='bi-ong-bi' onclick='ouvrirOngletBI()' style='flex:1;padding:12px;background:none;border:none;color:#FFFFFF;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid #FFFFFF'>Bon d\'intervention</button>"+
      "<button id='bi-ong-prev' onclick='ouvrirOngletPrevention()' style='flex:1;padding:12px;background:none;border:none;color:rgba(255,255,255,.5);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid transparent'>Prevention</button>"+
    "</div>"+
    "<div style='flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch'>"+
    "<div id='bi-contenu-bi' style='padding:14px;padding-bottom:calc(env(safe-area-inset-bottom,34px)+20px)'>"+
      "<div class='titre-section'>Prestations realisees</div>"+
      "<div class='grille2' style='margin-bottom:12px'>"+grille+"</div>"+
      "<div class='titre-section'>Note complementaire</div>"+
      "<div class='carte' style='padding:11px;margin-bottom:12px'>"+
        "<textarea id='bi-note' rows='3' placeholder='Precisions...' style='width:100%;padding:8px 10px;border:1.5px solid var(--gris2);border-radius:9px;font-size:14px;color:var(--noir);background:var(--gris3);outline:none;resize:none;font-family:-apple-system,sans-serif;-webkit-appearance:none;display:block'></textarea>"+
      "</div>"+
      "<div class='titre-section'>Client</div>"+
      "<div class='carte' style='padding:11px;margin-bottom:12px'>"+
        "<input class='input-texte' id='bi-client-search' type='text' placeholder='Rechercher un client...' oninput='rechercherClientBI(this.value)'/>"+
        "<div id='bi-client-liste' style='margin-top:6px'></div>"+
        "<div id='bi-client-selectionne' style='display:none;margin-top:8px;padding:8px 12px;background:rgba(200,146,62,.1);border-radius:8px'>"+
          "<span style='font-size:13px;font-weight:600;color:#B8860B' id='bi-client-nom-aff'></span>"+
        "</div>"+
      "</div>"+
      "<button class='btn-or' onclick='envoyerBI()'>Envoyer le bon d'intervention</button>"+
      "<button class='btn-gris' onclick='reinitialiserBI()' style='margin-top:8px'>Reinitialiser</button>"+
      "<div style='margin-top:16px'><div style='font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#86868B;margin-bottom:8px'>Derniers envois</div><div id='bi-historique-liste'></div></div>"+
      "</div>"+
      "<div id='bi-contenu-prev' style='display:none;padding:14px;padding-bottom:calc(env(safe-area-inset-bottom,34px)+20px)'>"+
        "<div class='titre-section'>Date d\'intervention</div>"+
        "<div class='carte' style='padding:11px;margin-bottom:12px'><div style='display:flex;gap:8px'><div style='flex:1'><div style='font-size:11px;color:#86868B;margin-bottom:4px'>Du</div><input type='date' id='prev-date-debut' style='width:100%;padding:8px 10px;border:1.5px solid var(--gris2);border-radius:9px;font-size:14px;color:var(--noir);background:var(--gris3);outline:none;font-family:-apple-system,sans-serif;-webkit-appearance:none'></div><div style='flex:1'><div style='font-size:11px;color:#86868B;margin-bottom:4px'>Au</div><input type='date' id='prev-date-fin' style='width:100%;padding:8px 10px;border:1.5px solid var(--gris2);border-radius:9px;font-size:14px;color:var(--noir);background:var(--gris3);outline:none;font-family:-apple-system,sans-serif;-webkit-appearance:none'></div></div></div>"+
        "<div class='titre-section'>Type d\'intervention</div>"+
        "<div class='grille2' style='margin-bottom:12px'>"+
          "<button class='btn-prest' id='prev-prest-tonte' data-label='Tonte' onclick='this.classList.toggle(\"actif\")'>Tonte</button>"+
          "<button class='btn-prest' id='prev-prest-taille' data-label='Taille de haie' onclick='this.classList.toggle(\"actif\")'>Taille de haie</button>"+
          "<button class='btn-prest' id='prev-prest-feuilles' data-label='Ramassage feuilles' onclick='this.classList.toggle(\"actif\")'>Ramassage feuilles</button>"+
          "<button class='btn-prest' id='prev-prest-fauchage' data-label='Fauchage' onclick='this.classList.toggle(\"actif\")'>Fauchage</button>"+
        "</div>"+
        "<div class='titre-section'>Client</div>"+
        "<div class='carte' style='padding:11px;margin-bottom:12px'>"+
          "<input class='input-texte' id='prev-client-search' type='text' placeholder='Rechercher un client...' oninput='rechercherClientPrev(this.value)'/>"+
          "<div id='prev-client-liste' style='margin-top:6px'></div>"+
          "<div id='prev-client-selectionne' style='display:none;margin-top:8px;padding:8px 12px;background:rgba(200,146,62,.1);border-radius:8px;font-size:13px;font-weight:600;color:#B8860B'></div>"+
        "</div>"+
        "<button class='btn-or' onclick='envoyerPrevention()'>Envoyer l\'avis de passage</button>"+
        "<div style='margin-top:16px'><div style='font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#86868B;margin-bottom:8px'>Derniers envois</div><div id='prev-historique-liste'></div></div>"+
      "</div>"+
    "</div>"
    "</div>";
  document.body.appendChild(pn);
  chargerHistoriqueBI();
  chargerHistoriquePrevention();
}
function fermerPanneauBI(){ var pn=document.getElementById("panneau-bi"); if(pn) pn.remove(); }
function toggleBIbtn(id){
  var idx=biPrestsSelec.indexOf(id);
  if(idx>=0) biPrestsSelec.splice(idx,1); else biPrestsSelec.push(id);
  var btn=document.getElementById("bip-"+id); if(btn) btn.classList.toggle("actif",biPrestsSelec.indexOf(id)>=0);
}
function rechercherClientBI(val){
  var liste=document.getElementById("bi-client-liste"); if(!liste) return;
  if(!val||val.length<2){ liste.innerHTML=""; return; }
  db.collection("clients").orderBy("nom").get().then(function(snap){
    var r=[];
    snap.forEach(function(doc){ var d=doc.data(); if(d.nom&&d.nom.toLowerCase().indexOf(val.toLowerCase())>=0) r.push(Object.assign({_id:doc.id},d)); });
    liste.innerHTML="";
    r.slice(0,5).forEach(function(cl){
      var item=document.createElement("div");
      item.style.cssText="padding:9px 12px;background:rgba(200,146,62,.08);border-radius:8px;margin-bottom:4px;cursor:pointer;font-size:14px;color:var(--noir)";
      item.textContent=cl.nom+(cl.adresse?" - "+cl.adresse:"");
      (function(client){ item.onclick=function(){
        biClientSelec=client; liste.innerHTML="";
        var inp=document.getElementById("bi-client-search"); if(inp) inp.value=client.nom;
        var aff=document.getElementById("bi-client-selectionne"); if(aff) aff.style.display="block";
        var nm=document.getElementById("bi-client-nom-aff"); if(nm) nm.textContent=client.nom+(client.adresse?" - "+client.adresse:"");
      }; })(cl);
      liste.appendChild(item);
    });
  }).catch(function(){});
}
function envoyerBI(){
  if(biPrestsSelec.length===0){ afficherToast("Selectionne au moins une prestation"); return; }
  var note=(document.getElementById("bi-note")||{}).value||"";
  var nomCl=biClientSelec?biClientSelec.nom:""; var emailCl=biClientSelec?(biClientSelec.email2||biClientSelec.email||""):"";
  var d=new Date();
  var JOURS=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  var MOIS=["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
  var dateStr=JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()]+" "+d.getFullYear();
  var auteur=utilisateurActuel?utilisateurActuel.nom:"Crea Nature";
  var prenom=nomCl?nomCl.split(" ")[0]:"";
  var listePr=biPrestsSelec.map(function(id){ var p=BI_PRESTS.find(function(x){return x.id===id;}); return p?"   - "+p.label:id; }).join("\n");
  var corps="Bonjour,\n\nNous vous confirmons notre intervention realisee ce "+dateStr+".\nPrestations effectuees :\n"+listePr+"."+(note?"\nRemarques : "+note:"")+"\nNous restons disponibles.\n\nCordialement\n"+nomComplet()+"\n"+SOCIETE_NOM+".";
  var sujet="Bon d'intervention - "+dateStr+(nomCl?" - "+nomCl:"");
  window.location.href="mailto:"+encodeURIComponent(emailCl)+"?cc="+encodeURIComponent("creanature@ymail.com")+"&subject="+encodeURIComponent(sujet)+"&body="+encodeURIComponent(corps);
  afficherToast("Mail prepare !");
  // Sauver dans historique BI
  db.collection("bi_historique").add({
    client: nomCl || "",
    email: emailCl || "",
    prests: biPrestsSelec.slice(),
    note: note,
    date: dateStr,
    auteur: utilisateurActuel ? utilisateurActuel.nom : "",
    timestamp: Date.now()
  }).then(function(){ chargerHistoriqueBI(); }).catch(function(){});
}
function reinitialiserBI(){
  biPrestsSelec=[]; biClientSelec=null;
  BI_PRESTS.forEach(function(p){ var b=document.getElementById("bip-"+p.id); if(b) b.classList.remove("actif"); });
  var n=document.getElementById("bi-note"); if(n) n.value="";
  var i=document.getElementById("bi-client-search"); if(i) i.value="";
  var a=document.getElementById("bi-client-selectionne"); if(a) a.style.display="none";
  var l=document.getElementById("bi-client-liste"); if(l) l.innerHTML="";
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// DEVIS : CONSULTER / MODIFIER / DUPLIQUER
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function chargerDevisDansCalculateur(d, dupliquer) {
  // R\u00E9initialiser d'abord
  reinitialiser();
  // Charger les prestations principales
  if (d.snapshot) {
    var snap = d.snapshot;
    // Prestations
    if (snap.prests) {
      snap.prests.forEach(function(p) {
        etat.prests.push(p);
        var btn = trouverEl("bp-" + p);
        if (btn) btn.classList.add("actif");
      });
    }
    if (snap.autre) { etat.autre = true; }
    if (snap.autreTexte) {
      etat.autreTexte = snap.autreTexte;
      var inp = trouverEl("txt-autre-main");
      if (inp) inp.value = snap.autreTexte;
      var z = trouverEl("zone-autre-main");
      if (z) z.classList.add("visible");
    }
    if (snap.interv) {
      etat.interv = snap.interv;
      for (var i = 1; i <= 4; i++) {
        var b = trouverEl("ib-" + i);
        if (b) b.classList.toggle("actif", i === snap.interv);
      }
    }
    if (snap.heures) {
      etat.heures = snap.heures;
      valeurs["fc-h"] = snap.heures;
      var vh = trouverEl("fv-h");
      if (vh) { vh.textContent = snap.heures; vh.classList.remove("dim"); }
    }
    if (snap.fournitures) {
      etat.fournitures = snap.fournitures;
      valeurs["fc-s"] = snap.fournitures;
      var vs = trouverEl("fv-s");
      if (vs) { vs.textContent = snap.fournitures; vs.classList.remove("dim"); }
    }
    if (snap.designation) {
      var md = trouverEl("main-designation");
      if (md) md.value = snap.designation;
    }
  }
  // Infos client
  if (d.client) { var ec = trouverEl("c-nom"); if (ec) ec.value = d.client; }
  if (d.adresse) { var ea = trouverEl("c-adresse"); if (ea) ea.value = d.adresse; }
  if (d.email) { var ee = trouverEl("c-email"); if (ee) ee.value = d.email; }
  if (d.tel) { var et = trouverEl("c-tel"); if (et) et.value = d.tel; }
  if (d.date) { var ed = trouverEl("d-date"); if (ed) ed.value = d.date; }
  // Num\u00E9ro : garder si modification, nouveau si dupliquer
  if (!dupliquer && d.num) {
    var en = trouverEl("d-num"); if (en) en.value = d.num;
  }
  calculer();
  // Aller sur l'onglet calc
  lancerCalculateur();
  allerVers("calc");
}

// Ajouter snapshot aux donn\u00E9es sauvegard\u00E9es dans Firebase
var _sauverDevisOrig = sauverDevisDansHistorique;
function sauverDevisDansHistorique(numDevis, nomClient, auteur2) {
  var n = new Date();
  var date = ("0"+n.getDate()).slice(-2)+"/"+("0"+(n.getMonth()+1)).slice(-2)+"/"+n.getFullYear();
  var auteurSave = utilisateurActuel ? utilisateurActuel.nom : "";
  var t = calculer();
  var snap = {
    prests: etat.prests.slice(),
    autre: etat.autre,
    autreTexte: etat.autreTexte,
    interv: etat.interv,
    heures: etat.heures,
    fournitures: etat.fournitures,
    designation: lireChamp("main-designation")
  };
  var data = {
    num: numDevis, client: nomClient || "Sans nom", date: date,
    totalHT: parseFloat(t.ht.toFixed(2)),
    totalTTC: parseFloat(t.ttc.toFixed(2)),
    timestamp: n.getTime(), auteur: auteurSave,
    adresse: lireChamp("c-adresse") || "",
    email: lireChamp("c-email") || "",
    tel: lireChamp("c-tel") || "",
    snapshot: snap
  };
  db.collection("devis").add(data).catch(function(e) {
    console.log("Erreur historique:", e);
  });
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// TRESORERIE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

var TRESOR_USERS = [
  { id: "alex", nom: "Alexandre", initiale: "A" },
  { id: "guil", nom: "Guillaume", initiale: "G" }
];

function ouvrirPanneauTresorerie() {
  var ancien = document.getElementById("panneau-tresor");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-tresor";
  pn.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";
  // Header
  pn.innerHTML =
    "<div style='background:linear-gradient(135deg,#18181F,#111116);padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0'>" +
      "<span style='font-size:17px;font-weight:700;color:#FFFFFF'>Tresorerie</span>" +
      "<button onclick='fermerPanneauTresorerie()' style='background:rgba(255,255,255,.1);border:none;color:#FFFFFF;padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif'>Fermer</button>" +
    "</div>" +
    "<div id='tresor-body' style='flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px;padding-bottom:calc(env(safe-area-inset-bottom,34px)+20px)'>" +
      "<div style='text-align:center;color:#86868B;padding:30px;font-size:14px'>Chargement...</div>" +
    "</div>";
  document.body.appendChild(pn);
  chargerTresorerie();
}

function fermerPanneauTresorerie() {
  var pn = document.getElementById("panneau-tresor");
  if (pn) pn.remove();
  afficherBottomNav("accueil");
}

function chargerTresorerie() {
  var body = document.getElementById("tresor-body");
  if (!body) return;
  db.collection("tresorerie").get().then(function(snap) {
    var data = {};
    snap.forEach(function(doc) { data[doc.id] = doc.data(); });
    // Charger aussi les contrats recurrents
    db.collection("contrats").get().then(function(snapC) {
      var contrats = [];
      snapC.forEach(function(doc) { contrats.push(Object.assign({_id: doc.id}, doc.data())); });
      afficherTresorerie(data, contrats);
    }).catch(function() { afficherTresorerie(data, []); });
  }).catch(function(e) {
    if (body) body.innerHTML = "<div style='text-align:center;color:var(--erreur);padding:20px'>Erreur: " + e.message + "</div>";
  });
}

// Pre-remplir les contrats existants (depuis la liste fournie)
function importerContratsInitiaux() {
  if (!confirm("Ajouter les 9 contrats de la liste (Arcese, ENA 2, DPD, SDC, Mutuelle SMPS, Duhaillier, SCI Epermailles, PIK, Verheyden) ?")) return;
  var contratsAImporter = [
    { client: "Arcese DP World France", montantMensuel: 2232.30, periodicite: "mensuel" },
    { client: "ENA 2 c/o Immobilier Gestion (SCI)", montantMensuel: 574.50, periodicite: "mensuel" },
    { client: "DPD France", montantMensuel: 517.81, periodicite: "mensuel" },
    { client: "SDC Les Capucins c/o Cabinet Montesquieu", montantMensuel: 892.00, periodicite: "mensuel" },
    { client: "Mutuelle SMPS", montantMensuel: 180.00, periodicite: "mensuel" },
    { client: "Duhaillier Cyril", montantMensuel: 72.00, periodicite: "mensuel" },
    { client: "SCI Des Epermailles", montantMensuel: 132.50, periodicite: "trimestriel" },
    { client: "PIK", montantMensuel: 155.00, periodicite: "trimestriel" },
    { client: "Verheyden", montantMensuel: 190.00, periodicite: "trimestriel" }
  ];
  afficherToast("Import en cours...");
  var promesses = contratsAImporter.map(function(ct) {
    return db.collection("contrats").add({
      type: "recurrent",
      periodicite: ct.periodicite,
      client: ct.client,
      montantMensuel: ct.montantMensuel,
      date: new Date().toISOString()
    });
  });
  Promise.all(promesses).then(function() {
    afficherToast("9 contrats importes !");
    chargerTresorerie();
  }).catch(function() {
    afficherToast("Erreur lors de l'import");
  });
}


function afficherTresorerie(data, contrats) {
  var body = document.getElementById("tresor-body");
  if (!body) return;
  body.innerHTML = "";

  TRESOR_USERS.forEach(function(usr) {
    var uid = usr.id;
    var d = data[uid] || { encaissements: [], avances: 0, avancesHisto: [], archives: {} };
    var encaissements = d.encaissements || [];
    // Migration : si avances est un nombre mais pas d'historique, on garde le nombre
    var avancesHisto = d.avancesHisto || [];
    var avances = 0;
    if (avancesHisto.length > 0) {
      avances = avancesHisto.reduce(function(s, a) { return s + (a.montant || 0); }, 0);
    } else {
      avances = d.avances || 0;
    }
    if (avances < 0) avances = 0;
    var archives = d.archives || {};
    // Totaux = encaissements actifs + archives (les archives ne se decomptent pas)
    var tousEnc = encaissements.slice();
    if (archives) {
      Object.keys(archives).forEach(function(an) {
        (archives[an] || []).forEach(function(e) { tousEnc.push(e); });
      });
    }
    var totalEnc = tousEnc.reduce(function(s, e) { return s + (e.valide ? (e.montant || 0) : 0); }, 0);
    var totalEnc2 = tousEnc.reduce(function(s, e) { return s + (e.montant || 0); }, 0);

    var section = document.createElement("div");
    section.style.cssText = "background:var(--blanc);border-radius:16px;padding:16px;margin-bottom:16px";

    section.innerHTML =
      "<div style='display:flex;align-items:center;gap:10px;margin-bottom:12px'>" +
        "<div style='width:36px;height:36px;border-radius:18px;background:linear-gradient(135deg,#D4AF37,#B8860B);display:flex;align-items:center;justify-content:center;font-size:16px;color:#FFFFFF;font-weight:700'>" + usr.initiale + "</div>" +
        "<span style='font-size:16px;font-weight:700;color:#1D1D1F'>" + usr.nom + "</span>" +
      "</div>" +
      "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px'>" +
        "<div style='background:#F5F5F7;border-radius:10px;padding:10px;text-align:center'>" +
          "<div style='font-size:14px;font-weight:700;color:#0071E3'>" + totalEnc2.toFixed(2) + " EUR</div>" +
          "<div style='font-size:9px;color:#86868B;margin-top:2px;text-transform:uppercase;letter-spacing:.05em'>Total facture</div>" +
        "</div>" +
        "<div style='background:#F5F5F7;border-radius:10px;padding:10px;text-align:center'>" +
          "<div style='font-size:14px;font-weight:700;color:#16A34A'>" + totalEnc.toFixed(2) + " EUR</div>" +
          "<div style='font-size:9px;color:#86868B;margin-top:2px;text-transform:uppercase;letter-spacing:.05em'>Encaisse valide</div>" +
        "</div>" +
        "<div style='background:#F5F5F7;border-radius:10px;padding:10px;text-align:center'>" +
          "<div style='font-size:18px;font-weight:700;color:#FF6B35'>" + avances.toFixed(2) + " EUR</div>" +
          "<div style='font-size:10px;color:#86868B;margin-top:2px;text-transform:uppercase;letter-spacing:.05em'>Avances</div>" +
        "</div>" +
      "</div>";

    // \u2500\u2500 Liste encaissements (annee en cours) \u2500\u2500
    var listDiv = document.createElement("div");
    listDiv.style.cssText = "margin-bottom:10px";
    var titleRow = document.createElement("div");
    titleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px";
    var titleEnc = document.createElement("div");
    titleEnc.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3)";
    titleEnc.textContent = "Encaissements clients";
    titleRow.appendChild(titleEnc);
    // Bouton archives (si des archives existent)
    var anneesArchivees = Object.keys(archives).sort().reverse();
    if (anneesArchivees.length > 0) {
      var btnArch = document.createElement("button");
      btnArch.style.cssText = "background:rgba(100,181,246,.15);border:none;color:var(--bleu);padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
      btnArch.textContent = "Archives (" + anneesArchivees.length + ")";
      (function(userId, arch) {
        btnArch.onclick = function() { ouvrirArchivesEncaissements(usr.nom, arch, userId, data); };
      })(uid, archives);
      titleRow.appendChild(btnArch);
    }
    listDiv.appendChild(titleRow);

    encaissements.forEach(function(enc, idx) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--fond);border-radius:8px;padding:8px 10px;margin-bottom:5px";
      // Case de selection pour archivage
      var selBox = document.createElement("button");
      var estSelec = (window._encSelec && window._encSelec[uid] && window._encSelec[uid].indexOf(idx) >= 0);
      selBox.style.cssText = "width:20px;height:20px;border-radius:5px;border:2px solid " + (estSelec ? "var(--bleu)" : "rgba(0,0,0,.12)") + ";background:" + (estSelec ? "var(--bleu)" : "none") + ";cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--blanc)";
      selBox.innerHTML = estSelec ? "&#x2713;" : "";
      (function(userId, i) {
        selBox.onclick = function() {
          if (!window._encSelec) window._encSelec = {};
          if (!window._encSelec[userId]) window._encSelec[userId] = [];
          var p = window._encSelec[userId].indexOf(i);
          if (p >= 0) window._encSelec[userId].splice(p, 1);
          else window._encSelec[userId].push(i);
          chargerTresorerie();
        };
      })(uid, idx);
      row.appendChild(selBox);
      var cb = document.createElement("button");
      cb.style.cssText = "width:22px;height:22px;border-radius:11px;border:2px solid " + (enc.valide ? "var(--succes)" : "rgba(0,0,0,.12)") + ";background:" + (enc.valide ? "var(--succes)" : "none") + ";cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--blanc)";
      cb.innerHTML = enc.valide ? "&#x2713;" : "";
      (function(userId, i, v) {
        cb.onclick = function() {
          var d2 = data[userId] || { encaissements: [], avances: 0 };
          d2.encaissements[i].valide = !v;
          db.collection("tresorerie").doc(userId).set(d2).then(function() { chargerTresorerie(); });
        };
      })(uid, idx, enc.valide);
      var info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0";
      info.innerHTML = "<div style='font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(enc.client || "") + "</div>" +
        "<div style='font-size:11px;color:#86868B'>" + enc.date + "</div>";
      var mont = document.createElement("div");
      mont.style.cssText = "font-size:14px;font-weight:700;color:" + (enc.valide ? "var(--succes)" : "#AEAEB2") + ";flex-shrink:0";
      mont.textContent = (enc.montant || 0).toFixed(2) + " EUR";
      var bDel = document.createElement("button");
      bDel.style.cssText = "background:rgba(255,59,48,.15);border:none;color:var(--erreur);width:24px;height:24px;border-radius:12px;font-size:14px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
      bDel.innerHTML = "&#x00D7;";
      (function(userId, i) {
        bDel.onclick = function() {
          if (!confirm("Supprimer cet encaissement ?")) return;
          var d2 = data[userId] || { encaissements: [], avances: 0 };
          d2.encaissements.splice(i, 1);
          db.collection("tresorerie").doc(userId).set(d2).then(function() { chargerTresorerie(); });
        };
      })(uid, idx);
      row.appendChild(cb); row.appendChild(info); row.appendChild(mont); row.appendChild(bDel);
      listDiv.appendChild(row);
    });

    // Formulaire ajout encaissement
    var formEnc = document.createElement("div");
    formEnc.style.cssText = "display:flex;gap:6px;margin-top:6px";
    var inpClient = document.createElement("input");
    inpClient.type = "text"; inpClient.placeholder = "Client";
    inpClient.style.cssText = "flex:1;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    var inpMont = document.createElement("input");
    inpMont.type = "number"; inpMont.placeholder = "EUR";
    inpMont.style.cssText = "width:80px;padding:8px 8px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    var btnAdd = document.createElement("button");
    btnAdd.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0";
    btnAdd.textContent = "+ Ajouter";
    (function(userId) {
      btnAdd.onclick = function() {
        var client = inpClient.value.trim();
        var montant = parseFloat(inpMont.value);
        if (!client || isNaN(montant) || montant <= 0) { afficherToast("Remplis client et montant"); return; }
        var d2 = data[userId] || { encaissements: [], avances: 0 };
        if (!d2.encaissements) d2.encaissements = [];
        var now = new Date();
        d2.encaissements.push({
          client: client, montant: montant, valide: false,
          date: ("0"+now.getDate()).slice(-2)+"/"+("0"+(now.getMonth()+1)).slice(-2)+"/"+now.getFullYear()
        });
        db.collection("tresorerie").doc(userId).set(d2).then(function() {
          inpClient.value = ""; inpMont.value = ""; chargerTresorerie();
        });
      };
    })(uid);
    formEnc.appendChild(inpClient); formEnc.appendChild(inpMont); formEnc.appendChild(btnAdd);
    listDiv.appendChild(formEnc);

    // Bouton archiver les encaissements selectionnes
    if (encaissements.length > 0) {
      var selec = (window._encSelec && window._encSelec[uid]) ? window._encSelec[uid].slice() : [];
      var nbSelec = selec.length;
      var barArch = document.createElement("div");
      barArch.style.cssText = "display:flex;gap:6px;margin-top:8px";
      var btnArchiver = document.createElement("button");
      btnArchiver.style.cssText = "flex:1;background:rgba(100,181,246,.15);border:1px solid rgba(100,181,246,.3);color:var(--bleu);padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
      btnArchiver.textContent = nbSelec > 0 ? ("Archiver la selection (" + nbSelec + ")") : "Archiver (selectionne d'abord)";
      (function(userId, encs) {
        btnArchiver.onclick = function() {
          var sel = (window._encSelec && window._encSelec[userId]) ? window._encSelec[userId].slice() : [];
          if (sel.length === 0) { afficherToast("Coche les encaissements a archiver"); return; }
          var annee = new Date().getFullYear();
          var anneeArch = prompt("Archiver ces " + sel.length + " encaissement(s) sous quelle annee ?", String(annee));
          if (!anneeArch) return;
          anneeArch = anneeArch.trim();
          if (!confirm("Archiver " + sel.length + " encaissement(s) sous '" + anneeArch + "' ? Ils seront retires de la liste active.")) return;
          var d2 = data[userId] || { encaissements: [], avances: 0 };
          if (!d2.archives) d2.archives = {};
          if (!d2.archives[anneeArch]) d2.archives[anneeArch] = [];
          // Trier les index par ordre decroissant pour splice sans decalage
          sel.sort(function(a,b){ return b - a; });
          var aArchiver = [];
          sel.forEach(function(i) {
            if (d2.encaissements[i]) { aArchiver.push(d2.encaissements[i]); d2.encaissements.splice(i, 1); }
          });
          d2.archives[anneeArch] = d2.archives[anneeArch].concat(aArchiver.reverse());
          if (window._encSelec) window._encSelec[userId] = [];
          db.collection("tresorerie").doc(userId).set(d2).then(function() {
            afficherToast(aArchiver.length + " encaissement(s) archive(s) sous " + anneeArch);
            chargerTresorerie();
          });
        };
      })(uid, encaissements);
      barArch.appendChild(btnArchiver);
      // Bouton tout selectionner / deselectionner
      var btnToutSel = document.createElement("button");
      btnToutSel.style.cssText = "background:rgba(255,255,255,.06);border:1px solid rgba(0,0,0,.1);color:var(--txt-3);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0";
      btnToutSel.textContent = (nbSelec === encaissements.length && nbSelec > 0) ? "Aucun" : "Tout";
      (function(userId, total) {
        btnToutSel.onclick = function() {
          if (!window._encSelec) window._encSelec = {};
          var cur = window._encSelec[userId] || [];
          if (cur.length === total) { window._encSelec[userId] = []; }
          else { window._encSelec[userId] = []; for (var k = 0; k < total; k++) window._encSelec[userId].push(k); }
          chargerTresorerie();
        };
      })(uid, encaissements.length);
      barArch.appendChild(btnToutSel);
      listDiv.appendChild(barArch);
    }
    section.appendChild(listDiv);

    // \u2500\u2500 Section avances avec historique \u2500\u2500
    var avDiv = document.createElement("div");
    avDiv.style.cssText = "margin-top:4px";
    var avTitleRow = document.createElement("div");
    avTitleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px";
    var titleAv = document.createElement("div");
    titleAv.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3)";
    titleAv.textContent = "Avances a la societe";
    avTitleRow.appendChild(titleAv);
    // Bouton historique des avances
    if (avancesHisto.length > 0) {
      var btnHistoAv = document.createElement("button");
      btnHistoAv.style.cssText = "background:var(--violet-doux);border:none;color:#FF6B35;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
      btnHistoAv.textContent = "Historique (" + avancesHisto.length + ")";
      (function(userId, histo, nom) {
        btnHistoAv.onclick = function() { ouvrirHistoriqueAvances(nom, histo, userId, data); };
      })(uid, avancesHisto, usr.nom);
      avTitleRow.appendChild(btnHistoAv);
    }
    avDiv.appendChild(avTitleRow);

    // Formulaire avances : montant + libelle
    var formAv = document.createElement("div");
    formAv.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-bottom:8px";
    var ligne1 = document.createElement("div");
    ligne1.style.cssText = "display:flex;gap:6px";
    var inpAv = document.createElement("input");
    inpAv.type = "number"; inpAv.placeholder = "Montant EUR (+/-)";
    inpAv.style.cssText = "width:130px;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    var inpLibelle = document.createElement("input");
    inpLibelle.type = "text"; inpLibelle.placeholder = "Motif (ex: achat carburant)";
    inpLibelle.style.cssText = "flex:1;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    ligne1.appendChild(inpAv); ligne1.appendChild(inpLibelle);
    var btnAv = document.createElement("button");
    btnAv.style.cssText = "background:var(--violet);border:none;color:var(--blanc);padding:9px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    btnAv.textContent = "Enregistrer le mouvement";
    formAv.appendChild(ligne1); formAv.appendChild(btnAv);
    (function(userId, histoActuel) {
      btnAv.onclick = function() {
        var montant = parseFloat(inpAv.value);
        var libelle = inpLibelle.value.trim();
        if (isNaN(montant) || montant === 0) { afficherToast("Entre un montant"); return; }
        if (!libelle) { afficherToast("Indique le motif du mouvement"); return; }
        var d2 = data[userId] || { encaissements: [], avances: 0 };
        if (!d2.avancesHisto) {
          d2.avancesHisto = [];
          // Migration : si un ancien total existe, on le convertit en 1ere entree
          if (d2.avances && d2.avances > 0) {
            d2.avancesHisto.push({ montant: d2.avances, libelle: "Solde initial", date: "-" });
          }
        }
        var now = new Date();
        d2.avancesHisto.push({
          montant: montant, libelle: libelle,
          date: ("0"+now.getDate()).slice(-2)+"/"+("0"+(now.getMonth()+1)).slice(-2)+"/"+now.getFullYear()
        });
        // Recalculer le total
        d2.avances = d2.avancesHisto.reduce(function(s,a){ return s+(a.montant||0); }, 0);
        if (d2.avances < 0) d2.avances = 0;
        db.collection("tresorerie").doc(userId).set(d2).then(function() {
          inpAv.value = ""; inpLibelle.value = ""; chargerTresorerie();
        });
      };
    })(uid, avancesHisto);
    avDiv.appendChild(formAv);
    var avNote = document.createElement("div");
    avNote.style.cssText = "font-size:11px;color:var(--txt-2);text-align:center;margin-top:2px";
    avNote.textContent = "Montant positif = avance ajoutee, negatif = remboursement";
    avDiv.appendChild(avNote);
    section.appendChild(avDiv);
    body.appendChild(section);
  });

  // ===== RUBRIQUE CONTRATS RECURRENTS =====
  if (!contrats) contrats = [];
  var sectionC = document.createElement("div");
  sectionC.style.cssText = "background:var(--blanc);border-radius:16px;padding:16px;margin-bottom:16px";
  var totalMensuelContrats = 0, totalMensuelContratsHT = 0;
  contrats.forEach(function(ct) {
    if (ct.type !== "ponctuel") {
      var m = ct.montantMensuel || 0;
      totalMensuelContrats += m;
      totalMensuelContratsHT += montantHT(m, tauxTVA(ct.client));
    }
  });
  var totalAnnuelContrats = totalMensuelContrats * 12;
  var totalAnnuelContratsHT = totalMensuelContratsHT * 12;
  var totalPonctuels = 0, totalPonctuelsHT = 0;
  contrats.forEach(function(ct) {
    if (ct.type === "ponctuel") {
      var m = ct.montant || 0;
      totalPonctuels += m;
      totalPonctuelsHT += montantHT(m, tauxTVA(ct.libelle));
    }
  });

  sectionC.innerHTML =
    "<div style='display:flex;align-items:center;gap:10px;margin-bottom:14px'>" +
      "<div style='width:36px;height:36px;border-radius:18px;background:linear-gradient(135deg,#0071E3,#3A6FD8);display:flex;align-items:center;justify-content:center;font-size:16px;color:#FFFFFF'>\u21BB</div>" +
      "<span style='font-size:16px;font-weight:700;color:#1D1D1F'>Contrats recurrents</span>" +
    "</div>";

  var listeC = document.createElement("div");
  var titreM = document.createElement("div");
  titreM.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin-bottom:8px";
  titreM.textContent = "Contrats";
  listeC.appendChild(titreM);
  // Bouton import initial (si aucun contrat recurrent)
  if (contrats.filter(function(ct){ return ct.type !== "ponctuel"; }).length === 0) {
    var btnImport = document.createElement("button");
    btnImport.style.cssText = "width:100%;padding:10px;border-radius:8px;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:var(--violet-2);font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:8px";
    btnImport.textContent = "Importer mes 9 contrats existants";
    btnImport.onclick = importerContratsInitiaux;
    listeC.appendChild(btnImport);
  }

  contrats.filter(function(ct){ return ct.type !== "ponctuel"; }).forEach(function(ct) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--fond);border-radius:8px;padding:10px 12px;margin-bottom:5px";
    var info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0";
    var mensuel = ct.montantMensuel || 0;
    var estTrim = ct.periodicite === "trimestriel";
    var tvaCt = tauxTVA(ct.client);
    var mensuelHT = montantHT(mensuel, tvaCt);
    var ligneMontant;
    if (estTrim) {
      ligneMontant = (mensuel * 3).toFixed(2) + " EUR TTC/trim \u00B7 " + (mensuel * 12).toFixed(2) + " TTC/an";
    } else {
      ligneMontant = mensuel.toFixed(2) + " EUR TTC/mois \u00B7 " + (mensuel * 12).toFixed(2) + " TTC/an";
    }
    var ligneHT = mensuelHT.toFixed(2) + " EUR HT/mois \u00B7 " + (mensuelHT * 12).toFixed(2) + " HT/an (TVA " + Math.round(tvaCt*100) + "%)";
    var badge = estTrim ? "<span style='font-size:9px;font-weight:700;color:var(--violet-2);background:rgba(168,85,247,.15);padding:1px 6px;border-radius:6px;margin-left:6px'>TRIM</span>" : "";
    info.innerHTML = "<div style='font-size:14px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(ct.client || "") + badge + "</div>" +
      "<div style='font-size:11px;color:#86868B;margin-top:2px'>" + ligneMontant + "</div>" +
      "<div style='font-size:11px;color:#16A34A;margin-top:1px;font-weight:600'>" + ligneHT + "</div>";
    var bDel = document.createElement("button");
    bDel.style.cssText = "background:rgba(255,59,48,.15);border:none;color:var(--erreur);width:26px;height:26px;border-radius:13px;font-size:14px;cursor:pointer;flex-shrink:0";
    bDel.innerHTML = "&#x00D7;";
    (function(id) {
      bDel.onclick = function() {
        if (!confirm("Supprimer ce contrat ?")) return;
        db.collection("contrats").doc(id).delete().then(function(){ chargerTresorerie(); }).catch(function(){});
      };
    })(ct._id);
    row.appendChild(info); row.appendChild(bDel);
    listeC.appendChild(row);
  });

  // Formulaire ajout contrat (avec choix mensuel/trimestriel)
  var formWrap = document.createElement("div");
  formWrap.style.cssText = "margin-top:8px;margin-bottom:14px";
  var formC = document.createElement("div");
  formC.style.cssText = "display:flex;gap:6px;margin-bottom:6px";
  var inpClientC = document.createElement("input");
  inpClientC.type = "text"; inpClientC.placeholder = "Nom du client";
  inpClientC.style.cssText = "flex:1;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
  var inpMontC = document.createElement("input");
  inpMontC.type = "number"; inpMontC.placeholder = "Montant";
  inpMontC.style.cssText = "width:85px;padding:8px 8px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
  formC.appendChild(inpClientC); formC.appendChild(inpMontC);
  formWrap.appendChild(formC);
  // Ligne 2 : choix periodicite + bouton
  var formC2 = document.createElement("div");
  formC2.style.cssText = "display:flex;gap:6px";
  var selPeriode = document.createElement("select");
  selPeriode.style.cssText = "flex:1;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
  selPeriode.innerHTML = "<option value='mensuel'>Montant mensuel</option><option value='trimestriel'>Montant trimestriel</option>";
  formC2.appendChild(selPeriode);
  var btnAddC = document.createElement("button");
  btnAddC.style.cssText = "background:linear-gradient(135deg,var(--bleu),#3A6FD8);border:none;color:var(--blanc);padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0";
  btnAddC.textContent = "+ Ajouter";
  btnAddC.onclick = function() {
    var client = inpClientC.value.trim();
    var montant = parseFloat(inpMontC.value);
    if (!client || isNaN(montant) || montant <= 0) { afficherToast("Remplis client et montant"); return; }
    var periodicite = selPeriode.value;
    var montantMensuel = (periodicite === "trimestriel") ? (montant / 3) : montant;
    db.collection("contrats").add({ type: "recurrent", periodicite: periodicite, client: client, montantMensuel: montantMensuel, date: new Date().toISOString() }).then(function() {
      afficherToast("Contrat ajoute"); chargerTresorerie();
    }).catch(function(){ afficherToast("Erreur"); });
  };
  formC2.appendChild(btnAddC);
  formWrap.appendChild(formC2);
  listeC.appendChild(formWrap);

  // Montants ponctuels
  var titreP = document.createElement("div");
  titreP.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-3);margin-bottom:8px";
  titreP.textContent = "Montants ponctuels";
  listeC.appendChild(titreP);

  contrats.filter(function(ct){ return ct.type === "ponctuel"; }).forEach(function(ct) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--fond);border-radius:8px;padding:10px 12px;margin-bottom:5px";
    var info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0";
    var tvaP = tauxTVA(ct.libelle);
    var montantPHT = montantHT(ct.montant||0, tvaP);
    info.innerHTML = "<div style='font-size:14px;font-weight:600;color:var(--txt)'>" + echapper(ct.libelle || "Divers") + "</div>" +
      "<div style='font-size:11px;color:#86868B;margin-top:2px'>" + (ct.montant||0).toFixed(2) + " EUR TTC \u00B7 " + echapper(ct.periode || "") + "</div>" +
      "<div style='font-size:11px;color:#16A34A;margin-top:1px;font-weight:600'>" + montantPHT.toFixed(2) + " EUR HT (TVA " + Math.round(tvaP*100) + "%)</div>";
    var bDel = document.createElement("button");
    bDel.style.cssText = "background:rgba(255,59,48,.15);border:none;color:var(--erreur);width:26px;height:26px;border-radius:13px;font-size:14px;cursor:pointer;flex-shrink:0";
    bDel.innerHTML = "&#x00D7;";
    (function(id) {
      bDel.onclick = function() {
        if (!confirm("Supprimer ce montant ?")) return;
        db.collection("contrats").doc(id).delete().then(function(){ chargerTresorerie(); }).catch(function(){});
      };
    })(ct._id);
    row.appendChild(info); row.appendChild(bDel);
    listeC.appendChild(row);
  });

  var formP = document.createElement("div");
  formP.style.cssText = "display:flex;gap:6px;margin-top:6px;margin-bottom:6px";
  var inpLibP = document.createElement("input");
  inpLibP.type = "text"; inpLibP.placeholder = "Libelle (ex: prime)";
  inpLibP.style.cssText = "flex:1;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
  var inpMontP = document.createElement("input");
  inpMontP.type = "number"; inpMontP.placeholder = "EUR";
  inpMontP.style.cssText = "width:80px;padding:8px 8px;border:1.5px solid rgba(0,0,0,.12);border-radius:8px;background:var(--fond);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
  var btnAddP = document.createElement("button");
  btnAddP.style.cssText = "background:rgba(91,141,239,.85);border:none;color:var(--blanc);padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;flex-shrink:0";
  btnAddP.textContent = "+ Ajouter";
  btnAddP.onclick = function() {
    var lib = inpLibP.value.trim();
    var montant = parseFloat(inpMontP.value);
    if (!lib || isNaN(montant) || montant === 0) { afficherToast("Remplis libelle et montant"); return; }
    var now = new Date();
    var periode = ("0"+(now.getMonth()+1)).slice(-2) + "/" + now.getFullYear();
    db.collection("contrats").add({ type: "ponctuel", libelle: lib, montant: montant, periode: periode, annee: now.getFullYear(), mois: now.getMonth(), date: now.toISOString() }).then(function() {
      afficherToast("Montant ajoute"); chargerTresorerie();
    }).catch(function(){ afficherToast("Erreur"); });
  };
  formP.appendChild(inpLibP); formP.appendChild(inpMontP); formP.appendChild(btnAddP);
  listeC.appendChild(formP);

  sectionC.appendChild(listeC);

  var totalRub = document.createElement("div");
  totalRub.style.cssText = "margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,.1)";
  totalRub.innerHTML =
    "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span style='font-size:12px;color:#86868B'>Contrats (annuel)</span><span style='font-size:12px;color:#86868B'>" + totalAnnuelContrats.toFixed(2) + " TTC</span></div>" +
    "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span style='font-size:12px;color:#86868B'>Contrats HT (annuel)</span><span style='font-size:13px;font-weight:600;color:#16A34A'>" + totalAnnuelContratsHT.toFixed(2) + " HT</span></div>" +
    "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span style='font-size:12px;color:#86868B'>Ponctuels</span><span style='font-size:12px;color:#86868B'>" + totalPonctuels.toFixed(2) + " TTC</span></div>" +
    "<div style='display:flex;justify-content:space-between;margin-bottom:8px'><span style='font-size:12px;color:#86868B'>Ponctuels HT</span><span style='font-size:13px;font-weight:600;color:#16A34A'>" + totalPonctuelsHT.toFixed(2) + " HT</span></div>" +
    "<div style='display:flex;justify-content:space-between;align-items:center;background:rgba(139,92,246,.12);border-radius:10px;padding:12px'><span style='font-size:12px;font-weight:700;color:#9333EA;text-transform:uppercase;letter-spacing:.04em'>Total recurrents HT</span><span style='font-size:18px;font-weight:700;color:#9333EA'>" + (totalAnnuelContratsHT + totalPonctuelsHT).toFixed(2) + " EUR</span></div>";
  sectionC.appendChild(totalRub);
  body.appendChild(sectionC);


}

function ouvrirHistoriqueAvances(nom, histo, userId, data) {
  var pop = document.createElement("div");
  pop.id = "popup-histo-avances";
  pop.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:20px 20px 0 0;width:100%;max-width:430px;max-height:80vh;display:flex;flex-direction:column;padding-bottom:calc(env(safe-area-inset-bottom,34px)+10px)";
  var hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:18px 18px 14px;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>Historique des avances</div><div style='font-size:12px;color:var(--txt-3);margin-top:2px'>" + echapper(nom) + "</div></div>";
  var btnX = document.createElement("button");
  btnX.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--blanc);width:30px;height:30px;border-radius:15px;font-size:18px;cursor:pointer";
  btnX.innerHTML = "&#x00D7;";
  btnX.onclick = function() { pop.remove(); };
  hdr.appendChild(btnX);
  box.appendChild(hdr);
  var list = document.createElement("div");
  list.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px 16px";
  var total = 0;
  // Afficher du plus recent au plus ancien
  for (var i = histo.length - 1; i >= 0; i--) {
    var a = histo[i];
    total += (a.montant || 0);
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:10px;background:var(--fond);border-radius:10px;padding:12px;margin-bottom:6px";
    var pos = (a.montant || 0) >= 0;
    var ic = document.createElement("div");
    ic.style.cssText = "width:32px;height:32px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;background:" + (pos ? "rgba(76,217,100,.15)" : "rgba(255,59,48,.15)") + ";color:" + (pos ? "var(--succes)" : "var(--erreur)");
    ic.textContent = pos ? "+" : "-";
    var inf = document.createElement("div");
    inf.style.cssText = "flex:1;min-width:0";
    inf.innerHTML = "<div style='font-size:14px;font-weight:600;color:var(--txt)'>" + echapper(a.libelle || "Mouvement") + "</div><div style='font-size:11px;color:var(--txt-3);margin-top:2px'>" + echapper(a.date || "-") + "</div>";
    var mt = document.createElement("div");
    mt.style.cssText = "font-size:15px;font-weight:700;flex-shrink:0;color:" + (pos ? "var(--succes)" : "var(--erreur)");
    mt.textContent = (pos ? "+" : "") + (a.montant || 0).toFixed(2) + " EUR";
    var bDel = document.createElement("button");
    bDel.style.cssText = "background:rgba(255,59,48,.12);border:none;color:var(--erreur);width:26px;height:26px;border-radius:13px;font-size:14px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
    bDel.innerHTML = "&#x00D7;";
    (function(index) {
      bDel.onclick = function() {
        if (!confirm("Supprimer ce mouvement ?")) return;
        var d2 = data[userId];
        d2.avancesHisto.splice(index, 1);
        d2.avances = d2.avancesHisto.reduce(function(s,x){ return s+(x.montant||0); }, 0);
        if (d2.avances < 0) d2.avances = 0;
        db.collection("tresorerie").doc(userId).set(d2).then(function() {
          pop.remove(); chargerTresorerie();
        });
      };
    })(i);
    row.appendChild(ic); row.appendChild(inf); row.appendChild(mt); row.appendChild(bDel);
    list.appendChild(row);
  }
  // Total
  var totRow = document.createElement("div");
  totRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;background:var(--violet-doux);border-radius:10px;padding:14px;margin-top:8px";
  totRow.innerHTML = "<span style='font-size:13px;font-weight:700;color:#FF6B35;text-transform:uppercase;letter-spacing:.05em'>Total avances</span><span style='font-size:18px;font-weight:700;color:#FF6B35'>" + total.toFixed(2) + " EUR</span>";
  list.appendChild(totRow);
  box.appendChild(list);
  pop.appendChild(box);
  pop.onclick = function(e) { if (e.target === pop) pop.remove(); };
  document.body.appendChild(pop);
}

function ouvrirArchivesEncaissements(nom, archives, userId, data) {
  var pop = document.createElement("div");
  pop.id = "popup-archives-enc";
  pop.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:20px 20px 0 0;width:100%;max-width:430px;max-height:82vh;display:flex;flex-direction:column;padding-bottom:calc(env(safe-area-inset-bottom,34px)+10px)";
  var hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:18px 18px 14px;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>Encaissements archives</div><div style='font-size:12px;color:var(--txt-3);margin-top:2px'>" + echapper(nom) + "</div></div>";
  var btnX = document.createElement("button");
  btnX.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--blanc);width:30px;height:30px;border-radius:15px;font-size:18px;cursor:pointer";
  btnX.innerHTML = "&#x00D7;";
  btnX.onclick = function() { pop.remove(); };
  hdr.appendChild(btnX);
  box.appendChild(hdr);
  var list = document.createElement("div");
  list.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px 16px";
  var annees = Object.keys(archives).sort().reverse();
  annees.forEach(function(annee) {
    var encs = archives[annee] || [];
    var totalAnnee = encs.reduce(function(s,e){ return s+(e.montant||0); }, 0);
    var anneeHdr = document.createElement("button");
    anneeHdr.style.cssText = "width:100%;display:flex;align-items:center;justify-content:space-between;background:var(--fond);border:none;border-radius:10px;padding:13px 14px;margin-bottom:6px;cursor:pointer;font-family:-apple-system,sans-serif";
    anneeHdr.innerHTML = "<span style='font-size:15px;font-weight:700;color:var(--txt)'>" + echapper(annee) + " <span style='font-size:11px;color:var(--txt-3);font-weight:400'>(" + encs.length + ")</span></span><span style='font-size:14px;font-weight:700;color:var(--bleu)'>" + totalAnnee.toFixed(2) + " EUR</span>";
    var detail = document.createElement("div");
    detail.style.cssText = "display:none;margin-bottom:8px";
    encs.forEach(function(e, encIdx) {
      var r = document.createElement("div");
      r.style.cssText = "display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border-radius:8px;padding:8px 10px;margin-bottom:4px";
      var infoHtml = "<div style='flex:1;min-width:0'><div style='font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + echapper(e.client||"") + "</div><div style='font-size:11px;color:var(--txt-3)'>" + echapper(e.date||"") + "</div></div>" +
        "<div style='font-size:14px;font-weight:700;color:" + (e.valide?"#16A34A":"#AEAEB2") + "'>" + (e.montant||0).toFixed(2) + " EUR</div>";
      var infoDiv = document.createElement("div");
      infoDiv.style.cssText = "display:flex;align-items:center;gap:8px;flex:1;min-width:0";
      infoDiv.innerHTML = infoHtml;
      r.appendChild(infoDiv);
      // Bouton desarchiver une seule ligne
      var bUn = document.createElement("button");
      bUn.style.cssText = "background:rgba(76,217,100,.15);border:none;color:var(--succes);padding:5px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:-apple-system,sans-serif";
      bUn.textContent = "Restaurer";
      (function(an, i) {
        bUn.onclick = function() {
          if (!confirm("Remettre cet encaissement dans la liste active ?")) return;
          var d2 = data[userId] || { encaissements: [], avances: 0, archives: {} };
          if (!d2.encaissements) d2.encaissements = [];
          if (!d2.archives || !d2.archives[an]) return;
          var item = d2.archives[an].splice(i, 1)[0];
          if (item) d2.encaissements.push(item);
          if (d2.archives[an].length === 0) delete d2.archives[an];
          db.collection("tresorerie").doc(userId).set(d2).then(function() {
            afficherToast("Encaissement restaure");
            pop.remove();
            chargerTresorerie();
          });
        };
      })(annee, encIdx);
      r.appendChild(bUn);
      detail.appendChild(r);
    });
    // Bouton desarchiver toute l'annee
    var btnDesarch = document.createElement("button");
    btnDesarch.style.cssText = "width:100%;background:rgba(76,217,100,.12);border:1px solid rgba(76,217,100,.3);color:var(--succes);padding:9px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:8px";
    btnDesarch.textContent = "Tout restaurer dans la liste (" + annee + ")";
    (function(an) {
      btnDesarch.onclick = function() {
        if (!confirm("Remettre les " + (archives[an]||[]).length + " encaissement(s) de " + an + " dans la liste active ?")) return;
        var d2 = data[userId] || { encaissements: [], avances: 0, archives: {} };
        if (!d2.encaissements) d2.encaissements = [];
        if (!d2.archives || !d2.archives[an]) return;
        d2.encaissements = d2.encaissements.concat(d2.archives[an]);
        delete d2.archives[an];
        db.collection("tresorerie").doc(userId).set(d2).then(function() {
          afficherToast("Annee " + an + " restauree");
          pop.remove();
          chargerTresorerie();
        });
      };
    })(annee);
    detail.appendChild(btnDesarch);
    (function(det) {
      anneeHdr.onclick = function() { det.style.display = det.style.display === "none" ? "block" : "none"; };
    })(detail);
    list.appendChild(anneeHdr);
    list.appendChild(detail);
  });
  box.appendChild(list);
  pop.appendChild(box);
  pop.onclick = function(e) { if (e.target === pop) pop.remove(); };
  document.body.appendChild(pop);
}





// === RECAP MENSUEL (a s'envoyer ou montrer a Guillaume) ===
function genererRecapMensuel() {
  var now = new Date();
  var moisNoms = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  var moisCourant = now.getMonth();
  var anneeCourante = now.getFullYear();
  var moisNom = moisNoms[moisCourant];

  Promise.all([
    db.collection("devis").get(),
    db.collection("contrats").get(),
    db.collection("tresorerie").get()
  ]).then(function(res) {
    var snapD = res[0], snapC = res[1], snapT = res[2];

    // Devis valides du mois (allocatedTo)
    var devisValidesMois = 0, nbDevisValides = 0;
    snapD.forEach(function(doc){
      var d = doc.data();
      if (!d.allocatedTo) return;
      var ts = new Date(d.timestamp || 0);
      if (ts.getMonth() === moisCourant && ts.getFullYear() === anneeCourante) {
        devisValidesMois += (d.totalTTC || 0);
        nbDevisValides++;
      }
    });

    // Encaissements du mois par personne (net)
    var encMoisAlex = 0, encMoisGuil = 0;
    snapT.forEach(function(doc){
      var d = doc.data();
      var estAlex = (doc.id === "alex");
      var tousEnc = [];
      (d.encaissements || []).forEach(function(e){ tousEnc.push(e); });
      if (d.archives) { Object.keys(d.archives).forEach(function(an){ (d.archives[an]||[]).forEach(function(e){ tousEnc.push(e); }); }); }
      tousEnc.forEach(function(e){
        var parts = (e.date || "").split("/");
        if (parts.length === 3 && parseInt(parts[1],10)-1 === moisCourant && parseInt(parts[2],10) === anneeCourante) {
          if (estAlex) encMoisAlex += (e.montant||0); else encMoisGuil += (e.montant||0);
        }
      });
    });

    // Contrats Crea (equivalent mensuel HT)
    var contratsMensuelHT = 0, nbContrats = 0;
    snapC.forEach(function(doc){
      var ct = doc.data();
      if (ct.type === "ponctuel") return;
      contratsMensuelHT += montantHT(ct.montantMensuel||0, tauxTVA(ct.client));
      nbContrats++;
    });

    var caMoisTotal = encMoisAlex + encMoisGuil + contratsMensuelHT;

    // Construire le HTML du recap
    var h = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Recap " + moisNom + " " + anneeCourante + "<\/title>";
    h += "<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111116;font-size:13px;padding:28px 30px}@page{size:A4;margin:12mm}@media print{html{-webkit-print-color-adjust:exact;print-color-adjust:exact}}<\/style><\/head><body>";
    // En-tete
    h += "<div style='display:flex;justify-content:space-between;align-items:flex-start'>";
    h += "<div><div style='font-size:22px;font-weight:800;color:#111116'>" + echapper(SOCIETE_NOM.toUpperCase()) + "</div>";
    h += "<div style='font-size:10px;color:#7C3AED;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:2px'>Recap mensuel</div></div>";
    h += "<div style='text-align:right'><div style='font-size:24px;font-weight:800;background:linear-gradient(120deg,#D4AF37,#7C3AED);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#D4AF37'>" + moisNom + "</div>";
    h += "<div style='font-size:12px;color:#86868B;margin-top:2px'>" + anneeCourante + "</div></div></div>";
    h += "<div style='height:3px;background:linear-gradient(90deg,#D4AF37,#9333EA 60%,#7C3AED);border-radius:2px;margin:14px 0 20px'></div>";

    // Bloc CA total
    h += "<div style='background:linear-gradient(120deg,#D4AF37,#7C3AED);border-radius:12px;padding:20px;color:#FFFFFF;margin-bottom:20px'>";
    h += "<div style='font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.9'>Chiffre d'affaires du mois</div>";
    h += "<div style='font-size:32px;font-weight:800;margin-top:4px'>" + Math.round(caMoisTotal).toLocaleString('fr-FR') + " EUR</div></div>";

    // Detail par source
    h += "<div style='font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#86868B;margin-bottom:10px'>Detail par source</div>";
    h += "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>";
    var lignes = [
      ["Alexandre (EI)", encMoisAlex, "#D4AF37"],
      ["Guillaume (EI)", encMoisGuil, "#F59E0B"],
      ["Contrats Crea Nature (HT/mois)", contratsMensuelHT, "#7C3AED"]
    ];
    lignes.forEach(function(l){
      h += "<tr style='border-bottom:1px solid rgba(0,0,0,.08)'>";
      h += "<td style='padding:10px 4px'><span style='display:inline-block;width:10px;height:10px;border-radius:3px;background:" + l[2] + ";margin-right:8px'></span>" + l[0] + "</td>";
      h += "<td style='padding:10px 4px;text-align:right;font-weight:700'>" + l[1].toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + " EUR</td></tr>";
    });
    h += "</table>";

    // Indicateurs
    h += "<div style='display:flex;gap:12px;margin-bottom:20px'>";
    h += "<div style='flex:1;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px;text-align:center'><div style='font-size:26px;font-weight:800;color:#D4AF37'>" + nbDevisValides + "</div><div style='font-size:11px;color:#86868B;margin-top:2px'>Devis valides</div></div>";
    h += "<div style='flex:1;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px;text-align:center'><div style='font-size:26px;font-weight:800;color:#7C3AED'>" + nbContrats + "</div><div style='font-size:11px;color:#86868B;margin-top:2px'>Contrats actifs</div></div>";
    h += "<div style='flex:1;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px;text-align:center'><div style='font-size:20px;font-weight:800;color:#111116'>" + Math.round(devisValidesMois).toLocaleString('fr-FR') + "</div><div style='font-size:11px;color:#86868B;margin-top:2px'>EUR devis valides</div></div>";
    h += "</div>";

    h += "<div style='border-top:1px solid #ddd;padding-top:12px;text-align:center;font-size:10px;color:#aaa'>Genere le " + now.toLocaleDateString('fr-FR') + " - " + echapper(SOCIETE_NOM) + "</div>";
    h += "<\/body><\/html>";

    // Afficher dans un overlay avec bouton imprimer
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999999;background:#F5F5F7;display:flex;flex-direction:column";
    var barre = document.createElement("div");
    barre.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px) + 8px);background:linear-gradient(135deg,#18181F,#111116)";
    var btnF = document.createElement("button");
    btnF.style.cssText = "background:rgba(255,255,255,.1);border:none;color:#FFFFFF;padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    btnF.textContent = "Fermer";
    btnF.onclick = function(){ overlay.remove(); };
    var titre = document.createElement("div");
    titre.style.cssText = "flex:1;color:#FFFFFF;font-size:15px;font-weight:700";
    titre.textContent = "Recap " + moisNom;
    var btnPrint = document.createElement("button");
    btnPrint.style.cssText = "background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;color:#18181F;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;white-space:nowrap";
    btnPrint.textContent = "PDF / Envoyer";
    btnPrint.onclick = function(){ var fr = document.getElementById("iframe-recap"); if (fr && fr.contentWindow) fr.contentWindow.print(); };
    barre.appendChild(btnF); barre.appendChild(titre); barre.appendChild(btnPrint);
    var iframe = document.createElement("iframe");
    iframe.id = "iframe-recap";
    iframe.style.cssText = "flex:1;border:none;width:100%;background:#FFFFFF";
    iframe.srcdoc = h;
    overlay.appendChild(barre); overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  }).catch(function(e){
    afficherToast("Erreur recap: " + e.message);
  });
}

function voirDevisPDF(d) {
  var snap = d.snapshot || {};
  var num = d.num || "001";
  var date = d.date || "";
  var nom = d.client || "";
  var adresse = d.adresse || "";
  var email = d.email || "";
  var tel = d.tel || "";
  var ht = d.totalHT || 0;
  var ttc = d.totalTTC || 0;
  var tva = ttc - ht;
  var prests = snap.prests || [];
  var labelPrest = prests.map(function(p) { return nomPrests[p] || p; });
  if (snap.autre && snap.autreTexte) labelPrest.push(snap.autreTexte);
  var label = labelPrest.length > 0 ? labelPrest.join(", ") : "Prestation";
  if (snap.designation) label = label + " - " + snap.designation;
  var lignesHTML = "<tr style='background:#FFFFFF'><td style='padding:8px 12px;font-size:12px'>" + echapper(label) + "</td><td style='padding:8px 12px;text-align:right;font-weight:600;font-size:12px;white-space:nowrap'>" + ht.toFixed(2) + " EUR</td></tr>";
  var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<title>Devis " + echapper(num) + "<\/title>";
  html += "<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#1C1C1E;font-size:13px;padding:28px 30px}@page{size:A4;margin:10mm 10mm 0 10mm}@media print{body{padding:0}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}}<\/style><\/head><body>";
  html += "<div style='display:flex;justify-content:space-between;align-items:flex-start'>";
  html += "<div><div style='font-size:22px;font-weight:800;letter-spacing:-.5px;color:#111116'>" + echapper(SOCIETE_NOM.toUpperCase()) + "</div>";
  html += "<div style='font-size:10px;color:#7C3AED;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:2px'>Paysagiste</div></div>";
  html += "<div style='text-align:right'><div style='font-size:28px;font-weight:800;letter-spacing:1px;background:linear-gradient(120deg,#D4AF37,#7C3AED);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#D4AF37'>DEVIS</div>";
  html += "<div style='font-size:11px;color:#86868B;margin-top:4px'>N&deg; " + echapper(num) + "</div>";
  html += "<div style='font-size:11px;color:#86868B'>Date : " + echapper(date) + "</div></div></div>";
  html += "<div style='height:3px;background:linear-gradient(90deg,#D4AF37 0%,#9333EA 60%,#7C3AED 100%);border-radius:2px;margin:12px 0'></div>";
  html += "<div style='display:flex;justify-content:space-between;gap:16px;margin-bottom:16px'>";
  html += "<div><div style='font-size:13px;font-weight:700;margin-bottom:3px'>CREA NATURE</div>";
  html += "<div style='font-size:10px;color:#6E6E73;line-height:1.8'>48, Rue Alfred et Edme Sommier<br/>77950 MAINCY FRANCE<br/>creanature@ymail.com</div></div>";
  html += "<div style='background:#FAF8F5;border-radius:8px;padding:12px 14px;min-width:185px'>";
  html += "<div style='font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#86868B;margin-bottom:5px'>Client</div>";
  if (nom) html += "<div style='font-size:13px;font-weight:700;margin-bottom:2px'>" + echapper(nom) + "</div>";
  if (adresse) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(adresse) + "</div>";
  if (email) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(email) + "</div>";
  if (tel) html += "<div style='font-size:11px;color:#6E6E73'>" + echapper(tel) + "</div>";
  html += "</div></div>";
  html += "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>";
  html += "<thead><tr style='background:#D4AF37'><th style='padding:8px 12px;text-align:left;color:#FFFFFF;font-size:11px;font-weight:600'>Designation</th><th style='padding:8px 12px;text-align:right;color:#FFFFFF;font-size:11px;font-weight:600'>Montant HT</th></tr></thead>";
  html += "<tbody>" + lignesHTML + "</tbody></table>";
  html += "<div style='display:flex;justify-content:flex-end;margin-bottom:18px'>";
  html += "<div style='width:220px;border:1px solid rgba(0,0,0,.08);border-radius:8px;overflow:hidden'>";
  html += "<div style='display:flex;justify-content:space-between;padding:8px 14px;border-bottom:.5px solid rgba(0,0,0,.08);font-size:13px'><span style='color:#6E6E73'>Total HT</span><span style='font-weight:600'>" + ht.toFixed(2) + " EUR</span></div>";
  html += "<div style='display:flex;justify-content:space-between;padding:8px 14px;border-bottom:.5px solid rgba(0,0,0,.08);font-size:13px'><span style='color:#6E6E73'>TVA (20%)</span><span style='font-weight:600'>" + tva.toFixed(2) + " EUR</span></div>";
  html += "<div style='display:flex;justify-content:space-between;padding:12px 14px;background:linear-gradient(120deg,#D4AF37,#7C3AED)'><span style='color:#FFFFFF;font-weight:700;font-size:15px'>Total TTC</span><span style='color:#FFFFFF;font-weight:800;font-size:15px'>" + ttc.toFixed(2) + " EUR</span></div>";
  html += "</div></div>";
  html += "<div style='border-top:1px solid #ddd;padding-top:10px;margin-top:16px;text-align:center;font-size:8.5px;color:#86868B;line-height:1.8'>";
  html += "CREA NATURE &bull; 48, Rue Alfred et Edme Sommier, 77950 MAINCY FRANCE<br/>";
  html += "IBAN : FR7630087338610002058080347 &bull; Code NAF (APE) : 8810A<br/>";
  html += "SAS au capital social de 500 EUR &bull; Siret : 98194358200016 &bull; N&deg; TVA : FR25981943582";
  html += "</div><\/body><\/html>";
  var ancien = document.getElementById("overlay-voir-devis");
  if (ancien) ancien.remove();
  var overlay = document.createElement("div");
  overlay.id = "overlay-voir-devis";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999999;background:#FFFFFF;display:flex;flex-direction:column";
  var barre = document.createElement("div");
  barre.style.cssText = "background:#D4AF37;color:#FFFFFF;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px) + 6px);gap:10px";
  var btnF = document.createElement("button");
  btnF.style.cssText = "background:rgba(255,255,255,.25);border:none;color:#FFFFFF;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF.textContent = "Fermer";
  btnF.onclick = function() { overlay.remove(); };
  var titre = document.createElement("span");
  titre.style.cssText = "font-size:15px;font-weight:700;flex:1;text-align:center";
  titre.textContent = "Devis N" + num;
  var btnPDF = document.createElement("button");
  btnPDF.style.cssText = "background:#FFFFFF;border:none;color:#B8860B;padding:7px 14px;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;white-space:nowrap";
  btnPDF.textContent = "Sauvegarder PDF";
  btnPDF.onclick = function() { var fr = document.getElementById("iframe-voir-devis"); if (fr && fr.contentWindow) fr.contentWindow.print(); };
  barre.appendChild(btnF); barre.appendChild(titre); barre.appendChild(btnPDF);
  var iframe = document.createElement("iframe");
  iframe.id = "iframe-voir-devis";
  iframe.style.cssText = "flex:1;border:none;width:100%";
  iframe.srcdoc = html;
  overlay.appendChild(barre); overlay.appendChild(iframe);
  document.body.appendChild(overlay);
}

function dupliquerDevis(d) {
  lancerCalculateur();
  allerVers("calc");
  reinitialiser();
  // Attendre que Firebase ait recharg\u00E9 le num\u00E9ro (async) avant de remplir
  setTimeout(function() {
    var snap = d.snapshot || {};
    // Prestations
    if (snap.prests) {
      snap.prests.forEach(function(p) {
        if (!etat.prests.includes(p)) etat.prests.push(p);
        var btn = trouverEl("bp-" + p);
        if (btn) btn.classList.add("actif");
      });
    }
    // Autre prestation
    if (snap.autre) { etat.autre = true; }
    if (snap.autreTexte) {
      etat.autreTexte = snap.autreTexte;
      var inp = trouverEl("txt-autre-main");
      if (inp) inp.value = snap.autreTexte;
      var z = trouverEl("zone-autre-main");
      if (z) z.classList.add("visible");
    }
    // Intervenants
    if (snap.interv) {
      var nb = parseInt(snap.interv);
      etat.interv = nb;
      for (var i = 1; i <= 4; i++) {
        var bI = trouverEl("bi-" + i);
        if (bI) bI.classList.toggle("actif", i === nb);
      }
    }
    // Heures
    if (snap.heures) {
      etat.heures = String(snap.heures);
      valeurs["fc-h"] = String(snap.heures);
      var vh = trouverEl("fv-h");
      if (vh) { vh.textContent = String(snap.heures); vh.classList.remove("dim"); }
    }
    // Fournitures
    if (snap.fournitures) {
      etat.fournitures = String(snap.fournitures);
      valeurs["fc-s"] = String(snap.fournitures);
      var vs = trouverEl("fv-s");
      if (vs) { vs.textContent = String(snap.fournitures); vs.classList.remove("dim"); }
    }
    // Designation
    if (snap.designation) {
      var md = trouverEl("main-designation");
      if (md) md.value = snap.designation;
    }
    // Client
    if (d.client) { var ec = trouverEl("c-nom"); if (ec) ec.value = d.client; }
    if (d.adresse) { var ea = trouverEl("c-adresse"); if (ea) ea.value = d.adresse; }
    if (d.email) { var ee = trouverEl("c-email"); if (ee) ee.value = d.email; }
    if (d.tel) { var et = trouverEl("c-tel"); if (et) et.value = d.tel; }
    calculer();
    afficherToast("Devis charge - nouveau numero pret");
  }, 800);
}

function ajouterDevisATresorerie(d) {
  // Si deja attribue : proposer de retirer l'attribution
  if (d.allocatedTo) {
    retirerDevisDeTresorerie(d);
    return;
  }
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:18px;padding:24px 20px;width:300px;max-width:90vw";
  var titre = document.createElement("div");
  titre.style.cssText = "font-size:17px;font-weight:700;color:var(--blanc);margin-bottom:4px;text-align:center";
  titre.textContent = "Ajouter a la tresorerie";
  var sous = document.createElement("div");
  sous.style.cssText = "font-size:13px;color:var(--txt-3);margin-bottom:20px;text-align:center";
  sous.textContent = echapper(d.client || "") + " \u00B7 " + (d.totalTTC || 0).toFixed(2) + " EUR TTC";
  var btnsDiv = document.createElement("div");
  btnsDiv.style.cssText = "display:flex;flex-direction:column;gap:10px";
  var usrs = [{id:"alex",nom:"Alexandre",ini:"A"},{id:"guil",nom:"Guillaume",ini:"G"}];
  usrs.forEach(function(usr) {
    var btn = document.createElement("button");
    btn.style.cssText = "width:100%;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:15px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;gap:12px;padding:0 16px";
    btn.innerHTML = "<div style='width:32px;height:32px;border-radius:16px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0'>" + usr.ini + "</div><span>" + usr.nom + "</span>";
    (function(userId, userName) {
      btn.onclick = function() {
        popup.remove();
        db.collection("tresorerie").doc(userId).get().then(function(doc) {
          var d2 = doc.exists ? doc.data() : {encaissements: [], avances: 0};
          if (!d2.encaissements) d2.encaissements = [];
          d2.encaissements.push({
            client: d.client || "Sans nom",
            montant: d.totalTTC || 0,
            valide: false,
            date: d.date || ""
          });
          db.collection("tresorerie").doc(userId).set(d2).then(function() {
            afficherToast("Ajoute a la tresorerie de " + userName);
            // Marquer le devis comme alloue
            if (d._id) {
              db.collection("devis").doc(d._id).update({allocatedTo: userName}).catch(function(){});
            }
            // Mettre a jour le bouton bT dans la liste si visible
            var btnTresor = document.getElementById("bt-" + (d._id||""));
            if (btnTresor) {
              btnTresor.textContent = userName.substring(0,4) + ".";
              btnTresor.style.background = "rgba(52,199,89,.2)";
              btnTresor.style.color = "var(--succes)";
            }
          }).catch(function(err){ afficherToast("Erreur: " + err.message); });
        }).catch(function(err){ afficherToast("Erreur: " + err.message); });
      };
    })(usr.id, usr.nom);
    btnsDiv.appendChild(btn);
  });
  var btnAnn = document.createElement("button");
  btnAnn.style.cssText = "width:100%;height:44px;border-radius:12px;background:rgba(255,255,255,.08);border:none;color:var(--txt-3);font-size:15px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:10px";
  btnAnn.textContent = "Annuler";
  btnAnn.onclick = function() { popup.remove(); };
  box.appendChild(titre); box.appendChild(sous); box.appendChild(btnsDiv); box.appendChild(btnAnn);
  popup.appendChild(box);
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  document.body.appendChild(popup);
}


// === ASSISTANT IA ===
function ouvrirAssistantIA() {
  var ancien = document.getElementById("panneau-ia");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-ia";
  pn.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";
  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,var(--violet),var(--violet-2));padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>\u2728 Assistant devis</div><div style='font-size:11px;color:rgba(255,255,255,.7);margin-top:2px'>Decris le chantier, je remplis le devis</div></div><button onclick='document.getElementById(\"panneau-ia\").remove()' style='background:rgba(255,255,255,.15);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif'>Fermer</button>";
  var msgs = document.createElement("div");
  msgs.id = "ia-msgs";
  msgs.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 14px;display:flex;flex-direction:column;gap:12px";
  msgs.appendChild(creerMsgIA("Bonjour ! Decris-moi le chantier, je remplis ton devis automatiquement.\n\nExemples :\n\u2022 Taille haie 80m, 2 hommes, 4h, evac dechets\n\u2022 Tonte chez Dupont, 3h solo\n\u2022 Elagage 2 arbres + abattage 1 pin, 3 intervenants demi-journee"));
  var footer = document.createElement("div");
  footer.style.cssText = "flex-shrink:0;background:var(--blanc);border-top:.5px solid rgba(0,0,0,.12);padding:10px 14px;padding-bottom:calc(env(safe-area-inset-bottom,34px)+8px)";
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;align-items:flex-end";
  var ta = document.createElement("textarea");
  ta.id = "ia-input";
  ta.placeholder = "Decris le chantier...";
  ta.rows = 2;
  ta.style.cssText = "flex:1;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:12px;background:var(--fond);color:var(--txt);font-size:15px;font-family:-apple-system,sans-serif;outline:none;resize:none;max-height:100px;-webkit-appearance:none";
  ta.oninput = function(){ this.style.height="auto"; this.style.height=Math.min(this.scrollHeight,100)+"px"; };
  ta.onkeydown = function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); envoyerMessageIA(); } };
  var btnS = document.createElement("button");
  btnS.style.cssText = "width:44px;height:44px;border-radius:22px;background:linear-gradient(135deg,var(--violet),var(--violet-2));border:none;color:var(--blanc);font-size:20px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
  btnS.innerHTML = "&#x27A4;";
  btnS.onclick = function(){ envoyerMessageIA(); };
  row.appendChild(ta); row.appendChild(btnS);
  footer.appendChild(row);
  pn.appendChild(hdr); pn.appendChild(msgs); pn.appendChild(footer);
  document.body.appendChild(pn);
}

function retirerDevisDeTresorerie(d) {
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:18px;padding:24px 20px;width:300px;max-width:90vw";
  var titre = document.createElement("div");
  titre.style.cssText = "font-size:17px;font-weight:700;color:var(--blanc);margin-bottom:4px;text-align:center";
  titre.textContent = "Annuler l'attribution";
  var sous = document.createElement("div");
  sous.style.cssText = "font-size:13px;color:var(--txt-3);margin-bottom:20px;text-align:center;line-height:1.4";
  sous.innerHTML = echapper(d.client || "") + " \u00B7 " + (d.totalTTC || 0).toFixed(2) + " EUR<br>Actuellement attribue a <b style='color:var(--blanc)'>" + echapper(d.allocatedTo || "") + "</b>";
  var btnConf = document.createElement("button");
  btnConf.style.cssText = "width:100%;height:50px;border-radius:14px;background:rgba(255,59,48,.85);border:none;color:var(--blanc);font-size:15px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:10px";
  btnConf.textContent = "Retirer de la tresorerie";
  btnConf.onclick = function() {
    popup.remove();
    // Trouver l'userId a partir du nom
    var userId = (d.allocatedTo === "Alexandre") ? "alex" : (d.allocatedTo === "Guillaume") ? "guil" : null;
    if (!userId) { afficherToast("Utilisateur introuvable"); return; }
    db.collection("tresorerie").doc(userId).get().then(function(doc) {
      var d2 = doc.exists ? doc.data() : {encaissements: [], avances: 0};
      if (!d2.encaissements) d2.encaissements = [];
      // Retirer le 1er encaissement qui correspond a ce devis (client + montant)
      var idxTrouve = -1;
      for (var i = 0; i < d2.encaissements.length; i++) {
        var e = d2.encaissements[i];
        if (e.client === (d.client||"Sans nom") && Math.abs((e.montant||0) - (d.totalTTC||0)) < 0.01) { idxTrouve = i; break; }
      }
      if (idxTrouve >= 0) d2.encaissements.splice(idxTrouve, 1);
      db.collection("tresorerie").doc(userId).set(d2).then(function() {
        // Effacer l'attribution sur le devis
        if (d._id) {
          db.collection("devis").doc(d._id).update({allocatedTo: ""}).catch(function(){});
        }
        d.allocatedTo = "";
        // Remettre le bouton bT a l'etat initial
        var btnTresor = document.getElementById("bt-" + (d._id||""));
        if (btnTresor) {
          btnTresor.textContent = "+ Tres.";
          btnTresor.style.background = "rgba(200,146,62,.15)";
          btnTresor.style.color = "var(--or-2)";
        }
        afficherToast("Attribution annulee");
        // Rafraichir la liste si possible
        if (typeof rafraichirListeDevis === "function") rafraichirListeDevis();
      }).catch(function(err){ afficherToast("Erreur: " + err.message); });
    }).catch(function(err){ afficherToast("Erreur: " + err.message); });
  };
  var btnAnn = document.createElement("button");
  btnAnn.style.cssText = "width:100%;height:44px;border-radius:12px;background:rgba(255,255,255,.08);border:none;color:var(--txt-3);font-size:15px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnAnn.textContent = "Garder l'attribution";
  btnAnn.onclick = function() { popup.remove(); };
  box.appendChild(titre); box.appendChild(sous); box.appendChild(btnConf); box.appendChild(btnAnn);
  popup.appendChild(box);
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  document.body.appendChild(popup);
}


function creerMsgIA(texte) {
  var div = document.createElement("div");
  div.style.cssText = "background:var(--blanc);border-radius:16px;border-bottom-left-radius:4px;padding:12px 14px;max-width:85%;align-self:flex-start;white-space:pre-wrap;font-size:14px;color:var(--blanc);line-height:1.5";
  div.textContent = texte;
  return div;
}

function creerMsgUser(texte) {
  var div = document.createElement("div");
  div.style.cssText = "background:linear-gradient(135deg,var(--violet),var(--violet-2));border-radius:16px;border-bottom-right-radius:4px;padding:12px 14px;max-width:85%;align-self:flex-end;white-space:pre-wrap;font-size:14px;color:var(--blanc);line-height:1.5";
  div.textContent = texte;
  return div;
}

function creerMsgLoading() {
  if (!document.getElementById("ia-style")) {
    var st = document.createElement("style");
    st.id = "ia-style";
    st.textContent = "@keyframes iapulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}";
    document.head.appendChild(st);
  }
  var div = document.createElement("div");
  div.id = "ia-loading";
  div.style.cssText = "background:var(--blanc);border-radius:16px;border-bottom-left-radius:4px;padding:14px;align-self:flex-start";
  div.innerHTML = "<div style='display:flex;gap:5px;align-items:center'><div style='width:7px;height:7px;border-radius:50%;background:#9B59D0;animation:iapulse 1s infinite 0s'></div><div style='width:7px;height:7px;border-radius:50%;background:#9B59D0;animation:iapulse 1s infinite .2s'></div><div style='width:7px;height:7px;border-radius:50%;background:#9B59D0;animation:iapulse 1s infinite .4s'></div></div>";
  return div;
}

function envoyerMessageIA() {
  var inp = document.getElementById("ia-input");
  if (!inp) return;
  var txt = inp.value.trim();
  if (!txt) return;
  inp.value = ""; inp.style.height = "auto";
  var msgs = document.getElementById("ia-msgs");
  if (!msgs) return;
  msgs.appendChild(creerMsgUser(txt));
  var loading = creerMsgLoading();
  msgs.appendChild(loading);
  msgs.scrollTop = msgs.scrollHeight;
  var ctx = "Prestations disponibles: haie=Taille de haie, tonte=Tonte, elagage=Elagage, abattage=Abattage, evac=Evacuation/Compostage. Tarif: 72 EUR HT par heure par intervenant. Client actuel: " + (lireChamp("c-nom")||"aucun") + ".";
  var _apiKey = localStorage.getItem("creanature_api_key") || "";
  if (!_apiKey) {
    var _msgs = document.getElementById("ia-msgs");
    var _old = document.getElementById("ia-loading"); if(_old) _old.remove();
    if(_msgs) _msgs.appendChild(creerMsgIA("Cle API manquante. Va dans Reglages > Assistant IA pour configurer ta cle OpenAI (sk-...)."));
    return;
  }
  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + _apiKey
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        {role: "system", content: "Tu es un assistant pour Crea Nature, entreprise de paysagisme en Seine-et-Marne. Analyse la description du chantier et reponds UNIQUEMENT en JSON valide:\n{\"prests\":[],\"interv\":1,\"heures\":\"4\",\"fournitures\":\"0\",\"designation\":\"label court pro\",\"client\":\"\",\"explication\":\"ce que tu as compris\"}\nprests = tableau d ids parmi: haie, tonte, elagage, abattage, evac. interv = 1 a 4. heures = nombre string (demi-journee=4, journee=8). fournitures = cout materiel sinon 0. designation = label court pour PDF. client = nom si mentionne sinon vide. explication = 1-2 phrases. Ne reponds QUE du JSON. " + ctx},
        {role: "user", content: txt}
      ]
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    var old = document.getElementById("ia-loading"); if(old) old.remove();
    try {
      var raw = data.choices && data.choices[0] ? data.choices[0].message.content : (data.content && data.content[0] ? data.content[0].text : "");
      var parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      afficherSuggestionIA(parsed, msgs);
    } catch(e) {
      msgs.appendChild(creerMsgIA("Je n'ai pas compris. Reformule avec le type de travaux, le nombre de personnes et la duree estimee."));
      msgs.scrollTop = msgs.scrollHeight;
    }
  })
  .catch(function(){
    var old = document.getElementById("ia-loading"); if(old) old.remove();
    msgs.appendChild(creerMsgIA("Erreur de connexion. Verifie ta connexion internet et reessaie."));
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function afficherSuggestionIA(p, msgs) {
  var lignes = ["J'ai analyse : " + (p.explication||"")];
  if (p.prests && p.prests.length) lignes.push("Prestations : " + p.prests.map(function(x){return nomPrests[x]||x;}).join(", "));
  if (p.interv) lignes.push("Intervenants : " + p.interv);
  if (p.heures) { var h=parseFloat(p.heures); var nb=parseInt(p.interv)||1; lignes.push("Heures : " + p.heures + "h \u2192 " + (h*nb*72).toFixed(2) + " EUR HT"); }
  if (p.fournitures && parseFloat(p.fournitures)>0) lignes.push("Fournitures : " + p.fournitures + " EUR");
  if (p.client) lignes.push("Client : " + p.client);
  msgs.appendChild(creerMsgIA(lignes.join("\n")));
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;align-self:flex-start;flex-wrap:wrap";
  var bOk = document.createElement("button");
  bOk.style.cssText = "background:linear-gradient(135deg,var(--violet),var(--violet-2));border:none;color:var(--blanc);padding:10px 20px;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif";
  bOk.innerHTML = "\u2705 Appliquer au devis";
  bOk.onclick = function() {
    reinitialiser();
    if (p.prests) p.prests.forEach(function(x){ if(nomPrests[x]){ etat.prests.push(x); var b=trouverEl("bp-"+x); if(b) b.classList.add("actif"); } });
    if (p.interv) { var nb=parseInt(p.interv); if(nb>=1&&nb<=4){ etat.interv=nb; for(var i=1;i<=4;i++){ var bI=trouverEl("bi-"+i); if(bI) bI.classList.toggle("actif",i===nb); } } }
    if (p.heures) { var h=String(p.heures); etat.heures=h; valeurs["fc-h"]=h; var vh=trouverEl("fv-h"); if(vh){ vh.textContent=h; vh.classList.remove("dim"); } }
    if (p.fournitures && parseFloat(p.fournitures)>0) { var f=String(p.fournitures); etat.fournitures=f; valeurs["fc-s"]=f; var vs=trouverEl("fv-s"); if(vs){ vs.textContent=f; vs.classList.remove("dim"); } }
    if (p.designation) { var md=trouverEl("main-designation"); if(md) md.value=p.designation; }
    if (p.client) { var ec=trouverEl("c-nom"); if(ec&&!ec.value) ec.value=p.client; }
    calculer();
    document.getElementById("panneau-ia").remove();
    allerVers("calc");
    afficherToast("Devis rempli par l\'IA !");
  };
  var bNon = document.createElement("button");
  bNon.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--txt-3);padding:10px 18px;border-radius:20px;font-size:14px;cursor:pointer;font-family:-apple-system,sans-serif";
  bNon.textContent = "Modifier";
  bNon.onclick = function(){ row.remove(); var inp2=document.getElementById("ia-input"); if(inp2) inp2.focus(); };
  row.appendChild(bOk); row.appendChild(bNon);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}


function chargerHistoriqueBI() {
  var cont = document.getElementById("bi-historique-liste");
  if (!cont) return;
  cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Chargement...</div>";
  db.collection("bi_historique").orderBy("timestamp","desc").limit(20).get().then(function(snap) {
    if (snap.empty) { cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Aucun envoi</div>"; return; }
    cont.innerHTML = "";
    snap.forEach(function(doc) {
      var d = doc.data(); var id = doc.id;
      var item = document.createElement("div");
      item.style.cssText = "display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(255,255,255,.06);border-radius:10px;margin-bottom:6px";
      var info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0";
      var prestLabels = (d.prests||[]).map(function(p){ return BI_PRESTS.find(function(x){return x.id===p;}) ? BI_PRESTS.find(function(x){return x.id===p;}).label : p; }).join(", ");
      info.innerHTML = "<div style='font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"+(d.client||"Sans client")+"</div><div style='font-size:11px;color:var(--txt-3);margin-top:1px'>"+d.date+(d.auteur?" \u00B7 "+d.auteur:"")+"</div><div style='font-size:10px;color:var(--txt-2);margin-top:1px'>"+prestLabels+"</div>";
      var bX = document.createElement("button");
      bX.style.cssText = "background:rgba(255,59,48,.15);border:none;color:var(--erreur);width:26px;height:26px;border-radius:13px;font-size:15px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
      bX.textContent = "\u00D7";
      (function(docId){ bX.onclick=function(){ db.collection("bi_historique").doc(docId).delete().then(chargerHistoriqueBI).catch(function(){}); }; })(id);
      item.appendChild(info); item.appendChild(bX);
      cont.appendChild(item);
    });
  }).catch(function(){ cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Erreur</div>"; });
}

function chargerHistoriquePrevention() {
  var cont = document.getElementById("prev-historique-liste");
  if (!cont) return;
  cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Chargement...</div>";
  db.collection("prev_historique").orderBy("timestamp","desc").limit(20).get().then(function(snap) {
    if (snap.empty) { cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Aucun envoi</div>"; return; }
    cont.innerHTML = "";
    snap.forEach(function(doc) {
      var d = doc.data(); var id = doc.id;
      var item = document.createElement("div");
      item.style.cssText = "display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(255,255,255,.06);border-radius:10px;margin-bottom:6px";
      var info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0";
      var prestLabels = (d.prests||[]).join(", ");
      info.innerHTML = "<div style='font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"+(d.client||"Sans client")+"</div><div style='font-size:11px;color:var(--txt-3);margin-top:1px'>"+(d.date||"")+(d.auteur?" \u00B7 "+d.auteur:"")+"</div><div style='font-size:10px;color:var(--txt-2);margin-top:1px'>"+prestLabels+"</div>";
      var bX = document.createElement("button");
      bX.style.cssText = "background:rgba(255,59,48,.15);border:none;color:var(--erreur);width:26px;height:26px;border-radius:13px;font-size:15px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
      bX.textContent = "\u00D7";
      (function(docId){ bX.onclick=function(){ db.collection("prev_historique").doc(docId).delete().then(chargerHistoriquePrevention).catch(function(){}); }; })(id);
      item.appendChild(info); item.appendChild(bX);
      cont.appendChild(item);
    });
  }).catch(function(){ cont.innerHTML = "<div style='text-align:center;color:var(--txt-3);font-size:13px;padding:10px'>Erreur</div>"; });
}



function ouvrirOngletPrevention() {
  var contBI = document.getElementById("bi-contenu-bi");
  var contPrev = document.getElementById("bi-contenu-prev");
  var ongBI = document.getElementById("bi-ong-bi");
  var ongPrev = document.getElementById("bi-ong-prev");
  if (!contBI || !contPrev) return;
  contBI.style.display = "none";
  contPrev.style.display = "block";
  var actif = "flex:1;padding:12px;background:none;border:none;color:var(--blanc);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid var(--blanc)";
  var inactif = "flex:1;padding:12px;background:none;border:none;color:rgba(255,255,255,.5);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid transparent";
  if (ongBI) ongBI.style.cssText = inactif;
  if (ongPrev) ongPrev.style.cssText = actif;
}

function ouvrirOngletBI() {
  var contBI = document.getElementById("bi-contenu-bi");
  var contPrev = document.getElementById("bi-contenu-prev");
  var ongBI = document.getElementById("bi-ong-bi");
  var ongPrev = document.getElementById("bi-ong-prev");
  if (!contBI || !contPrev) return;
  contBI.style.display = "block";
  contPrev.style.display = "none";
  var actif = "flex:1;padding:12px;background:none;border:none;color:var(--blanc);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid var(--blanc)";
  var inactif = "flex:1;padding:12px;background:none;border:none;color:rgba(255,255,255,.5);font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid transparent";
  if (ongBI) ongBI.style.cssText = actif;
  if (ongPrev) ongPrev.style.cssText = inactif;
}

var prevClientSelec = null;

function rechercherClientPrev(val) {
  var liste = document.getElementById("prev-client-liste");
  if (!liste) return;
  if (!val || val.length < 2) { liste.innerHTML = ""; return; }
  db.collection("clients").orderBy("nom").get().then(function(snap) {
    var r = [];
    snap.forEach(function(doc) {
      var d = doc.data();
      if (d.nom && d.nom.toLowerCase().indexOf(val.toLowerCase()) >= 0) r.push(Object.assign({_id:doc.id},d));
    });
    liste.innerHTML = "";
    r.slice(0,5).forEach(function(cl) {
      var item = document.createElement("div");
      item.style.cssText = "padding:9px 12px;background:rgba(200,146,62,.08);border-radius:8px;margin-bottom:4px;cursor:pointer;font-size:14px;color:var(--noir)";
      item.textContent = cl.nom + (cl.adresse ? " - " + cl.adresse : "");
      (function(client) {
        item.onclick = function() {
          prevClientSelec = client;
          liste.innerHTML = "";
          var inp = document.getElementById("prev-client-search");
          if (inp) inp.value = client.nom;
          var aff = document.getElementById("prev-client-selectionne");
          if (aff) { aff.style.display = "block"; aff.textContent = client.nom + (client.email ? " - " + client.email : ""); }
        };
      })(cl);
      liste.appendChild(item);
    });
  });
}

function envoyerPrevention() {
  var dateDebEl = document.getElementById("prev-date-debut");
  var dateFinEl = document.getElementById("prev-date-fin");
  var dateDebVal = dateDebEl ? dateDebEl.value : "";
  var dateFinVal = dateFinEl ? dateFinEl.value : "";
  if (!dateDebVal) { afficherToast("Selectionne une date de debut"); return; }
  var dateVal = dateDebVal;
  var prestsSelec = [];
  ["tonte","taille","feuilles","fauchage"].forEach(function(p) {
    var b = document.getElementById("prev-prest-" + p);
    if (b && b.classList.contains("actif")) prestsSelec.push(b.getAttribute("data-label"));
  });
  if (!prestsSelec.length) { afficherToast("Selectionne au moins une intervention"); return; }

  var nomCl = prevClientSelec ? prevClientSelec.nom : "";
  var emailCl = prevClientSelec ? (prevClientSelec.email2 || prevClientSelec.email || "") : "";
  var prenom = nomCl ? nomCl.split(" ")[0] : "Madame, Monsieur";
  var auteur = utilisateurActuel ? utilisateurActuel.nom : "Crea Nature";

  // Formatter la date
  var parts = dateDebVal.split("-");
  var JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  var MOIS = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
  var dateObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  var dateStr = JOURS[dateObj.getDay()] + " " + dateObj.getDate() + " " + MOIS[dateObj.getMonth()] + " " + dateObj.getFullYear();
  var dateStrFull = dateStr;
  if (dateFinVal && dateFinVal !== dateDebVal) {
    var pf = dateFinVal.split("-");
    var df = new Date(parseInt(pf[0]), parseInt(pf[1])-1, parseInt(pf[2]));
    dateStrFull = "du " + dateStr + " au " + JOURS[df.getDay()] + " " + df.getDate() + " " + MOIS[df.getMonth()] + " " + df.getFullYear();
  }

  var listePrest = prestsSelec.map(function(p){ return "  - " + p; }).join("\n");
  var sujet = "Avis de passage - "+SOCIETE_NOM+" - " + dateStrFull;
  var corps = "Bonjour " + prenom + ",\n\nNous vous informons que notre equipe interviendra chez vous le " + dateStr + " pour effectuer les travaux suivants :\n\n" + listePrest + "\n\nMerci de vous assurer que nous aurons acces a votre propriete ce jour-la.\n\nSi cette date ne vous convient pas, n'hesitez pas a nous contacter pour convenir d'un autre rendez-vous.\n\nCordialement,\n" + auteur + "\n"+SOCIETE_NOM+"\nTel : 06 19 30 40 93\ncreanature@ymail.com";

  var nl = "%0D%0A";
  var corpsEnc = encodeURIComponent("Bonjour " + prenom + ",") + nl + nl
    + encodeURIComponent("Nous vous informons que notre equipe interviendra chez vous " + dateStrFull + " pour :") + nl
    + prestsSelec.map(function(p){ return encodeURIComponent("  - " + p); }).join(nl)
    + nl + nl
    + encodeURIComponent("Merci de vous assurer que nous aurons acces a votre propriete ce jour-la.") + nl + nl
    + encodeURIComponent("Si cette date ne vous convient pas, contactez-nous pour reporter.") + nl + nl
    + encodeURIComponent("Cordialement,") + nl
    + encodeURIComponent(auteur) + nl
    + encodeURIComponent("Crea Nature - Tel : 06 19 30 40 93 - creanature@ymail.com");

  window.location.href = "mailto:" + encodeURIComponent(emailCl)
    + "?cc=" + encodeURIComponent("creanature@ymail.com")
    + "&subject=" + encodeURIComponent(sujet)
    + "&body=" + corpsEnc;

  afficherToast("Mail de prevention prepare !");
  // Sauver dans historique prevention
  db.collection("prev_historique").add({
    client: nomCl || "",
    email: emailCl || "",
    prests: prestsSelec.slice(),
    date: dateStrFull,
    auteur: utilisateurActuel ? utilisateurActuel.nom : "",
    timestamp: Date.now()
  }).then(function(){ chargerHistoriquePrevention(); }).catch(function(){});
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PLANNING ANNUEL 52 SEMAINES
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// Donn\u00E9es planning initiales (issues du PDF)
var PLANNING_DEFAUT = [
  {
    client: "ENA2",
    interventions: {
      TONTE:     [16,18,20,22,24,26,28,30,32,34,36,38],
      FEUILLES:  [44,46,48],
      TAILLE:    [12,14],
      DESHERBAGE:[10,20,30]
    }
  },
  {
    client: "DPWORLD",
    interventions: {
      TONTE:     [14,16,18,20,22,24,28,30,32,34],
      FAUCHAGE:  [26,28,30,32],
      FEUILLES:  [40,42,44,46,48],
      TAILLE:    [10,12,14],
      DESHERBAGE:[16,22,28,34,40]
    }
  },
  {
    client: "CAPUSIN",
    interventions: {
      TONTE:     [16,18,20,22,26,28,30,32],
      FEUILLES:  [44,46],
      TAILLE:    [10,12],
      DESHERBAGE:[14,28]
    }
  },
  {
    client: "DPD LST",
    interventions: {
      TONTE:     [14,16,18,20,22,24,28,30,32,34],
      FAUCHAGE:  [26,32],
      FEUILLES:  [44,46],
      TAILLE:    [12]
    }
  },
  {
    client: "SCI EPERMAILLE",
    interventions: {
      TONTE:     [16,18,20,22,26,28,30,32],
      TAILLE:    [12],
      FEUILLES:  [44],
      ELAGAGE:   [10],
      DESHERBAGE:[14,28]
    }
  },
  {
    client: "PIK",
    interventions: {
      TONTE:     [14,16,18,20,22,24,26,28,30,32,34,36],
      TAILLE:    [10],
      FEUILLES:  [44],
      FAUCHAGE:  [26,30,34]
    }
  },
  {
    client: "VERHEYDEN",
    interventions: {
      TONTE:     [16,18,20,22,24,26,28,30,32,34],
      TAILLE:    [12],
      DESHERBAGE:[14,22],
      FEUILLES:  [44]
    }
  }
];

var PREST_COULEURS = {
  TONTE:     "var(--succes)",
  FAUCHAGE:  "#FF9500",
  FEUILLES:  "#FF6B35",
  TAILLE:    "var(--bleu)",
  DESHERBAGE:"#C77DFF",
  ELAGAGE:   "var(--erreur)"
};

function getLundiSemaine(annee, semaine) {
  var jan4 = new Date(annee, 0, 4);
  var joursDepuis = (semaine - 1) * 7;
  var jourSemaine = jan4.getDay() || 7;
  var lundi = new Date(jan4);
  lundi.setDate(jan4.getDate() - (jourSemaine - 1) + joursDepuis);
  return lundi;
}

function formaterDateICS(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth()+1).padStart(2,"0");
  var d = String(date.getDate()).padStart(2,"0");
  return y + m + d;
}

function genererICS(client) {
  var plannings = JSON.parse(localStorage.getItem("creanature_planning") || "null") || PLANNING_DEFAUT;
  var plan = plannings.find(function(p){ return p.client === client; });
  if (!plan) return;
  var annee = new Date().getFullYear();
  var lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Crea Nature//Planning//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  Object.keys(plan.interventions).forEach(function(prest) {
    var semaines = plan.interventions[prest];
    semaines.forEach(function(sem) {
      var lundi = getLundiSemaine(annee, sem);
      var mardi = new Date(lundi); mardi.setDate(lundi.getDate()+1);
      var uid = "creanature-" + client.replace(/\s/g,"-") + "-" + prest + "-S" + sem + "-" + annee + "@creanature";
      lines.push("BEGIN:VEVENT");
      lines.push("UID:" + uid);
      lines.push("DTSTART;VALUE=DATE:" + formaterDateICS(lundi));
      lines.push("DTEND;VALUE=DATE:" + formaterDateICS(mardi));
      lines.push("SUMMARY:" + client + " - " + prest + " (S" + sem + ")");
      lines.push("DESCRIPTION:Planning Crea Nature - " + client + " - " + prest);
      lines.push("CATEGORIES:CREA NATURE");
      lines.push("END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  var icsContent = lines.join("\r\n");
  var blob = new Blob([icsContent], {type: "text/calendar;charset=utf-8"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "planning-" + client.replace(/\s/g,"-").toLowerCase() + "-" + annee + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  afficherToast("Fichier ICS telecharge - ouvre-le pour importer dans Calendrier");
}

function ouvrirPlanning() {
  var ancien = document.getElementById("panneau-planning");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-planning";
  pn.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#18181F,#111116);padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>Planning annuel</div><div style='font-size:11px;color:rgba(255,255,255,.6);margin-top:2px'>52 semaines</div></div>";
  var btnF = document.createElement("button");
  btnF.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF.textContent = "Fermer";
  btnF.onclick = function(){ pn.remove(); };
  var btnSem = document.createElement("button");
  btnSem.style.cssText = "background:rgba(200,146,62,.25);border:none;color:var(--or-2);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnSem.textContent = "Sem. " + getSemaineCourante();
  btnSem.onclick = function(){ afficherSemaineEnCours(plannings, pn); };
  hdr.appendChild(btnSem);
  hdr.appendChild(btnF);

  // Onglets clients
  var plannings = JSON.parse(localStorage.getItem("creanature_planning") || "null") || PLANNING_DEFAUT;
  var onglets = document.createElement("div");
  onglets.style.cssText = "display:flex;overflow-x:auto;background:#0D1A2A;padding:8px 12px;gap:8px;flex-shrink:0;-webkit-overflow-scrolling:touch";

  var corps = document.createElement("div");
  corps.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";

  function afficherClient(plan) {
    corps.innerHTML = "";

    // Designation client
    var descDiv = document.createElement("div");
    descDiv.style.cssText = "margin-bottom:12px;display:flex;align-items:center;gap:8px";
    var descInp = document.createElement("input");
    descInp.type = "text";
    descInp.placeholder = "Designation / notes (optionnel)";
    descInp.value = plan.designation || "";
    descInp.style.cssText = "flex:1;padding:9px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:var(--blanc);color:var(--txt);font-size:13px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    descInp.oninput = function() {
      plan.designation = this.value;
      localStorage.setItem("creanature_planning", JSON.stringify(plannings));
    };
    descDiv.appendChild(descInp);
    corps.appendChild(descDiv);

    // Actions : sync + supprimer
    var actRow = document.createElement("div");
    actRow.style.cssText = "display:flex;gap:8px;margin-bottom:14px";
    var btnSync = document.createElement("button");
    btnSync.style.cssText = "flex:1;height:44px;border-radius:12px;background:linear-gradient(135deg,#18181F,#111116);border:none;color:var(--blanc);font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px";
    btnSync.innerHTML = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none'><rect x='3' y='4' width='18' height='18' rx='3' stroke='white' stroke-width='2'/><line x1='3' y1='9' x2='21' y2='9' stroke='white' stroke-width='2'/><line x1='8' y1='2' x2='8' y2='6' stroke='white' stroke-width='2' stroke-linecap='round'/><line x1='16' y1='2' x2='16' y2='6' stroke='white' stroke-width='2' stroke-linecap='round'/></svg> Calendrier";
    (function(cl){ btnSync.onclick = function(){ genererICS(cl); }; })(plan.client);
    var btnDel = document.createElement("button");
    btnDel.style.cssText = "height:44px;padding:0 14px;border-radius:12px;background:rgba(255,59,48,.15);border:none;color:var(--erreur);font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
    btnDel.textContent = "Supprimer";
    (function(cl) {
      btnDel.onclick = function() {
        if (!confirm("Supprimer le planning de " + cl + " ?")) return;
        var idx = plannings.findIndex(function(p){ return p.client===cl; });
        if (idx >= 0) {
          plannings.splice(idx, 1);
          localStorage.setItem("creanature_planning", JSON.stringify(plannings));
          pn.remove();
          ouvrirPlanning();
        }
      };
    })(plan.client);
    actRow.appendChild(btnSync); actRow.appendChild(btnDel);
    corps.appendChild(actRow);

    // Legende prestations cliquables pour ajouter/retirer
    var legende = document.createElement("div");
    legende.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px";
    var PRESTS_DISPO = ["TONTE","FAUCHAGE","FEUILLES","TAILLE","DESHERBAGE","ELAGAGE"];
    PRESTS_DISPO.forEach(function(p) {
      var actif = plan.interventions[p] && plan.interventions[p].length > 0;
      var chip = document.createElement("button");
      chip.style.cssText = "padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;border:2px solid " + (PREST_COULEURS[p]||"var(--txt-3)") + ";background:" + (actif ? (PREST_COULEURS[p]||"var(--txt-3)") : "transparent") + ";color:" + (actif ? "var(--blanc)" : (PREST_COULEURS[p]||"var(--txt-3)"));
      chip.textContent = p + (actif ? " (" + plan.interventions[p].length + ")" : " +");
      chip.setAttribute("data-prest", p);
      (function(prest, el) {
        el.onclick = function() {
          if (!plan.interventions[prest]) {
            plan.interventions[prest] = [];
          }
          afficherClient(plan);
        };
      })(p, chip);
      legende.appendChild(chip);
    });
    corps.appendChild(legende);

    // Hint
    var hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;color:var(--txt-2);margin-bottom:10px;text-align:center";
    hint.textContent = "Touche une case pour ajouter / retirer une semaine";
    corps.appendChild(hint);

    // ===== VUE VERTICALE (mobile) : liste par mois =====
    var vueVerticale = document.createElement("div");
    vueVerticale.className = "planning-vue-verticale";
    vueVerticale.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-bottom:14px";
    // Noms des mois et leur correspondance approximative en semaines
    var moisNoms = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
    // Pour chaque mois, trouver les semaines (approx : 4.33 sem/mois)
    for (var moi = 0; moi < 12; moi++) {
      var semDebut = Math.floor(moi * 4.333) + 1;
      var semFin = Math.floor((moi + 1) * 4.333);
      if (moi === 11) semFin = 52;
      // Collecter les interventions de ce mois
      var interventionsMois = [];
      Object.keys(plan.interventions).forEach(function(prest) {
        var sems = (plan.interventions[prest] || []).filter(function(s){ return s >= semDebut && s <= semFin; });
        if (sems.length > 0) interventionsMois.push({ prest: prest, sems: sems });
      });
      var carteMois = document.createElement("div");
      carteMois.style.cssText = "background:var(--blanc);border-radius:12px;padding:12px 14px";
      var entete = document.createElement("div");
      entete.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:" + (interventionsMois.length ? "10px" : "0");
      entete.innerHTML = "<span style='font-size:14px;font-weight:700;color:var(--txt)'>" + moisNoms[moi] + "</span>" +
        "<span style='font-size:10px;color:#6E6E73'>S" + semDebut + "-S" + semFin + "</span>";
      carteMois.appendChild(entete);
      if (interventionsMois.length === 0) {
        var vide = document.createElement("div");
        vide.style.cssText = "font-size:12px;color:var(--txt-2);font-style:italic";
        vide.textContent = "Aucune intervention";
        carteMois.appendChild(vide);
      } else {
        interventionsMois.forEach(function(item) {
          var ligne = document.createElement("div");
          ligne.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 0";
          var pastille = document.createElement("div");
          pastille.style.cssText = "width:10px;height:10px;border-radius:3px;flex-shrink:0;background:" + (PREST_COULEURS[item.prest] || "var(--or-2)");
          ligne.appendChild(pastille);
          var nom = document.createElement("div");
          nom.style.cssText = "flex:1;font-size:13px;font-weight:600;color:var(--txt)";
          nom.textContent = item.prest;
          ligne.appendChild(nom);
          var semLabels = document.createElement("div");
          semLabels.style.cssText = "font-size:11px;color:var(--txt-3);font-weight:500";
          semLabels.textContent = item.sems.map(function(s){ return "S" + s; }).join(", ");
          ligne.appendChild(semLabels);
          carteMois.appendChild(ligne);
        });
      }
      vueVerticale.appendChild(carteMois);
    }
    corps.appendChild(vueVerticale);

    // Tableau 52 semaines
    var tableWrap = document.createElement("div");
    tableWrap.className = "planning-vue-grille";
    tableWrap.style.cssText = "overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px;background:var(--blanc);padding:12px";

    var semNumRow = document.createElement("div");
    semNumRow.style.cssText = "display:flex;gap:2px;margin-bottom:6px;align-items:center";
    var lblSem = document.createElement("div");
    lblSem.style.cssText = "width:80px;flex-shrink:0;font-size:9px;color:var(--txt-2);font-weight:600;text-transform:uppercase";
    lblSem.textContent = "Semaine";
    semNumRow.appendChild(lblSem);
    // Groupes de 4 semaines (13 groupes = 52)
    for (var s=1; s<=52; s++) {
      var cell = document.createElement("div");
      cell.style.cssText = "width:16px;flex-shrink:0;text-align:center;font-size:7px;color:" + (s%4===0?"var(--txt-3)":"rgba(0,0,0,.12)");
      cell.textContent = s%4===0 ? String(s) : "";
      semNumRow.appendChild(cell);
    }
    tableWrap.appendChild(semNumRow);

    // Ligne par prestation
    Object.keys(plan.interventions).forEach(function(prest) {
      var semaines = plan.interventions[prest] || [];
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:2px;margin-bottom:4px;align-items:center";
      var lbl = document.createElement("div");
      lbl.style.cssText = "width:80px;flex-shrink:0;font-size:10px;font-weight:600;color:" + (PREST_COULEURS[prest]||"var(--txt-3)");
      lbl.textContent = prest;
      row.appendChild(lbl);
      for (var s2=1; s2<=52; s2++) {
        var dot = document.createElement("div");
        var actif = semaines.indexOf(s2) >= 0;
        dot.style.cssText = "width:16px;height:16px;flex-shrink:0;border-radius:3px;cursor:pointer;background:" + (actif ? (PREST_COULEURS[prest]||"var(--or-2)") : "rgba(255,255,255,.05)") + ";transition:transform .1s";
        dot.title = "S" + s2;
        (function(prest2, sem, dotEl, plan2) {
          dotEl.onclick = function() {
            var idx2 = plan2.interventions[prest2].indexOf(sem);
            if (idx2 >= 0) {
              plan2.interventions[prest2].splice(idx2, 1);
              dotEl.style.background = "rgba(255,255,255,.05)";
            } else {
              plan2.interventions[prest2].push(sem);
              plan2.interventions[prest2].sort(function(a,b){return a-b;});
              dotEl.style.background = PREST_COULEURS[prest2]||"var(--or-2)";
            }
            localStorage.setItem("creanature_planning", JSON.stringify(plannings));
            // Mettre \u00E0 jour le chip de l\u00E9gende
            var chips = legende.querySelectorAll("button");
            chips.forEach(function(ch) {
              if (ch.getAttribute("data-prest") === prest2) {
                var nb = plan2.interventions[prest2].length;
                ch.textContent = prest2 + (nb > 0 ? " (" + nb + ")" : " +");
                ch.style.background = nb > 0 ? (PREST_COULEURS[prest2]||"var(--txt-3)") : "transparent";
                ch.style.color = nb > 0 ? "var(--blanc)" : (PREST_COULEURS[prest2]||"var(--txt-3)");
              }
            });
          };
          dotEl.onmouseenter = function(){ dotEl.style.transform="scale(1.3)"; };
          dotEl.onmouseleave = function(){ dotEl.style.transform="scale(1)"; };
        })(prest, s2, dot, plan);
        row.appendChild(dot);
      }
      tableWrap.appendChild(row);
    });

    // Ligne semaine courante
    var semCourante = getSemaineCourante();
    var rows = tableWrap.querySelectorAll("div[style*='display:flex']");
    // Ajouter indicateur semaine courante
    var indicRow = document.createElement("div");
    indicRow.style.cssText = "display:flex;gap:2px;margin-top:6px;align-items:center";
    var indicLbl = document.createElement("div");
    indicLbl.style.cssText = "width:80px;flex-shrink:0;font-size:9px;color:var(--or-2);font-weight:600";
    indicLbl.textContent = "Auj. S" + semCourante;
    indicRow.appendChild(indicLbl);
    for (var s3=1; s3<=52; s3++) {
      var tick = document.createElement("div");
      tick.style.cssText = "width:16px;height:3px;flex-shrink:0;border-radius:2px;background:" + (s3===semCourante?"var(--or-2)":"transparent");
      indicRow.appendChild(tick);
    }
    tableWrap.appendChild(indicRow);
    corps.appendChild(tableWrap);
  }

  // Onglet "Ajouter client"
  function creerOnglet(texte, actif) {
    var btn = document.createElement("button");
    btn.style.cssText = "flex-shrink:0;padding:6px 14px;border-radius:20px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;background:" + (actif?"rgba(100,181,246,.3)":"rgba(255,255,255,.08)") + ";color:" + (actif?"var(--bleu)":"var(--txt-3)");
    btn.textContent = texte;
    return btn;
  }

  plannings.forEach(function(plan) {
    var ong = creerOnglet(plan.client, false);
    (function(p) {
      ong.onclick = function() {
        onglets.querySelectorAll("button").forEach(function(b){ b.style.background="rgba(255,255,255,.08)"; b.style.color="var(--txt-3)"; });
        ong.style.background="rgba(100,181,246,.3)"; ong.style.color="var(--bleu)";
        afficherClient(p);
      };
    })(plan);
    onglets.appendChild(ong);
  });

  // Bouton + nouveau client
  var btnNew = document.createElement("button");
  btnNew.style.cssText = "flex-shrink:0;padding:6px 14px;border-radius:20px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;background:rgba(200,146,62,.2);color:var(--or-2)";
  btnNew.textContent = "+ Nouveau";
  btnNew.onclick = function(){ ouvrirNouveauClientPlanning(plannings, function(){ pn.remove(); ouvrirPlanning(); }); };
  onglets.appendChild(btnNew);

  pn.appendChild(hdr); pn.appendChild(onglets); pn.appendChild(corps);
  document.body.appendChild(pn);

  // Afficher le premier client par d\u00E9faut
  if (plannings.length > 0) {
    onglets.querySelectorAll("button")[0].click();
  }
}


function afficherSemaineEnCours(plannings, parentPn) {
  var semaine = getSemaineCourante();
  var annee = new Date().getFullYear();
  var lundi = getLundiSemaine(annee, semaine);
  var JOURS = ["dim","lun","mar","mer","jeu","ven","sam"];
  var MOIS = ["jan","fev","mar","avr","mai","jun","jul","aou","sep","oct","nov","dec"];
  var lundiStr = JOURS[lundi.getDay()] + " " + lundi.getDate() + " " + MOIS[lundi.getMonth()];

  var ancien = document.getElementById("panneau-semaine");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-semaine";
  pn.style.cssText = "position:fixed;inset:0;z-index:9999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>Semaine " + semaine + "</div><div style='font-size:12px;color:rgba(255,255,255,.8);margin-top:2px'>A partir du " + lundiStr + " " + annee + "</div></div>";
  var btnF2 = document.createElement("button");
  btnF2.style.cssText = "background:rgba(255,255,255,.2);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF2.textContent = "Retour";
  btnF2.onclick = function(){ pn.remove(); };
  hdr.appendChild(btnF2);

  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";

  // Collecter tout ce qui est pr\u00E9vu cette semaine
  var previsions = [];
  plannings.forEach(function(plan) {
    Object.keys(plan.interventions).forEach(function(prest) {
      if ((plan.interventions[prest]||[]).indexOf(semaine) >= 0) {
        previsions.push({ client: plan.client, prest: prest, designation: plan.designation || "" });
      }
    });
  });

  if (!previsions.length) {
    body.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:60px 20px;font-size:15px'>Aucune intervention prevue cette semaine</div>";
  } else {
    // R\u00E9sum\u00E9
    var resume = document.createElement("div");
    resume.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border-radius:14px;padding:16px;margin-bottom:14px;color:var(--blanc)";
    resume.innerHTML = "<div style='font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:4px'>Total semaine " + semaine + "</div><div style='font-size:28px;font-weight:200'>" + previsions.length + " intervention" + (previsions.length > 1 ? "s" : "") + "</div><div style='font-size:12px;opacity:.7;margin-top:4px'>" + [...new Set(previsions.map(function(p){return p.client;}))].join(" \u00B7 ") + "</div>";
    body.appendChild(resume);

    // Grouper par client
    var parClient = {};
    previsions.forEach(function(p) {
      if (!parClient[p.client]) parClient[p.client] = [];
      parClient[p.client].push(p);
    });

    Object.keys(parClient).forEach(function(client) {
      var card = document.createElement("div");
      card.style.cssText = "background:var(--blanc);border-radius:14px;padding:14px;margin-bottom:10px";
      var titreClient = document.createElement("div");
      titreClient.style.cssText = "font-size:15px;font-weight:700;color:var(--blanc);margin-bottom:10px";
      var desig = parClient[client][0].designation;
      titreClient.innerHTML = echapper(client) + (desig ? "<span style='font-size:11px;font-weight:400;color:var(--txt-3);margin-left:8px'>" + echapper(desig) + "</span>" : "");
      card.appendChild(titreClient);
      var prestRow = document.createElement("div");
      prestRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
      parClient[client].forEach(function(p) {
        var chip = document.createElement("div");
        chip.style.cssText = "padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;color:var(--blanc);background:" + (PREST_COULEURS[p.prest]||"var(--txt-3)");
        chip.textContent = p.prest;
        prestRow.appendChild(chip);
      });
      card.appendChild(prestRow);

      // Bouton pr\u00E9vention
      var btnPrev = document.createElement("button");
      btnPrev.style.cssText = "width:100%;height:38px;border-radius:10px;background:rgba(200,146,62,.15);border:none;color:var(--or-2);font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:10px";
      btnPrev.textContent = "Envoyer avis de passage";
      (function(cl) {
        btnPrev.onclick = function() {
          pn.remove();
          if (parentPn) parentPn.remove();
          // Pr\u00E9-remplir la pr\u00E9vention avec ce client
          setTimeout(function() {
            ouvrirPanneauBI();
            setTimeout(function() {
              ouvrirOngletPrevention();
              var inp = document.getElementById("prev-client-search");
              if (inp) { inp.value = cl; rechercherClientPrev(cl); }
            }, 200);
          }, 100);
        };
      })(client);
      card.appendChild(btnPrev);
      body.appendChild(card);
    });
  }

  pn.appendChild(hdr); pn.appendChild(body);
  document.body.appendChild(pn);
}

function ouvrirHistoriqueClient(nomClient, devisFiltres, tousDevis) {
  var ancien = document.getElementById("panneau-histo-client");
  if (ancien) ancien.remove();
  var pn = document.createElement("div");
  pn.id = "panneau-histo-client";
  pn.style.cssText = "position:fixed;inset:0;z-index:9999999;background:var(--gris3);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";
  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));color:var(--blanc);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;padding-top:calc(env(safe-area-inset-top,44px)+6px)";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700'>" + echapper(nomClient) + "</div><div style='font-size:12px;opacity:.8;margin-top:2px'>" + devisFiltres.length + " devis</div></div>";
  var btnF = document.createElement("button");
  btnF.style.cssText = "background:rgba(255,255,255,.25);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF.textContent = "Fermer";
  btnF.onclick = function(){ pn.remove(); };
  hdr.appendChild(btnF);
  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";
  if (!devisFiltres.length) {
    body.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:40px;font-size:14px'>Aucun devis pour ce client</div>";
  } else {
    var totalCA = devisFiltres.reduce(function(s,d){return s+(d.totalTTC||0);},0);
    var carte = document.createElement("div");
    carte.style.cssText = "background:linear-gradient(135deg,var(--or-2),var(--or));border-radius:14px;padding:16px;margin-bottom:14px;color:var(--blanc)";
    carte.innerHTML = "<div style='font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:4px'>Total client</div><div style='font-size:30px;font-weight:200'>" + totalCA.toLocaleString("fr-FR",{minimumFractionDigits:2}) + " EUR TTC</div><div style='font-size:12px;opacity:.7;margin-top:4px'>" + devisFiltres.length + " devis</div>";
    body.appendChild(carte);
    afficherListeDevis(devisFiltres, body);
  }
  pn.appendChild(hdr); pn.appendChild(body);
  document.body.appendChild(pn);
}
function getSemaineCourante() {
  var now = new Date();
  var debut = new Date(now.getFullYear(), 0, 4);
  var diff = now - debut;
  return Math.ceil((diff / 86400000 + (debut.getDay()||7) - 1) / 7);
}

function ouvrirEditPlanning(clientNom, plannings, callback) {
  var plan = plannings.find(function(p){ return p.client===clientNom; });
  if (!plan) return;
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:20px 20px 0 0;padding:20px 16px;width:100%;max-width:430px;max-height:80vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(env(safe-area-inset-bottom,34px)+20px)";
  box.innerHTML = "<div style='font-size:17px;font-weight:700;color:var(--blanc);margin-bottom:4px'>" + echapper(clientNom) + "</div>" +
    "<div style='font-size:12px;color:#86868B;margin-bottom:16px'>Entrez les numeros de semaines separes par des virgules</div>";
  var PRESTS = ["TONTE","FAUCHAGE","FEUILLES","TAILLE","DESHERBAGE","ELAGAGE"];
  var inputs = {};
  PRESTS.forEach(function(p) {
    var sems = (plan.interventions[p] || []).join(",");
    var row = document.createElement("div");
    row.style.cssText = "margin-bottom:12px";
    var lbl = document.createElement("div");
    lbl.style.cssText = "font-size:11px;font-weight:700;color:" + (PREST_COULEURS[p]||"var(--txt-3)") + ";margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em";
    lbl.textContent = p;
    var inp = document.createElement("input");
    inp.type = "text"; inp.value = sems;
    inp.placeholder = "ex: 14,16,18,20";
    inp.style.cssText = "width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:var(--fond);color:var(--txt);font-size:14px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none";
    inputs[p] = inp;
    row.appendChild(lbl); row.appendChild(inp);
    box.appendChild(row);
  });
  var btnSave = document.createElement("button");
  btnSave.style.cssText = "width:100%;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:8px";
  btnSave.textContent = "Sauvegarder";
  btnSave.onclick = function() {
    PRESTS.forEach(function(p) {
      var val = inputs[p].value.trim();
      if (val) {
        plan.interventions[p] = val.split(",").map(function(s){ return parseInt(s.trim()); }).filter(function(n){ return !isNaN(n) && n>=1 && n<=52; });
      } else {
        delete plan.interventions[p];
      }
    });
    localStorage.setItem("creanature_planning", JSON.stringify(plannings));
    popup.remove();
    afficherToast("Planning sauvegarde !");
    if (callback) callback();
  };
  var btnAnn = document.createElement("button");
  btnAnn.style.cssText = "width:100%;height:44px;border-radius:12px;background:rgba(255,255,255,.08);border:none;color:var(--txt-3);font-size:14px;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:8px";
  btnAnn.textContent = "Annuler";
  btnAnn.onclick = function(){ popup.remove(); };
  box.appendChild(btnSave); box.appendChild(btnAnn);
  popup.appendChild(box);
  popup.onclick = function(e){ if(e.target===popup) popup.remove(); };
  document.body.appendChild(popup);
}

function ouvrirNouveauClientPlanning(plannings, callback) {
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,sans-serif";
  var box = document.createElement("div");
  box.style.cssText = "background:var(--blanc);border-radius:20px 20px 0 0;padding:20px 16px;width:100%;max-width:430px;max-height:85vh;display:flex;flex-direction:column;padding-bottom:calc(env(safe-area-inset-bottom,34px)+16px)";

  // Header
  var hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0";
  hdr.innerHTML = "<div style='font-size:17px;font-weight:700;color:var(--blanc)'>Nouveau client planning</div>";
  var btnX = document.createElement("button");
  btnX.style.cssText = "background:rgba(255,255,255,.08);border:none;color:var(--txt-3);width:28px;height:28px;border-radius:14px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center";
  btnX.textContent = "\u00D7";
  btnX.onclick = function(){ popup.remove(); };
  hdr.appendChild(btnX);
  box.appendChild(hdr);

  // Onglets
  var onglets = document.createElement("div");
  onglets.style.cssText = "display:flex;gap:6px;margin-bottom:16px;flex-shrink:0";
  var ongManuel = document.createElement("button");
  ongManuel.style.cssText = "flex:1;padding:9px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;background:rgba(200,146,62,.25);color:var(--or-2)";
  ongManuel.textContent = "Manuel";
  var ongIA = document.createElement("button");
  ongIA.style.cssText = "flex:1;padding:9px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;background:rgba(255,255,255,.08);color:var(--txt-3)";
  ongIA.innerHTML = "\u2728 Generer avec IA";
  onglets.appendChild(ongManuel); onglets.appendChild(ongIA);
  box.appendChild(onglets);

  // Contenu scrollable
  var corps = document.createElement("div");
  corps.style.cssText = "overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1";
  box.appendChild(corps);

  // \u2500\u2500 Panneau Manuel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var pManuel = document.createElement("div");
  var inp = document.createElement("input");
  inp.type = "text"; inp.placeholder = "Nom du client (ex: DUPONT SAS)";
  inp.style.cssText = "width:100%;padding:12px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;background:var(--fond);color:var(--txt);font-size:15px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;margin-bottom:12px;display:block;box-sizing:border-box";
  var btnCr = document.createElement("button");
  btnCr.style.cssText = "width:100%;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif";
  btnCr.textContent = "Creer le planning";
  btnCr.onclick = function() {
    var nom = inp.value.trim().toUpperCase();
    if (!nom) { afficherToast("Entre un nom"); return; }
    if (plannings.find(function(p){ return p.client===nom; })) { afficherToast("Client deja existant"); return; }
    plannings.push({ client: nom, interventions: {}, designation: "" });
    localStorage.setItem("creanature_planning", JSON.stringify(plannings));
    popup.remove();
    afficherToast(nom + " ajoute !");
    if (callback) callback();
  };
  pManuel.appendChild(inp); pManuel.appendChild(btnCr);
  corps.appendChild(pManuel);

  // \u2500\u2500 Panneau IA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var pIA = document.createElement("div");
  pIA.style.display = "none";

  var lblNom = document.createElement("div");
  lblNom.style.cssText = "font-size:11px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px";
  lblNom.textContent = "Nom du client";
  var inpNom = document.createElement("input");
  inpNom.type = "text"; inpNom.placeholder = "Ex: NOUVEAU CLIENT SAS";
  inpNom.style.cssText = "width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:var(--fond);color:var(--txt);font-size:14px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;margin-bottom:12px;display:block;box-sizing:border-box";

  var lblDesc = document.createElement("div");
  lblDesc.style.cssText = "font-size:11px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px";
  lblDesc.textContent = "Prestations du contrat";
  var taDesc = document.createElement("textarea");
  taDesc.placeholder = "Ex: 10 tontes, 2 fauchages, 1 taille de haie, 3 desherbage...";
  taDesc.rows = 3;
  taDesc.style.cssText = "width:100%;padding:10px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px;background:var(--fond);color:var(--txt);font-size:14px;font-family:-apple-system,sans-serif;outline:none;resize:none;-webkit-appearance:none;margin-bottom:14px;display:block;box-sizing:border-box;line-height:1.4";

  var hint = document.createElement("div");
  hint.style.cssText = "background:rgba(110,64,201,.15);border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:rgba(155,89,208,.9);line-height:1.5";
  hint.textContent = "L'IA va analyser les plannings existants pour caler les interventions sur les memes semaines que tes clients actuels.";

  var resultIA = document.createElement("div");
  resultIA.id = "planning-ia-result";

  var btnGen = document.createElement("button");
  btnGen.style.cssText = "width:100%;height:50px;border-radius:12px;background:linear-gradient(135deg,var(--violet),var(--violet-2));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px";
  btnGen.innerHTML = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' fill='white'/></svg> Generer le planning";
  btnGen.onclick = function() {
    var nom = inpNom.value.trim().toUpperCase();
    var desc = taDesc.value.trim();
    if (!nom) { afficherToast("Entre le nom du client"); return; }
    if (!desc) { afficherToast("Decris les prestations du contrat"); return; }
    if (plannings.find(function(p){ return p.client===nom; })) { afficherToast("Client deja existant"); return; }
    var apiKey = localStorage.getItem("creanature_api_key") || "";
    if (!apiKey) { afficherToast("Cle API manquante - Reglages > Assistant IA"); return; }

    btnGen.textContent = "Generation en cours..."; btnGen.disabled = true;
    resultIA.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:16px;font-size:13px'>Analyse des plannings existants...</div>";

    // Construire le contexte des plannings existants
    var contexte = "Plannings existants:\n";
    plannings.forEach(function(p) {
      contexte += "\n" + p.client + ":\n";
      Object.keys(p.interventions).forEach(function(prest) {
        contexte += "  " + prest + ": semaines " + (p.interventions[prest]||[]).join(",") + "\n";
      });
    });

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          {role:"system", content:"Tu es un expert en planification de travaux de paysagisme. Ton role: generer un planning annuel sur 52 semaines pour un nouveau client, en repartissant les interventions intelligemment sur les memes semaines que les clients existants (pour optimiser les deplacements), en evitant les semaines sans activite deja planifiee sauf si necessaire. Reponds UNIQUEMENT en JSON valide: {\"prests\":{\"TONTE\":[1,4,7],\"FAUCHAGE\":[10,20],\"TAILLE\":[15]}} avec les noms de prestations en majuscules (TONTE, FAUCHAGE, TAILLE, DESHERBAGE, FEUILLES, ELAGAGE) et les numeros de semaines. Ne reponds QUE du JSON."},
          {role:"user", content:"Nouveau client: " + nom + "\nPrestations du contrat: " + desc + "\n\n" + contexte}
        ]
      })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      btnGen.innerHTML = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' fill='white'/></svg> Generer le planning";
      btnGen.disabled = false;
      try {
        var raw = data.choices && data.choices[0] ? data.choices[0].message.content : "";
        var parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
        var prests = parsed.prests || parsed;
        resultIA.innerHTML = "";

        // Aper\u00E7u
        var prevDiv = document.createElement("div");
        prevDiv.style.cssText = "background:var(--fond);border-radius:12px;padding:14px;margin-bottom:12px";
        var prevTitre = document.createElement("div");
        prevTitre.style.cssText = "font-size:12px;font-weight:700;color:#9B59D0;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px";
        prevTitre.textContent = "Planning genere pour " + nom;
        prevDiv.appendChild(prevTitre);
        Object.keys(prests).forEach(function(prest) {
          var sems = prests[prest] || [];
          var row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px";
          var chip = document.createElement("div");
          chip.style.cssText = "padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:var(--blanc);background:" + (PREST_COULEURS[prest]||"var(--txt-3)") + ";flex-shrink:0;min-width:80px;text-align:center";
          chip.textContent = prest;
          var semsDiv = document.createElement("div");
          semsDiv.style.cssText = "font-size:12px;color:var(--txt-3);flex:1";
          semsDiv.textContent = sems.length + " fois - S" + sems.slice(0,4).join(", S") + (sems.length > 4 ? "..." : "");
          row.appendChild(chip); row.appendChild(semsDiv);
          prevDiv.appendChild(row);
        });
        resultIA.appendChild(prevDiv);

        var btnApply = document.createElement("button");
        btnApply.style.cssText = "width:100%;height:50px;border-radius:12px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;margin-bottom:8px";
        btnApply.textContent = "Valider et ajouter au planning";
        btnApply.onclick = function() {
          plannings.push({ client: nom, interventions: prests, designation: "" });
          localStorage.setItem("creanature_planning", JSON.stringify(plannings));
          popup.remove();
          afficherToast(nom + " ajoute avec " + Object.keys(prests).length + " prestations !");
          if (callback) callback();
        };
        var btnRegen = document.createElement("button");
        btnRegen.style.cssText = "width:100%;height:40px;border-radius:12px;background:rgba(110,64,201,.2);border:none;color:#9B59D0;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
        btnRegen.textContent = "Regenerer";
        btnRegen.onclick = function() { resultIA.innerHTML = ""; btnGen.click(); };
        resultIA.appendChild(btnApply);
        resultIA.appendChild(btnRegen);
      } catch(e) {
        resultIA.innerHTML = "<div style='color:var(--erreur);padding:10px;text-align:center;font-size:13px'>Erreur de generation. Reformule et reessaie.</div>";
      }
    })
    .catch(function() {
      btnGen.innerHTML = "Generer le planning"; btnGen.disabled = false;
      resultIA.innerHTML = "<div style='color:var(--erreur);padding:10px;text-align:center;font-size:13px'>Erreur de connexion.</div>";
    });
  };

  pIA.appendChild(lblNom); pIA.appendChild(inpNom);
  pIA.appendChild(lblDesc); pIA.appendChild(taDesc);
  pIA.appendChild(hint); pIA.appendChild(resultIA); pIA.appendChild(btnGen);
  corps.appendChild(pIA);

  // Switcher onglets
  ongManuel.onclick = function() {
    ongManuel.style.background = "rgba(200,146,62,.25)"; ongManuel.style.color = "var(--or-2)";
    ongIA.style.background = "rgba(255,255,255,.08)"; ongIA.style.color = "var(--txt-3)";
    pManuel.style.display = "block"; pIA.style.display = "none";
  };
  ongIA.onclick = function() {
    ongIA.style.background = "rgba(110,64,201,.3)"; ongIA.style.color = "#9B59D0";
    ongManuel.style.background = "rgba(255,255,255,.08)"; ongManuel.style.color = "var(--txt-3)";
    pManuel.style.display = "none"; pIA.style.display = "block";
  };

  popup.appendChild(box);
  popup.onclick = function(e){ if(e.target===popup) popup.remove(); };
  document.body.appendChild(popup);
}



// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MODULE CAMPAGNE MAIL
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

var CAMPAGNES_MODELES = [
  {
    id: "printemps",
    titre: "Offre printemps",
    emoji: "\u1F331",
    sujet: "Crea Nature - Pr\u00E9parez votre jardin pour le printemps !",
    corps: "Bonjour,\n\nLe printemps approche et c'est le moment id\u00E9al pour pr\u00E9parer vos espaces verts !\n\nChez "+SOCIETE_NOM+", nous vous proposons :\n\n\u1F33F Tonte et mise en forme de vos pelouses\n\u2702\uFE0F Taille de haies et arbustes\n\u1F338 Nettoyage et pr\u00E9paration des massifs\n\u1F331 Plantation et entretien saisonnier\n\nProfitez de notre expertise pour un jardin impeccable d\u00E8s les beaux jours.\n\nContactez-nous pour obtenir un devis gratuit !\n\nCordialement,\nL'\u00E9quipe \"+SOCIETE_NOM+\"\nTel : 06 19 30 40 93\ncreanature@ymail.com"
  },
  {
    id: "automne",
    titre: "Nettoyage automne",
    emoji: "\u1F342",
    sujet: "Crea Nature - Pr\u00E9parez votre jardin pour l'hiver",
    corps: "Bonjour,\n\nL'automne est l\u00E0 ! C'est le moment de pr\u00E9parer vos espaces verts pour affronter l'hiver dans les meilleures conditions.\n\nNos prestations automnales :\n\n\u1F342 Ramassage de feuilles\n\u2702\uFE0F Taille d'automne de vos haies\n\u1F33F Fauchage et d\u00E9broussaillage\n\u1F331 Traitement et protection de vos plantations\n\nN'attendez pas que votre jardin soit envahi ! Faites appel \u00E0 nos \u00E9quipes d\u00E8s maintenant.\n\nCordialement,\nL'\u00E9quipe \"+SOCIETE_NOM+\"\nTel : 06 19 30 40 93\ncreanature@ymail.com"
  },
  {
    id: "renouvellement",
    titre: "Renouvellement contrat",
    emoji: "\u1F4CB",
    sujet: "Crea Nature - Renouvellement de votre contrat d'entretien",
    corps: "Bonjour,\n\nNous esp\u00E9rons que vous \u00EAtes satisfait(e) de nos services d'entretien de vos espaces verts.\n\n\u00C0 l'approche du renouvellement de votre contrat, nous souhaitons vous recontacter pour :\n\n\u2705 Faire le bilan de l'ann\u00E9e \u00E9coul\u00E9e\n\u2705 Adapter nos prestations \u00E0 vos besoins\n\u2705 Vous proposer notre offre pour la prochaine saison\n\nNous restons \u00E0 votre disposition pour convenir d'un rendez-vous ou r\u00E9pondre \u00E0 vos questions.\n\nMerci de votre confiance.\n\nCordialement,\nL'\u00E9quipe \"+SOCIETE_NOM+\"\nTel : 06 19 30 40 93\ncreanature@ymail.com"
  },
  {
    id: "voeux",
    titre: "V\u0153ux de fin d'ann\u00E9e",
    emoji: "\u1F384",
    sujet: "Crea Nature vous souhaite une excellente ann\u00E9e !",
    corps: "Bonjour,\n\n\u00C0 l'occasion de la nouvelle ann\u00E9e, toute l'\u00E9quipe \"+SOCIETE_NOM+\" vous adresse ses meilleurs v\u0153ux.\n\nNous vous souhaitons une excellente ann\u00E9e, pleine de sant\u00E9, de bonheur et de beaux projets.\n\nMerci de nous faire confiance pour l'entretien de vos espaces verts. C'est gr\u00E2ce \u00E0 vous que nous pouvons continuer \u00E0 grandir et \u00E0 am\u00E9liorer nos services.\n\nNous nous r\u00E9jouissons de continuer \u00E0 travailler avec vous en cette nouvelle ann\u00E9e.\n\nChaleureusement,\nL'\u00E9quipe \"+SOCIETE_NOM+\"\nTel : 06 19 30 40 93\ncreanature@ymail.com"
  },
  {
    id: "nouveaute",
    titre: "Nouveau service",
    emoji: "\u2728",
    sujet: "Crea Nature - D\u00E9couvrez nos nouveaux services",
    corps: "Bonjour,\n\n"+SOCIETE_NOM+" \u00E9volue et nous sommes ravis de vous annoncer de nouvelles prestations !\n\nNos nouveaut\u00E9s :\n\n\u1F333 \u00C9lagage et abattage d'arbres\n\u1F3E1 Am\u00E9nagement et cr\u00E9ation de jardins\n\u1F4A7 Installation de syst\u00E8mes d'arrosage automatique\n\u1F33F Conseils personnalis\u00E9s en v\u00E9g\u00E9talisation\n\nFaites confiance \u00E0 notre \u00E9quipe de professionnels pour embellir et valoriser vos espaces ext\u00E9rieurs.\n\nContactez-nous pour en savoir plus !\n\nCordialement,\nL'\u00E9quipe \"+SOCIETE_NOM+\"\nTel : 06 19 30 40 93\ncreanature@ymail.com"
  }
];

function ouvrirCampagneMail() {
  var ancien = document.getElementById("panneau-campagne");
  if (ancien) ancien.remove();

  var pn = document.createElement("div");
  pn.id = "panneau-campagne";
  pn.style.cssText = "position:fixed;inset:0;z-index:999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  // Header
  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#18181F,#111116);padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>Campagne mail</div><div style='font-size:11px;color:rgba(255,255,255,.6);margin-top:2px'>Envoyer a tous vos clients</div></div>";
  var btnF = document.createElement("button");
  btnF.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnF.textContent = "Fermer";
  btnF.onclick = function(){ pn.remove(); };
  hdr.appendChild(btnF);

  // Corps scrollable
  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";

  // \u2500\u2500 Section mod\u00E8les \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var titreModeles = document.createElement("div");
  titreModeles.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--txt-3);margin-bottom:10px";
  titreModeles.textContent = "Modeles prets";
  body.appendChild(titreModeles);

  CAMPAGNES_MODELES.forEach(function(m) {
    var card = document.createElement("button");
    card.style.cssText = "width:100%;background:var(--blanc);border:none;border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:-apple-system,sans-serif;text-align:left";
    var ico = document.createElement("div");
    ico.style.cssText = "width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#18181F,#111116);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0";
    ico.textContent = m.emoji;
    var info = document.createElement("div");
    info.innerHTML = "<div style='font-size:15px;font-weight:600;color:var(--blanc);margin-bottom:3px'>" + echapper(m.titre) + "</div><div style='font-size:12px;color:var(--txt-3)'>" + echapper(m.sujet) + "</div>";
    card.appendChild(ico); card.appendChild(info);
    (function(modele){ card.onclick = function(){ ouvrirEditeurCampagne(modele, pn); }; })(m);
    body.appendChild(card);
  });

  // \u2500\u2500 Nouvelle campagne avec IA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var sep = document.createElement("div");
  sep.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--txt-3);margin:16px 0 10px";
  sep.textContent = "Creer avec l'IA";
  body.appendChild(sep);

  var cardIA = document.createElement("button");
  cardIA.style.cssText = "width:100%;background:linear-gradient(135deg,#2D1B69,#1A0F40);border:none;border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:-apple-system,sans-serif;text-align:left;margin-bottom:8px";
  cardIA.innerHTML = "<div style='width:44px;height:44px;border-radius:12px;background:rgba(110,64,201,.4);display:flex;align-items:center;justify-content:center;flex-shrink:0'><svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' fill='white'/></svg></div><div><div style='font-size:15px;font-weight:600;color:var(--blanc);margin-bottom:3px'>Nouvelle campagne IA</div><div style='font-size:12px;color:rgba(255,255,255,.6)'>Decris ton objectif, ChatGPT redige</div></div>";
  cardIA.onclick = function(){ ouvrirIACampagne(pn); };
  body.appendChild(cardIA);

  // \u2500\u2500 Campagne libre \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var cardLibre = document.createElement("button");
  cardLibre.style.cssText = "width:100%;background:var(--blanc);border:none;border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:-apple-system,sans-serif;text-align:left;margin-bottom:20px";
  cardLibre.innerHTML = "<div style='width:44px;height:44px;border-radius:12px;background:rgba(200,146,62,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0'><svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' stroke='var(--or-2)' stroke-width='2' stroke-linecap='round'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' stroke='var(--or-2)' stroke-width='2' stroke-linecap='round'/></svg></div><div><div style='font-size:15px;font-weight:600;color:var(--blanc);margin-bottom:3px'>Message libre</div><div style='font-size:12px;color:var(--txt-3)'>Ecrire ton propre message</div></div>";
  cardLibre.onclick = function(){ ouvrirEditeurCampagne({id:"libre",titre:"Message libre",emoji:"\u270F\uFE0F",sujet:"",corps:""}, pn); };
  body.appendChild(cardLibre);

  pn.appendChild(hdr); pn.appendChild(body);
  document.body.appendChild(pn);
}

function ouvrirIACampagne(parentPn) {
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,var(--violet),var(--violet-2));padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div><div style='font-size:17px;font-weight:700;color:var(--blanc)'>\u2728 IA - Campagne mail</div><div style='font-size:11px;color:rgba(255,255,255,.7);margin-top:2px'>Decris ton objectif</div></div>";
  var btnRetour = document.createElement("button");
  btnRetour.style.cssText = "background:rgba(255,255,255,.15);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnRetour.textContent = "Retour";
  btnRetour.onclick = function(){ popup.remove(); };
  hdr.appendChild(btnRetour);

  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px";

  // Instructions
  var hint = document.createElement("div");
  hint.style.cssText = "background:var(--blanc);border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--txt-3);line-height:1.6";
  hint.textContent = "Exemples :\n- Offre sp\u00E9ciale taille de haie pour l'automne avec 10% de remise\n- Rappel aux clients pour le nettoyage hivernal\n- Pr\u00E9sentation de notre nouveau service d'\u00E9lagage";
  body.appendChild(hint);

  // Zone de saisie
  var label = document.createElement("div");
  label.style.cssText = "font-size:12px;color:var(--txt-3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700";
  label.textContent = "D\u00E9cris ta campagne";
  body.appendChild(label);

  var ta = document.createElement("textarea");
  ta.placeholder = "Ex: Je veux envoyer un mail pour proposer une remise de 15% sur la tonte de printemps...";
  ta.rows = 4;
  ta.style.cssText = "width:100%;padding:12px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:12px;background:var(--blanc);color:var(--txt);font-size:15px;font-family:-apple-system,sans-serif;outline:none;resize:none;-webkit-appearance:none;display:block;box-sizing:border-box;margin-bottom:14px";
  body.appendChild(ta);

  // R\u00E9sultat IA
  var resultDiv = document.createElement("div");
  resultDiv.id = "ia-campagne-result";
  body.appendChild(resultDiv);

  // Bouton g\u00E9n\u00E9rer
  var btnGen = document.createElement("button");
  btnGen.style.cssText = "width:100%;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--violet),var(--violet-2));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px";
  btnGen.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='none'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' fill='white'/></svg> Generer avec ChatGPT";
  btnGen.onclick = function() {
    var desc = ta.value.trim();
    if (!desc) { afficherToast("Decris d'abord ta campagne"); return; }
    var apiKey = localStorage.getItem("creanature_api_key") || "";
    if (!apiKey) { afficherToast("Cle API manquante - Reglages > Assistant IA"); return; }
    btnGen.textContent = "Generation en cours..."; btnGen.disabled = true;
    resultDiv.innerHTML = "<div style='text-align:center;color:var(--txt-3);padding:20px;font-size:14px'>ChatGPT redige votre campagne...</div>";
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          {role:"system", content:"Tu es un expert en communication pour Crea Nature, entreprise de paysagisme en Seine-et-Marne. Redige un mail de campagne commercial professionnel et chaleureux. Reponds UNIQUEMENT en JSON: {\"sujet\":\"sujet du mail\",\"corps\":\"corps du mail complet avec sauts de ligne\"}. Le mail doit finir par la signature Crea Nature, Tel : 06 19 30 40 93, creanature@ymail.com. Ne reponds QUE du JSON."},
          {role:"user", content:"Objectif de la campagne: " + desc}
        ]
      })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      btnGen.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='none'><path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' fill='white'/></svg> Generer avec ChatGPT";
      btnGen.disabled = false;
      try {
        var raw = data.choices && data.choices[0] ? data.choices[0].message.content : "";
        var parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
        var modeleIA = { id:"ia_"+Date.now(), titre:"Campagne IA", emoji:"\u2728", sujet:parsed.sujet, corps:parsed.corps };
        resultDiv.innerHTML = "";
        var preview = document.createElement("div");
        preview.style.cssText = "background:var(--blanc);border-radius:12px;padding:14px;margin-bottom:12px";
        preview.innerHTML = "<div style='font-size:10px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px'>Apercu gener\u00E9</div><div style='font-size:13px;font-weight:600;color:var(--or-2);margin-bottom:6px'>" + echapper(parsed.sujet) + "</div><div style='font-size:13px;color:var(--txt);white-space:pre-wrap;line-height:1.5'>" + echapper(parsed.corps.substring(0,300)) + (parsed.corps.length > 300 ? "..." : "") + "</div>";
        resultDiv.appendChild(preview);
        var btnUtiliser = document.createElement("button");
        btnUtiliser.style.cssText = "width:100%;height:50px;border-radius:14px;background:linear-gradient(135deg,var(--or-2),var(--or));border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif";
        btnUtiliser.textContent = "Utiliser ce mail";
        btnUtiliser.onclick = function(){ popup.remove(); if(parentPn) parentPn.remove(); ouvrirEditeurCampagne(modeleIA, null); };
        resultDiv.appendChild(btnUtiliser);
      } catch(e) {
        resultDiv.innerHTML = "<div style='color:var(--erreur);padding:10px;text-align:center;font-size:13px'>Erreur de g\u00E9n\u00E9ration. R\u00E9essaie.</div>";
      }
    })
    .catch(function() {
      btnGen.innerHTML = "Generer avec ChatGPT"; btnGen.disabled = false;
      resultDiv.innerHTML = "<div style='color:var(--erreur);padding:10px;text-align:center;font-size:13px'>Erreur de connexion.</div>";
    });
  };

  pn.appendChild(hdr); pn.appendChild(body); pn.appendChild(btnGen);

  // Padding sous le bouton
  var padBtn = document.createElement("div");
  padBtn.style.cssText = "height:calc(env(safe-area-inset-bottom,34px)+16px);background:var(--fond);flex-shrink:0";
  pn.appendChild(padBtn);

  var pn = popup;
  document.body.appendChild(popup);
}

function ouvrirEditeurCampagne(modele, parentPn) {
  var popup = document.createElement("div");
  popup.style.cssText = "position:fixed;inset:0;z-index:9999999;background:var(--fond);display:flex;flex-direction:column;font-family:-apple-system,sans-serif";

  var hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#18181F,#111116);padding:14px 16px;padding-top:calc(env(safe-area-inset-top,44px)+6px);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  hdr.innerHTML = "<div style='font-size:17px;font-weight:700;color:var(--blanc)'>" + modele.emoji + " " + echapper(modele.titre) + "</div>";
  var btnRet = document.createElement("button");
  btnRet.style.cssText = "background:rgba(255,255,255,.1);border:none;color:var(--blanc);padding:6px 14px;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif";
  btnRet.textContent = "Retour";
  btnRet.onclick = function(){ popup.remove(); };
  hdr.appendChild(btnRet);

  var body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px";

  // Sujet
  var lblSujet = document.createElement("div");
  lblSujet.style.cssText = "font-size:11px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px";
  lblSujet.textContent = "Sujet du mail";
  var inpSujet = document.createElement("input");
  inpSujet.type = "text";
  inpSujet.value = modele.sujet;
  inpSujet.placeholder = "Sujet de votre campagne";
  inpSujet.style.cssText = "width:100%;padding:12px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;background:var(--blanc);color:var(--txt);font-size:15px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;display:block;box-sizing:border-box;margin-bottom:14px";

  // Corps
  var lblCorps = document.createElement("div");
  lblCorps.style.cssText = "font-size:11px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px";
  lblCorps.textContent = "Corps du mail";
  var taCorps = document.createElement("textarea");
  taCorps.value = modele.corps;
  taCorps.rows = 12;
  taCorps.style.cssText = "width:100%;padding:12px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;background:var(--blanc);color:var(--txt);font-size:14px;font-family:-apple-system,sans-serif;outline:none;resize:none;-webkit-appearance:none;display:block;box-sizing:border-box;margin-bottom:14px;line-height:1.5";

  // Destinataires
  var lblDest = document.createElement("div");
  lblDest.style.cssText = "font-size:11px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px";
  lblDest.textContent = "Destinataires";
  var destInfo = document.createElement("div");
  destInfo.style.cssText = "background:var(--blanc);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--txt-3)";
  destInfo.textContent = "Chargement des clients...";

  // Charger les clients depuis Firebase
  var emails = [];
  db.collection("clients").get().then(function(snap) {
    var clients = [];
    snap.forEach(function(doc) {
      var d = doc.data();
      if (d.email) clients.push({nom: d.nom||"", email: d.email});
    });
    emails = clients.map(function(c){ return c.email; });
    destInfo.innerHTML = "<div style='font-size:15px;font-weight:600;color:var(--blanc);margin-bottom:4px'>" + clients.length + " clients avec email</div><div style='font-size:11px;color:var(--txt-2)'>" + clients.slice(0,3).map(function(c){return echapper(c.nom);}).join(", ") + (clients.length > 3 ? " et " + (clients.length-3) + " autres" : "") + "</div>";
    if (clients.length === 0) {
      destInfo.innerHTML = "<div style='color:var(--erreur);font-size:13px'>Aucun client avec email dans votre base</div>";
    }
  }).catch(function(){ destInfo.textContent = "Erreur chargement clients"; });

  body.appendChild(lblSujet); body.appendChild(inpSujet);
  body.appendChild(lblCorps); body.appendChild(taCorps);
  body.appendChild(lblDest); body.appendChild(destInfo);

  // Bouton envoyer
  var footer = document.createElement("div");
  footer.style.cssText = "flex-shrink:0;padding:14px;padding-bottom:calc(env(safe-area-inset-bottom,34px)+10px);background:var(--fond);border-top:.5px solid #2C2C2E";
  var btnEnvoyer = document.createElement("button");
  btnEnvoyer.style.cssText = "width:100%;height:52px;border-radius:14px;background:linear-gradient(135deg,#18181F,#111116);border:none;color:var(--blanc);font-size:15px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px";
  btnEnvoyer.innerHTML = "<svg width='18' height='18' viewBox='0 0 24 24' fill='none'><path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg> Envoyer la campagne";
  btnEnvoyer.onclick = function() {
    var sujet = inpSujet.value.trim();
    var corps = taCorps.value.trim();
    if (!sujet) { afficherToast("Entre un sujet"); return; }
    if (!corps) { afficherToast("Entre le corps du mail"); return; }
    if (!emails.length) { afficherToast("Aucun client avec email"); return; }
    var bcc = emails.map(function(e){ return encodeURIComponent(e); }).join(",");
    var nl = "%0D%0A";
    var corpsEnc = corps.split("\n").map(function(l){ return encodeURIComponent(l); }).join(nl);
    window.location.href = "mailto:creanature@ymail.com?bcc=" + bcc
      + "&subject=" + encodeURIComponent(sujet)
      + "&body=" + corpsEnc;
    afficherToast("Mail prepare - " + emails.length + " destinataires en BCC");
    setTimeout(function(){ popup.remove(); if(parentPn) parentPn.remove(); }, 1000);
  };
  footer.appendChild(btnEnvoyer);

  popup.appendChild(hdr); popup.appendChild(body); popup.appendChild(footer);
  document.body.appendChild(popup);
}


function init() {
  chargerSociete();
  // Attacher evenements pave
  var touches = ["7","8","9","4","5","6","1","2","3",".","0"];
  for (var i = 0; i < touches.length; i++) {
    (function(k) {
      var id = k === "." ? "tv" : "t" + k;
      var b = trouverEl(id);
      if (b) b.onclick = function() { appuyerTouche(k); };
    })(touches[i]);
  }
  var teff = trouverEl("teff");
  if (teff) teff.onclick = function() { appuyerTouche("X"); };
  var tok = trouverEl("tok");
  if (tok) tok.onclick = fermerPave;

  // Prestations
  var plist = ["haie", "tonte", "elagage", "abattage", "evac"];
  for (var i = 0; i < plist.length; i++) {
    (function(p) {
      var b = trouverEl("bp-" + p);
      if (b) b.onclick = function() { togglePrest(p); };
    })(plist[i]);
  }
  var bAutre = trouverEl("bp-autre");
  if (bAutre) bAutre.onclick = function() { toggleAutre("main"); };

  // Intervenants
  for (var i = 1; i <= 4; i++) {
    (function(n) {
      var b = trouverEl("bi-" + n);
      if (b) b.onclick = function() { setInterv(n); };
    })(i);
  }

  // Champs
  var cth = trouverEl("ct-h");
  if (cth) cth.onclick = function() { ouvrirPave("h", "ct-h", "cur-h"); };
  var cts = trouverEl("ct-s");
  if (cts) cts.onclick = function() { ouvrirPave("s", "ct-s", "cur-s"); };

  // Autre texte main
  var tAutreMain = trouverEl("txt-autre-main");
  if (tAutreMain) tAutreMain.oninput = function() { etat.autreTexte = this.value; calculer(); };

  // Photos main
  var inputPhMain = trouverEl("input-photo-main");
  if (inputPhMain) inputPhMain.onchange = function() { ajouterPhotos("main", this); };

  // Boutons
  var btnAjout = trouverEl("btn-ajouter-desig");
  if (btnAjout) btnAjout.onclick = ajouterLigne;
  var btnReset = trouverEl("btn-reset");
  if (btnReset) btnReset.onclick = reinitialiser;
  var btnDevis = trouverEl("btn-vers-devis");
  if (btnDevis) btnDevis.onclick = function() { allerVers("devis"); };
  var btnVisu = trouverEl("btn-visualiser");
  if (btnVisu) btnVisu.onclick = visualiserDevis;
  var btnRetour = trouverEl("btn-retour");
  if (btnRetour) btnRetour.onclick = function() { allerVers("calc"); };
  var btnND = trouverEl("btn-nouveau-devis");
  if (btnND) btnND.onclick = function() { reinitialiser(); allerVers("calc"); };

  // Clients
  var btnMesClients = trouverEl("btn-mes-clients");
  if (btnMesClients) btnMesClients.onclick = ouvrirClientsPourDevis;
  if (typeof initAutocompleteClient === "function") initAutocompleteClient();
  var btnSauverClient = trouverEl("btn-sauver-client");
  if (btnSauverClient) btnSauverClient.onclick = sauverClientActuel;

  // Date et numero
  var d = new Date();
  var dd = ("0" + d.getDate()).slice(-2);
  var mm = ("0" + (d.getMonth() + 1)).slice(-2);
  var yyyy = d.getFullYear();
  var dDate = trouverEl("d-date");
  if (dDate) dDate.value = dd + "/" + mm + "/" + yyyy;
  // Numero de devis auto-incremente depuis Firebase
  var dNum = trouverEl("d-num");
  if (dNum) {
    var yyyy2 = yyyy, mm2 = mm;
    db.collection("config").doc("devis").get().then(function(doc) {
      var dernierNum = 0;
      if (doc.exists) {
        var data = doc.data();
        // Reset si nouvelle annee/mois
        if (data.annee === yyyy2 && data.mois === mm2) {
          dernierNum = data.num || 0;
        }
      }
      var numStr = String(dernierNum + 1).padStart(3, "0");
      if (dNum) dNum.value = yyyy2 + "-" + mm2 + "-" + numStr;
    }).catch(function() {
      if (dNum) dNum.value = yyyy2 + "-" + mm2 + "-001";
    });
  }

  // Onglets
  var oCalc = trouverEl("ong-calc");
  if (oCalc) oCalc.onclick = function() { allerVers("calc"); };
  var oDevis = trouverEl("ong-devis");
  if (oDevis) oDevis.onclick = function() { allerVers("devis"); };

  // Fermer install
  var btnFI = trouverEl("btn-fermer-install");
  if (btnFI) btnFI.onclick = function() { trouverEl("barre-install").classList.remove("visible"); };

  // Banner install
  var sa = window.navigator.standalone === true || window.matchMedia("(display-mode:standalone)").matches;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !sa) {
    var bi = trouverEl("barre-install");
    if (bi) bi.classList.add("visible");
  }

  // Mode sombre
  if (localStorage.getItem("cn_dark") === "1") {
    modeSombre = true;
    document.body.classList.add("dark");
    var btnD = document.getElementById("btn-dark");
    if (btnD) btnD.textContent = "\u2600\uFE0F";
  }

  // Demarrage : afficher choix utilisateur
  document.getElementById("app").style.display = "none";

  // Verifier si session active avec utilisateur connu
  var sessionActive = localStorage.getItem("cn_connecte") === "1";
  var userId = localStorage.getItem("cn_user");

  if (sessionActive && userId) {
    // Recharger l'utilisateur depuis Firebase et ouvrir directement
    chargerUtilisateurs(function(users) {
      var u = users.find(function(x){ return x.id === userId; });
      if (u) {
        utilisateurActuel = u;
        ouvrirAccueil();
      } else {
        afficherChoixUsers();
      }
    });
  } else {
    afficherChoixUsers();
  }

  afficherPhotos("main");
  calculer();
}


// === PWA : manifest + service worker inline (fichier unique) ===
(function() {
  // 1. Manifest inline via Blob
  try {
    var manifest = {
      name: "Crea Nature",
      short_name: "Crea Nature",
      start_url: ".",
      display: "standalone",
      background_color: "#09090B",
      theme_color: "#09090B",
      icons: []
    };
    var mBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    var mUrl = URL.createObjectURL(mBlob);
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = mUrl;
    document.head.appendChild(link);
  } catch (e) { /* ignore */ }

  // 2. Service Worker inline : cache l'app pour chargement hors-ligne
  if ("serviceWorker" in navigator) {
    var swCode = [
      "var CACHE = 'creanature-v2';",
      "self.addEventListener('install', function(e){ self.skipWaiting(); });",
      "self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });",
      "self.addEventListener('fetch', function(e){",
      "  var req = e.request;",
      "  if (req.method !== 'GET') return;",
      "  var url = new URL(req.url);",
      "  // Ne pas intercepter Firebase/Firestore (gere sa propre persistance)",
      "  if (url.hostname.indexOf('firestore') >= 0 || url.hostname.indexOf('googleapis') >= 0 || url.hostname.indexOf('firebaseio') >= 0 || url.hostname.indexOf('gstatic') >= 0) return;",
      "  // CACHE D'ABORD (stale-while-revalidate) : affichage instantane, maj en arriere-plan",
      "  e.respondWith(",
      "    caches.match(req).then(function(cached){",
      "      var reseau = fetch(req).then(function(res){",
      "        if (res && res.status === 200 && url.origin === location.origin) {",
      "          var copy = res.clone();",
      "          caches.open(CACHE).then(function(cache){ try { cache.put(req, copy); } catch(err){} });",
      "        }",
      "        return res;",
      "      }).catch(function(){ return cached; });",
      "      return cached || reseau;",
      "    })",
      "  );",
      "});"
    ].join("\n");
    try {
      var swBlob = new Blob([swCode], { type: "text/javascript" });
      var swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl).then(function(reg) {
        // SW enregistre
      }).catch(function(err) {
        console.warn("Service Worker non enregistre:", err.message);
      });
    } catch (e) { /* ignore */ }
  }
})();


window.addEventListener("load", function(){ init(); if (typeof majIndicateurReseau === "function") majIndicateurReseau(); });
