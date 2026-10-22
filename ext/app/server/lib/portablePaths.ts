import * as path from "path";

/**
 * Document paths are stored in landing.db. In portable mode, store paths inside the
 * portable folder relative to it, so the folder can move between drives and machines.
 */
function root(): string | undefined {
  return process.env.GRIST_PORTABLE_ROOT || undefined;
}

export function toStoredPath(docPath: string): string {
  const r = root();
  if (!r) { return docPath; }
  const rel = path.relative(r, docPath);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel.split(path.sep).join("/");
  }
  return docPath;
}

export function fromStoredPath(stored: string | null | undefined): string | undefined {
  if (!stored) { return undefined; }
  const r = root();
  if (!r || path.isAbsolute(stored)) { return stored; }
  return path.resolve(r, stored);
}
