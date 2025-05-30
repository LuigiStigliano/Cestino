/**
 * Invia una richiesta API al backend.
 * @param {string} method Metodo HTTP (GET, POST, PUT, DELETE)
 * @param {string} endpoint Endpoint API (es. /predisposizioni)
 * @param {object|null} data Dati da inviare nel body (per POST, PUT)
 * @param {function} successCallback Funzione da chiamare in caso di successo
 * @param {function} errorCallback Funzione da chiamare in caso di errore
 */
function sendApiRequest(method, endpoint, data, successCallback, errorCallback) {
    const url = API_BASE_URL + endpoint;
    console.log(`API Request: ${method} ${url}`, data); // Log per debug

    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    fetch(url, options)
        .then(response => {
            if (!response.ok) {
                const status = response.status; // Cattura lo status code
                // Tenta di leggere il corpo dell'errore JSON
                return response.json().then(err => {
                     console.error("API Error Response Body:", err);
                     // Usa il messaggio di dettaglio se presente, altrimenti un errore generico HTTP
                     const error = new Error(err.detail || `Errore HTTP ${status}`);
                     error.status = status; // Aggiungi lo status all'oggetto errore
                     throw error;
                }).catch(() => {
                    // Se il corpo non è JSON o c'è un altro errore nella lettura
                    const error = new Error(`Errore HTTP ${status} - Impossibile leggere il dettaglio dell'errore.`);
                    error.status = status; // Aggiungi lo status all'oggetto errore
                    throw error;
                });
            }
             // Gestisce risposte senza contenuto (es. 204 No Content per DELETE)
            if (response.status === 204) {
                return null; // Nessun corpo da parsare
            }
            return response.json(); // Per risposte con contenuto JSON (es. 200 OK, 201 Created)
        })
        .then(responseData => {
            console.log('API Success Response:', responseData);
            successCallback(responseData);
        })
        .catch(error => { // Cattura sia errori di rete che errori lanciati dal blocco !response.ok
            console.error('API Fetch Error:', error);
            // Passa un oggetto errore che include il messaggio e lo status (se disponibile)
            errorCallback({
                message: error.message || 'Errore di rete o backend non raggiungibile.',
                status: error.status // lo status sarà undefined per errori di rete puri
            });
        });
}