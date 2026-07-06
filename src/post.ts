import * as core from '@actions/core'
import {saveBougieCache} from './cache'

saveBougieCache().catch((err: unknown) => {
  // The post step must never fail the job.
  core.warning(`post step failed: ${err instanceof Error ? err.message : String(err)}`)
})
