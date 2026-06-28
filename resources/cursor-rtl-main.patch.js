import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const dirname = fileURLToPath(new URL(".", import.meta.url));

(function () {
  const fs = require("fs");
  const path = require("path");
  const electron = require("electron");
  const rtlPath = path.join(dirname, "cursor-rtl-chat-fix.js");
  let rtlScript = "";

  try {
    rtlScript = fs.readFileSync(rtlPath, "utf-8");
  } catch {
    return;
  }

  if (!rtlScript) {
    return;
  }

  const hooked = new WeakSet();

  function inject(webContents) {
    if (!webContents || webContents.isDestroyed()) {
      return;
    }

    webContents.executeJavaScript(rtlScript).catch(function () {});
  }

  function hookWindow(win) {
    if (!win || !win.webContents || hooked.has(win)) {
      return;
    }

    hooked.add(win);
    const webContents = win.webContents;

    webContents.on("dom-ready", function () {
      inject(webContents);
    });

    webContents.on("did-finish-load", function () {
      inject(webContents);
    });

    webContents.on("did-navigate-in-page", function () {
      inject(webContents);
    });
  }

  electron.app.on("browser-window-created", function (_event, win) {
    hookWindow(win);
  });

  electron.app.whenReady().then(function () {
    electron.BrowserWindow.getAllWindows().forEach(hookWindow);
  });
})();
