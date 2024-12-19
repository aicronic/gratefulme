document.addEventListener('DOMContentLoaded', async function() {
    const elements = {
        entriesContainer: document.getElementById('entries-container'),
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        prevPageButton: document.getElementById('prev-page'),
        nextPageButton: document.getElementById('next-page'),
        pageInfo: document.getElementById('page-info'),
        exportPdfButton: document.getElementById('export-pdf'),
        totalEntries: document.getElementById('total-entries'),
        longestStreak: document.getElementById('longest-streak'),
        averageMood: document.getElementById('average-mood'),
        deleteAll: document.getElementById('delete-all')
    };

    let currentPage = 1;
    const entriesPerPage = 20;
    let allEntries = [];

    // Load entries and display first page
    await loadEntries();

    // Search functionality
    elements.searchButton.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Pagination
    elements.prevPageButton.addEventListener('click', () => changePage(-1));
    elements.nextPageButton.addEventListener('click', () => changePage(1));

    // Export to PDF
    if (elements.exportPdfButton) {
        elements.exportPdfButton.addEventListener('click', exportToPdf);
    }

    async function loadEntries() {
        allEntries = await appUtils.storage.getEntries();
        displayEntries(allEntries);
        updateStats();
    }

    function displayEntries(entries) {
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = startIndex + entriesPerPage;
        const pageEntries = entries.slice(startIndex, endIndex);

        elements.entriesContainer.innerHTML = '';
        pageEntries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.classList.add('entry');
            entryElement.innerHTML = `
                <button class="delete-entry" data-date="${entry.date}" title="Delete entry">×</button>
                <p><strong>${appUtils.date.formatDate(entry.date)}</strong></p>
                <p>${entry.entry}</p>
                ${entry.mood ? `<p>Mood: ${entry.mood}</p>` : ''}
            `;
            elements.entriesContainer.appendChild(entryElement);

            // Add delete event listener
            const deleteBtn = entryElement.querySelector('.delete-entry');
            deleteBtn.addEventListener('click', () => deleteEntry(entry.date));
        });

        updatePagination(entries.length);
    }

    function updatePagination(totalEntries) {
        const totalPages = Math.ceil(totalEntries / entriesPerPage);
        elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        elements.prevPageButton.disabled = currentPage === 1;
        elements.nextPageButton.disabled = currentPage === totalPages;
    }

    function changePage(direction) {
        currentPage += direction;
        displayEntries(allEntries);
    }

    function performSearch() {
        const searchTerm = elements.searchInput.value.toLowerCase();
        const filteredEntries = allEntries.filter(entry =>
            entry.entry.toLowerCase().includes(searchTerm) ||
            (entry.mood && entry.mood.toLowerCase().includes(searchTerm))
        );
        currentPage = 1;
        displayEntries(filteredEntries);
    }

    async function updateStats() {
        if (!elements.totalEntries || !elements.longestStreak || !elements.averageMood) return;

        // Update total entries
        elements.totalEntries.textContent = allEntries.length;

        // Calculate longest streak
        const { streak = 0 } = await appUtils.storage.get(['streak']);
        elements.longestStreak.textContent = streak;

        // Calculate average mood
        const moodEntries = allEntries.filter(entry => entry.mood);
        if (moodEntries.length > 0) {
            const moodCounts = moodEntries.reduce((acc, entry) => {
                acc[entry.mood] = (acc[entry.mood] || 0) + 1;
                return acc;
            }, {});
            const topMood = Object.entries(moodCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
            elements.averageMood.textContent = topMood;
        } else {
            elements.averageMood.textContent = 'No mood data';
        }
    }

    // Delete single entry
    async function deleteEntry(date) {
        try {
            // Remove the entry from storage
            allEntries = allEntries.filter(entry => entry.date !== date);
            await appUtils.storage.set({ entries: allEntries });
            
            // Refresh the display
            displayEntries(allEntries);
            updateStats();
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete entry. Please try again.');
        }
    }

    // Delete all entries
    async function deleteAllEntries() {
        try {
            // Clear all entries
            allEntries = [];
            await appUtils.storage.set({ entries: [] });
            
            // Reset streak
            await appUtils.storage.set({ streak: 0 });
            
            // Refresh the display
            displayEntries(allEntries);
            updateStats();
            
            // Hide the modal
            document.getElementById('delete-modal').style.display = 'none';
        } catch (error) {
            console.error('Error deleting all entries:', error);
            alert('Failed to delete all entries. Please try again.');
        }
    }

    // Set up delete all functionality
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = deleteModal.querySelector('.confirm-delete');
    const cancelDeleteBtn = deleteModal.querySelector('.cancel-delete');

    elements.deleteAll.addEventListener('click', () => {
        deleteModal.style.display = 'flex';
    });

    confirmDeleteBtn.addEventListener('click', deleteAllEntries);

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    // Close modal when clicking outside
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });

    // Export to PDF with dynamic loading of jsPDF
    async function exportToPdf() {
        try {
            const exportButton = elements.exportPdfButton;
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
            let yPos = 20;
            
            // Set theme colors
            const themeColors = {
                primary: '#9C27B0',    // Main purple color
                secondary: '#E91E63',   // Pink accent
                text: '#4A0E4E',       // Dark purple text
                accent: '#7B1FA2'       // Secondary purple
            };

            // Mood mapping
            const moodMapping = {
                '😊': 'Happy',
                '😌': 'Content',
                '😔': 'Sad',
                '😤': 'Frustrated',
                '😴': 'Tired'
            };

            // Title styling
            doc.setFontSize(24);
            doc.setTextColor(themeColors.primary);
            doc.text('Gratitude Journal', 105, yPos, { align: 'center' });
            
            allEntries.forEach((entry) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                const date = appUtils.date.formatDate(entry.date);
                
                // Date styling
                doc.setFontSize(14);
                doc.setTextColor(themeColors.secondary);
                doc.setFont(undefined, 'bold');
                yPos += 10;
                doc.text(date, 20, yPos);
                
                // Entry text styling
                doc.setFontSize(12);
                doc.setTextColor(themeColors.text);
                doc.setFont(undefined, 'normal');
                
                const lines = doc.splitTextToSize(entry.entry, 170);
                yPos += 7;
                doc.text(lines, 20, yPos);
                yPos += (lines.length * 7) + 5;
                
                if (entry.mood) {
                    // Convert emoji to text using mapping
                    const moodText = moodMapping[entry.mood] || 'Unknown';
                    
                    // Mood styling
                    doc.setTextColor(themeColors.accent);
                    doc.setFont(undefined, 'italic');
                    doc.text(`Mood: ${moodText}`, 20, yPos);
                    yPos += 10;
                }
            });
            
            // Save the PDF
            doc.save('gratitude-journal.pdf');
            
            // Reset button state
            exportButton.disabled = false;
            exportButton.textContent = 'Export to PDF';
        } catch (error) {
            console.error('Error generating PDF:', error);
            const exportButton = elements.exportPdfButton;
            exportButton.disabled = false;
            exportButton.textContent = 'Export Failed - Try Again';
            
            // Show error to user
            alert('Failed to generate PDF. Please try again. If the problem persists, check your internet connection.');
        }
    }
});