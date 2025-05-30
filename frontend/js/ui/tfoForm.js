const tfoFormEl = document.getElementById('tfoForm');
const formTfoContainerElRef = document.getElementById('formTfoContainer'); // Riferimento al contenitore del form

// Campi nascosti per IDs
const formTfoRowIndexInputEl = document.getElementById('formTfoRowIndex'); // ID TFO per PUT (verifiche_edifici.id)
const selectedPredisposizioneIdInputEl = document.getElementById('selectedPredisposizioneId'); // ID Abitazione (catasto_abitazioni.id)

// Campi readonly pre-compilati dalla predisposizione selezionata
const formIndirizzoTfoEl = document.getElementById('formIndirizzoTfo');
const formLatitudineTfoEl = document.getElementById('formLatitudineTfo');
const formLongitudineTfoEl = document.getElementById('formLongitudineTfo');
const formCodiceCatastaleTfoEl = document.getElementById('formCodiceCatastaleTfo');

// Campi TFO compilabili dall'utente
const formDataPredisposizioneTfoEl = document.getElementById('formDataPredisposizioneTfo');
const formScalaTfoEl = document.getElementById('formScalaTfo');
const formPianoTfoEl = document.getElementById('formPianoTfo');
const formInternoTfoEl = document.getElementById('formInternoTfo');
const formIdOperatoreTfoEl = document.getElementById('formIdOperatoreTfo');
const formCodiceTfoEl = document.getElementById('formCodiceTfo'); // Codice identificativo TFO (id_tfo)
const formCodiceRoeTfoEl = document.getElementById('formCodiceRoeTfo'); // Codice identificativo ROE (id_roe)

// Bottoni del form TFO
const btnSalvaTfoEl = document.getElementById('btnSalvaTfo');
const btnAnnullaTfoEl = document.getElementById('btnAnnullaTfo');

let isEditModeTfo = false; // Flag per distinguere tra creazione e modifica TFO

function resetTfoForm() {
    if (tfoFormEl) tfoFormEl.reset(); // Resetta i campi input standard
    // Svuota i campi nascosti e il flag di modifica
    if (formTfoRowIndexInputEl) formTfoRowIndexInputEl.value = '';
    if (selectedPredisposizioneIdInputEl) selectedPredisposizioneIdInputEl.value = '';
    isEditModeTfo = false;

    // I campi readonly (Indirizzo, Lat, Lon, CodCatastale TFO)
    // saranno ripopolati quando si mostra il form per una nuova TFO o per modifica.
    // Quindi non è strettamente necessario svuotarli qui, ma per pulizia:
    if(formIndirizzoTfoEl) formIndirizzoTfoEl.value = '';
    if(formLatitudineTfoEl) formLatitudineTfoEl.value = '';
    if(formLongitudineTfoEl) formLongitudineTfoEl.value = '';
    if(formCodiceCatastaleTfoEl) formCodiceCatastaleTfoEl.value = '';
}

function hideTfoForm() {
    if (formTfoContainerElRef) formTfoContainerElRef.style.display = 'none';
    resetTfoForm();
}

/**
 * Mostra il form TFO per l'aggiunta.
 * @param {object} predData Dati della predisposizione selezionata (dalla riga della tabella predisposizioni).
 * Atteso formato: dataset della riga (es. predData.id, predData.indirizzo, ecc.)
 */
function showTfoFormForAdd(predData) {
    if (!formTfoContainerElRef || !predData) {
        console.error("Contenitore form TFO o dati predisposizione mancanti.");
        return;
    }
    resetTfoForm(); // Assicura che il form sia pulito
    isEditModeTfo = false;

    // Popola i campi readonly con i dati della predisposizione
    if (selectedPredisposizioneIdInputEl) selectedPredisposizioneIdInputEl.value = predData.id || '';
    if (formIndirizzoTfoEl) formIndirizzoTfoEl.value = predData.indirizzo || '';
    if (formLatitudineTfoEl) formLatitudineTfoEl.value = predData.lat || '';
    if (formLongitudineTfoEl) formLongitudineTfoEl.value = predData.lon || '';
    if (formCodiceCatastaleTfoEl) formCodiceCatastaleTfoEl.value = predData.codCatastale || ''; // Nota: codCatastale nel dataset

    formTfoContainerElRef.style.display = 'block';
    if(btnSalvaTfoEl) btnSalvaTfoEl.textContent = 'Salva Nuova TFO';

    // Focus sul primo campo editabile
    if(formDataPredisposizioneTfoEl) formDataPredisposizioneTfoEl.focus();
}


/**
 * Mostra il form TFO per la modifica di una TFO esistente.
 * @param {object} tfoData Dati della TFO da modificare (da currentTfoDataStore).
 * @param {object} predData Dati della predisposizione associata.
 */
