// Variabile globale per la mappa
let map;
let geoJsonLayer;
let centroidLayer;
let minZoomToLoad = 14;
let loadingIndicator = null;
let debounceTimer = null;
let lastBounds = null;
let errorMessageTimeout = null;

// NUOVE: Per gestire i layer e lo stato di predisposizione
let buildingLayers = {}; // Oggetto per mappare ID edificio -> layer Leaflet
let predispostoIds = new Set(); // Set per memorizzare gli ID degli edifici predisposti

// Funzione per inizializzare la mappa (chiamata da index.html)
function initMap() {
    // Centro su L'Aquila (o dove preferisci)
    map = L.map('map').setView([42.3498, 13.3995], 14); // Assicurati che il div #map esista

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Crea o ottieni l'indicatore di caricamento
    loadingIndicator = document.getElementById('loading');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerText = 'Caricamento dati...';
        loadingIndicator.style.position = 'absolute';
        loadingIndicator.style.top = '10px';
        loadingIndicator.style.right = '10px';
        loadingIndicator.style.zIndex = '1000';
        loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        loadingIndicator.style.padding = '5px 10px';
        loadingIndicator.style.borderRadius = '4px';
        loadingIndicator.style.display = 'none';
        document.body.appendChild(loadingIndicator);
    }

    // Crea un elemento per i messaggi di errore
    const errorElement = document.createElement('div');
    errorElement.id = 'map-error-message';
    errorElement.style.position = 'absolute';
    errorElement.style.bottom = '10px';
    errorElement.style.left = '10px';
    errorElement.style.zIndex = '1000';
    errorElement.style.maxWidth = '80%';
    errorElement.style.display = 'none';
    document.getElementById('map').appendChild(errorElement);

    map.on('moveend zoomend', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadBuildingsDataByBounds, 300);
    });

    loadBuildingsDataByBounds();
}

// Funzione per mostrare messaggi di errore
function showErrorMessage(message, duration = 5000) {
    const errorElement = document.getElementById('map-error-message');
    if (!errorElement) return;

    errorElement.innerHTML = `
        <div class="alert alert-danger">
            <strong>Errore</strong><br>
            ${message}<br>
            <small>Prova a cambiare l'area visualizzata o il livello di zoom.</small>
        </div>
    `;
    errorElement.style.display = 'block';

    // Cancella eventuali timeout precedenti
    if (errorMessageTimeout) {
        clearTimeout(errorMessageTimeout);
    }

    // Imposta un nuovo timeout per nascondere il messaggio
    errorMessageTimeout = setTimeout(() => {
        errorElement.style.display = 'none';
    }, duration);
}

