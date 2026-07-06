import * as os from 'node:os'
import * as path from 'node:path'

export interface BougiePaths {
  home: string
  local: string
  cache: string
}

/**
 * Mirror bougie-paths' resolution: `BOUGIE_HOME` / `BOUGIE_LOCAL` /
 * `BOUGIE_CACHE` override; otherwise XDG base dirs on Unix (macOS
 * included — bougie is XDG-strict) and APPDATA / LOCALAPPDATA on
 * Windows. Setting `BOUGIE_HOME` alone also collapses `local` onto it,
 * matching the single-root layout.
 */
export function bougiePaths(
  env: NodeJS.ProcessEnv = process.env,
  platform: string = process.platform
): BougiePaths {
  const homeDir = env['HOME'] || env['USERPROFILE'] || os.homedir()
  let home: string
  let local: string
  let cache: string
  if (platform === 'win32') {
    const appData = env['APPDATA'] || path.join(homeDir, 'AppData', 'Roaming')
    const localAppData = env['LOCALAPPDATA'] || path.join(homeDir, 'AppData', 'Local')
    home = path.join(appData, 'bougie')
    local = path.join(localAppData, 'bougie')
    cache = path.join(localAppData, 'bougie')
  } else {
    const data = env['XDG_DATA_HOME'] || path.join(homeDir, '.local', 'share')
    const xdgCache = env['XDG_CACHE_HOME'] || path.join(homeDir, '.cache')
    home = path.join(data, 'bougie')
    local = home
    cache = path.join(xdgCache, 'bougie')
  }
  if (env['BOUGIE_HOME']) {
    home = env['BOUGIE_HOME']
    local = env['BOUGIE_LOCAL'] || env['BOUGIE_HOME']
  } else if (env['BOUGIE_LOCAL']) {
    local = env['BOUGIE_LOCAL']
  }
  if (env['BOUGIE_CACHE']) {
    cache = env['BOUGIE_CACHE']
  }
  return {home, local, cache}
}

/**
 * Cache pattern list: everything under the three roots except `state/`
 * (project registry, tenant ledgers, daemon runtime state — must not
 * leak across runs). Uses `<root>/*` plus a `!` exclusion because
 * actions/cache archives a bare directory match wholesale, ignoring
 * deeper exclude patterns.
 */
export function cachePatterns(p: BougiePaths): string[] {
  const roots = [...new Set([p.home, p.local, p.cache])]
  const patterns: string[] = []
  for (const root of roots) {
    patterns.push(`${root}/*`)
    patterns.push(`!${root}/state`)
  }
  return patterns
}
