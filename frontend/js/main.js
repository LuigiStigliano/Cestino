document.addEventListener('DOMContentLoaded', function() {
    console.log("Applicazione Frontend Inizializzata - DOMContentLoaded");

    // Inizializza la navigazione (mostra sezione edifici di default)
    if (typeof setupNavigation === 'function') {
        setupNavigation();
    } else {
        console.error("Funzione setupNavigation non trovata.");
    }

    // Inizializza la mappa Leaflet
    if (typeof initMap === 'function') {
        initMap(); // Definita in mapHandler.js
    } else {
        console.error("Funzione initMap non trovata.");
    }
    
    // Inizializza i gestori per il form degli edifici
    if (typeof setupEdificiForm === 'function') {
        setupEdificiForm();
    } else {
        console.error("Funzione setupEdificiForm non trovata.");
    }

    // Inizializza i gestori per la tabella delle predisposizioni
    if (typeof setupPredisposizioniTableActions === 'function') {
        setupPredisposizioniTableActions();
        // La tabella delle predisposizioni viene caricata da showSection quando si va in #sectionTfo
        // o inizialmente se la sezione TFO fosse quella di default.
    } else {
        console.error("Funzione setupPredisposizioniTableActions non trovata.");
    }
    
    // Inizializza i gestori per la tabella TFO
    if (typeof setupTfoTableActions === 'function') {
        setupTfoTableActions();
    } else {
        console.error("Funzione setupTfoTableActions non trovata.");
    }

    // Inizializza i gestori per il form TFO
    if (typeof setupTfoFormActions === 'function') {
        setupTfoFormActions();
    } else {
        console.error("Funzione setupTfoFormActions non trovata.");
    }
});