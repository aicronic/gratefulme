function setTheme() {
    const currentHour = new Date().getHours();
    if (currentHour >= 19 || currentHour < 7) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

function applyFont() {
    chrome.storage.sync.get(['font'], function(result) {
        document.body.style.fontFamily = result.font || 'Arial, sans-serif';
    });
}

function getRandomQuote() {
    return fetch(chrome.runtime.getURL('data/quotes.json'))
        .then(response => response.json())
        .then(quotes => quotes[Math.floor(Math.random() * quotes.length)]);
}

// Call applyFont when the script loads
applyFont();