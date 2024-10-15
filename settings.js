document.addEventListener('DOMContentLoaded', function() {
    const reminderTimeInput = document.getElementById('reminder-time');
    const fontSelect = document.getElementById('font-select');
    const remindersToggle = document.getElementById('reminders-toggle');
    const saveButton = document.getElementById('save-settings');

    // Load current settings
    loadSettings();

    // Set theme based on time of day
    setTheme();

    // Save settings
    saveButton.addEventListener('click', saveSettings);

    function loadSettings() {
        chrome.storage.sync.get(['reminderTime', 'font', 'remindersEnabled'], function(result) {
            reminderTimeInput.value = result.reminderTime || '20:00';
            fontSelect.value = result.font || 'Arial, sans-serif';
            remindersToggle.checked = result.remindersEnabled !== false; // Default to true
        });
    }

    function saveSettings() {
        const settings = {
            reminderTime: reminderTimeInput.value,
            font: fontSelect.value,
            remindersEnabled: remindersToggle.checked
        };

        chrome.storage.sync.set(settings, function() {
            alert('Settings saved!');
        });

        // Update reminder alarm
        if (settings.remindersEnabled) {
            const [hours, minutes] = settings.reminderTime.split(':').map(Number);
            chrome.alarms.create('dailyReminder', {
                when: getNextAlarmTime(hours, minutes),
                periodInMinutes: 24 * 60 // Daily
            });
        } else {
            chrome.alarms.clear('dailyReminder');
        }
    }

    function getNextAlarmTime(hours, minutes) {
        const now = new Date();
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        if (alarmTime <= now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
        }
        
        return alarmTime.getTime();
    }
});