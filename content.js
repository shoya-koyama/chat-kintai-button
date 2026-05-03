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
chrome.storage.local.get(['spaceName', 'inMessage', 'outMessage', 'remoteInMessage', 'remoteOutMessage', 'currentStatus'], (items) => {
  Object.assign(config, items);
  if (items.currentStatus) currentStatus = items.currentStatus;
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
  chrome.storage.local.set({ currentStatus: currentStatus });
  updateButtonUI();
}

function sendMessage(text) {
  const input = document.querySelector('div[role="textbox"]');
  if (!input) return;

  input.focus();

  // 現在の選択範囲（カーソル位置）を取得
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  
  // 1. カーソル位置にある既存のテキストを削除（必要なら）
  range.deleteContents();

  // 2. 新しいテキストノードを作成して挿入
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // 3. カーソルを挿入したテキストの直後に移動させる
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  // 4. Google Chat側に「入力されたこと」を通知するイベントを発火
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));

  // 送信処理（Enterキーのシミュレート）
  setTimeout(() => {
    const enter = new KeyboardEvent('keydown', {
      bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
    });
    input.dispatchEvent(enter);
  }, 200);
}
