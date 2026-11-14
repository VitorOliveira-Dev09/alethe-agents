export type WslUncPath = {
  distro: string
  linuxPath: string
}

/** Mirror of `parse_wsl_unc` in `src-tauri/src/wsl.rs` — keep both in sync. */
function parseWslUncPath(path: string): WslUncPath | null {
  const normalized = path.trim().replace(/\\/g, '/')
  if (!normalized.startsWith('//')) return null

  const segments = normalized.slice(2).split('/').filter(Boolean)
  const host = segments[0]?.toLowerCase()
  if (host !== 'wsl.localhost' && host !== 'wsl$') return null

  const distro = segments[1]
  if (!distro) return null

  const tail = segments.slice(2)
  return { distro, linuxPath: tail.length ? `/${tail.join('/')}` : '/' }
}

/** Root UNC path of a distro — the fallback when its home directory cannot be probed. */
export function wslDistroRootUnc(distro: string): string | null {
  const trimmed = distro.trim()
  return trimmed ? `\\\\wsl.localhost\\${trimmed}` : null
}

export function toWslGuestPath(path: string): string | null {
  const normalized = path.trim().replace(/\\/g, '/')
  const drive = /^([A-Za-z]):\/(.*)$/.exec(normalized)
  if (drive) return `/mnt/${drive[1].toLowerCase()}/${drive[2]}`
  return parseWslUncPath(path)?.linuxPath ?? null
}

let preferredDistro: string | null = null

/**
 * WSL-first: the distro every Windows folder runs in. Mirror of `set_preferred_distro` in
 * `src-tauri/src/wsl.rs`, so the launch code and the backend agree on what is a WSL terminal.
 */
export function setPreferredWslDistro(distro: string | null | undefined): void {
  preferredDistro = distro?.trim() || null
}

/** Mirror of `windows_drive_to_mnt` in `src-tauri/src/wsl.rs`: `C:\work\app` → `/mnt/c/work/app`. */
function windowsDriveToMnt(path: string): string | null {
  const match = /^([A-Za-z]):(?:[\\/](.*))?$/.exec(path.trim())
  if (!match) return null
  const tail = (match[2] ?? '').split(/[\\/]/).filter(Boolean)
  const mount = `/mnt/${match[1].toLowerCase()}`
  return tail.length ? `${mount}/${tail.join('/')}` : mount
}

export function wslTargetFor(cwd: string | null | undefined, enabled: boolean): WslUncPath | null {
  if (!enabled) return null
  const unc = parseWslUncPath(cwd ?? '')
  if (unc || !preferredDistro) return unc
  const linuxPath = windowsDriveToMnt(cwd ?? '')
  return linuxPath ? { distro: preferredDistro, linuxPath } : null
}
