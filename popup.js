document.addEventListener('DOMContentLoaded', async function() {
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
    if (elements.quoteContainer) {
        const quote = await appUtils.quotes.getRandomQuote();
        elements.quoteContainer.textContent = `"${quote.text}" - ${quote.author}`;
    }

    // Load and display current streak
    if (elements.currentStreak) {
        const { streak = 0 } = await appUtils.storage.get(['streak']);
        elements.currentStreak.textContent = streak;
    }

    // Set up mood selector
    if (elements.moodSelector) {
        setupMoodSelector(elements.moodSelector);
    }

    // Word count
    if (elements.journalEntry && elements.wordCount) {
        elements.journalEntry.addEventListener('input', () => updateWordCount(elements));
    }

    // Save entry
    if (elements.saveEntryBtn && elements.journalEntry) {
        elements.saveEntryBtn.addEventListener('click', async () => {
            // Check if mood selector exists and has a selected mood
            if (elements.moodSelector) {
                const selectedMood = elements.moodSelector.querySelector('.selected');
                if (!selectedMood) {
                    elements.moodSelector.classList.add('shake');
                    setTimeout(() => {
                        elements.moodSelector.classList.remove('shake');
                    }, 400);
                    return;
                }
            }

            const entry = {
                date: new Date().toISOString(),
                entry: elements.journalEntry.value,
                mood: elements.moodSelector ? elements.moodSelector.querySelector('.selected')?.textContent : null
            };

            const saved = await appUtils.storage.saveEntry(entry);
            if (saved) {
                // Clear the form
                elements.journalEntry.value = '';
                updateWordCount(elements);
                
                // Clear mood selection if mood selector exists
                if (elements.moodSelector) {
                    const selectedMoodEmoji = elements.moodSelector.querySelector('.selected');
                    if (selectedMoodEmoji) {
                        selectedMoodEmoji.classList.remove('selected');
                    }
                }
                
                elements.saveEntryBtn.textContent = 'Saved!';
                setTimeout(() => {
                    elements.saveEntryBtn.textContent = 'Save Entry';
                }, 2000);
            } else {
                alert('Failed to save entry. Please try again.');
            }
        });
    }

    // Navigation buttons
    if (elements.viewJournalBtn) {
        elements.viewJournalBtn.addEventListener('click', () => {
            chrome.tabs.create({url: 'journal.html'});
        });
    }

    if (elements.openSettingsBtn) {
        elements.openSettingsBtn.addEventListener('click', () => {
            chrome.tabs.create({url: 'settings.html'});
        });
    }

    // Load any unsaved entry
    if (elements.journalEntry) {
        const { unsavedEntry = '' } = await appUtils.storage.get(['unsavedEntry']);
        elements.journalEntry.value = unsavedEntry;
        updateWordCount(elements);
    }

    // Auto-save unsaved entry every 15 seconds
    setInterval(async () => {
        if (elements.journalEntry) {
            await appUtils.storage.set({ unsavedEntry: elements.journalEntry.value });
        }
    }, 15000);

    // Load random prompt
    if (elements.journalEntry) {
        const prompt = await appUtils.prompts.getRandomPrompt();
        elements.journalEntry.placeholder = prompt.text;
    }
});

// Helper functions
function updateWordCount(elements) {
    const WORD_LIMIT = 100;
    const words = elements.journalEntry.value.trim().split(/\s+/).filter(Boolean).length;
    elements.wordCount.textContent = `${words}/${WORD_LIMIT} words`;
    
    // Optional: Disable save button if over limit
    if (elements.saveEntryBtn) {
        elements.saveEntryBtn.disabled = words > WORD_LIMIT;
    }
}

function setupMoodSelector(moodSelector) {
    const moods = ['😊', '😌', '😔', '😤', '😴'];
    moodSelector.innerHTML = ''; // Clear existing content
    moods.forEach(mood => {
        const span = document.createElement('span');
        span.textContent = mood;
        span.classList.add('mood-emoji');
        span.addEventListener('click', () => selectMood(mood, span));
        moodSelector.appendChild(span);
    });
}

function selectMood(mood, element) {
    // Remove 'selected' class from all mood emojis
    const allMoods = element.parentElement.getElementsByClassName('mood-emoji');
    Array.from(allMoods).forEach(moodElement => {
        moodElement.classList.remove('selected');
    });
    
    // Add 'selected' class to clicked mood
    element.classList.add('selected');
}

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
