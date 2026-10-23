const CONTEXT_MENU_ID = 'sunasty-inspect-page-colors';

function setupContextMenu() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    const title =
      (chrome.i18n && chrome.i18n.getMessage('ctxPickColor')) ||
      'Inspect page colors with Sunasty';
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title,
        contexts: ['page', 'image'],
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
});

function captureTabDataUrl(windowId) {
  return new Promise((resolve) => {
    try {
      const targetWindow =
        typeof windowId === 'number' ? windowId : chrome.windows.WINDOW_ID_CURRENT;
      chrome.tabs.captureVisibleTab(targetWindow, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          resolve(null);
        } else {
          resolve(dataUrl);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

async function openExtensionPopup(query = '') {
  if (chrome.action && typeof chrome.action.openPopup === 'function') {
    try {
      await chrome.action.openPopup();
      return;
    } catch {
      // Fallback to popup window
    }
  }
  const url = chrome.runtime.getURL(`popup.html${query}`);
  chrome.windows.create({
    url,
    type: 'popup',
    width: 416,
    height: 600,
  });
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const dataUrl = await captureTabDataUrl(tab?.windowId);
    if (dataUrl) {
      await chrome.storage.local.set({
        sunasty_cp_pending_capture: {
          dataUrl,
          timestamp: Date.now(),
        },
      });
    }
    await openExtensionPopup('?tab=palette');
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.action === 'capture-visible-tab') {
    captureTabDataUrl(message.windowId).then((dataUrl) => {
      sendResponse({ ok: Boolean(dataUrl), dataUrl });
    });
    return true;
  }

  return false;
});
