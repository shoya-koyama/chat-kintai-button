let config = {
  spaceName: "AAQAJ_JdHAo",
  inMessage: "出社しました",
  outMessage: "退勤します",
  remoteInMessage: "在宅勤務開始します",
  remoteOutMessage: "在宅勤務終了します"
};

let lastAction = "out";       // 出社の状態 (in/out)
let lastRemoteAction = "out"; // 在宅の状態 (in/out)

// ストレージから設定と前回の状態を読み込む
chrome.storage.local.get(['spaceName', 'inMessage', 'outMessage', 'remoteInMessage', 'remoteOutMessage', 'lastAction', 'lastRemoteAction'], (items) => {
  Object.assign(config, items);
  if (items.lastAction) lastAction = items.lastAction;
  if (items.lastRemoteAction) lastRemoteAction = items.lastRemoteAction;
  updateButtonUI();
});

const observer = new MutationObserver(() => {
  if (!window.location.href.includes(config.spaceName)) {
    const existingWrap = document.getElementById('work-btn-wrapper');
    if (existingWrap) existingWrap.remove(); 
    return;
  }

  const toolbar = document.querySelector('div[jsname="SFaVIf"]');
  if (toolbar && !document.getElementById('work-btn-wrapper')) {
    const plusButtonContainer = toolbar.querySelector('div[jsname="OEZz7"]');
    if (plusButtonContainer) {
      injectButtons(plusButtonContainer);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function injectButtons(anchorElement) {
  if (document.getElementById('work-btn-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'work-btn-wrapper';
  wrapper.style = `display: flex; flex-direction: column; gap: 2px; margin-right: 8px; align-self: center;`;

  const commonStyle = `padding: 0 8px; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; height: 18px; white-space: nowrap;`;

  // --- 在宅ボタン (上) ---
  const remoteBtn = document.createElement('button');
  remoteBtn.id = 'remote-action-btn';
  remoteBtn.style = commonStyle;
  remoteBtn.onclick = (e) => {
    e.preventDefault();
    handleRemoteAction();
  };

  // --- 出社/退勤ボタン (下) ---
  const workBtn = document.createElement('button');
  workBtn.id = 'work-action-btn';
  workBtn.style = commonStyle;
  workBtn.onclick = (e) => {
    e.preventDefault();
    handleWorkAction();
  };

  wrapper.appendChild(remoteBtn);
  wrapper.appendChild(workBtn);
  anchorElement.parentNode.insertBefore(wrapper, anchorElement);
  updateButtonUI();
}

function updateButtonUI() {
  const workBtn = document.getElementById('work-action-btn');
  if (workBtn) {
    workBtn.innerText = lastAction === "in" ? "退勤" : "出社";
    workBtn.style.background = lastAction === "in" ? "#d93025" : "#0b57d0";
  }

  const remoteBtn = document.getElementById('remote-action-btn');
  if (remoteBtn) {
    remoteBtn.innerText = lastRemoteAction === "in" ? "在宅終" : "在宅始";
    remoteBtn.style.background = lastRemoteAction === "in" ? "#f29900" : "#188038";
  }
}

// 在宅ボタンの処理
async function handleRemoteAction() {
  let sendText = lastRemoteAction === "in" ? config.remoteOutMessage : config.remoteInMessage;
  sendMessage(sendText);
  lastRemoteAction = lastRemoteAction === "in" ? "out" : "in";
  chrome.storage.local.set({ lastRemoteAction: lastRemoteAction });
  updateButtonUI();
}

// 出社ボタンの処理
async function handleWorkAction() {
  let sendText = lastAction === "in" ? config.outMessage : config.inMessage;
  sendMessage(sendText);
  lastAction = lastAction === "in" ? "out" : "in";
  chrome.storage.local.set({ lastAction: lastAction });
  updateButtonUI();
}

function sendMessage(text) {
  const input = document.querySelector('div[role="textbox"]');
  if (input) {
    input.focus();
    document.execCommand('insertText', false, text);
    setTimeout(() => {
      const enter = new KeyboardEvent('keydown', { bubbles: true, keyCode: 13, key: 'Enter' });
      input.dispatchEvent(enter);
    }, 200);
  }
}