import * as cache from '@actions/cache'
import * as core from '@actions/core'
import {hashFiles} from '@actions/glob'
import {bougiePaths, cachePatterns} from './paths'

export const STATE_CACHE_KEY = 'cache-key'
export const STATE_CACHE_MATCHED_KEY = 'cache-matched-key'
export const STATE_CACHE_PATHS = 'cache-paths'

/** Bump to invalidate every existing cache entry on layout changes. */
const KEY_VERSION = 'v1'

export async function restoreBougieCache(bougieVersion: string): Promise<void> {
  if (!cache.isFeatureAvailable()) {
    core.warning('the GitHub Actions cache service is unavailable; skipping cache')
    core.setOutput('cache-hit', false)
    return
  }
  const globs = core.getInput('cache-dependency-glob') || '**/composer.lock'
  const suffix = core.getInput('cache-suffix')
  const lockHash = await hashFiles(globs)
  if (!lockHash) {
    core.info(
      `no files matched cache-dependency-glob (${globs.replaceAll('\n', ', ')}); ` +
        'using a static cache key'
    )
  }
  const prefix = [
    'setup-bougie',
    KEY_VERSION,
    process.platform,
    process.arch,
    suffix,
    `bougie${bougieVersion}`,
  ]
    .filter(Boolean)
    .join('-')
  const key = `${prefix}-${lockHash || 'no-lockfile'}`
  const patterns = cachePatterns(bougiePaths())
  core.saveState(STATE_CACHE_KEY, key)
  core.saveState(STATE_CACHE_PATHS, JSON.stringify(patterns))
  const matched = await cache.restoreCache(patterns.slice(), key, [`${prefix}-`])
  core.saveState(STATE_CACHE_MATCHED_KEY, matched ?? '')
  core.setOutput('cache-hit', matched === key)
  core.info(matched ? `cache restored from key: ${matched}` : `no cache found for key: ${key}`)
}

export async function saveBougieCache(): Promise<void> {
  const key = core.getState(STATE_CACHE_KEY)
  if (!key) {
    return
  }
  if (key === core.getState(STATE_CACHE_MATCHED_KEY)) {
    core.info(`cache hit on primary key ${key}; nothing to save`)
    return
  }
  const patterns: string[] = JSON.parse(core.getState(STATE_CACHE_PATHS) || '[]')
  try {
    const id = await cache.saveCache(patterns, key)
    if (id !== -1) {
      core.info(`cache saved with key: ${key}`)
    }
  } catch (err) {
    // Racing jobs reserving the same key (ReserveCacheError) or a
    // flaky cache service must not fail the user's build.
    core.warning(`saving cache failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
