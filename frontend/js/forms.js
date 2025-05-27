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


    // --- Inizializzazione Mappa ---
    if (typeof initMap === 'function') {
        initMap(); // map_logic.js
    } else {
        console.error("La funzione initMap() non è stata trovata.");
    }
    console.log("Applicazione Frontend Inizializzata.");

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
                alert('Per favore, seleziona un edificio dalla mappa prima di salvare la predisposizione.');
                return;
            }
            if (!dataPred) {
                alert('Per favore, inserisci la Data di Predisposizione.');
                return;
            }
            if (!indirizzo) {
                alert('Indirizzo mancante.');
                return;
            }
            if (!comune) {
                alert('Comune mancante.');
                return;
            }

            const uniqueId = dbId || objectId;
            const existingRow = document.querySelector(`#predisposizioniTableBody tr[data-id="${uniqueId}"]`);
            if (existingRow) {
                alert('Questo edificio è già stato registrato come predisposto.');
                return;
            }

            const predisposizioneData = {
                id: uniqueId,
                indirizzo: indirizzo,
                lat: lat,
                lon: lon,
                comune: comune,
                codCatastale: codCatastale,
                dataPred: dataPred,
            };

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

            alert(`Edificio ID: ${predisposizioneData.id} registrato come predisposto e aggiunto alla tabella.`);
            buildingForm.reset();
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
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella prima di aggiungere una TFO.');
            return;
        }
        showTfoFormInternal('add');
    });

    btnModificaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella da modificare.');
            return;
        }
        formIndirizzo.value = selectedPredisposizioneRow.cells[1].textContent;
        formComune.value = selectedPredisposizioneRow.cells[2].textContent;
        formCodiceCatastale.value = selectedPredisposizioneRow.cells[3].textContent;
        formDataPredisposizione.value = selectedPredisposizioneRow.cells[4].textContent;
        formDbId.value = selectedPredisposizioneRow.dataset.id;
        formLatitudine.value = selectedPredisposizioneRow.dataset.lat || '';
        formLongitudine.value = selectedPredisposizioneRow.dataset.lon || '';
        alert("Modulo registrazione edifici pre-compilato. Modifica i dati e salva.");
        showSection(sectionEdifici, navEdifici);
    });

    btnEliminaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella da eliminare.');
            return;
        }
        if (confirm('Sei sicuro di voler eliminare questa predisposizione e tutte le TFO associate? L\'azione è irreversibile.')) {
            const predispoIdToDelete = selectedPredisposizioneRow.dataset.id;

            if (tfoDataStore[predispoIdToDelete]) {
                delete tfoDataStore[predispoIdToDelete];
                console.log(`TFOs per l'edificio ID ${predispoIdToDelete} eliminate dallo store.`);
            }

            // --- MODIFICATO: Chiama la funzione per aggiornare la mappa ---
            if (typeof window.unmarkBuildingAsPredispostoOnMap === 'function') {
                window.unmarkBuildingAsPredispostoOnMap(predispoIdToDelete);
            } else {
                console.error("Funzione unmarkBuildingAsPredispostoOnMap non trovata.");
            }
            // --- FINE MODIFICA ---

            selectedPredisposizioneRow.remove();
            selectedPredisposizioneRow = null;

            tfoTableBody.innerHTML = '';
            tfoTableContainer.querySelector('p').textContent = "Nessun edificio predisposto selezionato.";
            tfoTableContainer.querySelector('p').style.display = 'block';
            tfoTable.style.display = 'none';
            tfoActionButtons.style.display = 'none';
            tfoSectionTitle.textContent = 'Terminazioni Ottiche (TFO)';

            alert(`Predisposizione edificio ID ${predispoIdToDelete} eliminata.`);
        }
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
            alert("Errore: ID edificio predisposto non trovato.");
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
            alert("Per favore, compila almeno Data Predisposizione TFO e Codice TFO.");
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
        alert('TFO salvata!');
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
            alert('Seleziona una riga TFO da modificare.');
            return;
        }
        if (!selectedPredisposizioneRow) {
            alert('Nessun edificio predisposto selezionato.');
            return;
        }
        const currentPredispoId = selectedPredisposizioneRow.dataset.id;
        const tfoIndex = parseInt(selectedTfoRow.dataset.index);

        if (isNaN(tfoIndex) || !tfoDataStore[currentPredispoId] || tfoIndex >= tfoDataStore[currentPredispoId].length) {
            console.error("Indice TFO non valido o dato non trovato:", tfoIndex, currentPredispoId);
            alert("Errore nel recupero dei dati TFO. Riprova.");
            return;
        }

        const tfoDataToEdit = tfoDataStore[currentPredispoId][tfoIndex];
        showTfoFormInternal('edit', tfoDataToEdit, tfoIndex);
    });

    btnEliminaTfo.addEventListener('click', () => {
        if (!selectedTfoRow) {
            alert('Seleziona una riga TFO da eliminare.');
            return;
        }
        if (!selectedPredisposizioneRow) {
            alert('Nessun edificio predisposto selezionato.');
            return;
        }

        if (confirm('Sei sicuro di voler eliminare questa TFO?')) {
            const currentPredispoId = selectedPredisposizioneRow.dataset.id;
            const tfoIndex = parseInt(selectedTfoRow.dataset.index);

            if (isNaN(tfoIndex) || !tfoDataStore[currentPredispoId] || tfoIndex >= tfoDataStore[currentPredispoId].length) {
                 console.error("Indice TFO non valido per eliminazione:", tfoIndex, currentPredispoId);
                 alert("Errore nell'eliminazione della TFO. Riprova.");
                 return;
            }

            tfoDataStore[currentPredispoId].splice(tfoIndex, 1);
            loadTfosForPredisposizione(currentPredispoId);
        }
    });
});
