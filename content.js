let config = {
  spaceName: "AAQAJ_JdHAo",
  inMessage: "出社しました",
  outMessage: "退勤します",
  remoteInMessage: "在宅勤務開始します",
  remoteOutMessage: "在宅勤務終了します"
};

// 共通フラグ：'in' (勤務中) または 'out' (退勤中)
let currentStatus = "out";

// ストレージから設定と現在の状態を読み込む
chrome.storage.local.get(['spaceName', 'inMessage', 'outMessage', 'remoteInMessage', 'remoteOutMessage', 'currentStatus', 'currentStatusDate', 'lastAction', 'lastRemoteAction'], (items) => {
  Object.assign(config, items);
  // helper: today's local date string YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  if (items.currentStatus) {
    // If stored status is 'in' but it was set on a previous date, reset to 'out' so the start buttons are usable
    if (items.currentStatus === 'in' && items.currentStatusDate && items.currentStatusDate !== todayStr) {
      currentStatus = 'out';
      // persist the reset so UI remains consistent
      chrome.storage.local.set({ currentStatus: currentStatus, currentStatusDate: todayStr });
    } else {
      currentStatus = items.currentStatus;
    }
  } else if (items.lastAction || items.lastRemoteAction) {
    // Backwards compatibility: if either previous flag was 'in', treat as 'in'
    if (items.lastAction === 'in' || items.lastRemoteAction === 'in') currentStatus = 'in';
    else currentStatus = 'out';
    // Persist derived value so next time we read currentStatus directly
    chrome.storage.local.set({ currentStatus: currentStatus, currentStatusDate: todayStr });
  }
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

  const remoteBtn = document.createElement('button');
  remoteBtn.id = 'remote-action-btn';
  remoteBtn.style = commonStyle;
  remoteBtn.onclick = (e) => { e.preventDefault(); handleAction('remote'); };

  const workBtn = document.createElement('button');
  workBtn.id = 'work-action-btn';
  workBtn.style = commonStyle;
  workBtn.onclick = (e) => { e.preventDefault(); handleAction('work'); };

  wrapper.appendChild(remoteBtn);
  wrapper.appendChild(workBtn);
  anchorElement.parentNode.insertBefore(wrapper, anchorElement);
  updateButtonUI();
}

function updateButtonUI() {
  const workBtn = document.getElementById('work-action-btn');
  const remoteBtn = document.getElementById('remote-action-btn');

  if (currentStatus === "in") {
    // 勤務中の表示（どちらのボタンも「終了」系にする）
    if (workBtn) {
      workBtn.innerText = "退勤";
      workBtn.style.background = "#d93025"; // 赤
    }
    if (remoteBtn) {
      remoteBtn.innerText = "在宅終";
      remoteBtn.style.background = "#f29900"; // オレンジ
    }
  } else {
    // 退勤中の表示（どちらのボタンも「開始」系にする）
    if (workBtn) {
      workBtn.innerText = "出社";
      workBtn.style.background = "#0b57d0"; // 青
    }
    if (remoteBtn) {
      remoteBtn.innerText = "在宅始";
      remoteBtn.style.background = "#188038"; // 緑
    }
  }
}

/**
 * ボタンが押された時の共通処理
 * @param {string} type 'work' または 'remote'
 */
async function handleAction(type) {
  let sendText = "";
  
  if (currentStatus === "out") {
    // 開始する時
    sendText = (type === 'remote') ? config.remoteInMessage : config.inMessage;
    currentStatus = "in";
  } else {
    // 終了する時
    sendText = (type === 'remote') ? config.remoteOutMessage : config.outMessage;
    currentStatus = "out";
  }

  sendMessage(sendText);
  
  // 状態を保存してUIを更新
  // also save the date when status was set so we can reset on the next day
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  chrome.storage.local.set({ currentStatus: currentStatus, currentStatusDate: todayStr });
  updateButtonUI();
}

function sendMessage(text) {
  const input = document.querySelector('div[role="textbox"]');
  if (!input) return;

  input.focus();

  // helper: check if node is a descendant of parent
  function isDescendant(parent, node) {
    while (node) {
      if (node === parent) return true;
      node = node.parentNode;
    }
    return false;
  }

  const selection = window.getSelection();
  let range;
  // If there's no selection or the selection is not inside the input,
  // create a collapsed range at the end of the input
  if (!selection.rangeCount || !isDescendant(input, selection.anchorNode)) {
    range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false); // collapse to end
  } else {
    range = selection.getRangeAt(0);
  }

  // Replace content at the range with our text
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);

  selection.removeAllRanges();
  selection.addRange(range);

  // Notify the page that input changed
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));

  // Try dispatching Enter immediately, then retry once after 200ms
  const sendEnter = () => {
    const enter = new KeyboardEvent('keydown', {
      bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter'
    });
    input.dispatchEvent(enter);
  };

  sendEnter();
  setTimeout(sendEnter, 200);
}
