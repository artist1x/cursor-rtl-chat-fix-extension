import * as vscode from "vscode";
import { findCursorPaths } from "./cursorPaths";
import {
  applyFix,
  getStatus,
  reapplyFix,
  restoreFix,
  StatusResult,
} from "./patcher";

export const PATCH_VERSION = "1.0.0";

export type ActionResult = {
  success: boolean;
  message: string;
  needsRestart?: boolean;
};

export function readCurrentStatus(): StatusResult {
  return getStatus(findCursorPaths());
}

export function formatStatusSummary(status: StatusResult): string {
  if (status.status === "applied") {
    return "Applied";
  }
  if (status.status === "partial") {
    return "Partial — re-apply needed";
  }
  if (status.status === "missing_cursor") {
    return "Cursor.app not found";
  }
  return "Not applied";
}

export function formatStatusDetails(status: StatusResult): string {
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

async function withCursorPaths<T>(
  action: (
    paths: NonNullable<ReturnType<typeof findCursorPaths>>
  ) => Promise<T>
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

export async function confirmRestart(message: string): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    `${message} Restart Cursor completely for the change to take effect.`,
    "Reload Window",
    "Later"
  );

  if (choice === "Reload Window") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}

export async function runApplyFix(extensionPath: string): Promise<ActionResult> {
  const result = await withCursorPaths(async (cursorPaths) => {
    try {
      const applyResult = applyFix(cursorPaths, extensionPath, PATCH_VERSION);
      return {
        success: true,
        message: applyResult.changed
          ? "Cursor RTL fix applied successfully."
          : "Cursor RTL fix was already applied.",
        needsRestart: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown apply error";
      await vscode.window.showErrorMessage(`Cursor RTL apply failed: ${message}`);
      return { success: false, message };
    }
  });

  if (!result) {
    return { success: false, message: "Cursor.app not found." };
  }

  if (result.needsRestart) {
    await confirmRestart(result.message);
  }

  return result;
}

export async function runCheckStatus(): Promise<ActionResult> {
  const status = readCurrentStatus();
  await vscode.window.showInformationMessage(formatStatusDetails(status), {
    modal: true,
  });
  return { success: true, message: formatStatusSummary(status) };
}

export async function runRestore(): Promise<ActionResult> {
  const confirm = await vscode.window.showWarningMessage(
    "Restore original Cursor files and remove the RTL fix?",
    { modal: true },
    "Restore"
  );

  if (confirm !== "Restore") {
    return { success: false, message: "Restore cancelled." };
  }

  const result = await withCursorPaths(async (cursorPaths) => {
    try {
      restoreFix(cursorPaths);
      return {
        success: true,
        message: "Cursor RTL fix removed.",
        needsRestart: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown restore error";
      await vscode.window.showErrorMessage(
        `Cursor RTL restore failed: ${message}`
      );
      return { success: false, message };
    }
  });

  if (!result) {
    return { success: false, message: "Cursor.app not found." };
  }

  if (result.needsRestart) {
    await confirmRestart(result.message);
  }

  return result;
}

export async function runReapply(extensionPath: string): Promise<ActionResult> {
  const result = await withCursorPaths(async (cursorPaths) => {
    try {
      reapplyFix(cursorPaths, extensionPath, PATCH_VERSION);
      return {
        success: true,
        message: "Cursor RTL fix re-applied.",
        needsRestart: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown reapply error";
      await vscode.window.showErrorMessage(
        `Cursor RTL reapply failed: ${message}`
      );
      return { success: false, message };
    }
  });

  if (!result) {
    return { success: false, message: "Cursor.app not found." };
  }

  if (result.needsRestart) {
    await confirmRestart(result.message);
  }

  return result;
}
