import * as fs from "fs";
import * as path from "path";
import {
  CursorPaths,
  getBackupDir,
  getExtensionResourcesDir,
  getStateFile,
} from "./cursorPaths";

export const PATCH_BEGIN = "/* CURSOR_RTL_FIX_BEGIN */";
export const PATCH_END = "/* CURSOR_RTL_FIX_END */";
export const PATCH_IMPORT = 'import "./cursor-rtl-main.patch.js";';
export const RTL_JS_NAME = "cursor-rtl-chat-fix.js";
export const PATCH_JS_NAME = "cursor-rtl-main.patch.js";

export type PatchStatus =
  | "applied"
  | "partial"
  | "not_applied"
  | "missing_cursor";

export interface FixState {
  appliedAt: string;
  cursorAppRoot: string;
  mainJsBackup: string;
  patchVersion: string;
}

export interface StatusResult {
  status: PatchStatus;
  cursorPaths: CursorPaths | null;
  mainJsPatched: boolean;
  rtlJsPresent: boolean;
  patchJsPresent: boolean;
  backupExists: boolean;
  state: FixState | null;
  message: string;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readState(): FixState | null {
  const stateFile = getStateFile();
  if (!fs.existsSync(stateFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8")) as FixState;
  } catch {
    return null;
  }
}

function writeState(state: FixState): void {
  ensureDir(path.dirname(getStateFile()));
  fs.writeFileSync(getStateFile(), JSON.stringify(state, null, 2), "utf-8");
}

function clearState(): void {
  const stateFile = getStateFile();
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

function hasPatchMarker(content: string): boolean {
  return content.includes(PATCH_BEGIN) && content.includes(PATCH_END);
}

function buildPatchLine(): string {
  return `${PATCH_BEGIN}${PATCH_IMPORT}${PATCH_END}`;
}

function createBackup(sourcePath: string): string {
  ensureDir(getBackupDir());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    getBackupDir(),
    `${path.basename(sourcePath)}.${stamp}.bak`
  );
  fs.copyFileSync(sourcePath, backupPath);
  return backupPath;
}

function copyResourceFile(
  resourcesDir: string,
  fileName: string,
  targetDir: string
): void {
  const source = path.join(resourcesDir, fileName);
  const target = path.join(targetDir, fileName === "rtl.js" ? RTL_JS_NAME : fileName);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing extension resource: ${source}`);
  }

  fs.copyFileSync(source, target);
}

function injectMainJsPatch(mainJsPath: string): void {
  const content = fs.readFileSync(mainJsPath, "utf-8");

  if (hasPatchMarker(content)) {
    return;
  }

  const patchLine = buildPatchLine();
  const markerMatch = content.match(/\*\/\s*\r?\n/);

  if (!markerMatch || markerMatch.index === undefined) {
    throw new Error("Could not find copyright block end in main.js");
  }

  const insertAt = markerMatch.index + markerMatch[0].length;
  const updated =
    content.slice(0, insertAt) + patchLine + "\n" + content.slice(insertAt);

  fs.writeFileSync(mainJsPath, updated, "utf-8");
}

function removeMainJsPatch(mainJsPath: string): void {
  const content = fs.readFileSync(mainJsPath, "utf-8");
  const pattern = new RegExp(
    `${escapeRegExp(PATCH_BEGIN)}[\\s\\S]*?${escapeRegExp(PATCH_END)}\\n?`,
    "g"
  );
  const updated = content.replace(pattern, "");

  if (updated === content) {
    throw new Error("Patch markers not found in main.js");
  }

  fs.writeFileSync(mainJsPath, updated, "utf-8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeDeployedFiles(outDir: string): void {
  for (const fileName of [RTL_JS_NAME, PATCH_JS_NAME]) {
    const filePath = path.join(outDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export function getStatus(cursorPaths: CursorPaths | null): StatusResult {
  if (!cursorPaths) {
    return {
      status: "missing_cursor",
      cursorPaths: null,
      mainJsPatched: false,
      rtlJsPresent: false,
      patchJsPresent: false,
      backupExists: false,
      state: readState(),
      message: "Cursor installation not found.",
    };
  }

  const mainContent = fs.readFileSync(cursorPaths.mainJs, "utf-8");
  const mainJsPatched = hasPatchMarker(mainContent);
  const rtlJsPresent = fs.existsSync(path.join(cursorPaths.outDir, RTL_JS_NAME));
  const patchJsPresent = fs.existsSync(
    path.join(cursorPaths.outDir, PATCH_JS_NAME)
  );
  const state = readState();
  const backupExists = Boolean(state?.mainJsBackup && fs.existsSync(state.mainJsBackup));

  let status: PatchStatus = "not_applied";
  if (mainJsPatched && rtlJsPresent && patchJsPresent) {
    status = "applied";
  } else if (mainJsPatched || rtlJsPresent || patchJsPresent) {
    status = "partial";
  }

  let message = "RTL fix is not applied.";
  if (status === "applied") {
    message = "RTL fix is applied.";
  } else if (status === "partial") {
    message = "RTL fix is partially applied and should be re-applied.";
  }

  return {
    status,
    cursorPaths,
    mainJsPatched,
    rtlJsPresent,
    patchJsPresent,
    backupExists,
    state,
    message,
  };
}

export function applyFix(
  cursorPaths: CursorPaths,
  extensionPath: string,
  patchVersion: string
): { backupPath: string; changed: boolean } {
  const resourcesDir = getExtensionResourcesDir(extensionPath);
  let changed = false;
  let backupPath = readState()?.mainJsBackup ?? "";

  if (!fs.existsSync(backupPath)) {
    backupPath = createBackup(cursorPaths.mainJs);
    changed = true;
  }

  copyResourceFile(resourcesDir, "rtl.js", cursorPaths.outDir);
  copyResourceFile(resourcesDir, PATCH_JS_NAME, cursorPaths.outDir);
  changed = true;

  const before = fs.readFileSync(cursorPaths.mainJs, "utf-8");
  injectMainJsPatch(cursorPaths.mainJs);
  const after = fs.readFileSync(cursorPaths.mainJs, "utf-8");

  if (before !== after) {
    changed = true;
  }

  writeState({
    appliedAt: new Date().toISOString(),
    cursorAppRoot: cursorPaths.appRoot,
    mainJsBackup: backupPath,
    patchVersion,
  });

  return { backupPath, changed };
}

export function restoreFix(cursorPaths: CursorPaths): { changed: boolean } {
  const state = readState();
  let changed = false;

  if (state?.mainJsBackup && fs.existsSync(state.mainJsBackup)) {
    fs.copyFileSync(state.mainJsBackup, cursorPaths.mainJs);
    changed = true;
  } else {
    const content = fs.readFileSync(cursorPaths.mainJs, "utf-8");
    if (hasPatchMarker(content)) {
      removeMainJsPatch(cursorPaths.mainJs);
      changed = true;
    }
  }

  removeDeployedFiles(cursorPaths.outDir);
  clearState();

  return { changed };
}

export function reapplyFix(
  cursorPaths: CursorPaths,
  extensionPath: string,
  patchVersion: string
): { backupPath: string; changed: boolean } {
  const current = getStatus(cursorPaths);

  if (current.status === "applied") {
    copyResourceFile(
      getExtensionResourcesDir(extensionPath),
      "rtl.js",
      cursorPaths.outDir
    );
    copyResourceFile(
      getExtensionResourcesDir(extensionPath),
      PATCH_JS_NAME,
      cursorPaths.outDir
    );

    return {
      backupPath: current.state?.mainJsBackup ?? "",
      changed: true,
    };
  }

  return applyFix(cursorPaths, extensionPath, patchVersion);
}

export function needsReapplyAfterUpdate(cursorPaths: CursorPaths): boolean {
  const state = readState();
  if (!state) {
    return false;
  }

  const status = getStatus(cursorPaths);
  return status.status !== "applied";
}
