// Variabile globale per la mappa
let map;
let geoJsonLayer;
let centroidLayer;
let minZoomToLoad = 14;
let loadingIndicator = null;
let debounceTimer = null;
let lastBounds = null;
let errorMessageTimeout = null;

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
        return;
    }
    
    const bounds = map.getBounds();
    let geometry_type;
    if (zoom > 16) {
        geometry_type = 'both'; // Mostra centroidi e poligoni SOLO se zoom > 16
    } else {
        if (geoJsonLayer) map.removeLayer(geoJsonLayer);
        if (centroidLayer) map.removeLayer(centroidLayer);
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
    
    // Mostra l'indicatore di caricamento con informazioni sul livello di zoom
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
            
            geoJsonLayer = null;
            centroidLayer = null;
            
            // Mostra statistiche sui dati caricati
            const featureCount = data.features ? data.features.length : 0;
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `Caricati ${featureCount} elementi`;
                // Nascondi dopo 2 secondi
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                }, 2000);
            }
            
            // Separa le feature dei poligoni e dei centroidi
            const polygonFeatures = [];
            const centroidFeatures = [];
            
            data.features.forEach(feature => {
                if (feature.properties && feature.properties.is_centroid) {
                    centroidFeatures.push(feature);
                } else {
                    polygonFeatures.push(feature);
                }
            });
            
            // Crea il layer per i poligoni
            geoJsonLayer = L.geoJSON({
                type: "FeatureCollection",
                features: polygonFeatures
            }, {
                style: function(feature) {
                    if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                        return { 
                            color: 'red', 
                            weight: 1, 
                            fillOpacity: 0.3,
                            // Disabilita la semplificazione automatica di Leaflet
                            smoothFactor: 0
                        };
                    }
                    return {};
                },
                onEachFeature: function(feature, layer) {
                    // Crea un popup con le informazioni richieste: id, uso, coordinate, predisposto_fibra
                    let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
                    
                    // ID dell'edificio
                    popupContent += '<strong>ID:</strong> ' + (feature.properties.id || feature.properties.objectid || 'N/D') + '<br>';
                    
                    // Uso dell'edificio
                    popupContent += '<strong>Uso:</strong> ' + (feature.properties.edifc_uso || 'N/D') + '<br>';
                    
                    // Coordinate (dal centroide se disponibile)
                    if (feature.properties.centroid) {
                        const coords = feature.properties.centroid.coordinates;
                        popupContent += '<strong>Coordinate:</strong> ' + coords[1].toFixed(8) + ', ' + coords[0].toFixed(8) + '<br>';
                    } else {
                        // Usa il centroide calcolato della geometria
                        const center = layer.getBounds().getCenter();
                        popupContent += '<strong>Coordinate:</strong> ' + center.lat.toFixed(8) + ', ' + center.lng.toFixed(8) + '<br>';
                    }
                    
                    // Predisposto fibra
                    popupContent += '<strong>Predisposto Fibra:</strong> ' + (feature.properties.predisposto_fibra ? 'Sì' : 'No') + '<br>';
                    
                    popupContent += '</div>';
                    
                    layer.bindPopup(popupContent);
                    
                    layer.on('click', function(e) {
                        const props = e.target.feature.properties;
                        const latlng = e.latlng; // Ottieni le coordinate del click
                        
                        const formIndirizzo = document.getElementById('formIndirizzo');
                        const formLat = document.getElementById('formLatitudine');
                        const formLon = document.getElementById('formLongitudine');
                        const formDbId = document.getElementById('formDbId');
                        const formObjectId = document.getElementById('formObjectId');
                        const formEdifcUso = document.getElementById('formEdifcUso');
                        
                        if (formIndirizzo) formIndirizzo.value = props.edifc_nome || props.id || '';
                        if (formObjectId) formObjectId.value = props.objectid || '';
                        if (formDbId) formDbId.value = props.id || '';
                        if (formEdifcUso) formEdifcUso.value = props.edifc_uso || '';
                        
                        // Aggiorna le coordinate con precisione
                        if (formLat) formLat.value = latlng.lat.toFixed(8);
                        if (formLon) formLon.value = latlng.lng.toFixed(8);
                        
                        // Se il backend fornisce il centroide come proprietà, usalo invece delle coordinate del click
                        if (props.centroid && formLat && formLon) {
                            const centroidCoords = props.centroid.coordinates;
                            formLon.value = centroidCoords[0].toFixed(8);
                            formLat.value = centroidCoords[1].toFixed(8);
                        }
                    });
                }
            }).addTo(map);
            
            // Crea il layer per i centroidi
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
                    // Crea un popup con le informazioni essenziali per il centroide
                    let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
                    popupContent += '<strong>Centroide</strong><br>';
                    
                    // ID dell'edificio associato
                    if (feature.properties.parent_id) {
                        popupContent += '<strong>ID Edificio:</strong> ' + feature.properties.parent_id + '<br>';
                    }
                    
                    // Coordinate precise del centroide
                    // Ottieni le coordinate dal layer stesso, non da una variabile esterna
                    const coordinates = feature.geometry.coordinates;
                    popupContent += '<strong>Coordinate:</strong> ' + coordinates[1].toFixed(8) + ', ' + coordinates[0].toFixed(8) + '<br>';
                    
                    popupContent += '</div>';
                    
                    layer.bindPopup(popupContent);
                }
            }).addTo(map);
        })
        .catch(err => {
            console.error('Errore nel caricamento dei dati:', err);
            
            // Aggiorna l'indicatore di caricamento con l'errore
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `<span style="color: red">Errore: ${err.message}</span>`;
                // Nascondi dopo 5 secondi
                setTimeout(() => {
                    loadingIndicator.style.display = 'none';
                }, 5000);
            }
            
            // Mostra un messaggio di errore più dettagliato
            showErrorMessage(`Errore nel caricamento dei dati dalla mappa: ${err.message}`);
        });
}

// Chiama initMap quando il DOM è pronto (se questo script è incluso nell'head o prima del div #map)
// Altrimenti, chiama initMap() da uno script inline in index.html dopo che il div #map è stato caricato.
// Esempio: document.addEventListener('DOMContentLoaded', initMap);
// Per ora, initMap() sarà chiamata da index.html
