// Theme Management
function setTheme() {
    const currentHour = new Date().getHours();
    // Remove any existing theme classes
    document.body.classList.remove('light-theme', 'dark-theme');
    
    // Add appropriate theme class
    if (currentHour >= 19 || currentHour < 7) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

// Font Management
function applyFont() {
    chrome.storage.sync.get(['font'], function(result) {
        document.body.style.fontFamily = result.font || 'Arial, sans-serif';
    });
}

// Quote Management
async function getRandomQuote() {
    try {
        const response = await fetch(chrome.runtime.getURL('data/quotes.json'));
        if (!response.ok) {
            throw new Error('Failed to load quotes');
        }
        const quotes = await response.json();
        return quotes[Math.floor(Math.random() * quotes.length)];
    } catch (error) {
        console.error('Error loading quote:', error);
        return { text: 'Every day is a gift.', author: 'Unknown' };
    }
}

// Prompt Management
async function getRandomPrompt() {
    try {
        const response = await fetch(chrome.runtime.getURL('data/prompts.json'));
        if (!response.ok) {
            throw new Error('Failed to load prompts');
        }
        const data = await response.json();
        const prompts = data.prompts;
        return prompts[Math.floor(Math.random() * prompts.length)];
    } catch (error) {
        console.error('Error loading prompt:', error);
        return { text: 'What made you smile today?' };
    }
}

// Storage Utilities
const storageUtils = {
    async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, resolve);
        });
    },
    
    async set(data) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(data, resolve);
        });
    },
    
    async saveEntry(entry) {
        try {
            const { entries = [] } = await this.get(['entries']);
            entries.unshift(entry);
            await this.set({ entries });
            return true;
        } catch (error) {
            console.error('Error saving entry:', error);
            return false;
        }
    },
    
    async getEntries() {
        const { entries = [] } = await this.get(['entries']);
        return entries;
    }
};

// Date Utilities
const dateUtils = {
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },
    
    formatDate(date) {
        return new Date(date).toLocaleDateString();
    }
};

// Export utilities
window.appUtils = {
    theme: { setTheme },
    font: { applyFont },
    quotes: { getRandomQuote },
    prompts: { getRandomPrompt },
    storage: storageUtils,
    date: dateUtils
};

// Initialize theme and font when the script loads
document.addEventListener('DOMContentLoaded', () => {
    setTheme();
    applyFont();
});