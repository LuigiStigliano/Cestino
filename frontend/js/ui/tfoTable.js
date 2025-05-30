const tfoTableEl = document.getElementById('tfoTable');
const tfoTableBodyEl = document.getElementById('tfoTableBody');
const tfoTablePlaceholderEl = document.getElementById('tfoTablePlaceholder'); // Paragrafo <p>
const tfoActionButtonsContainerEl = document.getElementById('tfoActionButtons'); // Contenitore bottoni Modifica/Elimina TFO
const btnModificaTfoEl = document.getElementById('btnModificaTfo');
const btnEliminaTfoEl = document.getElementById('btnEliminaTfo');

let selectedTfoRow = null; // Riga TFO selezionata
let currentTfoDataStore = {}; // Oggetto per memorizzare { tfo_id_db: tfo_data_completa }

function updateTfoActionButtonsVisibility() {
    const isRowSelected = selectedTfoRow !== null;
    if (tfoActionButtonsContainerEl) tfoActionButtonsContainerEl.style.display = isRowSelected ? 'block' : 'none';
    // I singoli bottoni sono dentro il container, quindi basta mostrare/nascondere il container.
    // if (btnModificaTfoEl) btnModificaTfoEl.style.display = isRowSelected ? 'inline-block' : 'none';
    // if (btnEliminaTfoEl) btnEliminaTfoEl.style.display = isRowSelected ? 'inline-block' : 'none';
}

function clearTfoSelection() {
    if (selectedTfoRow) {
        selectedTfoRow.classList.remove('selected');
        selectedTfoRow = null;
    }
    updateTfoActionButtonsVisibility();
}

function displayTfoTableWithMessage(message) {
    if (tfoTableBodyEl) tfoTableBodyEl.innerHTML = ''; // Svuota corpo tabella
    if (tfoTableEl) tfoTableEl.style.display = 'none'; // Nascondi tabella
    if (tfoTablePlaceholderEl) {
        tfoTablePlaceholderEl.textContent = message;
        tfoTablePlaceholderEl.style.display = 'block'; // Mostra messaggio
    }
    if (tfoActionButtonsContainerEl) tfoActionButtonsContainerEl.style.display = 'none'; // Nascondi bottoni azione TFO
    currentTfoDataStore = {}; // Svuota i dati TFO memorizzati
    clearTfoSelection();
}

// Chiamata quando si deseleziona una predisposizione o si cambia sezione
function clearTfoDisplayForPredisposizione() {
    displayTfoTableWithMessage("Nessun edificio predisposto selezionato o nessuna TFO ancora inserita per l'edificio selezionato.");
     if (document.getElementById('formTfoContainer')) { // Nascondi anche il form di aggiunta/modifica TFO
        document.getElementById('formTfoContainer').style.display = 'none';
    }
}


function addTfoToTable(tfoData) {
    if (!tfoTableBodyEl || !tfoData) return;
    
    // Memorizza i dati completi della TFO per la modifica
    // tfoData.id è l'ID della TFO dalla tabella verifiche_edifici
    currentTfoDataStore[tfoData.id] = tfoData; 

    const newRow = tfoTableBodyEl.insertRow();
    newRow.dataset.tfoDbId = tfoData.id; // ID univoco della TFO nel database

    // Formatta la data se presente
    let dataPredTfoFormatted = 'N/D';
    if (tfoData.data_predisposizione) { // Backend ora la chiama data_predisposizione
        try {
            // Assicurati che sia trattata come data locale, non UTC
            dataPredTfoFormatted = new Date(tfoData.data_predisposizione + 'T00:00:00').toLocaleDateString();
        } catch (e) { console.warn("Formato data TFO non valido:", tfoData.data_predisposizione); }
    }
    
    newRow.innerHTML = `
        <td>${tfoData.scala || 'N/D'}</td>
        <td>${tfoData.piano || 'N/D'}</td>
        <td>${tfoData.interno || 'N/D'}</td>
        <td>${dataPredTfoFormatted}</td>
        <td>${tfoData.id_operatore || 'N/D'}</td>
        <td>${tfoData.id_tfo || 'N/D'}</td> <td>${tfoData.id_roe || 'N/D'}</td> `;

    newRow.addEventListener('click', function() {
        if (selectedTfoRow) {
            selectedTfoRow.classList.remove('selected');
        }
        if (selectedTfoRow === newRow) { // Click sulla riga TFO già selezionata
            clearTfoSelection();
        } else {
            selectedTfoRow = newRow;
            newRow.classList.add('selected');
            updateTfoActionButtonsVisibility();
        }
         // Nascondi il form di aggiunta/modifica TFO quando si seleziona una riga TFO,
         // verrà mostrato solo se si clicca "Modifica TFO"
        if (document.getElementById('formTfoContainer')) {
             document.getElementById('formTfoContainer').style.display = 'none';
        }
    });
}


