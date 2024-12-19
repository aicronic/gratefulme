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

    async function exportToPdf() {
        try {
            const exportButton = document.getElementById('export-pdf');
            exportButton.disabled = true;
            exportButton.textContent = 'Preparing PDF...';

            // Dynamically load jsPDF only when needed
            if (typeof window.jspdf === 'undefined') {
                const script = document.createElement('script');
                script.src = 'jspdf.umd.min.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load PDF generator'));
                    document.head.appendChild(script);
                });
            }

            // Wait a brief moment to ensure jsPDF is fully initialized
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create new PDF document
            const doc = new window.jspdf.jsPDF();
            
            // Get all entries for export
            chrome.storage.sync.get(['entries'], function(result) {
                const entries = result.entries || [];
                let yPos = 20;
                
                doc.setFontSize(20);
                doc.text('Gratitude Journal', 105, yPos, { align: 'center' });
                doc.setFontSize(12);
                
                entries.forEach((entry, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    const date = new Date(entry.date).toLocaleDateString();
                    doc.setFont(undefined, 'bold');
                    yPos += 10;
                    doc.text(date, 20, yPos);
                    doc.setFont(undefined, 'normal');
                    
                    // Split long entries into multiple lines
                    const lines = doc.splitTextToSize(entry.entry, 170);
                    yPos += 7;
                    doc.text(lines, 20, yPos);
                    yPos += (lines.length * 7) + 5;
                    
                    if (entry.mood) {
                        doc.text(`Mood: ${entry.mood}`, 20, yPos);
                        yPos += 10;
                    }
                });
                
                // Save the PDF
                doc.save('gratitude-journal.pdf');
                
                // Reset button state
                exportButton.disabled = false;
                exportButton.textContent = 'Export to PDF';
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            const exportButton = document.getElementById('export-pdf');
            exportButton.disabled = false;
            exportButton.textContent = 'Export Failed - Try Again';
            
            // Show error to user
            alert('Failed to generate PDF. Please try again. If the problem persists, check your internet connection.');
        }
    }
});