// Queste variabili devono essere accessibili da mapHandler.js e potenzialmente da altri moduli UI
// Se mapHandler.js gestisce buildingLayers e predispostoIds, queste funzioni potrebbero
// essere metodi di un oggetto MapManager o accettare questi stati come argomenti.
// Per ora, manteniamo l'approccio con variabili globali/condivise come nell'originale map_logic.js
// var buildingLayers = {}; // Sarà inizializzato e gestito in mapHandler.js
// var predispostoIds = new Set(); // Sarà inizializzato e gestito in mapHandler.js


/**
 * Aggiorna lo stile di un edificio sulla mappa a "predisposto" (giallo)
 * e lo aggiunge al set degli ID predisposti (gestito in mapHandler).
 * Questa funzione viene esposta globalmente su window.
 * @param {string|number} buildingId L'ID dell'edificio da aggiornare.
 */
function markBuildingAsPredispostoOnMap(buildingId) {
    // Assumiamo che 'buildingLayers' e 'predispostoIds' siano gestite in mapHandler.js
    // e che mapHandler.js esponga un modo per interagire con esse, oppure
    // che queste funzioni operino su variabili accessibili (es. globali o tramite un gestore di stato).
    
    const idStr = String(buildingId);
    console.log(`MAP_UTILS: Tentativo di marcare ${idStr} come predisposto.`);

    if (window.mapContext && window.mapContext.predispostoIds) {
         window.mapContext.predispostoIds.add(idStr);
    } else {
        console.warn("MAP_UTILS: window.mapContext.predispostoIds non definito.");
    }

    if (window.mapContext && window.mapContext.buildingLayers && window.mapContext.buildingLayers[idStr]) {
        const layerToUpdate = window.mapContext.buildingLayers[idStr];
        layerToUpdate.setStyle({ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.4 }); // Stile più evidente
        console.log(`MAP_UTILS: Layer ${idStr} trovato e aggiornato a giallo.`);
    } else {
        console.warn(`MAP_UTILS: Layer ${idStr} non trovato sulla mappa per marcare come predisposto. Potrebbe essere fuori BBox/Zoom.`);
    }
}
// Esponi globalmente per compatibilità con il codice originale che chiama window.markBuildingAsPredispostoOnMap
window.markBuildingAsPredispostoOnMap = markBuildingAsPredispostoOnMap;

/**
 * Rimuove lo stato "predisposto" da un edificio sulla mappa (rosso)
 * e lo rimuove dal set degli ID predisposti (gestito in mapHandler).
 * Questa funzione viene esposta globalmente su window.
 * @param {string|number} buildingId L'ID dell'edificio da aggiornare.
 */
function unmarkBuildingAsPredispostoOnMap(buildingId) {
    const idStr = String(buildingId);
    console.log(`MAP_UTILS: Tentativo di rimuovere lo stato predisposto da ${idStr}.`);

    if (window.mapContext && window.mapContext.predispostoIds) {
        window.mapContext.predispostoIds.delete(idStr);
    } else {
        console.warn("MAP_UTILS: window.mapContext.predispostoIds non definito.");
    }
    
    if (window.mapContext && window.mapContext.buildingLayers && window.mapContext.buildingLayers[idStr]) {
        const layerToUpdate = window.mapContext.buildingLayers[idStr];
        // Ripristina lo stile originale (es. rosso, o quello definito in base ad altre proprietà)
        layerToUpdate.setStyle({ color: 'red', fillColor: 'red', fillOpacity: 0.3 }); // Stile non predisposto
        console.log(`MAP_UTILS: Layer ${idStr} trovato e aggiornato a rosso (non predisposto).`);
    } else {
        console.warn(`MAP_UTILS: Layer ${idStr} non trovato sulla mappa per rimuovere marcatura predisposto.`);
    }
}
// Esponi globalmente
window.unmarkBuildingAsPredispostoOnMap = unmarkBuildingAsPredispostoOnMap;

// Contesto per la mappa condiviso, inizializzato da mapHandler.js
window.mapContext = {
    mapInstance: null,
    geoJsonLayer: null,
    centroidLayer: null,
    buildingLayers: {}, // Oggetto per mappare ID edificio -> layer Leaflet
    predispostoIds: new Set() // Set per memorizzare gli ID degli edifici predisposti
};