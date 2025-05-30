// Variabili globali per la mappa definite in mapUtils.js e accessibili tramite window.mapContext
// let map;
// let geoJsonLayer;
// let centroidLayer;
// let buildingLayers = {}; // Oggetto per mappare ID edificio -> layer Leaflet
// let predispostoIds = new Set(); // Set per memorizzare gli ID degli edifici predisposti

let minZoomToLoad = MAP_MIN_ZOOM_TO_LOAD_DATA; // Da config.js
let loadingIndicatorEl = null;
let debounceTimer = null;
// let lastBounds = null; // Non usato nell'originale
let errorMessageTimeout = null;
let mapErrorElement = null;


// Funzione per inizializzare la mappa (chiamata da main.js)
function initMap() {
    // Assicurati che il div #map esista
    const mapDiv = document.getElementById('map');
    if (!mapDiv) {
        console.error("Elemento #map non trovato. Impossibile inizializzare la mappa.");
        return;
    }
    
    // Inizializza le variabili di contesto se non già fatto (dovrebbe essere fatto in mapUtils.js)
    if (!window.mapContext) {
        console.warn("window.mapContext non trovato, inizializzazione fallback in mapHandler.");
        window.mapContext = {
            mapInstance: null,
            geoJsonLayer: null,
            centroidLayer: null,
            buildingLayers: {},
            predispostoIds: new Set()
        };
    }

    window.mapContext.mapInstance = L.map('map').setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM); // Da config.js

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.mapContext.mapInstance);

    // Indicatore di caricamento
    loadingIndicatorEl = document.getElementById('loading');
    if (!loadingIndicatorEl) {
        loadingIndicatorEl = document.createElement('div');
        loadingIndicatorEl.id = 'loading';
        loadingIndicatorEl.className = 'loading-indicator'; // Stile da CSS
        loadingIndicatorEl.innerText = 'Caricamento dati...';
        // Stili inline come fallback se CSS non li definisce o per override
        loadingIndicatorEl.style.position = 'absolute';
        loadingIndicatorEl.style.top = '50px'; // Spostato un po' più in basso
        loadingIndicatorEl.style.right = '10px';
        loadingIndicatorEl.style.zIndex = '1000'; // Sopra la mappa
        loadingIndicatorEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        loadingIndicatorEl.style.padding = '8px 12px';
        loadingIndicatorEl.style.borderRadius = '5px';
        loadingIndicatorEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        loadingIndicatorEl.style.display = 'none'; // Nascosto inizialmente
        mapDiv.appendChild(loadingIndicatorEl); // Aggiungi al div della mappa
    }
    
    // Elemento per messaggi di errore sulla mappa
    mapErrorElement = document.getElementById('map-error-message');
    if (!mapErrorElement) {
        mapErrorElement = document.createElement('div');
        mapErrorElement.id = 'map-error-message';
        mapErrorElement.style.position = 'absolute';
        mapErrorElement.style.bottom = '10px';
        mapErrorElement.style.left = '50%';
        mapErrorElement.style.transform = 'translateX(-50%)';
        mapErrorElement.style.zIndex = '1000';
        mapErrorElement.style.maxWidth = 'calc(100% - 20px)';
        mapErrorElement.style.textAlign = 'center';
        mapErrorElement.style.display = 'none';
        mapDiv.appendChild(mapErrorElement);
    }


    window.mapContext.mapInstance.on('moveend zoomend', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadBuildingsDataByBounds, 300);
    });

    // Caricamento iniziale dei dati per la vista corrente
    loadBuildingsDataByBounds();
    console.log("Mappa inizializzata.");
}

// Funzione per mostrare messaggi di errore sulla mappa
function showMapErrorMessage(message, duration = 7000) {
    if (!mapErrorElement) return;

    mapErrorElement.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert" style="margin-bottom:0;">
            <strong>Errore Mappa:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    mapErrorElement.style.display = 'block';

    if (errorMessageTimeout) {
        clearTimeout(errorMessageTimeout);
    }
    errorMessageTimeout = setTimeout(() => {
        if (mapErrorElement) mapErrorElement.style.display = 'none';
    }, duration);
}

