const predisposizioniTableBodyEl = document.getElementById('predisposizioniTableBody');
const btnShowAddTfoEl = document.getElementById('btnShowAddTfo');
const btnModificaPredisposizioneEl = document.getElementById('btnModificaPredisposizione');
const btnEliminaPredisposizioneEl = document.getElementById('btnEliminaPredisposizione');

const tfoSectionTitleEl = document.getElementById('tfoSectionTitle'); // Titolo sopra il form/tabella TFO
const formTfoContainerEl = document.getElementById('formTfoContainer'); // Form TFO

let selectedPredisposizioneRow = null; // Riga selezionata nella tabella predisposizioni

function updatePredisposizioniActionButtonsVisibility() {
    const isRowSelected = selectedPredisposizioneRow !== null;
    if (btnShowAddTfoEl) btnShowAddTfoEl.style.display = isRowSelected ? 'inline-block' : 'none';
    if (btnModificaPredisposizioneEl) btnModificaPredisposizioneEl.style.display = isRowSelected ? 'inline-block' : 'none';
    if (btnEliminaPredisposizioneEl) btnEliminaPredisposizioneEl.style.display = isRowSelected ? 'inline-block' : 'none';
}

function clearPredisposizioneSelection() {
    if (selectedPredisposizioneRow) {
        selectedPredisposizioneRow.classList.remove('selected');
        selectedPredisposizioneRow = null;
    }
    updatePredisposizioniActionButtonsVisibility();
    // Nascondi/resetta la sezione TFO se nessuna predisposizione è selezionata
    if (typeof clearTfoDisplayForPredisposizione === 'function') {
        clearTfoDisplayForPredisposizione();
    }
     if (tfoSectionTitleEl) tfoSectionTitleEl.textContent = 'Terminazioni Ottiche (TFO)';
     if (formTfoContainerEl) formTfoContainerEl.style.display = 'none'; // Nascondi form TFO
}

function addPredisposizioneToTable(pred) {
    if (!predisposizioniTableBodyEl) return;

    const newRow = predisposizioniTableBodyEl.insertRow();
    newRow.dataset.id = pred.id; // ID della tabella catasto_abitazioni (PK)
    // newRow.dataset.abitazioneId = pred.id; // Redundante se usiamo pred.id come chiave
    
    // Salva tutti i dati necessari per popolare i form di modifica o TFO
    newRow.dataset.indirizzo = pred.indirizzo || '';
    newRow.dataset.lat = pred.lat || '';
    newRow.dataset.lon = pred.lon || '';
    newRow.dataset.codCatastale = pred.codice_catastale || '';
    newRow.dataset.comune = pred.comune || '';
    newRow.dataset.dataPred = pred.data_predisposizione || ''; // Formato YYYY-MM-DD
    newRow.dataset.usoEdificio = pred.uso_edificio || '';
    newRow.dataset.codiceBelfiore = pred.codice_belfiore || '';
    // OBJECTID non è parte del modello PredisposizioneInDB, quindi non lo avremo qui
    // a meno che non venga aggiunto specificamente. Per ora, non c'è.

    newRow.innerHTML = `
        <td>${pred.id}</td>
        <td>${pred.indirizzo || 'N/D'}</td>
        <td>${pred.comune || 'N/D'}</td>
        <td>${pred.codice_catastale || 'N/D'}</td>
        <td>${pred.data_predisposizione ? new Date(pred.data_predisposizione + 'T00:00:00').toLocaleDateString() : 'N/D'}</td>
    `;

    newRow.addEventListener('click', function() {
        if (selectedPredisposizioneRow) {
            selectedPredisposizioneRow.classList.remove('selected');
        }
        if (selectedPredisposizioneRow === newRow) { // Click sulla riga già selezionata
            clearPredisposizioneSelection();
        } else {
            selectedPredisposizioneRow = newRow;
            newRow.classList.add('selected');
            updatePredisposizioniActionButtonsVisibility();

            const abitazioneId = newRow.dataset.id;
            if (tfoSectionTitleEl) tfoSectionTitleEl.textContent = `Gestione TFO per Edificio: ${newRow.dataset.indirizzo || abitazioneId}`;
            
            // Carica le TFO per questa predisposizione
            if (typeof loadTfosForSelectedPredisposizione === 'function') {
                loadTfosForSelectedPredisposizione(abitazioneId);
            }
            // Nascondi il form TFO di aggiunta/modifica TFO finché non si clicca "Aggiungi TFO"
             if (formTfoContainerEl) formTfoContainerEl.style.display = 'none';
        }
    });
}


