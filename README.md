# Cursor RTL Chat Fix

Private Cursor extension that applies a reversible RTL/BiDi fix to Cursor's native AI chat globally.

## What it does

- Detects `Cursor.app` on macOS
- Backs up `main.js` before patching
- Copies an Electron loader and RTL script into Cursor's `app/out` folder
- Injects a marked import into `main.js`
- Keeps code blocks, terminals, and Monaco editors LTR
- Provides restore and re-apply commands after Cursor updates

## Install

```bash
cd ~/Developer/cursor-rtl-chat-fix-extension
npm install
npm run package
```

Then in Cursor:

1. Open Command Palette
2. Run `Extensions: Install from VSIX...`
3. Select the generated `.vsix`
4. Run `Cursor RTL: Apply Fix`
5. Restart Cursor completely

## Commands

| Command | Purpose |
|---|---|
| `Cursor RTL: Apply Fix` | Apply the RTL patch with backup |
| `Cursor RTL: Check Status` | Show whether the patch is applied |
| `Cursor RTL: Restore Original Cursor Files` | Remove patch and restore backup |
| `Cursor RTL: Reapply After Cursor Update` | Reinstall RTL assets after Cursor update |

## Safety

- Backups are stored in `~/.cursor-rtl-fix/backups/`
- Patch state is stored in `~/.cursor-rtl-fix/state.json`
- Restore removes deployed files and patch markers from `main.js`

## Notes

- This modifies Cursor application files outside the extension sandbox
- Cursor updates may remove the patch; use `Reapply After Cursor Update`
- This is an unofficial workaround until Cursor adds native RTL support