function showTfoFormForEdit(tfoData, predData) {
    if (!formTfoContainerElRef || !tfoData || !predData) {
        console.error("Contenitore form TFO o dati TFO/predisposizione mancanti per la modifica.");
        return;
    }
    resetTfoForm();
    isEditModeTfo = true;

    // Popola i campi readonly con i dati della predisposizione (per consistenza display)
    if (formIndirizzoTfoEl) formIndirizzoTfoEl.value = predData.indirizzo || tfoData.indirizzo || '';
    if (formLatitudineTfoEl) formLatitudineTfoEl.value = predData.lat || tfoData.lat || '';
    if (formLongitudineTfoEl) formLongitudineTfoEl.value = predData.lon || tfoData.lon || '';
    if (formCodiceCatastaleTfoEl) formCodiceCatastaleTfoEl.value = predData.codCatastale || tfoData.codice_catastale || '';

    // Popola i campi del form TFO con i dati della TFO da modificare
    if (formTfoRowIndexInputEl) formTfoRowIndexInputEl.value = tfoData.id || ''; // ID della TFO (verifiche_edifici.id)
    if (selectedPredisposizioneIdInputEl) selectedPredisposizioneIdInputEl.value = tfoData.id_abitazione || predData.id || '';
    
    // tfoData.data_predisposizione è già YYYY-MM-DD dal backend TfoInDB
    if (formDataPredisposizioneTfoEl) formDataPredisposizioneTfoEl.value = tfoData.data_predisposizione || '';
    if (formScalaTfoEl) formScalaTfoEl.value = tfoData.scala || '';
    if (formPianoTfoEl) formPianoTfoEl.value = tfoData.piano || '';
    if (formInternoTfoEl) formInternoTfoEl.value = tfoData.interno || '';
    if (formIdOperatoreTfoEl) formIdOperatoreTfoEl.value = tfoData.id_operatore || '';
    if (formCodiceTfoEl) formCodiceTfoEl.value = tfoData.id_tfo || '';
    if (formCodiceRoeTfoEl) formCodiceRoeTfoEl.value = tfoData.id_roe || '';

    formTfoContainerElRef.style.display = 'block';
    if(btnSalvaTfoEl) btnSalvaTfoEl.textContent = 'Aggiorna TFO';
    
    if(formDataPredisposizioneTfoEl) formDataPredisposizioneTfoEl.focus();
}


function handleSalvaTfo() {
    const abitazioneId = selectedPredisposizioneIdInputEl ? selectedPredisposizioneIdInputEl.value : null;
    if (!abitazioneId) {
        showModal("Errore", "ID edificio predisposto non specificato. Impossibile salvare la TFO.", 'error');
        return;
    }

    if (!formDataPredisposizioneTfoEl || !formDataPredisposizioneTfoEl.value) {
        showModal("Attenzione", "La 'Data di Predisposizione TFO' è obbligatoria.", 'warning');
        formDataPredisposizioneTfoEl.focus();
        return;
    }
    if (!formCodiceTfoEl || !formCodiceTfoEl.value.trim()) {
        showModal("Attenzione", "Il 'Codice Identificativo TFO' è obbligatorio.", 'warning');
        formCodiceTfoEl.focus();
        return;
    }

    const payload = {
        id_abitazione: parseInt(abitazioneId),
        data_predisposizione_tfo: formDataPredisposizioneTfoEl.value, // Nome campo come da schema TfoCreate
        scala: formScalaTfoEl.value.trim() || null,
        piano: formPianoTfoEl.value.trim() || null,
        interno: formInternoTfoEl.value.trim() || null,
        id_operatore: formIdOperatoreTfoEl.value.trim() || null,
        id_tfo: formCodiceTfoEl.value.trim(), // Codice TFO (obbligatorio)
        id_roe: formCodiceRoeTfoEl.value.trim() || null,
    };

    const tfoDbId = isEditModeTfo && formTfoRowIndexInputEl ? formTfoRowIndexInputEl.value : null;
    const method = tfoDbId ? 'PUT' : 'POST';
    const endpoint = tfoDbId ? `/tfos/${tfoDbId}` : '/tfos';

    sendApiRequest(method, endpoint, payload,
        function(response) {
            showModal('Successo', `TFO ${tfoDbId ? 'aggiornata' : 'salvata'} con successo!`, 'success');
            hideTfoForm();
            // Ricarica la tabella delle TFO per la predisposizione corrente
            if (typeof loadTfosForSelectedPredisposizione === 'function') {
                loadTfosForSelectedPredisposizione(abitazioneId);
            }
        },
        function(error) {
            showModal('Errore', `Salvataggio TFO fallito: ${error}`, 'error');
        }
    );
}


function setupTfoFormActions() {
    if (btnSalvaTfoEl) {
        btnSalvaTfoEl.addEventListener('click', function(event) {
            event.preventDefault();
            handleSalvaTfo();
        });
    }

    if (btnAnnullaTfoEl) {
        btnAnnullaTfoEl.addEventListener('click', function() {
            hideTfoForm();
        });
    }
    
    // Inizialmente il form TFO è nascosto
    hideTfoForm();
    console.log("Form TFO e azioni inizializzati.");
}