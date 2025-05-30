// Riferimenti agli elementi del form Edifici
const buildingFormEl = document.getElementById('buildingForm');
const btnSalvaPredisposizioneEl = document.getElementById('btnSalvaPredisposizione');

// Campi del form compilati dalla mappa o dall'utente
const formIndirizzoEl = document.getElementById('formIndirizzo');
const formLatitudineEl = document.getElementById('formLatitudine'); // readonly, da mappa
const formLongitudineEl = document.getElementById('formLongitudine'); // readonly, da mappa
const formDbIdEl = document.getElementById('formDbId'); // readonly, da mappa (ID abitazione da catasto_abitazioni.id)
const formObjectIdEl = document.getElementById('formObjectId'); // readonly, da mappa (OBJECTID originale)
const formEdifcUsoEl = document.getElementById('formEdifcUso'); // readonly, da mappa

const formComuneEl = document.getElementById('formComune');
const formCodiceBelfioreEl = document.getElementById('formCodiceBelfiore');
const formCodiceCatastaleEl = document.getElementById('formCodiceCatastale');
const formDataPredisposizioneEl = document.getElementById('formDataPredisposizione');


function resetBuildingForm() {
    if (buildingFormEl) buildingFormEl.reset(); // Resetta i campi input standard
    // Resetta manualmente i campi readonly che non vengono resettati da form.reset()
    // o che hanno valori specifici da cancellare
    if (formLatitudineEl) formLatitudineEl.value = '';
    if (formLongitudineEl) formLongitudineEl.value = '';
    if (formDbIdEl) formDbIdEl.value = '';
    if (formObjectIdEl) formObjectIdEl.value = '';
    if (formEdifcUsoEl) formEdifcUsoEl.value = '';
    // I campi come comune, indirizzo, etc., vengono resettati da buildingFormEl.reset()
}


function handleSalvaPredisposizione() {
    if (!formDbIdEl || !formDbIdEl.value) {
        showModal('Attenzione', 'Seleziona un edificio dalla mappa prima di salvare.', 'warning');
        return;
    }
    if (!formDataPredisposizioneEl || !formDataPredisposizioneEl.value) {
        showModal('Attenzione', 'La data di predisposizione è obbligatoria.', 'warning');
        return;
    }
    if (!formIndirizzoEl || !formIndirizzoEl.value.trim()) {
        showModal('Attenzione', "Il campo 'Nome Edificio / Indirizzo' è obbligatorio.", 'warning');
        return;
    }
    if (!formComuneEl || !formComuneEl.value.trim()) {
        showModal('Attenzione', "Il campo 'Comune' è obbligatorio.", 'warning');
        return;
    }

    const payload = {
        id: parseInt(formDbIdEl.value), // Questo è l'ID della tabella catasto_abitazioni
        indirizzo: formIndirizzoEl.value.trim(),
        lat: formLatitudineEl.value ? parseFloat(formLatitudineEl.value) : null,
        lon: formLongitudineEl.value ? parseFloat(formLongitudineEl.value) : null,
        uso_edificio: formEdifcUsoEl.value || null, // Uso edificio dalla mappa (readonly)
        comune: formComuneEl.value.trim(),
        codice_belfiore: formCodiceBelfioreEl.value.trim() || null,
        codice_catastale: formCodiceCatastaleEl.value.trim() || null,
        data_predisposizione: formDataPredisposizioneEl.value
    };

    // L'ID della predisposizione (predisposizione_id) non esiste come campo separato nel form originale,
    // si assume che 'formDbId' (che è catasto_abitazioni.id) sia l'identificativo usato.
    // Il backend usa questo `id` per trovare il record in `catasto_abitazioni` e aggiornarlo.
    
    sendApiRequest('POST', '/predisposizioni', payload,
        function(response) {
            showModal('Successo', 'Predisposizione edificio salvata con successo!', 'success');
            
            // Aggiorna la mappa per riflettere lo stato di predisposizione
            if (typeof window.markBuildingAsPredispostoOnMap === 'function') {
                window.markBuildingAsPredispostoOnMap(payload.id); // payload.id è l'ID dell'abitazione
            }
            
            resetBuildingForm(); // Svuota il form dopo il salvataggio
            
            // Se la tabella delle predisposizioni è visibile (nella sezione TFO), aggiornala
            if (document.getElementById('sectionTfo').style.display === 'block' && typeof loadPredisposizioni === 'function') {
                loadPredisposizioni();
            }
        },
        function(error) {
            showModal('Errore', `Salvataggio predisposizione fallito: ${error}`, 'error');
        }
    );
}

function setupEdificiForm() {
    if (btnSalvaPredisposizioneEl) {
        btnSalvaPredisposizioneEl.addEventListener('click', function(event) {
            event.preventDefault();
            handleSalvaPredisposizione();
        });
    }
    console.log("Form Edifici inizializzato.");
}

// Espone la funzione per pre-compilare il form se necessario da altre parti (es. modifica da tabella predisposizioni)
window.populateEdificiFormForUpdate = function(data) {
    if (!formIndirizzoEl || !formComuneEl || !formDbIdEl) {
        console.error("Campi del form edifici non trovati per la pre-compilazione.");
        return;
    }
    formIndirizzoEl.value = data.indirizzo || '';
    formComuneEl.value = data.comune || '';
    if(formCodiceCatastaleEl) formCodiceCatastaleEl.value = data.codice_catastale || '';
    if(formDataPredisposizioneEl) formDataPredisposizioneEl.value = data.data_predisposizione || '';
    formDbIdEl.value = data.id || ''; // ID abitazione
    
    if(formLatitudineEl) formLatitudineEl.value = data.lat || '';
    if(formLongitudineEl) formLongitudineEl.value = data.lon || '';
    if(formEdifcUsoEl) formEdifcUsoEl.value = data.uso_edificio || '';
    if(formCodiceBelfioreEl) formCodiceBelfioreEl.value = data.codice_belfiore || '';
    if(formObjectIdEl && data.objectid) formObjectIdEl.value = data.objectid; // Se disponibile
    
    // Mostra la sezione edifici e scrolla al form se necessario
    if (typeof showSection === "function" && sectionEdificiDiv && navEdificiLink) {
        showSection(sectionEdificiDiv, navEdificiLink);
        buildingFormEl.scrollIntoView({ behavior: 'smooth' });
         showModal('Info', "Modulo predisposizione pre-compilato. Modifica i dati e clicca su 'Salva Predisposizione Edificio'.", 'info');
    }
};