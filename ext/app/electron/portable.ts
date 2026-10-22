import * as dotenv from "dotenv";
import * as electron from "electron";
import * as fs from "fs";
import * as path from "path";

/**
 * Portable mode: everything lives next to the program, in the GristData folder.
 * Must be called before requestSingleInstanceLock() and loadConfig().
 */
function findBaseDir(): string {
  // Manual override, handy for `yarn run electron:preview`.
  if (process.env.GRIST_PORTABLE_DIR) { return path.resolve(process.env.GRIST_PORTABLE_DIR); }
  // electron-builder "portable" target (single .exe that unpacks to temp).
  if (process.env.PORTABLE_EXECUTABLE_DIR) { return process.env.PORTABLE_EXECUTABLE_DIR; }
  // Linux AppImage: the .AppImage file itself, not its read-only mount.
  if (process.env.APPIMAGE) { return path.dirname(process.env.APPIMAGE); }
  const exe = electron.app.getPath("exe");
  // macOS: <folder>/Grist Desktop.app/Contents/MacOS/Grist Desktop -> <folder>
  if (process.platform === "darwin") { return path.resolve(exe, "../../../.."); }
  // Windows zip/dir, Linux tar.gz/dir: folder with the executable.
  return path.dirname(exe);
}

export function setupPortable(): void {
  if (!electron.app.isPackaged && !process.env.GRIST_PORTABLE_DIR) { return; }

  const base = findBaseDir();
  if (process.platform === "darwin" && base.includes("/AppTranslocation/")) {
    electron.dialog.showErrorBox("Grist Portable",
      "macOS запустил программу из временной папки (App Translocation).\n" +
      "Выполните в Терминале:\n  xattr -dr com.apple.quarantine <папка с программой>\n" +
      "и запустите снова.");
    process.exit(1);
  }

  const data = path.join(base, "GristData");
  try {
    fs.mkdirSync(path.join(data, "docs"), { recursive: true });
    fs.mkdirSync(path.join(data, "app"), { recursive: true });
    fs.accessSync(data, fs.constants.W_OK);
  } catch (e) {
    electron.dialog.showErrorBox("Grist Portable", `Нет прав на запись в папку:\n${data}`);
    process.exit(1);
  }

  // Optional per-folder settings, e.g. GRIST_DEFAULT_USERNAME=Ivan
  dotenv.config({ path: path.join(data, "settings.env") });

  // Redirect every Electron/Grist location into GristData.
  electron.app.setPath("appData", data);                         // -> landing.db
  electron.app.setPath("userData", path.join(data, "app"));      // -> GRIST_INST_DIR, Chromium cache
  electron.app.setPath("documents", path.join(data, "docs"));    // -> GRIST_DATA_DIR, Open dialog
  process.env.GRIST_USER_ROOT ??= path.join(data, "app");        // plugins
  process.env.GRIST_DESKTOP_USE_UPDATE ??= "false";              // updater would install a non-portable copy
  process.env.GRIST_PORTABLE_ROOT = base;                        // doc paths stored relative to this
}
