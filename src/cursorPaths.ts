import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface CursorPaths {
  appRoot: string;
  outDir: string;
  mainJs: string;
  workbenchHtml: string;
}

export function findCursorPaths(): CursorPaths | null {
  const candidates = [
    "/Applications/Cursor.app/Contents/Resources/app",
    path.join(os.homedir(), "Applications/Cursor.app/Contents/Resources/app"),
  ];

  for (const appRoot of candidates) {
    const outDir = path.join(appRoot, "out");
    const mainJs = path.join(outDir, "main.js");
    const workbenchHtml = path.join(
      outDir,
      "vs/code/electron-sandbox/workbench/workbench.html"
    );

    if (fs.existsSync(mainJs) && fs.existsSync(workbenchHtml)) {
      return { appRoot, outDir, mainJs, workbenchHtml };
    }
  }

  return null;
}

export function getFixHomeDir(): string {
  return path.join(os.homedir(), ".cursor-rtl-fix");
}

export function getBackupDir(): string {
  return path.join(getFixHomeDir(), "backups");
}

export function getStateFile(): string {
  return path.join(getFixHomeDir(), "state.json");
}

export function getExtensionResourcesDir(extensionPath: string): string {
  return path.join(extensionPath, "resources");
}
