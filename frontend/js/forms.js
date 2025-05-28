document.addEventListener('DOMContentLoaded', function() {
    // --- Variabili Globali per le sezioni ---
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
    const formDbId = document.getElementById('formDbId');
    const formObjectId = document.getElementById('formObjectId');
    const formComune = document.getElementById('formComune');
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
    const selectedPredisposizioneIdInput = document.getElementById('selectedPredisposizioneId');
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
    const formTfoRowIndex = document.getElementById('formTfoRowIndex');

    const btnSalvaTfo = document.getElementById('btnSalvaTfo');
    const btnAnnullaTfo = document.getElementById('btnAnnullaTfo');

    const tfoTableContainer = document.getElementById('tfoTableContainer');
    const tfoTable = document.getElementById('tfoTable');
    const tfoTableBody = document.getElementById('tfoTableBody');
    const tfoActionButtons = document.getElementById('tfoActionButtons');
    const btnModificaTfo = document.getElementById('btnModificaTfo');
    const btnEliminaTfo = document.getElementById('btnEliminaTfo');
    let selectedTfoRow = null;

    let tfoDataStore = {};

    // --- Variabili Modal ---
    let genericModalElement = document.getElementById('genericModal');
    let genericModal = genericModalElement ? new bootstrap.Modal(genericModalElement) : null;
    let confirmModalElement = document.getElementById('confirmModal');
    let confirmModal = confirmModalElement ? new bootstrap.Modal(confirmModalElement) : null;
    let confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');

    // --- NUOVO: Nascondi i pulsanti TFO all'avvio ---
    btnShowAddTfo.style.display = 'none';
    btnModificaPredisposizione.style.display = 'none';
    btnEliminaPredisposizione.style.display = 'none';

    // --- Funzioni Modal ---
    function showModal(title, message, type = 'info') {
        if (!genericModal) {
            console.error("Modal generico non trovato!");
            alert(`${title}: ${message}`); // Fallback
            return;
        }
        document.getElementById('genericModalTitle').textContent = title;
        document.getElementById('genericModalBody').textContent = message;
        // Potresti aggiungere logica per cambiare l'icona o il colore in base a 'type'
        genericModal.show();
    }

    function showConfirmModal(title, message, confirmCallback) {
        if (!confirmModal || !confirmModalConfirmBtn) {
             console.error("Modal di conferma non trovato!");
             if (confirm(message)) { // Fallback
                 confirmCallback();
             }
             return;
        }

        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;

        // Rimuovi eventuali listener precedenti per evitare esecuzioni multiple
        const newConfirmBtn = confirmModalConfirmBtn.cloneNode(true);
        confirmModalConfirmBtn.parentNode.replaceChild(newConfirmBtn, confirmModalConfirmBtn);
        confirmModalConfirmBtn = newConfirmBtn; // Aggiorna il riferimento


        const confirmHandler = () => {
            confirmModal.hide();
            confirmCallback();
        };

        confirmModalConfirmBtn.addEventListener('click', confirmHandler, { once: true });

        confirmModal.show();
    }

    // --- NUOVO: Funzione per aggiornare la visibilità dei 3 pulsanti TFO ---
    function updateTfoButtonsVisibility() {
        const hasRows = predisposizioniTableBody.rows.length > 0;
        btnShowAddTfo.style.display = hasRows ? '' : 'none';
        btnModificaPredisposizione.style.display = hasRows ? '' : 'none';
        btnEliminaPredisposizione.style.display = hasRows ? '' : 'none';
    }


    // --- Inizializzazione Mappa ---
    if (typeof initMap === 'function') {
        initMap(); // map_logic.js
    } else {
        console.error("La funzione initMap() non è stata trovata.");
    }
    console.log("Applicazione Frontend Inizializzata.");

    // --- NUOVO: Chiama la funzione per impostare lo stato iniziale dei pulsanti ---
    updateTfoButtonsVisibility();

    // --- Logica Navigazione Sezioni ---
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
    }

    navEdifici.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(sectionEdifici, navEdifici);
    });

    navTfo.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(sectionTfo, navTfo);
    });

    showSection(sectionEdifici, navEdifici);

    // --- Logica Sezione Lista Edifici ---
    if (btnSalvaPredisposizione && buildingForm) {
        btnSalvaPredisposizione.addEventListener('click', function(event) {
            event.preventDefault();
            const dbId = formDbId.value;
            const objectId = formObjectId.value;
            const indirizzo = formIndirizzo.value;
            const dataPred = formDataPredisposizione.value;
            const comune = formComune.value;
            const codCatastale = formCodiceCatastale.value;
            const lat = formLatitudine.value;
            const lon = formLongitudine.value;

            if (!dbId && !objectId) {
                showModal('Attenzione', 'Per favore, seleziona un edificio dalla mappa prima di salvare la predisposizione.', 'warning');
                return;
            }
            if (!dataPred) {
                showModal('Attenzione', 'Per favore, inserisci la Data di Predisposizione.', 'warning');
                return;
            }
            if (!indirizzo) {
                showModal('Attenzione', 'Indirizzo mancante.', 'warning');
                return;
            }
            if (!comune) {
                showModal('Attenzione', 'Comune mancante.', 'warning');
                return;
            }

            const uniqueId = dbId || objectId;
            const existingRow = document.querySelector(`#predisposizioniTableBody tr[data-id="${uniqueId}"]`);

            const predisposizioneData = {
                id: uniqueId,
                indirizzo: indirizzo,
                lat: lat,
                lon: lon,
                comune: comune,
                codCatastale: codCatastale,
                dataPred: dataPred,
            };

            if (existingRow) {
                existingRow.dataset.indirizzo = predisposizioneData.indirizzo;
                existingRow.dataset.lat = predisposizioneData.lat;
                existingRow.dataset.lon = predisposizioneData.lon;
                existingRow.dataset.codCatastale = predisposizioneData.codCatastale;
                existingRow.cells[1].textContent = predisposizioneData.indirizzo;
                existingRow.cells[2].textContent = predisposizioneData.comune;
                existingRow.cells[3].textContent = predisposizioneData.codCatastale;
                existingRow.cells[4].textContent = predisposizioneData.dataPred;
                showModal('Successo', `Predisposizione edificio ID: ${predisposizioneData.id} modificata con successo.`, 'success');
            } else {
                const newRow = predisposizioniTableBody.insertRow();
                newRow.dataset.id = predisposizioneData.id;
                newRow.dataset.indirizzo = predisposizioneData.indirizzo;
                newRow.dataset.lat = predisposizioneData.lat;
                newRow.dataset.lon = predisposizioneData.lon;
                newRow.dataset.codCatastale = predisposizioneData.codCatastale;
                newRow.innerHTML = `
                    <td>${predisposizioneData.id}</td>
                    <td>${predisposizioneData.indirizzo}</td>
                    <td>${predisposizioneData.comune}</td>
                    <td>${predisposizioneData.codCatastale}</td>
                    <td>${predisposizioneData.dataPred}</td>
                `;

                if (!tfoDataStore[predisposizioneData.id]) {
                    tfoDataStore[predisposizioneData.id] = [];
                }

                if (typeof window.markBuildingAsPredispostoOnMap === 'function') {
                    window.markBuildingAsPredispostoOnMap(predisposizioneData.id);
                } else {
                    console.error("Funzione markBuildingAsPredispostoOnMap non trovata.");
                }

                showModal('Successo', `Edificio ID: ${predisposizioneData.id} registrato come predisposto e aggiunto alla tabella.`, 'success');
            }

            // --- NUOVO: Aggiorna la visibilità dei pulsanti ---
            updateTfoButtonsVisibility();

            buildingForm.reset();
            formDbId.value = '';
            formObjectId.value = '';
            formLatitudine.value = '';
            formLongitudine.value = '';
            formEdifcUso.value = '';

        });
    }

    // --- Logica Sezione Lista TFO ---
    predisposizioniTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        if (selectedPredisposizioneRow) {
            selectedPredisposizioneRow.classList.remove('selected');
        }
        if (selectedPredisposizioneRow === row) {
            selectedPredisposizioneRow = null;
            tfoTableContainer.querySelector('p').textContent = "Nessun edificio predisposto selezionato.";
            tfoTable.style.display = 'none';
            tfoActionButtons.style.display = 'none';
            tfoTableBody.innerHTML = '';
            formTfoContainer.style.display = 'none';
            tfoSectionTitle.textContent = 'Terminazioni Ottiche (TFO)';
        } else {
            selectedPredisposizioneRow = row;
            selectedPredisposizioneRow.classList.add('selected');
            const predispoId = selectedPredisposizioneRow.dataset.id;
            const predispoAddr = selectedPredisposizioneRow.dataset.indirizzo;
            tfoSectionTitle.textContent = `Terminazioni Ottiche (TFO) per: ${predispoAddr || predispoId}`;
            loadTfosForPredisposizione(predispoId);
            formTfoContainer.style.display = 'none';
        }
    });

    function loadTfosForPredisposizione(predispoId) {
        tfoTableBody.innerHTML = '';
        const tfos = tfoDataStore[predispoId] || [];

        if (tfos.length > 0) {
            tfos.forEach((data, index) => addTfoToTable(data, predispoId, false, index));
            tfoTableContainer.querySelector('p').style.display = 'none';
            tfoTable.style.display = '';
            tfoActionButtons.style.display = '';
        } else {
            tfoTableContainer.querySelector('p').textContent = "Nessuna TFO ancora inserita per l'edificio selezionato.";
            tfoTableContainer.querySelector('p').style.display = 'block';
            tfoTable.style.display = 'none';
            tfoActionButtons.style.display = 'none';
        }
        selectedTfoRow = null;
        if(tfoTable.querySelector('.selected')) tfoTable.querySelector('.selected').classList.remove('selected');
    }

    btnShowAddTfo.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            showModal('Attenzione', 'Per favore, seleziona un Edificio Predisposto dalla tabella prima di aggiungere una TFO.', 'warning');
            return;
        }
        showTfoFormInternal('add');
    });

    btnModificaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            showModal('Attenzione', 'Per favore, seleziona un Edificio Predisposto dalla tabella da modificare.', 'warning');
            return;
        }
        formIndirizzo.value = selectedPredisposizioneRow.cells[1].textContent;
        formComune.value = selectedPredisposizioneRow.cells[2].textContent;
        formCodiceCatastale.value = selectedPredisposizioneRow.cells[3].textContent;
        formDataPredisposizione.value = selectedPredisposizioneRow.cells[4].textContent;
        formDbId.value = selectedPredisposizioneRow.dataset.id;
        formLatitudine.value = selectedPredisposizioneRow.dataset.lat || '';
        formLongitudine.value = selectedPredisposizioneRow.dataset.lon || '';
        formEdifcUso.value = ''; // O recuperare se possibile
        showModal('Info', "Modulo registrazione edifici pre-compilato. Modifica i dati e salva.", 'info');
        showSection(sectionEdifici, navEdifici);
    });

    btnEliminaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            showModal('Attenzione', 'Per favore, seleziona un Edificio Predisposto dalla tabella da eliminare.', 'warning');
            return;
        }

        showConfirmModal(
            'Conferma Eliminazione',
            'Sei sicuro di voler eliminare questa predisposizione e tutte le TFO associate? L\'azione è irreversibile.',
            () => { // Funzione da eseguire se l'utente conferma
                const predispoIdToDelete = selectedPredisposizioneRow.dataset.id;

                if (tfoDataStore[predispoIdToDelete]) {
                    delete tfoDataStore[predispoIdToDelete];
                    console.log(`TFOs per l'edificio ID ${predispoIdToDelete} eliminate dallo store.`);
                }

                if (typeof window.unmarkBuildingAsPredispostoOnMap === 'function') {
                    window.unmarkBuildingAsPredispostoOnMap(predispoIdToDelete);
                } else {
                    console.error("Funzione unmarkBuildingAsPredispostoOnMap non trovata.");
                }

                selectedPredisposizioneRow.remove();
                selectedPredisposizioneRow = null;

                // --- NUOVO: Aggiorna la visibilità dei pulsanti ---
                updateTfoButtonsVisibility();

                tfoTableBody.innerHTML = '';
                tfoTableContainer.querySelector('p').textContent = "Nessun edificio predisposto selezionato.";
                tfoTableContainer.querySelector('p').style.display = 'block';
                tfoTable.style.display = 'none';
                tfoActionButtons.style.display = 'none';
                tfoSectionTitle.textContent = 'Terminazioni Ottiche (TFO)';

                showModal('Successo', `Predisposizione edificio ID ${predispoIdToDelete} eliminata.`, 'success');
            }
        );
    });

    function clearTfoForm() {
        tfoForm.reset();
        formTfoRowIndex.value = '';
    }

    function showTfoFormInternal(mode = 'add', tfoDataToEdit = null, rowIndex = null) {
        clearTfoForm();
        const predispoId = selectedPredisposizioneRow.dataset.id;
        const predispoAddr = selectedPredisposizioneRow.dataset.indirizzo;
        const predispoLat = selectedPredisposizioneRow.dataset.lat;
        const predispoLon = selectedPredisposizioneRow.dataset.lon;
        const predispoCatasto = selectedPredisposizioneRow.dataset.codCatastale;

        selectedPredisposizioneIdInput.value = predispoId;
        formIndirizzoTfo.value = predispoAddr || '';
        formLatitudineTfo.value = predispoLat || '';
        formLongitudineTfo.value = predispoLon || '';
        formCodiceCatastaleTfo.value = predispoCatasto || '';

        if (mode === 'edit' && tfoDataToEdit) {
            formDataPredisposizioneTfo.value = tfoDataToEdit.dataPredTFO;
            formScalaTfo.value = tfoDataToEdit.scala;
            formPianoTfo.value = tfoDataToEdit.piano;
            formInternoTfo.value = tfoDataToEdit.interno;
            formIdOperatoreTfo.value = tfoDataToEdit.operatore;
            formCodiceTfo.value = tfoDataToEdit.codiceTfo;
            formCodiceRoeTfo.value = tfoDataToEdit.codiceRoe;
            formTfoRowIndex.value = rowIndex;
        }
        formTfoContainer.style.display = 'block';
    }

    btnAnnullaTfo.addEventListener('click', () => {
        formTfoContainer.style.display = 'none';
        clearTfoForm();
    });

    btnSalvaTfo.addEventListener('click', () => {
        const currentPredispoId = selectedPredisposizioneIdInput.value;
        if (!currentPredispoId) {
            showModal("Errore", "ID edificio predisposto non trovato.", 'error');
            return;
        }

        const tfoData = {
            dataPredTFO: formDataPredisposizioneTfo.value,
            scala: formScalaTfo.value,
            piano: formPianoTfo.value,
            interno: formInternoTfo.value,
            operatore: formIdOperatoreTfo.value,
            codiceTfo: formCodiceTfo.value,
            codiceRoe: formCodiceRoeTfo.value,
        };

        if (!tfoData.dataPredTFO || !tfoData.codiceTfo) {
             showModal("Attenzione", "Per favore, compila almeno Data Predisposizione TFO e Codice TFO.", 'warning');
            return;
        }

        const rowIndexToEdit = formTfoRowIndex.value;

        if (rowIndexToEdit !== '') {
            const tfoIndex = parseInt(rowIndexToEdit);
            tfoDataStore[currentPredispoId][tfoIndex] = tfoData;
            const row = tfoTableBody.rows[tfoIndex];
            row.cells[0].textContent = tfoData.scala;
            row.cells[1].textContent = tfoData.piano;
            row.cells[2].textContent = tfoData.interno;
            row.cells[3].textContent = tfoData.dataPredTFO;
            row.cells[4].textContent = tfoData.operatore;
            row.cells[5].textContent = tfoData.codiceTfo;
            row.cells[6].textContent = tfoData.codiceRoe;
            row.classList.remove('selected');
            selectedTfoRow = null;
        } else {
            const newIndex = tfoDataStore[currentPredispoId].length;
            addTfoToTable(tfoData, currentPredispoId, true, newIndex);
        }

        formTfoContainer.style.display = 'none';
        clearTfoForm();
        loadTfosForPredisposizione(currentPredispoId);
        showModal('Successo', 'TFO salvata!', 'success');
    });

    function addTfoToTable(data, predispoId, saveToStore = true, index) {
        if (saveToStore) {
            if (!tfoDataStore[predispoId]) {
                tfoDataStore[predispoId] = [];
            }
            if (index === tfoDataStore[predispoId].length) {
                tfoDataStore[predispoId].push(data);
            }
        }

        const newRow = tfoTableBody.insertRow();
        newRow.dataset.index = index;
        newRow.innerHTML = `
            <td>${data.scala}</td>
            <td>${data.piano}</td>
            <td>${data.interno}</td>
            <td>${data.dataPredTFO}</td>
            <td>${data.operatore}</td>
            <td>${data.codiceTfo}</td>
            <td>${data.codiceRoe}</td>
        `;
        tfoTableContainer.querySelector('p').style.display = 'none';
        tfoTable.style.display = '';
        tfoActionButtons.style.display = '';
    }

    tfoTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        if (selectedTfoRow) {
            selectedTfoRow.classList.remove('selected');
        }
        if (selectedTfoRow === row) {
            selectedTfoRow = null;
        } else {
            selectedTfoRow = row;
            selectedTfoRow.classList.add('selected');
        }
    });

    btnModificaTfo.addEventListener('click', () => {
        if (!selectedTfoRow) {
            showModal('Attenzione', 'Seleziona una riga TFO da modificare.', 'warning');
            return;
        }
        if (!selectedPredisposizioneRow) {
             showModal('Errore', 'Nessun edificio predisposto selezionato.', 'error');
            return;
        }
        const currentPredispoId = selectedPredisposizioneRow.dataset.id;
        const tfoIndex = parseInt(selectedTfoRow.dataset.index);

        if (isNaN(tfoIndex) || !tfoDataStore[currentPredispoId] || tfoIndex >= tfoDataStore[currentPredispoId].length) {
            console.error("Indice TFO non valido o dato non trovato:", tfoIndex, currentPredispoId);
            showModal("Errore", "Errore nel recupero dei dati TFO. Riprova.", 'error');
            return;
        }

        const tfoDataToEdit = tfoDataStore[currentPredispoId][tfoIndex];
        showTfoFormInternal('edit', tfoDataToEdit, tfoIndex);
    });

    btnEliminaTfo.addEventListener('click', () => {
        if (!selectedTfoRow) {
            showModal('Attenzione', 'Seleziona una riga TFO da eliminare.', 'warning');
            return;
        }
        if (!selectedPredisposizioneRow) {
            showModal('Errore', 'Nessun edificio predisposto selezionato.', 'error');
            return;
        }

        showConfirmModal(
            'Conferma Eliminazione TFO',
            'Sei sicuro di voler eliminare questa TFO?',
            () => {
                const currentPredispoId = selectedPredisposizioneRow.dataset.id;
                const tfoIndex = parseInt(selectedTfoRow.dataset.index);

                if (isNaN(tfoIndex) || !tfoDataStore[currentPredispoId] || tfoIndex >= tfoDataStore[currentPredispoId].length) {
                     console.error("Indice TFO non valido per eliminazione:", tfoIndex, currentPredispoId);
                     showModal("Errore", "Errore nell'eliminazione della TFO. Riprova.", 'error');
                     return;
                }

                tfoDataStore[currentPredispoId].splice(tfoIndex, 1);
                loadTfosForPredisposizione(currentPredispoId);
                showModal('Successo', 'TFO eliminata.', 'success');
            }
        );
    });
});
