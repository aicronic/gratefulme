// Set up alarm for daily reminder
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['reminderTime'], (result) => {
      const reminderTime = result.reminderTime || '20:00'; // Default to 8:00 PM
      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      chrome.alarms.create('dailyReminder', {
        when: getNextAlarmTime(hours, minutes),
        periodInMinutes: 24 * 60 // Daily
      });
      console.log('Alarm created:', reminderTime); 
    });
  });
  
  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyReminder') {
      chrome.notifications.create('gratitudeReminder', {
        type: 'basic',
        iconUrl: 'icons/heart128.png',
        title: 'Gratitude Journal Reminder',
        message: 'Time to write your daily gratitude entry!',
        priority: 2
      });
    }
  });
  
  // Function to calculate the next alarm time
  function getNextAlarmTime(hours, minutes) {
    const now = new Date();
    const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    return alarmTime.getTime();
  }
  
  // Listen for changes in reminder time setting
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.reminderTime) {
      const [hours, minutes] = changes.reminderTime.newValue.split(':').map(Number);
      chrome.alarms.create('dailyReminder', {
        when: getNextAlarmTime(hours, minutes),
        periodInMinutes: 24 * 60 // Daily
      });
    }
  });