import * as vscode from "vscode";
import { findCursorPaths } from "./cursorPaths";
import {
  applyFix,
  getStatus,
  needsReapplyAfterUpdate,
  reapplyFix,
  restoreFix,
} from "./patcher";

const PATCH_VERSION = "1.0.0";

function getExtensionPath(context: vscode.ExtensionContext): string {
  return context.extensionPath;
}

async function withCursorPaths<T>(
  action: (paths: NonNullable<ReturnType<typeof findCursorPaths>>) => Promise<T>
): Promise<T | undefined> {
  const cursorPaths = findCursorPaths();

  if (!cursorPaths) {
    await vscode.window.showErrorMessage(
      "Cursor RTL: Could not find Cursor.app installation."
    );
    return undefined;
  }

  return action(cursorPaths);
}

function formatStatusDetails(
  status: ReturnType<typeof getStatus>
): string {
  if (!status.cursorPaths) {
    return status.message;
  }

  return [
    status.message,
    `Cursor: ${status.cursorPaths.appRoot}`,
    `main.js patched: ${status.mainJsPatched ? "yes" : "no"}`,
    `RTL script present: ${status.rtlJsPresent ? "yes" : "no"}`,
    `Loader present: ${status.patchJsPresent ? "yes" : "no"}`,
    `Backup available: ${status.backupExists ? "yes" : "no"}`,
  ].join("\n");
}

async function confirmRestart(message: string): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `${message} Restart Cursor completely for the change to take effect.`,
    "Reload Window",
    "Later"
  );

  if (choice === "Reload Window") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.applyFix", async () => {
      await withCursorPaths(async (cursorPaths) => {
        try {
          const result = applyFix(
            cursorPaths,
            getExtensionPath(context),
            PATCH_VERSION
          );

          await confirmRestart(
            result.changed
              ? "Cursor RTL fix applied successfully."
              : "Cursor RTL fix was already applied."
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown apply error";
          await vscode.window.showErrorMessage(`Cursor RTL apply failed: ${message}`);
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.checkStatus", async () => {
      const status = getStatus(findCursorPaths());
      await vscode.window.showInformationMessage(formatStatusDetails(status), {
        modal: true,
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.restore", async () => {
      await withCursorPaths(async (cursorPaths) => {
        const confirm = await vscode.window.showWarningMessage(
          "Restore original Cursor files and remove the RTL fix?",
          { modal: true },
          "Restore"
        );

        if (confirm !== "Restore") {
          return;
        }

        try {
          restoreFix(cursorPaths);
          await confirmRestart("Cursor RTL fix removed.");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown restore error";
          await vscode.window.showErrorMessage(
            `Cursor RTL restore failed: ${message}`
          );
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorRtl.reapply", async () => {
      await withCursorPaths(async (cursorPaths) => {
        try {
          reapplyFix(cursorPaths, getExtensionPath(context), PATCH_VERSION);
          await confirmRestart("Cursor RTL fix re-applied.");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown reapply error";
          await vscode.window.showErrorMessage(
            `Cursor RTL reapply failed: ${message}`
          );
        }
      });
    })
  );

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
