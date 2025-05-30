let genericModalInstance = null;
let confirmModalInstance = null;
let confirmModalConfirmBtnEl = null; // Riferimento al bottone di conferma originale

/**
 * Mostra un modal generico per messaggi informativi, di avviso o di errore.
 * @param {string} title Titolo del modal.
 * @param {string} message Messaggio da visualizzare nel corpo del modal.
 * @param {string} type Tipo di messaggio ('info', 'success', 'warning', 'error') - attualmente non usato per styling.
 */
function showModal(title, message, type = 'info') {
    if (!genericModalInstance) {
        const genericModalElement = document.getElementById('genericModal');
        if (genericModalElement) {
            genericModalInstance = new bootstrap.Modal(genericModalElement);
        } else {
            console.error("Elemento modal generico '#genericModal' non trovato nel DOM!");
            alert(`${title}: ${message}`); // Fallback ad alert se il modal non è inizializzabile
            return;
        }
    }
    document.getElementById('genericModalTitle').textContent = title;
    document.getElementById('genericModalBody').textContent = message;
    genericModalInstance.show();
}

/**
 * Mostra un modal di conferma con opzioni "Conferma" e "Annulla".
 * @param {string} title Titolo del modal di conferma.
 * @param {string} message Messaggio di richiesta conferma.
 * @param {function} confirmCallback Funzione da eseguire se l'utente clicca "Conferma".
 */
function showConfirmModal(title, message, confirmCallback) {
    if (!confirmModalInstance) {
        const confirmModalElement = document.getElementById('confirmModal');
        if (confirmModalElement) {
            confirmModalInstance = new bootstrap.Modal(confirmModalElement);
            confirmModalConfirmBtnEl = document.getElementById('confirmModalConfirmBtn');
        } else {
            console.error("Elemento modal di conferma '#confirmModal' non trovato nel DOM!");
            // Fallback a confirm() nativo se il modal non è inizializzabile
            if (confirm(`${title}\n${message}`)) {
                confirmCallback();
            }
            return;
        }
    }

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').textContent = message;

    // Gestione evento click sul bottone di conferma.
    // Rimuovi listener precedenti e aggiungi quello nuovo per evitare esecuzioni multiple.
    // Clonare il bottone è un modo robusto per rimuovere tutti gli event listener.
    if (confirmModalConfirmBtnEl) {
        const newConfirmBtn = confirmModalConfirmBtnEl.cloneNode(true);
        confirmModalConfirmBtnEl.parentNode.replaceChild(newConfirmBtn, confirmModalConfirmBtnEl);
        confirmModalConfirmBtnEl = newConfirmBtn;

        confirmModalConfirmBtnEl.addEventListener('click', function handleConfirm() {
            confirmModalInstance.hide();
            confirmCallback();
        }, { once: true }); // Assicura che l'evento sia gestito solo una volta
    }
    
    confirmModalInstance.show();
}