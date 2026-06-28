import * as vscode from "vscode";
import {
  formatStatusDetails,
  formatStatusSummary,
  readCurrentStatus,
  runApplyFix,
  runCheckStatus,
  runReapply,
  runRestore,
} from "./actions";

type PanelMessage =
  | { type: "ready" }
  | { type: "apply" }
  | { type: "status" }
  | { type: "restore" }
  | { type: "reapply" };

export class RtlPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cursorRtl.panel";

  private view?: vscode.WebviewView;

  constructor(private readonly extensionPath: string) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((message: PanelMessage) => {
      void this.handleMessage(message);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

    this.refresh();
  }

  refresh(): void {
    if (!this.view) {
      return;
    }

    const status = readCurrentStatus();
    void this.view.webview.postMessage({
      type: "statusUpdate",
      summary: formatStatusSummary(status),
      status: status.status,
      details: formatStatusDetails(status),
    });
  }

  private async handleMessage(message: PanelMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        this.refresh();
        return;
      case "apply":
        await runApplyFix(this.extensionPath);
        break;
      case "status":
        await runCheckStatus();
        break;
      case "restore":
        await runRestore();
        break;
      case "reapply":
        await runReapply(this.extensionPath);
        break;
    }

    this.refresh();
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    body {
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .logo {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #7c3aed;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
    }
    .subtitle {
      font-size: 11px;
      opacity: 0.75;
      margin-top: 2px;
    }
    .status-card {
      border: 1px solid var(--vscode-panel-border, rgba(127,127,127,.35));
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      background: var(--vscode-editor-background);
    }
    .status-label {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 6px;
    }
    .status-value {
      font-size: 14px;
      font-weight: 600;
    }
    .status-applied { color: #4ade80; }
    .status-partial { color: #fbbf24; }
    .status-not_applied,
    .status-missing_cursor { color: #f87171; }
    .details {
      margin-top: 8px;
      font-size: 11px;
      line-height: 1.5;
      opacity: 0.8;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-secondaryBackground, rgba(127,127,127,.2));
      color: var(--vscode-button-secondaryForeground, inherit);
      border-radius: 6px;
      padding: 10px 8px;
      cursor: pointer;
      font: inherit;
    }
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.danger {
      background: rgba(248, 113, 113, 0.15);
      color: #fca5a5;
    }
    button:hover {
      opacity: 0.92;
    }
    .note {
      margin-top: 14px;
      font-size: 11px;
      line-height: 1.5;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">RTL</div>
    <div>
      <div class="title">Cursor RTL Chat Fix</div>
      <div class="subtitle">Arabic / Persian / Hebrew chat rendering</div>
    </div>
  </div>

  <div class="status-card">
    <div class="status-label">Current status</div>
    <div id="statusValue" class="status-value">Loading...</div>
    <div id="statusDetails" class="details"></div>
  </div>

  <div class="actions">
    <button class="primary" data-action="apply">Apply Fix</button>
    <button data-action="status">Check Status</button>
    <button class="danger" data-action="restore">Restore</button>
    <button data-action="reapply">Reapply</button>
  </div>

  <div class="note">
    macOS only. Apply or restore requires a full Cursor restart. Code blocks stay LTR.
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const statusValue = document.getElementById("statusValue");
    const statusDetails = document.getElementById("statusDetails");

    function statusClass(status) {
      return "status-value status-" + status;
    }

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type !== "statusUpdate") return;
      statusValue.textContent = message.summary;
      statusValue.className = statusClass(message.status);
      statusDetails.textContent = message.details;
    });

    document.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        vscode.postMessage({ type: button.getAttribute("data-action") });
      });
    });

    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
  }
}
