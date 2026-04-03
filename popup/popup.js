document.getElementById('start-typing').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'activate_typing_mode' });
    window.close();
  });
});