document.addEventListener('DOMContentLoaded', function() {
    // --- Variabili Globali ---
    const navEdifici = document.getElementById('navEdifici');
    const navTfo = document.getElementById('navTfo');
    const sectionEdifici = document.getElementById('sectionEdifici');
    const sectionTfo = document.getElementById('sectionTfo');

    // --- Variabili Sezione Edifici ---
    const buildingForm = document.getElementById('buildingForm');
    const btnSalvaPredisposizione = document.getElementById('btnSalvaPredisposizione');
    const formIndirizzo = document.getElementById('formIndirizzo');
    const formLatitudine = document.getElementById('formLatitudine');
    const formLongitudine = document.getElementById('formLongitudine');
    const formDbId = document.getElementById('formDbId'); // ID Abitazione
    const formObjectId = document.getElementById('formObjectId');
    const formComune = document.getElementById('formComune');
    const formCodiceBelfiore = document.getElementById('formCodiceBelfiore');
    const formCodiceCatastale = document.getElementById('formCodiceCatastale');
    const formDataPredisposizione = document.getElementById('formDataPredisposizione');
    const formEdifcUso = document.getElementById('formEdifcUso');

    // --- Variabili Sezione TFO ---
    const predisposizioniTableBody = document.getElementById('predisposizioniTableBody');
    const btnShowAddTfo = document.getElementById('btnShowAddTfo');
    const btnModificaPredisposizione = document.getElementById('btnModificaPredisposizione');
    const btnEliminaPredisposizione = document.getElementById('btnEliminaPredisposizione');
    let selectedPredisposizioneRow = null;

    const tfoSectionTitle = document.getElementById('tfoSectionTitle');
    const formTfoContainer = document.getElementById('formTfoContainer');
    const tfoForm = document.getElementById('tfoForm');
    const formTfoIdInput = document.getElementById('formTfoRowIndex'); // Usato per TFO ID (DB)
    const selectedPredisposizioneIdInput = document.getElementById('selectedPredisposizioneId'); // Usato per ID Abitazione
    const formIndirizzoTfo = document.getElementById('formIndirizzoTfo');
    const formLatitudineTfo = document.getElementById('formLatitudineTfo');
    const formLongitudineTfo = document.getElementById('formLongitudineTfo');
    const formCodiceCatastaleTfo = document.getElementById('formCodiceCatastaleTfo');
    const formDataPredisposizioneTfo = document.getElementById('formDataPredisposizioneTfo');
    const formScalaTfo = document.getElementById('formScalaTfo');
    const formPianoTfo = document.getElementById('formPianoTfo');
    const formInternoTfo = document.getElementById('formInternoTfo');
    const formIdOperatoreTfo = document.getElementById('formIdOperatoreTfo');
    const formCodiceTfo = document.getElementById('formCodiceTfo');
    const formCodiceRoeTfo = document.getElementById('formCodiceRoeTfo');

    const btnSalvaTfo = document.getElementById('btnSalvaTfo');
    const btnAnnullaTfo = document.getElementById('btnAnnullaTfo');

    const tfoTableContainer = document.getElementById('tfoTableContainer');
    const tfoTable = document.getElementById('tfoTable');
    const tfoTableBody = document.getElementById('tfoTableBody');
    const tfoActionButtons = document.getElementById('tfoActionButtons');
    const btnModificaTfo = document.getElementById('btnModificaTfo');
    const btnEliminaTfo = document.getElementById('btnEliminaTfo');
    let selectedTfoRow = null;
    let currentTfoDataStore = {}; // Memorizza { tfo_id: tfo_data }

    // --- Variabili Modal ---
    let genericModalElement = document.getElementById('genericModal');
    let genericModal = genericModalElement ? new bootstrap.Modal(genericModalElement) : null;
    let confirmModalElement = document.getElementById('confirmModal');
    let confirmModal = confirmModalElement ? new bootstrap.Modal(confirmModalElement) : null;
    let confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');

    const API_BASE_URL = 'http://127.0.0.1:8000';

    // --- Funzioni Utilità ---
    function showModal(title, message, type = 'info') {
        if (!genericModal) { console.error("Modal generico non trovato!"); alert(`${title}: ${message}`); return; }
        document.getElementById('genericModalTitle').textContent = title;
        document.getElementById('genericModalBody').textContent = message;
        genericModal.show();
    }

    function showConfirmModal(title, message, confirmCallback) {
        if (!confirmModal || !confirmModalConfirmBtn) {
             console.error("Modal di conferma non trovato!");
             if (confirm(message)) { confirmCallback(); }
             return;
        }
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;
        const newConfirmBtn = confirmModalConfirmBtn.cloneNode(true);
        confirmModalConfirmBtn.parentNode.replaceChild(newConfirmBtn, confirmModalConfirmBtn);
        confirmModalConfirmBtn = newConfirmBtn;
        confirmModalConfirmBtn.addEventListener('click', () => {
            confirmModal.hide();
            confirmCallback();
        }, { once: true });
        confirmModal.show();
    }

    function sendApiRequest(method, endpoint, data, successCallback, errorCallback) {
        const url = API_BASE_URL + endpoint;
        console.log(`API Request: ${method} ${url}`, data); // Log per debug

        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                         console.error("API Error Response:", err);
                         throw new Error(err.detail || `Errore HTTP ${response.status}`);
                    }).catch(() => {
                        throw new Error(`Errore HTTP ${response.status} - Impossibile leggere il dettaglio.`);
                    });
                }
                 // Gestisce 204 No Content per DELETE
                if (response.status === 204) {
                    return null;
                }
                return response.json();
            })
            .then(responseData => {
                console.log('API Success Response:', responseData);
                successCallback(responseData);
            })
            .catch(error => {
                console.error('API Fetch Error:', error);
                errorCallback(error.message || 'Errore di rete o backend non raggiungibile.');
            });
    }

    function updatePredisposizioniButtonsVisibility() {
        const isRowSelected = selectedPredisposizioneRow !== null;
        btnShowAddTfo.style.display = isRowSelected ? '' : 'none';
        btnModificaPredisposizione.style.display = isRowSelected ? '' : 'none';
        btnEliminaPredisposizione.style.display = isRowSelected ? '' : 'none';
    }

    function updateTfoButtonsVisibility() {
        const isRowSelected = selectedTfoRow !== null;
        btnModificaTfo.style.display = isRowSelected ? '' : 'none';
        btnEliminaTfo.style.display = isRowSelected ? '' : 'none';
    }

    // --- Inizializzazione ---
    if (typeof initMap === 'function') { initMap(); }
    console.log("Applicazione Frontend Inizializzata.");
    showSection(sectionEdifici, navEdifici);
    updatePredisposizioniButtonsVisibility();
    updateTfoButtonsVisibility();

    // --- Navigazione ---
    function showSection(sectionToShow, navLinkToActivate) {
        sectionEdifici.style.display = 'none';
        sectionTfo.style.display = 'none';
        navEdifici.classList.remove('active');
        navTfo.classList.remove('active');
        sectionToShow.style.display = 'block';
        if (navLinkToActivate) navLinkToActivate.classList.add('active');
        formTfoContainer.style.display = 'none';
        if (sectionToShow === sectionEdifici && typeof map !== 'undefined' && map.invalidateSize) {
            setTimeout(() => map.invalidateSize(), 0);
        }
        if (sectionToShow === sectionTfo) {
             loadPredisposizioni();
        }
    }

    navEdifici.addEventListener('click', (e) => { e.preventDefault(); showSection(sectionEdifici, navEdifici); });
    navTfo.addEventListener('click', (e) => { e.preventDefault(); showSection(sectionTfo, navTfo); });

    // --- Logica Sezione Edifici ---
    btnSalvaPredisposizione.addEventListener('click', function(event) {
        event.preventDefault();
        const idAbitazione = formDbId.value;
        if (!idAbitazione) { showModal('Attenzione', 'Seleziona un edificio dalla mappa.', 'warning'); return; }
        if (!formDataPredisposizione.value) { showModal('Attenzione', 'Inserisci la Data.', 'warning'); return; }

        const payload = {
            id: parseInt(idAbitazione),
            indirizzo: formIndirizzo.value || 'N/D',
            lat: formLatitudine.value ? parseFloat(formLatitudine.value) : null,
            lon: formLongitudine.value ? parseFloat(formLongitudine.value) : null,
            uso_edificio: formEdifcUso.value || null,
            comune: formComune.value || 'N/D',
            codice_belfiore: formCodiceBelfiore.value || null,
            codice_catastale: formCodiceCatastale.value || null,
            data_predisposizione: formDataPredisposizione.value
        };

        sendApiRequest('POST', '/predisposizioni', payload,
            function(response) {
                showModal('Successo', 'Predisposizione salvata!', 'success');
                if (typeof window.markBuildingAsPredispostoOnMap === 'function') {
                    window.markBuildingAsPredispostoOnMap(payload.id);
                }
                buildingForm.reset();
                formDbId.value = ''; formObjectId.value = ''; formLatitudine.value = '';
                formLongitudine.value = ''; formEdifcUso.value = '';
                if(formCodiceBelfiore) formCodiceBelfiore.value = '';
                loadPredisposizioni(); // Aggiorna la lista
            },
            function(error) {
                showModal('Errore', `Salvataggio fallito: ${error}`, 'error');
            }
        );
    });

    // --- Logica Sezione Lista TFO ---
    function loadPredisposizioni() {
        predisposizioniTableBody.innerHTML = '<tr><td colspan="5">Caricamento...</td></tr>';
        sendApiRequest('GET', '/predisposizioni', null,
            function(data) {
                predisposizioniTableBody.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(pred => addPredisposizioneToTable(pred));
                } else {
                    predisposizioniTableBody.innerHTML = '<tr><td colspan="5">Nessuna predisposizione trovata.</td></tr>';
                }
                clearTfoSection();
                updatePredisposizioniButtonsVisibility();
            },
            function(error) {
                predisposizioniTableBody.innerHTML = `<tr><td colspan="5">Errore: ${error}</td></tr>`;
                clearTfoSection();
                updatePredisposizioniButtonsVisibility();
            }
        );
    }

    function addPredisposizioneToTable(pred) {
        const newRow = predisposizioniTableBody.insertRow();
        newRow.dataset.id = pred.id; // ID DB (verifiche_edifici)
        newRow.dataset.abitazioneId = pred.id_abitazione;
        newRow.dataset.indirizzo = pred.indirizzo || '';
        newRow.dataset.lat = pred.lat || '';
        newRow.dataset.lon = pred.lon || '';
        newRow.dataset.codCatastale = pred.codice_catastale || '';
        newRow.dataset.comune = pred.comune || '';
        newRow.dataset.dataPred = pred.data_predisposizione || '';
        newRow.dataset.usoEdificio = pred.uso_edificio || '';
        newRow.dataset.codiceBelfiore = pred.codice_belfiore || '';

        newRow.innerHTML = `
            <td>${pred.id_abitazione}</td>
            <td>${pred.indirizzo || 'N/D'}</td>
            <td>${pred.comune || 'N/D'}</td>
            <td>${pred.codice_catastale || 'N/D'}</td>
            <td>${pred.data_predisposizione ? new Date(pred.data_predisposizione).toLocaleDateString() : 'N/D'}</td>
        `;
    }

    function clearTfoSection() {
        tfoTableBody.innerHTML = '';
        tfoTableContainer.querySelector('p').textContent = "Nessun edificio selezionato.";
        tfoTableContainer.querySelector('p').style.display = 'block';
        tfoTable.style.display = 'none';
        tfoActionButtons.style.display = 'none';
        formTfoContainer.style.display = 'none';
        tfoSectionTitle.textContent = 'Terminazioni Ottiche (TFO)';
        currentTfoDataStore = {};
        selectedTfoRow = null;
        updateTfoButtonsVisibility();
    }

    predisposizioniTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.id) return;

        if (selectedPredisposizioneRow) { selectedPredisposizioneRow.classList.remove('selected'); }

        if (selectedPredisposizioneRow === row) {
            selectedPredisposizioneRow = null;
            clearTfoSection();
        } else {
            selectedPredisposizioneRow = row;
            selectedPredisposizioneRow.classList.add('selected');
            const abitazioneId = selectedPredisposizioneRow.dataset.abitazioneId;
            tfoSectionTitle.textContent = `TFO per: ${row.dataset.indirizzo || abitazioneId}`;
            loadTfosForPredisposizione(abitazioneId);
            formTfoContainer.style.display = 'none';
        }
        updatePredisposizioniButtonsVisibility();
    });

    function loadTfosForPredisposizione(abitazioneId) {
        tfoTableBody.innerHTML = '<tr><td colspan="7">Caricamento TFO...</td></tr>';
        currentTfoDataStore = {};
        sendApiRequest('GET', `/predisposizioni/${abitazioneId}/tfos`, null,
            function(tfos) {
                tfoTableBody.innerHTML = '';
                if (tfos && tfos.length > 0) {
                    tfos.forEach(tfo => addTfoToTable(tfo));
                    tfoTableContainer.querySelector('p').style.display = 'none';
                    tfoTable.style.display = '';
                    tfoActionButtons.style.display = '';
                } else {
                    tfoTableContainer.querySelector('p').textContent = "Nessuna TFO inserita.";
                    tfoTableContainer.querySelector('p').style.display = 'block';
                    tfoTable.style.display = 'none';
                    tfoActionButtons.style.display = 'none';
                }
                selectedTfoRow = null;
                updateTfoButtonsVisibility();
            },
            function(error) {
                tfoTableBody.innerHTML = `<tr><td colspan="7">Errore: ${error}</td></tr>`;
                updateTfoButtonsVisibility();
            }
        );
    }

    function addTfoToTable(tfo) {
        currentTfoDataStore[tfo.id] = tfo;
        const newRow = tfoTableBody.insertRow();
        newRow.dataset.tfoId = tfo.id;

        newRow.innerHTML = `
            <td>${tfo.scala || 'N/D'}</td>
            <td>${tfo.piano || 'N/D'}</td>
            <td>${tfo.interno || 'N/D'}</td>
            <td>${tfo.data_predisposizione ? new Date(tfo.data_predisposizione).toLocaleDateString() : 'N/D'}</td>
            <td>${tfo.id_operatore || 'N/D'}</td>
            <td>${tfo.id_tfo || 'N/D'}</td>
            <td>${tfo.id_roe || 'N/D'}</td>
        `;
    }

    btnShowAddTfo.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) { showModal('Attenzione', 'Seleziona un Edificio.', 'warning'); return; }
        showTfoFormInternal('add');
    });

    btnModificaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) { showModal('Attenzione', 'Seleziona un Edificio.', 'warning'); return; }
        const data = selectedPredisposizioneRow.dataset;
        formIndirizzo.value = data.indirizzo;
        formComune.value = data.comune;
        formCodiceCatastale.value = data.codCatastale;
        formDataPredisposizione.value = data.dataPred;
        formDbId.value = data.abitazioneId;
        formLatitudine.value = data.lat;
        formLongitudine.value = data.lon;
        formEdifcUso.value = data.usoEdificio;
        formCodiceBelfiore.value = data.codiceBelfiore;
        showModal('Info', "Modulo pre-compilato. Modifica e Salva.", 'info');
        showSection(sectionEdifici, navEdifici);
    });

    btnEliminaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) { showModal('Attenzione', 'Seleziona un Edificio.', 'warning'); return; }
        const abitazioneId = selectedPredisposizioneRow.dataset.abitazioneId;
        showConfirmModal('Conferma', `Eliminare la predisposizione ${abitazioneId} e le TFO associate?`,
            () => {
                sendApiRequest('DELETE', `/predisposizioni/${abitazioneId}`, null,
                    function(response) {
                        showModal('Successo', response.message, 'success');
                        loadPredisposizioni();
                        if (typeof window.unmarkBuildingAsPredispostoOnMap === 'function') {
                           window.unmarkBuildingAsPredispostoOnMap(abitazioneId);
                        }
                    },
                    function(error) { showModal('Errore', `Eliminazione fallita: ${error}`, 'error'); }
                );
            }
        );
    });

    function clearTfoForm() {
        tfoForm.reset();
        formTfoIdInput.value = '';
        selectedPredisposizioneIdInput.value = '';
    }

    function showTfoFormInternal(mode = 'add', tfoIdToEdit = null) {
        clearTfoForm();
        const predData = selectedPredisposizioneRow.dataset;
        selectedPredisposizioneIdInput.value = predData.abitazioneId;
        formIndirizzoTfo.value = predData.indirizzo;
        formLatitudineTfo.value = predData.lat;
        formLongitudineTfo.value = predData.lon;
        formCodiceCatastaleTfo.value = predData.codCatastale;

        if (mode === 'edit' && tfoIdToEdit && currentTfoDataStore[tfoIdToEdit]) {
            const tfoData = currentTfoDataStore[tfoIdToEdit];
            formDataPredisposizioneTfo.value = tfoData.data_predisposizione || '';
            formScalaTfo.value = tfoData.scala || '';
            formPianoTfo.value = tfoData.piano || '';
            formInternoTfo.value = tfoData.interno || '';
            formIdOperatoreTfo.value = tfoData.id_operatore || '';
            formCodiceTfo.value = tfoData.id_tfo || '';
            formCodiceRoeTfo.value = tfoData.id_roe || '';
            formTfoIdInput.value = tfoIdToEdit;
        } else {
             formTfoIdInput.value = '';
        }
        formTfoContainer.style.display = 'block';
    }

    btnAnnullaTfo.addEventListener('click', () => {
        formTfoContainer.style.display = 'none';
        clearTfoForm();
    });

    btnSalvaTfo.addEventListener('click', () => {
        const abitazioneId = selectedPredisposizioneIdInput.value;
        if (!abitazioneId) { showModal("Errore", "ID edificio mancante.", 'error'); return; }

        const payload = {
            id_abitazione: parseInt(abitazioneId),
            data_predisposizione: formDataPredisposizioneTfo.value || null,
            scala: formScalaTfo.value || null,
            piano: formPianoTfo.value || null,
            interno: formInternoTfo.value || null,
            id_operatore: formIdOperatoreTfo.value || null,
            id_tfo: formCodiceTfo.value || null,
            id_roe: formCodiceRoeTfo.value || null,
        };

        if (!payload.data_predisposizione || !payload.id_tfo) {
             showModal("Attenzione", "Compila Data TFO e Codice TFO.", 'warning');
            return;
        }

        const tfoId = formTfoIdInput.value;
        const method = tfoId ? 'PUT' : 'POST';
        const endpoint = tfoId ? `/tfos/${tfoId}` : '/tfos';

        sendApiRequest(method, endpoint, payload,
            function(response) {
                showModal('Successo', `TFO ${tfoId ? 'aggiornata' : 'salvata'}!`, 'success');
                formTfoContainer.style.display = 'none';
                clearTfoForm();
                loadTfosForPredisposizione(abitazioneId);
            },
            function(error) { showModal('Errore', `Salvataggio TFO fallito: ${error}`, 'error'); }
        );
    });

    tfoTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.tfoId) return;
        if (selectedTfoRow) { selectedTfoRow.classList.remove('selected'); }
        if (selectedTfoRow === row) { selectedTfoRow = null; }
        else { selectedTfoRow = row; selectedTfoRow.classList.add('selected'); }
        updateTfoButtonsVisibility();
    });

    btnModificaTfo.addEventListener('click', () => {
        if (!selectedTfoRow) { showModal('Attenzione', 'Seleziona una TFO.', 'warning'); return; }
        showTfoFormInternal('edit', selectedTfoRow.dataset.tfoId);
    });

    btnEliminaTfo.addEventListener('click', () => {
        if (!selectedTfoRow) { showModal('Attenzione', 'Seleziona una TFO.', 'warning'); return; }
        const tfoId = selectedTfoRow.dataset.tfoId;
        const abitazioneId = selectedPredisposizioneRow.dataset.abitazioneId;
        showConfirmModal('Conferma', `Eliminare la TFO ID ${tfoId}?`,
            () => {
                sendApiRequest('DELETE', `/tfos/${tfoId}`, null,
                    function() {
                        showModal('Successo', `TFO ${tfoId} eliminata.`, 'success');
                        loadTfosForPredisposizione(abitazioneId);
                    },
                    function(error) { showModal('Errore', `Eliminazione TFO fallita: ${error}`, 'error'); }
                );
            }
        );
    });
});