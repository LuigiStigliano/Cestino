// Variabile globale per la mappa
let map;
let geoJsonLayer;

// Funzione per inizializzare la mappa (chiamata da index.html)
function initMap() {
    // Centro su L'Aquila (o dove preferisci)
    map = L.map('map').setView([42.3498, 13.3995], 14); // Assicurati che il div #map esista

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log("Mappa inizializzata.");
    loadBuildingsData();
}

// Funzione per caricare i dati degli edifici/abitazioni
function loadBuildingsData() {
    // Sostituisci con l'URL corretto del tuo backend FastAPI
    const backendUrl = 'http://127.0.0.1:8000/geojson'; // Endpoint da server.py

    // Esempio di bounding box, puoi rimuoverlo o renderlo dinamico se l'endpoint non lo richiede più
    // const bbox = { minx: 13.38, miny: 42.34, maxx: 13.42, maxy: 42.36 };
    // const fetchUrl = `${backendUrl}?minx=${bbox.minx}&miny=${bbox.miny}&maxx=${bbox.maxx}&maxy=${bbox.maxy}`;
    const fetchUrl = backendUrl; // Se l'endpoint non usa più bbox o vuoi tutti i dati (limitati dal backend)

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
            geoJsonLayer = L.geoJSON(data, {
                style: function(feature) {
                    // Stile di base, puoi personalizzarlo
                    return { color: 'red', weight: 1, fillOpacity: 0.3 };
                },
                onEachFeature: function (feature, layer) {
                    let popupContent = "Dati edificio:<br>";
                    if (feature.properties) {
                        // Mostra alcune proprietà nel popup, adatta ai nomi delle tue proprietà
                        popupContent += `ID: ${feature.properties.id || 'N/D'}<br>`;
                        popupContent += `OBJECTID: ${feature.properties.objectid || 'N/D'}<br>`;
                        popupContent += `Uso: ${feature.properties.edifc_uso || 'N/D'}<br>`;
                        if(feature.properties.edifc_nome) {
                           popupContent += `Nome: ${feature.properties.edifc_nome}<br>`;
                        }
                    }
                    layer.bindPopup(popupContent);

                    // Gestione del click sulla feature per popolare il form in index.html
                    layer.on('click', function(e) {
                        const props = e.target.feature.properties;
                        if (props) {
                            // Popola i campi del form in index.html
                            // Assicurati che gli ID dei campi esistano in index.html
                            const formIndirizzo = document.getElementById('formIndirizzo');
                            const formLat = document.getElementById('formLatitudine');
                            const formLon = document.getElementById('formLongitudine');
                            const formObjectId = document.getElementById('formObjectId');
                            const formEdifcUso = document.getElementById('formEdifcUso');

                            if (formIndirizzo) formIndirizzo.value = props.edifc_nome || props.id || ''; // O un campo indirizzo se presente
                            if (formObjectId) formObjectId.value = props.objectid || '';
                            if (formEdifcUso) formEdifcUso.value = props.edifc_uso || '';

                            // Calcola e popola lat/lon dal centroide della geometria cliccata
                            if (e.target.feature.geometry && e.target.getBounds) {
                                const centroid = e.target.getBounds().getCenter();
                                if (formLat) formLat.value = centroid.lat.toFixed(6);
                                if (formLon) formLon.value = centroid.lng.toFixed(6);
                            }
                            // Qui potresti anche visualizzare il form se è nascosto
                        }
                    });
                }
            }).addTo(map);
            console.log("Dati GeoJSON caricati e visualizzati.");
        })
        .catch(err => {
            console.error('Errore nel caricamento GeoJSON:', err);
            alert('Errore nel caricamento dei dati dalla mappa: ' + err.message);
        });
}

// Chiama initMap quando il DOM è pronto (se questo script è incluso nell'head o prima del div #map)
// Altrimenti, chiama initMap() da uno script inline in index.html dopo che il div #map è stato caricato.
// Esempio: document.addEventListener('DOMContentLoaded', initMap);
// Per ora, initMap() sarà chiamata da index.html