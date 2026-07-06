import assert from 'node:assert/strict'
import {test} from 'node:test'
import {bougiePaths, cachePatterns} from '../src/paths'
import {assetName, resolveTarget} from '../src/platform'
import {normalizeVersion} from '../src/version'

test('normalizeVersion strips tag prefixes', () => {
  assert.equal(normalizeVersion('0.43.2'), '0.43.2')
  assert.equal(normalizeVersion('v0.43.2'), '0.43.2')
  assert.equal(normalizeVersion('bougie-v0.43.2'), '0.43.2')
  assert.equal(normalizeVersion('latest'), 'latest')
})

test('resolveTarget maps published release targets', () => {
  assert.equal(resolveTarget('linux', 'x64').triple, 'x86_64-unknown-linux-gnu')
  assert.equal(resolveTarget('darwin', 'arm64').triple, 'aarch64-apple-darwin')
  assert.equal(resolveTarget('win32', 'x64').archive, 'zip')
  assert.equal(
    assetName(resolveTarget('linux', 'x64')),
    'bougie-x86_64-unknown-linux-gnu.tar.gz'
  )
  assert.throws(() => resolveTarget('linux', 'arm64'), /aarch64-linux/)
  assert.throws(() => resolveTarget('darwin', 'x64'), /Apple Silicon/)
})

test('bougiePaths uses XDG defaults and honors overrides', () => {
  const xdg = bougiePaths({HOME: '/home/u'}, 'linux')
  assert.equal(xdg.home, '/home/u/.local/share/bougie')
  assert.equal(xdg.local, xdg.home)
  assert.equal(xdg.cache, '/home/u/.cache/bougie')

  const overridden = bougiePaths({HOME: '/home/u', BOUGIE_HOME: '/bh'}, 'linux')
  assert.equal(overridden.home, '/bh')
  assert.equal(overridden.local, '/bh')
  assert.equal(overridden.cache, '/home/u/.cache/bougie')

  const win = bougiePaths({USERPROFILE: 'C:\\Users\\u'}, 'win32')
  assert.match(win.home, /Roaming/)
  assert.match(win.local, /Local/)
})

test('cachePatterns excludes state/ under each root', () => {
  const patterns = cachePatterns({home: '/d/bougie', local: '/d/bougie', cache: '/c/bougie'})
  assert.deepEqual(patterns, [
    '/d/bougie/*',
    '!/d/bougie/state',
    '/c/bougie/*',
    '!/c/bougie/state',
  ])
})
