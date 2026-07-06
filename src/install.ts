import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {assetName, Target} from './platform'
import {TAG_PREFIX} from './version'

const REPO_URL = 'https://github.com/cresset-tools/bougie'

/** Install bougie (reusing the runner tool cache) and put it on PATH. */
export async function ensureBougie(version: string, target: Target): Promise<void> {
  const arch = process.arch
  let dir = tc.find('bougie', version, arch)
  if (dir) {
    core.info(`bougie ${version} found in the runner tool cache`)
  } else {
    dir = await downloadBougie(version, target, arch)
  }
  core.addPath(dir)
}

async function downloadBougie(version: string, target: Target, arch: string): Promise<string> {
  const asset = assetName(target)
  const base = `${REPO_URL}/releases/download/${TAG_PREFIX}${version}`
  core.info(`downloading ${base}/${asset}`)
  const archivePath = await tc.downloadTool(`${base}/${asset}`)
  await verifySha256(archivePath, `${base}/${asset}.sha256`, asset)
  const extracted =
    target.archive === 'zip' ? await tc.extractZip(archivePath) : await tc.extractTar(archivePath)
  // Release archives contain a single `bougie-<triple>/` directory
  // holding the `bougie` and `bgx` binaries.
  const nested = path.join(extracted, `bougie-${target.triple}`)
  const binDir = fs.existsSync(nested) ? nested : extracted
  return tc.cacheDir(binDir, 'bougie', version, arch)
}

async function verifySha256(file: string, sumUrl: string, asset: string): Promise<void> {
  const sumPath = await tc.downloadTool(sumUrl)
  // Format: `<hex> *<filename>` (sha256sum binary-mode).
  const expected = fs.readFileSync(sumPath, 'utf8').trim().split(/\s+/)[0]?.toLowerCase()
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) {
    throw new Error(`malformed checksum file for ${asset}`)
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for ${asset}: expected ${expected}, got ${actual}`)
  }
  core.info(`verified SHA-256 for ${asset}`)
}
