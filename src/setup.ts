import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {restoreBougieCache} from './cache'
import {ensureBougie} from './install'
import {resolveTarget} from './platform'
import {normalizeVersion, resolveLatestVersion} from './version'

async function main(): Promise<void> {
  const target = resolveTarget(process.platform, process.arch)
  const requested = core.getInput('version') || 'latest'
  const version =
    requested === 'latest'
      ? await resolveLatestVersion(core.getInput('github-token'))
      : normalizeVersion(requested)
  await ensureBougie(version, target)
  core.setOutput('version', version)
  core.info(`bougie ${version} is on PATH`)

  // A CI job must never mutate its own toolchain mid-run.
  core.exportVariable('BOUGIE_NO_SELF_UPDATE', '1')
  configureTelemetry()

  const cacheEnabled = (core.getInput('cache') || 'true').toLowerCase() === 'true'
  if (cacheEnabled) {
    await restoreBougieCache(version)
  } else {
    core.setOutput('cache-hit', false)
  }

  const php = core.getInput('php-version')
  if (php) {
    await exec.exec('bougie', ['php', 'install', php])
  }
}

/**
 * bougie's telemetry is silently off in CI unless the workflow author
 * opts in; `BOUGIE_TELEMETRY=on` is the documented lever for owned
 * runners. `DO_NOT_TRACK` still wins — the action never touches it.
 */
function configureTelemetry(): void {
  const t = core.getInput('telemetry').trim().toLowerCase()
  if (['true', 'on', '1', 'yes'].includes(t)) {
    core.exportVariable('BOUGIE_TELEMETRY', 'on')
  } else if (t === 'local') {
    core.exportVariable('BOUGIE_TELEMETRY', 'local')
  } else if (!['', 'false', 'off', '0', 'no'].includes(t)) {
    core.warning(`unrecognized telemetry value "${t}"; leaving telemetry off`)
  }
}

main().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err))
})