// Funzione per caricare i dati degli edifici/abitazioni
function loadBuildingsDataByBounds() {
    const zoom = map.getZoom();
    if (zoom < minZoomToLoad) {
        if (geoJsonLayer) map.removeLayer(geoJsonLayer);
        if (centroidLayer) map.removeLayer(centroidLayer);
        buildingLayers = {};
        return;
    }

    const bounds = map.getBounds();
    let geometry_type;
    if (zoom > 16) {
        geometry_type = 'both';
    } else {
        if (geoJsonLayer) map.removeLayer(geoJsonLayer);
        if (centroidLayer) map.removeLayer(centroidLayer);
        buildingLayers = {};
        return;
    }

    const params = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: zoom,
        geometry_type: geometry_type
    };

    const query = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const fetchUrl = `http://127.0.0.1:8000/geojson/bbox?${query}`;

    if (loadingIndicator) {
        loadingIndicator.innerHTML = `Caricamento dati (zoom: ${zoom})...`;
        loadingIndicator.style.display = 'block';
    }

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (geoJsonLayer) map.removeLayer(geoJsonLayer);
            if (centroidLayer) map.removeLayer(centroidLayer);

            buildingLayers = {};
            geoJsonLayer = null;
            centroidLayer = null;

            // *** AGGIUNTO: Popola predispostoIds in base al campo predisposto_fibra ***
            predispostoIds = new Set();
            if (data.features) {
                data.features.forEach(feature => {
                    if (feature.properties && feature.properties.predisposto_fibra) {
                        const buildingId = feature.properties.id || feature.properties.objectid;
                        if (buildingId) predispostoIds.add(String(buildingId));
                    }
                });
            }
            // *** FINE AGGIUNTA ***

            const featureCount = data.features ? data.features.length : 0;
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `Caricati ${featureCount} elementi`;
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                }, 2000);
            }

            const polygonFeatures = [];
            const centroidFeatures = [];

            data.features.forEach(feature => {
                if (feature.properties && feature.properties.is_centroid) {
                    centroidFeatures.push(feature);
                } else {
                    polygonFeatures.push(feature);
                }
            });

            geoJsonLayer = L.geoJSON({
                type: "FeatureCollection",
                features: polygonFeatures
            }, {
                style: function(feature) {
                    const buildingId = feature.properties.id || feature.properties.objectid;
                    // *** MODIFICATO: Usa 'predispostoIds' popolato dinamicamente ***
                    const isPredisposto = predispostoIds.has(String(buildingId));

                    if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                        return {
                            color: isPredisposto ? 'yellow' : 'red', // Giallo se predisposto, altrimenti rosso
                            weight: 1,
                            fillOpacity: 0.3,
                            smoothFactor: 0
                        };
                    }
                    return {};
                },
                onEachFeature: function(feature, layer) {
                    const props = feature.properties;
                    const buildingId = props.id || props.objectid;
                    if (buildingId) {
                         buildingLayers[String(buildingId)] = layer;
                    }

                    let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
                    popupContent += '<strong>ID:</strong> ' + (props.id || props.objectid || 'N/D') + '<br>';
                    popupContent += '<strong>Uso:</strong> ' + (props.edifc_uso || 'N/D') + '<br>';

                    if (props.centroid) {
                        const coords = props.centroid.coordinates;
                        popupContent += '<strong>Coordinate:</strong> ' + coords[1].toFixed(8) + ', ' + coords[0].toFixed(8) + '<br>';
                    } else {
                        const center = layer.getBounds().getCenter();
                        popupContent += '<strong>Coordinate:</strong> ' + center.lat.toFixed(8) + ', ' + center.lng.toFixed(8) + '<br>';
                    }
                    popupContent += '</div>';
                    layer.bindPopup(popupContent);

                    layer.on('click', function(e) {
                        const props = e.target.feature.properties;
                        const latlng = e.latlng;

                        const formIndirizzo = document.getElementById('formIndirizzo');
                        const formLat = document.getElementById('formLatitudine');
                        const formLon = document.getElementById('formLongitudine');
                        const formDbId = document.getElementById('formDbId');
                        const formObjectId = document.getElementById('formObjectId');
                        const formEdifcUso = document.getElementById('formEdifcUso');
                        const formCodiceBelfiore = document.getElementById('formCodiceBelfiore'); // Aggiunto per completezza

                        if (formIndirizzo) formIndirizzo.value = props.edifc_nome || props.id || '';
                        if (formObjectId) formObjectId.value = props.objectid || '';
                        if (formDbId) formDbId.value = props.id || '';
                        if (formEdifcUso) formEdifcUso.value = props.edifc_uso || '';
                        if (formLat) formLat.value = latlng.lat.toFixed(8);
                        if (formLon) formLon.value = latlng.lng.toFixed(8);
                        // Potresti voler popolare anche Comune e Codice Belfiore se disponibili nelle props

                        if (props.centroid && formLat && formLon) {
                            const centroidCoords = props.centroid.coordinates;
                            formLon.value = centroidCoords[0].toFixed(8);
                            formLat.value = centroidCoords[1].toFixed(8);
                        }
                    });
                }
            }).addTo(map);

            centroidLayer = L.geoJSON({
                type: "FeatureCollection",
                features: centroidFeatures
            }, {
                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 4,
                        fillColor: "#0000ff",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: function(feature, layer) {
                    let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
                    popupContent += '<strong>Centroide</strong><br>';
                    if (feature.properties.parent_id) {
                        popupContent += '<strong>ID Edificio:</strong> ' + feature.properties.parent_id + '<br>';
                    }
                    const coordinates = feature.geometry.coordinates;
                    popupContent += '<strong>Coordinate:</strong> ' + coordinates[1].toFixed(8) + ', ' + coordinates[0].toFixed(8) + '<br>';
                    popupContent += '</div>';
                    layer.bindPopup(popupContent);
                }
            }).addTo(map);
        })
        .catch(err => {
            console.error('Errore nel caricamento dei dati:', err);
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `<span style="color: red">Errore: ${err.message}</span>`;
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                }, 5000);
            }
            showErrorMessage(`Errore nel caricamento dei dati dalla mappa: ${err.message}`);
        });
}

/**
 * Aggiorna lo stile di un edificio sulla mappa a "predisposto" (giallo)
 * e lo aggiunge al set degli ID predisposti.
 * @param {string|number} buildingId L'ID dell'edificio da aggiornare.
 */
function markBuildingAsPredispostoOnMap(buildingId) {
    const idStr = String(buildingId);
    console.log(`Tentativo di marcare ${idStr} come predisposto sulla mappa.`);
    predispostoIds.add(idStr);
    const layerToUpdate = buildingLayers[idStr];
    if (layerToUpdate) {
        layerToUpdate.setStyle({ color: 'yellow' });
        console.log(`Layer ${idStr} trovato e aggiornato a giallo.`);
    } else {
        console.warn(`Layer ${idStr} non trovato sulla mappa. Potrebbe essere fuori BBox/Zoom o non ancora caricato.`);
    }
}
window.markBuildingAsPredispostoOnMap = markBuildingAsPredispostoOnMap;

/**
 * Rimuove lo stato "predisposto" da un edificio sulla mappa (rosso)
 * e lo rimuove dal set degli ID predisposti.
 * @param {string|number} buildingId L'ID dell'edificio da aggiornare.
 */
function unmarkBuildingAsPredispostoOnMap(buildingId) {
    const idStr = String(buildingId);
    console.log(`Tentativo di rimuovere lo stato predisposto da ${idStr} sulla mappa.`);
    predispostoIds.delete(idStr);
    const layerToUpdate = buildingLayers[idStr];
    if (layerToUpdate) {
        layerToUpdate.setStyle({ color: 'red' });
        console.log(`Layer ${idStr} trovato e aggiornato a rosso.`);
    } else {
        console.warn(`Layer ${idStr} non trovato sulla mappa per l'aggiornamento a rosso.`);
    }
}
window.unmarkBuildingAsPredispostoOnMap = unmarkBuildingAsPredispostoOnMap;