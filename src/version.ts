import {HttpClient} from '@actions/http-client'

const LATEST_RELEASE_API = 'https://api.github.com/repos/cresset-tools/bougie/releases/latest'

/** bougie release tags look like `bougie-v0.43.2` (single-component repo). */
export const TAG_PREFIX = 'bougie-v'

/** Strip `bougie-v` / `v` prefixes so users can paste tags verbatim. */
export function normalizeVersion(input: string): string {
  const v = input.trim()
  if (v.startsWith(TAG_PREFIX)) {
    return v.slice(TAG_PREFIX.length)
  }
  if (/^v\d/.test(v)) {
    return v.slice(1)
  }
  return v
}

export async function resolveLatestVersion(token: string): Promise<string> {
  const http = new HttpClient('setup-bougie')
  const headers: Record<string, string> = {accept: 'application/vnd.github+json'}
  if (token) {
    headers['authorization'] = `Bearer ${token}`
  }
  const res = await http.getJson<{tag_name?: string}>(LATEST_RELEASE_API, headers)
  const tag = res.result?.tag_name
  if (res.statusCode !== 200 || !tag) {
    throw new Error(
      `could not resolve the latest bougie release (HTTP ${res.statusCode}); ` +
        'pin `version` explicitly'
    )
  }
  return normalizeVersion(tag)
}