function loadPredisposizioni() {
    if (!predisposizioniTableBodyEl) {
        console.warn("Elemento predisposizioniTableBody non trovato. Impossibile caricare predisposizioni.");
        return;
    }
    predisposizioniTableBodyEl.innerHTML = '<tr><td colspan="5">Caricamento predisposizioni...</td></tr>';
    clearPredisposizioneSelection(); // Deseleziona e nascondi bottoni/sezione TFO

    sendApiRequest('GET', '/predisposizioni', null,
        function(data) {
            predisposizioniTableBodyEl.innerHTML = ''; // Svuota la tabella
            if (data && data.length > 0) {
                data.forEach(pred => addPredisposizioneToTable(pred));
            } else {
                predisposizioniTableBodyEl.innerHTML = '<tr><td colspan="5">Nessuna predisposizione trovata.</td></tr>';
            }
            // Assicurati che i bottoni azione predisposizione siano nascosti se non ci sono dati
            updatePredisposizioniActionButtonsVisibility();
        },
        function(error) {
            predisposizioniTableBodyEl.innerHTML = `<tr><td colspan="5">Errore nel caricamento: ${error}</td></tr>`;
            updatePredisposizioniActionButtonsVisibility(); // Nascondi bottoni in caso di errore
        }
    );
}

function handleModificaPredisposizione() {
    if (!selectedPredisposizioneRow) {
        showModal('Attenzione', 'Seleziona un edificio dalla tabella per modificarlo.', 'warning');
        return;
    }
    const data = selectedPredisposizioneRow.dataset;
    const predisposizioneDataForForm = {
        id: data.id,
        indirizzo: data.indirizzo,
        comune: data.comune,
        codice_catastale: data.codCatastale,
        data_predisposizione: data.dataPred, // Già in formato YYYY-MM-DD
        lat: data.lat,
        lon: data.lon,
        uso_edificio: data.usoEdificio,
        codice_belfiore: data.codiceBelfiore
        // objectid non è disponibile qui, ma il form edifici potrebbe averlo ancora da un click mappa precedente.
        // Se è importante, dovrebbe essere passato qui.
    };
    
    if (typeof window.populateEdificiFormForUpdate === 'function') {
        window.populateEdificiFormForUpdate(predisposizioneDataForForm);
    } else {
        showModal('Errore', 'Funzione per popolare il form di modifica non trovata.', 'error');
    }
}

function handleEliminaPredisposizione() {
    if (!selectedPredisposizioneRow) {
        showModal('Attenzione', 'Seleziona un edificio dalla tabella per eliminarlo.', 'warning');
        return;
    }
    const abitazioneId = selectedPredisposizioneRow.dataset.id;
    const indirizzo = selectedPredisposizioneRow.dataset.indirizzo || `ID ${abitazioneId}`;

    showConfirmModal(
        'Conferma Eliminazione Predisposizione',
        `Sei sicuro di voler eliminare la predisposizione per l'edificio "${indirizzo}" (ID: ${abitazioneId})? Questa azione rimuoverà anche tutte le TFO associate.`,
        () => {
            sendApiRequest('DELETE', `/predisposizioni/${abitazioneId}`, null,
                function(response) {
                    showModal('Successo', response.message || `Predisposizione per edificio ID ${abitazioneId} e TFO associate eliminate.`, 'success');
                    loadPredisposizioni(); // Ricarica la tabella delle predisposizioni
                    
                    // Aggiorna la mappa per riflettere la rimozione dello stato di predisposizione
                    if (typeof window.unmarkBuildingAsPredispostoOnMap === 'function') {
                       window.unmarkBuildingAsPredispostoOnMap(abitazioneId);
                    }
                },
                function(error) {
                    showModal('Errore', `Eliminazione predisposizione fallita: ${error}`, 'error');
                }
            );
        }
    );
}


function setupPredisposizioniTableActions() {
    if (btnShowAddTfoEl) {
        btnShowAddTfoEl.addEventListener('click', () => {
            if (!selectedPredisposizioneRow) {
                showModal('Attenzione', "Seleziona un edificio predisposto dalla tabella prima di aggiungere una TFO.", 'warning');
                return;
            }
            if (typeof showTfoFormForAdd === 'function') {
                const predData = selectedPredisposizioneRow.dataset;
                showTfoFormForAdd(predData); // Passa i dati della predisposizione al form TFO
            }
        });
    }

    if (btnModificaPredisposizioneEl) {
        btnModificaPredisposizioneEl.addEventListener('click', handleModificaPredisposizione);
    }

    if (btnEliminaPredisposizioneEl) {
        btnEliminaPredisposizioneEl.addEventListener('click', handleEliminaPredisposizione);
    }
    
    // Inizialmente nascondi i bottoni di azione dato che nessuna riga è selezionata
    updatePredisposizioniActionButtonsVisibility();
    console.log("Azioni tabella Predisposizioni inizializzate.");
}