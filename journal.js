document.addEventListener('DOMContentLoaded', function() {
    const entriesContainer = document.getElementById('entries-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const exportPdfButton = document.getElementById('export-pdf');

    let allEntries = [];
    let currentPage = 1;
    const entriesPerPage = 20;

    // Load entries and display first page
    loadEntries();

    // Set theme based on time of day
    setTheme();

    // Search functionality
    searchButton.addEventListener('click', performSearch);

    // Pagination
    prevPageButton.addEventListener('click', () => changePage(-1));
    nextPageButton.addEventListener('click', () => changePage(1));

    // Export to PDF
    exportPdfButton.addEventListener('click', exportToPdf);

    function loadEntries() {
        chrome.storage.sync.get(['entries'], function(result) {
            allEntries = result.entries || [];
            displayEntries(allEntries);
            updateStats();
        });
    }

    function displayEntries(entries) {
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = startIndex + entriesPerPage;
        const pageEntries = entries.slice(startIndex, endIndex);

        entriesContainer.innerHTML = '';
        pageEntries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.classList.add('entry');
            entryElement.innerHTML = `
                <p><strong>${new Date(entry.date).toLocaleDateString()}</strong></p>
                <p>${entry.entry}</p>
                ${entry.mood ? `<p>Mood: ${entry.mood}</p>` : ''}
            `;
            entriesContainer.appendChild(entryElement);
        });

        updatePagination(entries.length);
    }

    function updatePagination(totalEntries) {
        const totalPages = Math.ceil(totalEntries / entriesPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    function changePage(direction) {
        currentPage += direction;
        displayEntries(allEntries);
    }

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredEntries = allEntries.filter(entry => 
            entry.entry.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayEntries(filteredEntries);
    }

    function updateStats() {
        document.getElementById('total-entries').textContent = allEntries.length;
        // Implement longest streak and average mood calculations
    }

    function exportToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yOffset = 10;

        allEntries.forEach((entry, index) => {
            if (yOffset > 280) {
                doc.addPage();
                yOffset = 10;
            }

            doc.setFontSize(12);
            doc.text(new Date(entry.date).toLocaleDateString(), 10, yOffset);
            yOffset += 10;

            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(entry.entry, 190);
            doc.text(splitText, 10, yOffset);
            yOffset += splitText.length * 5 + 10;
        });

        doc.save('gratitude_journal.pdf');
    }
});