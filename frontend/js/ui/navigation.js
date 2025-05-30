// Riferimenti agli elementi DOM della navigazione e delle sezioni
const navEdificiLink = document.getElementById('navEdifici');
const navTfoLink = document.getElementById('navTfo');
const sectionEdificiDiv = document.getElementById('sectionEdifici');
const sectionTfoDiv = document.getElementById('sectionTfo');
const formTfoContainerDiv = document.getElementById('formTfoContainer'); // Per nasconderlo al cambio sezione

/**
 * Mostra una sezione specifica dell'applicazione e nasconde le altre.
 * Attiva il link di navigazione corrispondente.
 * @param {HTMLElement} sectionToShow Elemento della sezione da mostrare.
 * @param {HTMLElement} navLinkToActivate Elemento del link di navigazione da marcare come attivo.
 */
function showSection(sectionToShow, navLinkToActivate) {
    // Nascondi tutte le sezioni principali
    if (sectionEdificiDiv) sectionEdificiDiv.style.display = 'none';
    if (sectionTfoDiv) sectionTfoDiv.style.display = 'none';

    // Rimuovi la classe 'active' da tutti i link di navigazione principali
    if (navEdificiLink) navEdificiLink.classList.remove('active');
    if (navTfoLink) navTfoLink.classList.remove('active');

    // Mostra la sezione richiesta e attiva il link corrispondente
    if (sectionToShow) sectionToShow.style.display = 'block';
    if (navLinkToActivate) navLinkToActivate.classList.add('active');

    // Nascondi il form TFO quando si cambia sezione, a meno che non si vada alla sezione TFO
    // e una predisposizione sia già selezionata (logica gestita in predisposizioniTable.js)
    if (formTfoContainerDiv && sectionToShow !== sectionTfoDiv) {
        formTfoContainerDiv.style.display = 'none';
    }

    // Se la sezione Edifici viene mostrata, e la mappa esiste, invalida la sua dimensione
    // per assicurare il corretto rendering dopo essere stata nascosta.
    if (sectionToShow === sectionEdificiDiv && window.mapContext && window.mapContext.mapInstance && typeof window.mapContext.mapInstance.invalidateSize === 'function') {
        setTimeout(() => window.mapContext.mapInstance.invalidateSize(), 0);
    }

    // Se la sezione TFO viene mostrata, carica (o ricarica) la tabella delle predisposizioni
    if (sectionToShow === sectionTfoDiv && typeof loadPredisposizioni === 'function') {
         loadPredisposizioni(); // Assumendo che loadPredisposizioni sia definita in predisposizioniTable.js
    }
}


function setupNavigation() {
    if (navEdificiLink) {
        navEdificiLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(sectionEdificiDiv, navEdificiLink);
        });
    }

    if (navTfoLink) {
        navTfoLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(sectionTfoDiv, navTfoLink);
        });
    }
    
    // Mostra la sezione edifici di default all'avvio
    showSection(sectionEdificiDiv, navEdificiLink);
    console.log("Navigazione inizializzata.");
}