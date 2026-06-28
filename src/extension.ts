import * as vscode from "vscode";
import { findCursorPaths } from "./cursorPaths";
import {
  formatStatusSummary,
  readCurrentStatus,
  runApplyFix,
  runCheckStatus,
  runReapply,
  runRestore,
} from "./actions";
import { needsReapplyAfterUpdate } from "./patcher";
import { RtlPanelProvider } from "./panelProvider";

function updateStatusBar(
  item: vscode.StatusBarItem,
  panelProvider: RtlPanelProvider
): void {
  const status = readCurrentStatus();
  const label = formatStatusSummary(status);

  if (status.status === "applied") {
    item.text = "$(check) RTL";
    item.backgroundColor = undefined;
  } else if (status.status === "partial") {
    item.text = "$(warning) RTL";
    item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  } else {
    item.text = "$(arrow-swap) RTL";
    item.backgroundColor = undefined;
  }

  item.tooltip = `Cursor RTL: ${label}\nClick to open panel`;
  panelProvider.refresh();
}

export function activate(context: vscode.ExtensionContext): void {
  const panelProvider = new RtlPanelProvider(context.extensionPath);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RtlPanelProvider.viewType,
      panelProvider
    )
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    50
  );
  statusBarItem.command = "cursorRtl.openPanel";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const refreshUi = (): void => {
    updateStatusBar(statusBarItem, panelProvider);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.openPanel", async () => {
      await vscode.commands.executeCommand("cursorRtl.panel.focus");
      panelProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.applyFix", async () => {
      await runApplyFix(context.extensionPath);
      refreshUi();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.checkStatus", async () => {
      await runCheckStatus();
      refreshUi();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.restore", async () => {
      await runRestore();
      refreshUi();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.reapply", async () => {
      await runReapply(context.extensionPath);
      refreshUi();
    })
  );

  refreshUi();

  const cursorPaths = findCursorPaths();
  if (cursorPaths && needsReapplyAfterUpdate(cursorPaths)) {
    void vscode.window
      .showWarningMessage(
        "Cursor RTL fix needs to be re-applied after a Cursor update.",
        "Reapply Now",
        "Later"
      )
      .then((choice) => {
        if (choice === "Reapply Now") {
          void vscode.commands.executeCommand("cursorRtl.reapply");
        }
      });
  }
}

export function deactivate(): void {}