function loadTfosForSelectedPredisposizione(abitazioneId) {
    if (!abitazioneId) {
        displayTfoTableWithMessage("ID edificio non fornito per caricare le TFO.");
        return;
    }
    
    displayTfoTableWithMessage("Caricamento TFO in corso..."); // Messaggio di caricamento

    sendApiRequest('GET', `/tfos/predisposizioni/${abitazioneId}/tfos`, null,
        function(tfos) { // Success callback
            if (tfoTableBodyEl) tfoTableBodyEl.innerHTML = ''; // Svuota prima di riempire
            currentTfoDataStore = {}; // Resetta i dati TFO memorizzati
            clearTfoSelection(); // Deseleziona qualsiasi TFO precedente

            if (tfos && tfos.length > 0) {
                tfos.forEach(tfo => addTfoToTable(tfo));
                if (tfoTableEl) tfoTableEl.style.display = ''; // Mostra la tabella
                if (tfoTablePlaceholderEl) tfoTablePlaceholderEl.style.display = 'none'; // Nascondi placeholder
            } else {
                // Questo è il percorso corretto se il backend restituisce 200 OK con una lista vuota
                displayTfoTableWithMessage("Nessuna TFO trovata per questo edificio.");
            }
        },
        function(errorDetails) { // Error callback - errorDetails è ora { message: string, status: number }
            if (errorDetails.status === 404) {
                // Se lo status è 404 per questa specifica richiesta, lo interpretiamo come "nessuna TFO"
                displayTfoTableWithMessage("Nessuna TFO trovata per questo edificio.");
            } else {
                // Per tutti gli altri errori (inclusi 500, errori di rete, etc.)
                displayTfoTableWithMessage(`Errore nel caricamento delle TFO: ${errorDetails.message}`);
            }
        }
    );
}

function handleModificaTfo() {
    if (!selectedTfoRow) {
        showModal('Attenzione', "Seleziona una TFO dalla tabella per modificarla.", 'warning');
        return;
    }
    const tfoDbId = selectedTfoRow.dataset.tfoDbId;
    const tfoDataToEdit = currentTfoDataStore[tfoDbId];

    if (!tfoDataToEdit) {
        showModal('Errore', "Dati TFO non trovati per la modifica.", 'error');
        return;
    }
    
    if (typeof showTfoFormForEdit === 'function') {
        // Recupera i dati della predisposizione dalla riga selezionata della tabella predisposizioni
        // (selectedPredisposizioneRow è definita in predisposizioniTable.js)
        if (!selectedPredisposizioneRow || !selectedPredisposizioneRow.dataset) {
            showModal('Errore', 'Impossibile trovare i dati della predisposizione associata per modificare la TFO.', 'error');
            return;
        }
        const predData = selectedPredisposizioneRow.dataset;
        showTfoFormForEdit(tfoDataToEdit, predData);
    }
}

function handleEliminaTfo() {
    if (!selectedTfoRow) {
        showModal('Attenzione', "Seleziona una TFO dalla tabella per eliminarla.", 'warning');
        return;
    }
    const tfoDbId = selectedTfoRow.dataset.tfoDbId;
    const tfoCodice = currentTfoDataStore[tfoDbId] ? currentTfoDataStore[tfoDbId].id_tfo : `ID ${tfoDbId}`; // Usa codice TFO se disponibile

    showConfirmModal(
        'Conferma Eliminazione TFO',
        `Sei sicuro di voler eliminare la TFO "${tfoCodice}"?`,
        () => {
            sendApiRequest('DELETE', `/tfos/${tfoDbId}`, null,
                function(response) { // La risposta DELETE di solito è 204 No Content o un messaggio
                    showModal('Successo', response.message || `TFO ${tfoCodice} eliminata con successo.`, 'success');
                    // Ricarica le TFO per la predisposizione corrente
                    if (selectedPredisposizioneRow && selectedPredisposizioneRow.dataset.id) {
                        loadTfosForSelectedPredisposizione(selectedPredisposizioneRow.dataset.id);
                    } else {
                        // Fallback se non si può ricaricare, pulisce la tabella
                        displayTfoTableWithMessage("TFO eliminata. Selezionare nuovamente una predisposizione per aggiornare la lista.");
                    }
                },
                function(error) {
                    showModal('Errore', `Eliminazione TFO fallita: ${error}`, 'error');
                }
            );
        }
    );
}

function setupTfoTableActions() {
    if (btnModificaTfoEl) {
        btnModificaTfoEl.addEventListener('click', handleModificaTfo);
    }
    if (btnEliminaTfoEl) {
        btnEliminaTfoEl.addEventListener('click', handleEliminaTfo);
    }
    // Inizialmente nascondi i bottoni (lo fa già updateTfoActionButtonsVisibility chiamato da clearTfoSelection)
    updateTfoActionButtonsVisibility();
    console.log("Azioni tabella TFO inizializzate.");
}