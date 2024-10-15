document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        journalEntry: document.getElementById('journal-entry'),
        wordCount: document.getElementById('word-count'),
        saveEntryBtn: document.getElementById('save-entry'),
        viewJournalBtn: document.getElementById('view-journal'),
        openSettingsBtn: document.getElementById('open-settings'),
        moodSelector: document.getElementById('mood-selector'),
        currentStreak: document.getElementById('current-streak'),
        quoteContainer: document.getElementById('daily-quote')
    };

    // Load and display daily quote
    displayDailyQuote(elements);

    // Load and display current streak
    loadStreak(elements);

    // Set up mood selector
    if (elements.moodSelector) {
        setupMoodSelector(elements.moodSelector);
    } else {
        console.warn('Mood selector element not found');
    }

    // Word count
    if (elements.journalEntry && elements.wordCount) {
        elements.journalEntry.addEventListener('input', () => updateWordCount(elements));
    }

    // Save entry
    if (elements.saveEntryBtn && elements.journalEntry) {
        elements.saveEntryBtn.addEventListener('click', () => saveEntry(elements));
    }

    // View journal
    if (elements.viewJournalBtn) {
        elements.viewJournalBtn.addEventListener('click', () => {
            chrome.tabs.create({url: 'journal.html'});
        });
    }

    // Open settings
    if (elements.openSettingsBtn) {
        elements.openSettingsBtn.addEventListener('click', () => {
            chrome.tabs.create({url: 'settings.html'});
        });
    }

    // Load any unsaved entry
    if (elements.journalEntry) {
        loadUnsavedEntry(elements);
    }

    // Auto-save unsaved entry every 5 seconds
    setInterval(() => {
        if (elements.journalEntry) {
            const unsavedEntry = elements.journalEntry.value;
            chrome.storage.sync.set({unsavedEntry});
        }
    }, 5000);
});

function setTheme() {
    const currentHour = new Date().getHours();
    if (currentHour >= 19 || currentHour < 7) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

function displayDailyQuote(elements) {
    if (elements.quoteContainer) {
        getRandomQuote().then(quote => {
            elements.quoteContainer.textContent = `"${quote.text}" - ${quote.author}`;
        });
    }
}

function loadStreak(elements) {
    if (elements.currentStreak) {
        chrome.storage.sync.get(['streak'], function(result) {
            elements.currentStreak.textContent = result.streak || 0;
        });
    }
}

function setupMoodSelector(moodSelector) {
    const moods = ['😄', '😊', '😐', '😔', '😢'];
    moods.forEach(mood => {
        const span = document.createElement('span');
        span.textContent = mood;
        span.classList.add('mood-emoji');
        span.addEventListener('click', () => selectMood(mood, span));
        moodSelector.appendChild(span);
    });
}

function selectMood(mood, element) {
    console.log('Selected mood:', mood);
    // Remove 'selected' class from all mood emojis
    document.querySelectorAll('.mood-emoji').forEach(emoji => {
        emoji.classList.remove('selected');
    });
    // Add 'selected' class to the clicked emoji
    element.classList.add('selected');
    // Save the selected mood
    chrome.storage.sync.set({lastMood: mood});
}

function updateWordCount(elements) {
    const words = elements.journalEntry.value.trim().split(/\s+/).length;
    elements.wordCount.textContent = `${words} / 100 words`;
}

function saveEntry(elements) {
    const entry = elements.journalEntry.value.trim();
    if (entry) {
        const date = new Date().toISOString();
        chrome.storage.sync.get(['entries', 'lastMood'], function(result) {
            const entries = result.entries || [];
            const mood = result.lastMood || null;
            entries.push({date, entry, mood});
            chrome.storage.sync.set({entries, lastMood: null}, function() {
                elements.journalEntry.value = '';
                updateWordCount(elements);
                updateStreak(elements);
                // Clear mood selection
                document.querySelectorAll('.mood-emoji').forEach(emoji => {
                    emoji.classList.remove('selected');
                });
            });
        });
    }
}

function loadUnsavedEntry(elements) {
    chrome.storage.sync.get(['unsavedEntry'], function(result) {
        if (result.unsavedEntry) {
            elements.journalEntry.value = result.unsavedEntry;
            updateWordCount(elements);
        }
    });
}

function updateStreak(elements) {
    chrome.storage.sync.get(['entries', 'streak', 'lastStreakDate'], function(result) {
        const entries = result.entries || [];
        let currentStreak = result.streak || 0;
        let lastStreakDate = result.lastStreakDate ? new Date(result.lastStreakDate) : null;
        
        if (entries.length > 0) {
            const lastEntryDate = new Date(entries[entries.length - 1].date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (lastStreakDate) {
                const daysSinceLastStreak = Math.floor((today - lastStreakDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastStreak === 1) {
                    // Entry made on the next day, streak continues
                    currentStreak++;
                } else if (daysSinceLastStreak === 0) {
                    // Entry made on the same day, streak remains the same
                } else {
                    // Streak broken
                    currentStreak = 1;
                }
            } else {
                // First entry or streak was reset
                currentStreak = 1;
            }
            
            lastStreakDate = today;
        } else {
            // No entries yet
            currentStreak = 0;
            lastStreakDate = null;
        }
        
        chrome.storage.sync.set({streak: currentStreak, lastStreakDate: lastStreakDate ? lastStreakDate.toISOString() : null}, function() {
            if (elements.currentStreak) {
                elements.currentStreak.textContent = currentStreak;
            }
        });
    });
}


function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Utility function to get a random quote (implement this in utils.js)
function getRandomQuote() {
    return new Promise((resolve, reject) => {
        fetch(chrome.runtime.getURL('data/quotes.json'))
            .then(response => response.json())
            .then(quotes => {
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                resolve(randomQuote);
            })
            .catch(error => {
                console.error('Error fetching quotes:', error);
                reject(error);
            });
    });
}