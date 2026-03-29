const fields = ['spaceName', 'inMessage', 'outMessage', 'remoteInMessage', 'remoteOutMessage'];

document.getElementById('save').addEventListener('click', () => {
  const settings = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) settings[f] = el.value;
  });
  chrome.storage.local.set(settings, () => alert('保存しました！'));
});

chrome.storage.local.get(fields, (items) => {
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (items[f] && el) el.value = items[f];
  });
});