// Funzione per caricare i dati degli edifici/abitazioni in base ai confini della mappa
function loadBuildingsDataByBounds() {
    if (!window.mapContext.mapInstance) {
        console.warn("Tentativo di caricare dati mappa prima dell'inizializzazione della mappa.");
        return;
    }
    const currentMap = window.mapContext.mapInstance;
    const zoom = currentMap.getZoom();

    if (zoom < minZoomToLoad) {
        if (window.mapContext.geoJsonLayer) currentMap.removeLayer(window.mapContext.geoJsonLayer);
        if (window.mapContext.centroidLayer) currentMap.removeLayer(window.mapContext.centroidLayer);
        window.mapContext.buildingLayers = {}; // Resetta i layer tracciati
        showMapErrorMessage(`Zoom troppo basso (attuale: ${zoom}). Eseguire uno zoom maggiore (min: ${minZoomToLoad}) per visualizzare i dati.`);
        if (loadingIndicatorEl) loadingIndicatorEl.style.display = 'none';
        return;
    }
     if (mapErrorElement) mapErrorElement.style.display = 'none'; // Nascondi errori precedenti se lo zoom è ok


    const bounds = currentMap.getBounds();
    // La logica geometry_type 'both' o solo centroidi potrebbe essere basata su MAP_ZOOM_SHOW_POLYGONS
    // Per ora, l'originale caricava 'both' se zoom > 16, altrimenti nulla.
    // Modifichiamo per caricare sempre 'both' se zoom >= minZoomToLoad
    let geometry_type = 'both'; // Carica sempre poligoni e centroidi se lo zoom è sufficiente

    // L'originale aveva una condizione restrittiva per zoom > 16 per 'both'
    // e rimuoveva i layer se <= 16. Adattiamo per essere più permissivi.
    // Se si vuole un comportamento diverso (es. solo centroidi a zoom bassi), modificare qui.
    // if (zoom <= 16 && zoom >= minZoomToLoad) {
    //     // Potrebbe essere solo 'centroids' per performance a zoom intermedi
    //     geometry_type = 'centroids'; // Esempio: solo centroidi
    // } else if (zoom < minZoomToLoad) {
    //      // Già gestito sopra
    //     return;
    // }


    const params = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: zoom, // Inviato al backend, anche se non strettamente usato nella query SQL attuale
        geometry_type: geometry_type // Backend potrebbe usare questo per ottimizzare
    };

    const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const fetchUrl = `${API_BASE_URL}/geojson/bbox?${query}`; // API_BASE_URL da config.js

    if (loadingIndicatorEl) {
        loadingIndicatorEl.innerHTML = `Caricamento dati (zoom: ${zoom})...`;
        loadingIndicatorEl.style.display = 'block';
    }

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.detail || `Errore HTTP: ${response.status}`);
                }).catch(() => new Error(`Errore HTTP: ${response.status} - Impossibile leggere il messaggio.`));
            }
            return response.json();
        })
        .then(data => {
            if (window.mapContext.geoJsonLayer) currentMap.removeLayer(window.mapContext.geoJsonLayer);
            if (window.mapContext.centroidLayer) currentMap.removeLayer(window.mapContext.centroidLayer);
            
            window.mapContext.buildingLayers = {}; // Resetta i layer prima di ripopolare

            // Popola predispostoIds in base al campo predisposto_fibra dai dati caricati
            // Questo assicura che lo stato sia aggiornato con i dati freschi dal backend.
            window.mapContext.predispostoIds.clear(); // Svuota prima di ripopolare
            if (data.features) {
                data.features.forEach(feature => {
                    // Considera solo le feature che non sono centroidi per questo check,
                    // o assicurati che i centroidi abbiano anche loro la proprietà 'predisposto_fibra' se necessario.
                    if (feature.properties && !feature.properties.is_centroid && feature.properties.predisposto_fibra) {
                        const buildingId = feature.properties.id || feature.properties.objectid;
                        if (buildingId) window.mapContext.predispostoIds.add(String(buildingId));
                    }
                });
            }

            const featureCount = data.features ? data.features.length : 0;
            if (loadingIndicatorEl) {
                loadingIndicatorEl.innerHTML = `Caricati ${featureCount} elementi.`;
                setTimeout(() => {
                    if (loadingIndicatorEl) loadingIndicatorEl.style.display = 'none';
                }, 2000);
            }
            if (featureCount === 3000) { // Limite hardcoded nel backend
                 showMapErrorMessage("Numero massimo di elementi caricati (3000). Alcuni dati potrebbero mancare. Prova a zoomare di più.", 10000);
            }


            const polygonFeatures = [];
            const centroidFeatures = [];

            data.features.forEach(feature => {
                if (feature.properties && feature.properties.is_centroid) {
                    centroidFeatures.push(feature);
                } else {
                    polygonFeatures.push(feature); // Tutto ciò che non è esplicitamente un centroide va qui
                }
            });
            
            // Layer Poligoni Edifici
            window.mapContext.geoJsonLayer = L.geoJSON({
                type: "FeatureCollection",
                features: polygonFeatures
            }, {
                style: function(feature) {
                    const buildingId = feature.properties.id || feature.properties.objectid;
                    const isPredisposto = window.mapContext.predispostoIds.has(String(buildingId));
                    
                    // Stile di default per poligoni
                    let style = {
                        weight: 1,
                        fillOpacity: 0.3,
                        smoothFactor: 0.5 // Leggermente più liscio
                    };
                    if (isPredisposto) {
                        style.color = 'orange'; // Giallo/Arancio per predisposto
                        style.fillColor = 'orange';
                        style.fillOpacity = 0.4;
                    } else {
                        style.color = 'blue'; // Blu per non predisposto (diverso da rosso per centroidi)
                        style.fillColor = 'blue';
                    }
                    return style;
                },
                onEachFeature: function(feature, layer) {
                    const props = feature.properties;
                    const buildingId = String(props.id || props.objectid); // Assicura stringa
                    if (buildingId) {
                         window.mapContext.buildingLayers[buildingId] = layer; // Traccia il layer
                    }

                    let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px; max-width: 250px;">';
                    popupContent += '<strong>ID Edificio:</strong> ' + (buildingId || 'N/D') + '<br>';
                    popupContent += '<strong>Uso:</strong> ' + (props.edifc_uso || 'N/D') + '<br>';
                    
                    // Coordinate dal centroide della geometria del poligono se non specificato diversamente
                    const center = layer.getBounds().getCenter();
                    popupContent += `<strong>Coord. Poligono (centro):</strong> ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}<br>`;
                    if(props.predisposto_fibra) popupContent += '<strong style="color: orange;">Predisposto Fibra</strong><br>';
                    popupContent += '</div>';
                    layer.bindPopup(popupContent);

                    layer.on('click', function(e) {
                        const clickedProps = e.target.feature.properties;
                        const latlng = e.latlng; // Lat/Lng del punto cliccato sul poligono

                        // Popola il form nella sezione edifici (se il form è visibile/attivo)
                        // Questi ID sono definiti in index.html
                        const formIndirizzo = document.getElementById('formIndirizzo');
                        const formLat = document.getElementById('formLatitudine');
                        const formLon = document.getElementById('formLongitudine');
                        const formDbId = document.getElementById('formDbId'); // ID da catasto_abitazioni.id
                        const formObjectId = document.getElementById('formObjectId'); // OBJECTID originale
                        const formEdifcUso = document.getElementById('formEdifcUso');
                        // const formComune = document.getElementById('formComune');
                        // const formCodiceBelfiore = document.getElementById('formCodiceBelfiore');
                        // const formCodiceCatastale = document.getElementById('formCodiceCatastale');

                        if (formIndirizzo) formIndirizzo.value = clickedProps.edifc_nome || clickedProps.indirizzo || `Edificio ID ${clickedProps.id || clickedProps.objectid}` ;
                        if (formObjectId) formObjectId.value = clickedProps.objectid || '';
                        if (formDbId) formDbId.value = clickedProps.id || ''; // Usa 'id' (PK) se disponibile
                        if (formEdifcUso) formEdifcUso.value = clickedProps.edifc_uso || '';
                        
                        // Usa le coordinate del click o il centroide del poligono
                        if (formLat) formLat.value = latlng.lat.toFixed(8);
                        if (formLon) formLon.value = latlng.lng.toFixed(8);

                        // Se il backend fornisce lat/lon pre-calcolate (es. da predisposizione), usarle
                        if (clickedProps.lat && clickedProps.lon && formLat && formLon) {
                            formLat.value = parseFloat(clickedProps.lat).toFixed(8);
                            formLon.value = parseFloat(clickedProps.lon).toFixed(8);
                        }
                        
                        // Popola altri campi se disponibili nelle proprietà e se i campi esistono nel form
                        if (document.getElementById('formComune') && clickedProps.comune) document.getElementById('formComune').value = clickedProps.comune;
                        if (document.getElementById('formCodiceBelfiore') && clickedProps.codice_belfiore) document.getElementById('formCodiceBelfiore').value = clickedProps.codice_belfiore;
                        if (document.getElementById('formCodiceCatastale') && clickedProps.codice_catastale) document.getElementById('formCodiceCatastale').value = clickedProps.codice_catastale;
                         if (document.getElementById('formDataPredisposizione') && clickedProps.data_predisposizione) {
                            try {
                                document.getElementById('formDataPredisposizione').value = new Date(clickedProps.data_predisposizione).toISOString().split('T')[0];
                            } catch (dateErr) { /* ignora se la data non è valida */ }
                        }
                    });
                }
            }).addTo(currentMap);

            // Layer Centroidi (se presenti)
            if (centroidFeatures.length > 0) {
                window.mapContext.centroidLayer = L.geoJSON({
                    type: "FeatureCollection",
                    features: centroidFeatures
                }, {
                    pointToLayer: function(feature, latlng) {
                        const isParentPredisposto = window.mapContext.predispostoIds.has(String(feature.properties.parent_id));
                        return L.circleMarker(latlng, {
                            radius: 5, // Leggermente più grande
                            fillColor: isParentPredisposto ? "#FFA500" : "#FF0000", // Arancio se predisposto, Rosso altrimenti
                            color: "#000",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        let popupContent = '<div style="font-family: Arial, sans-serif; font-size: 12px;">';
                        popupContent += '<strong>Centroide Edificio</strong><br>';
                        if (feature.properties.parent_id) {
                            popupContent += '<strong>ID Edificio:</strong> ' + feature.properties.parent_id + '<br>';
                        }
                        const coordinates = feature.geometry.coordinates;
                        popupContent += `<strong>Coordinate:</strong> ${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}<br>`;
                        if(feature.properties.predisposto_fibra) popupContent += '<strong style="color: orange;">Predisposto Fibra</strong><br>';
                        popupContent += '</div>';
                        layer.bindPopup(popupContent);
                        // Nessun evento di click per popolare il form, i poligoni lo fanno già.
                    }
                })//.addTo(currentMap); // Decommenta se vuoi aggiungere il layer dei centroidi alla mappa
            }


        })
        .catch(err => {
            console.error('Errore nel caricamento o processamento dei dati GeoJSON:', err);
            if (loadingIndicatorEl) {
                loadingIndicatorEl.innerHTML = `<span style="color: red;">Errore caricamento!</span>`;
                setTimeout(() => {
                    if (loadingIndicatorEl) loadingIndicatorEl.style.display = 'none';
                }, 3000);
            }
            showMapErrorMessage(`Dati mappa non caricati: ${err.message}`);
        });
}