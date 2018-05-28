/*global browser */
const hypertopic = require('hypertopic');
const panel = document.getElementById('panel');

let db = hypertopic([
	'http://argos2.hypertopic.org',
	'http://steatite.hypertopic.org'
]);

// Utiliser l'API browser.tabs pour récupérer l'onglet actif
// Un onglet va par défaut avoir LaSuli désactivé
// On peut l'activer depuis le panel

// Ça peut être bien d'avoir pareil pour le bouton en fait
// Le bouton est grisé par défaut, pour l'activer faut cliquer

// Je dois faire des schémas de l'UI de la sidebar
// Faudrait que je teste la version précédente de LaSuli

browser.runtime.onMessage.addListener((msg) => {
	console.log(msg);
	var div = document.createElement('div');
	div.textContent = msg.aim; // data;
	panel.appendChild(div);
});

