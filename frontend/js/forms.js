document.addEventListener('DOMContentLoaded', function() {
    // --- Variabili Globali per le sezioni ---
    const navEdifici = document.getElementById('navEdifici');
    const navTfo = document.getElementById('navTfo');
    const sectionEdifici = document.getElementById('sectionEdifici');
    const sectionTfo = document.getElementById('sectionTfo');

    // --- Variabili Sezione Edifici ---
    const buildingForm = document.getElementById('buildingForm');
    const btnSalvaPredisposizione = document.getElementById('btnSalvaPredisposizione');
    // Input del form edificio (per pre-popolare tabella predisposizioni)
    const formIndirizzo = document.getElementById('formIndirizzo');
    const formLatitudine = document.getElementById('formLatitudine');
    const formLongitudine = document.getElementById('formLongitudine');
    const formDbId = document.getElementById('formDbId'); // Usato come ID univoco per la predisposizione
    const formObjectId = document.getElementById('formObjectId');
    const formComune = document.getElementById('formComune');
    const formCodiceCatastale = document.getElementById('formCodiceCatastale');
    // const formTipoEdificioSelect = document.getElementById('formTipoEdificioSelect'); // RIMOSSO
    const formDataPredisposizione = document.getElementById('formDataPredisposizione');


    // --- Variabili Sezione TFO ---
    // Gruppo Superiore
    const predisposizioniTableBody = document.getElementById('predisposizioniTableBody');
    const btnShowAddTfo = document.getElementById('btnShowAddTfo'); // Mostra il form per aggiungere TFO
    const btnModificaPredisposizione = document.getElementById('btnModificaPredisposizione'); // NUOVO
    const btnEliminaPredisposizione = document.getElementById('btnEliminaPredisposizione'); // NUOVO
    let selectedPredisposizioneRow = null; // Riga selezionata nella tabella predisposizioni

    // Gruppo Inferiore
    const tfoSectionTitle = document.getElementById('tfoSectionTitle');
    const formTfoContainer = document.getElementById('formTfoContainer');
    const tfoForm = document.getElementById('tfoForm');
    // const formTfoTitle = document.getElementById('formTfoTitle'); // RIMOSSO
    const selectedPredisposizioneIdInput = document.getElementById('selectedPredisposizioneId'); // Hidden input
    // Campi del form TFO da pre-popolare/leggere
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
    const formTfoRowIndex = document.getElementById('formTfoRowIndex'); // Per modifica TFO

    const btnSalvaTfo = document.getElementById('btnSalvaTfo');
    const btnAnnullaTfo = document.getElementById('btnAnnullaTfo');

    const tfoTableContainer = document.getElementById('tfoTableContainer');
    const tfoTable = document.getElementById('tfoTable');
    const tfoTableBody = document.getElementById('tfoTableBody');
    const tfoActionButtons = document.getElementById('tfoActionButtons');
    const btnModificaTfo = document.getElementById('btnModificaTfo');
    const btnEliminaTfo = document.getElementById('btnEliminaTfo');
    let selectedTfoRow = null; // Riga selezionata nella tabella TFO

    let tfoDataStore = {}; // Oggetto per memorizzare TFO per ID predisposizione: { "predispoId1": [tfo1, tfo2], ... }


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
                setTimeout(() => map.invalidateSize(), 0); // Invalida la mappa quando la sezione edifici è mostrata
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
    
    showSection(sectionEdifici, navEdifici); // Mostra la sezione edifici di default

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
            // const tipoEdificio = formTipoEdificioSelect.value; // RIMOSSO
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

            // Controllo se la predisposizione esiste già per evitare duplicati
            const existingRow = document.querySelector(`#predisposizioniTableBody tr[data-id="${dbId || objectId}"]`);
            if (existingRow) {
                alert('Questo edificio è già stato registrato come predisposto.');
                return;
            }


            const predisposizioneData = {
                id: dbId || objectId, // Usa dbId o objectId come identificativo univoco
                indirizzo: indirizzo,
                lat: lat,
                lon: lon,
                comune: comune,
                codCatastale: codCatastale,
                // tipoEdificio: tipoEdificio, // RIMOSSO
                dataPred: dataPred,
            };

            // Aggiungi alla tabella predisposizioni
            const newRow = predisposizioniTableBody.insertRow();
            newRow.dataset.id = predisposizioneData.id;
            newRow.dataset.indirizzo = predisposizioneData.indirizzo;
            newRow.dataset.lat = predisposizioneData.lat;
            newRow.dataset.lon = predisposizioneData.lon;
            newRow.dataset.codCatastale = predisposizioneData.codCatastale;
            
            // MODIFICATO: Rimossa cella per tipo edificio
            newRow.innerHTML = `
                <td>${predisposizioneData.id}</td>
                <td>${predisposizioneData.indirizzo}</td>
                <td>${predisposizioneData.comune}</td>
                <td>${predisposizioneData.codCatastale}</td>
                <td>${predisposizioneData.dataPred}</td>
            `;
            
            // Inizializza lo store per le TFO di questa predisposizione se non esiste
            if (!tfoDataStore[predisposizioneData.id]) {
                tfoDataStore[predisposizioneData.id] = [];
            }

            alert(`Edificio ID: ${predisposizioneData.id} registrato come predisposto e aggiunto alla tabella.`);
            buildingForm.reset(); // Pulisci il form edifici
        });
    }

    // --- Logica Sezione Lista TFO ---

    // Selezione riga nella tabella predisposizioni
    predisposizioniTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        if (selectedPredisposizioneRow) {
            selectedPredisposizioneRow.classList.remove('selected');
        }
        if (selectedPredisposizioneRow === row) { // Deseleziona se clicchi la stessa riga
            selectedPredisposizioneRow = null;
            tfoTableContainer.querySelector('p').textContent = "Nessun edificio predisposto selezionato.";
            tfoTable.style.display = 'none';
            tfoActionButtons.style.display = 'none';
            tfoTableBody.innerHTML = ''; // Pulisci tabella TFO
            formTfoContainer.style.display = 'none'; // Nascondi form TFO
            tfoSectionTitle.textContent = 'Terminazioni Ottiche (TFO)';
        } else {
            selectedPredisposizioneRow = row;
            selectedPredisposizioneRow.classList.add('selected');
            const predispoId = selectedPredisposizioneRow.dataset.id;
            const predispoAddr = selectedPredisposizioneRow.dataset.indirizzo;
            tfoSectionTitle.textContent = `Terminazioni Ottiche (TFO) per: ${predispoAddr || predispoId}`;
            
            loadTfosForPredisposizione(predispoId);
            formTfoContainer.style.display = 'none'; // Nascondi form TFO se era aperto
        }
    });

    function loadTfosForPredisposizione(predispoId) {
        tfoTableBody.innerHTML = ''; // Pulisci la tabella TFO
        const tfos = tfoDataStore[predispoId] || [];

        if (tfos.length > 0) {
            tfos.forEach((data, index) => addTfoToTable(data, predispoId, false, index)); // Aggiungi index per modifica
            tfoTableContainer.querySelector('p').style.display = 'none';
            tfoTable.style.display = '';
            tfoActionButtons.style.display = '';
        } else {
            tfoTableContainer.querySelector('p').textContent = "Nessuna TFO ancora inserita per l'edificio selezionato.";
            tfoTableContainer.querySelector('p').style.display = 'block';
            tfoTable.style.display = 'none';
            tfoActionButtons.style.display = 'none';
        }
        selectedTfoRow = null; // Deseleziona qualsiasi TFO precedente
        if(tfoTable.querySelector('.selected')) tfoTable.querySelector('.selected').classList.remove('selected');
    }
    
    // Mostra il form per "Aggiungi TFO"
    btnShowAddTfo.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella prima di aggiungere una TFO.');
            return;
        }
        showTfoFormInternal('add');
    });

    // NUOVO: Event Listener per "Modifica Predisposizione"
    btnModificaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella da modificare.');
            return;
        }
        // Popola il form edifici con i dati della riga selezionata
        formIndirizzo.value = selectedPredisposizioneRow.cells[1].textContent;
        formComune.value = selectedPredisposizioneRow.cells[2].textContent;
        formCodiceCatastale.value = selectedPredisposizioneRow.cells[3].textContent;
        // formTipoEdificioSelect.value = selectedPredisposizioneRow.cells[4].textContent; // RIMOSSO
        formDataPredisposizione.value = selectedPredisposizioneRow.cells[4].textContent; // MODIFICATO Indice
        
        // Recupera gli altri dati necessari se li hai salvati nei dataset della riga
        formDbId.value = selectedPredisposizioneRow.dataset.id;
        formLatitudine.value = selectedPredisposizioneRow.dataset.lat || '';
        formLongitudine.value = selectedPredisposizioneRow.dataset.lon || '';
        // objectId e edifc_uso potrebbero non essere direttamente nella tabella predisposizioni
        // Potresti doverli recuperare da un data store se necessario per la modifica
        
        alert("Modulo registrazione edifici pre-compilato. Modifica i dati e salva.");
        showSection(sectionEdifici, navEdifici); // Vai alla sezione edifici
        // Dovrai modificare la logica di btnSalvaPredisposizione per GESTIRE L'UPDATE
        // invece di creare sempre una nuova riga.
    });

    // NUOVO: Event Listener per "Elimina Predisposizione"
    btnEliminaPredisposizione.addEventListener('click', () => {
        if (!selectedPredisposizioneRow) {
            alert('Per favore, seleziona un Edificio Predisposto dalla tabella da eliminare.');
            return;
        }
        if (confirm('Sei sicuro di voler eliminare questa predisposizione e tutte le TFO associate? L\'azione è irreversibile.')) {
            const predispoIdToDelete = selectedPredisposizioneRow.dataset.id;
            
            // Rimuovi dallo store TFO
            if (tfoDataStore[predispoIdToDelete]) {
                delete tfoDataStore[predispoIdToDelete];
                console.log(`TFOs per l'edificio ID ${predispoIdToDelete} eliminate dallo store.`);
            }
            
            // Rimuovi la riga dalla tabella predisposizioni
            selectedPredisposizioneRow.remove();
            selectedPredisposizioneRow = null;
            
            // Pulisci la tabella TFO se quella eliminata era visualizzata
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
        formTfoRowIndex.value = ''; // Per la modifica
    }

    function showTfoFormInternal(mode = 'add', tfoDataToEdit = null, rowIndex = null) {
        clearTfoForm();
        const predispoId = selectedPredisposizioneRow.dataset.id;
        const predispoAddr = selectedPredisposizioneRow.dataset.indirizzo;
        const predispoLat = selectedPredisposizioneRow.dataset.lat;
        const predispoLon = selectedPredisposizioneRow.dataset.lon;
        const predispoCatasto = selectedPredisposizioneRow.dataset.codCatastale;

        selectedPredisposizioneIdInput.value = predispoId; // Imposta l'ID della predisposizione
        formIndirizzoTfo.value = predispoAddr || '';
        formLatitudineTfo.value = predispoLat || '';
        formLongitudineTfo.value = predispoLon || '';
        formCodiceCatastaleTfo.value = predispoCatasto || '';

        if (mode === 'edit' && tfoDataToEdit) {
            // formTfoTitle.textContent = 'Modifica TFO'; // RIMOSSO
            formDataPredisposizioneTfo.value = tfoDataToEdit.dataPredTFO;
            formScalaTfo.value = tfoDataToEdit.scala;
            formPianoTfo.value = tfoDataToEdit.piano;
            formInternoTfo.value = tfoDataToEdit.interno;
            formIdOperatoreTfo.value = tfoDataToEdit.operatore;
            formCodiceTfo.value = tfoDataToEdit.codiceTfo;
            formCodiceRoeTfo.value = tfoDataToEdit.codiceRoe;
            formTfoRowIndex.value = rowIndex; // Imposta l'indice per la modifica
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
            // Non più indirizzo, lat, lon, catastale TFO perché presi da predisposizione
            dataPredTFO: formDataPredisposizioneTfo.value,
            scala: formScalaTfo.value,
            piano: formPianoTfo.value,
            interno: formInternoTfo.value,
            operatore: formIdOperatoreTfo.value,
            codiceTfo: formCodiceTfo.value,
            codiceRoe: formCodiceRoeTfo.value,
        };
        
        // Validazione base
        if (!tfoData.dataPredTFO || !tfoData.codiceTfo) {
            alert("Per favore, compila almeno Data Predisposizione TFO e Codice TFO.");
            return;
        }

        const rowIndexToEdit = formTfoRowIndex.value;

        if (rowIndexToEdit !== '') { // Modalità Modifica
            const tfoIndex = parseInt(rowIndexToEdit);
            tfoDataStore[currentPredispoId][tfoIndex] = tfoData; // Aggiorna nello store
            // Aggiorna la riga nella tabella
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
        } else { // Modalità Aggiungi
             // Aggiungi e ottieni l'indice
            const newIndex = tfoDataStore[currentPredispoId].length;
            addTfoToTable(tfoData, currentPredispoId, true, newIndex); // true per salvare, passa indice
        }

        formTfoContainer.style.display = 'none';
        clearTfoForm();
        
        // Ricarica la tabella per riflettere le modifiche/aggiunte
        loadTfosForPredisposizione(currentPredispoId); // Ricarica tutta la tabella TFO

        alert('TFO salvata!');
    });

    function addTfoToTable(data, predispoId, saveToStore = true, index) {
            if (saveToStore) {
                if (!tfoDataStore[predispoId]) {
                    tfoDataStore[predispoId] = [];
                }
                // Se non è modifica, aggiungi; se è modifica, è già stato aggiornato
                if (index === tfoDataStore[predispoId].length) {
                    tfoDataStore[predispoId].push(data);
                }
            }

        const newRow = tfoTableBody.insertRow();
        newRow.dataset.index = index; // Salva l'indice nella riga
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
    
    // Selezione riga Tabella TFO
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
        if (!selectedPredisposizioneRow) { // Controllo di sicurezza
            alert('Nessun edificio predisposto selezionato.');
            return;
        }
        const currentPredispoId = selectedPredisposizioneRow.dataset.id;
        const tfoIndex = parseInt(selectedTfoRow.dataset.index); // Usa l'indice salvato
        
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
            if (!selectedPredisposizioneRow) { // Controllo di sicurezza
            alert('Nessun edificio predisposto selezionato.');
            return;
        }

        if (confirm('Sei sicuro di voler eliminare questa TFO?')) {
            const currentPredispoId = selectedPredisposizioneRow.dataset.id;
            const tfoIndex = parseInt(selectedTfoRow.dataset.index); // Usa l'indice salvato

            if (isNaN(tfoIndex) || !tfoDataStore[currentPredispoId] || tfoIndex >= tfoDataStore[currentPredispoId].length) {
                 console.error("Indice TFO non valido per eliminazione:", tfoIndex, currentPredispoId);
                 alert("Errore nell'eliminazione della TFO. Riprova.");
                 return;
            }
            
            tfoDataStore[currentPredispoId].splice(tfoIndex, 1); // Rimuovi dallo store
            loadTfosForPredisposizione(currentPredispoId); // Ricarica la tabella
        }
    });
});