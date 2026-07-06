export interface Target {
  /** Rust target triple as it appears in release asset names. */
  triple: string
  archive: 'tar.gz' | 'zip'
}

/** Map a Node platform/arch pair onto a published bougie release target. */
export function resolveTarget(platform: string, arch: string): Target {
  if (platform === 'linux' && arch === 'x64') {
    return {triple: 'x86_64-unknown-linux-gnu', archive: 'tar.gz'}
  }
  if (platform === 'linux' && arch === 'arm64') {
    throw new Error(
      'bougie does not currently publish aarch64-linux binaries. ' +
        'Use an x64 runner, or build from source with `cargo install bougie`.'
    )
  }
  if (platform === 'darwin' && arch === 'arm64') {
    return {triple: 'aarch64-apple-darwin', archive: 'tar.gz'}
  }
  if (platform === 'darwin' && arch === 'x64') {
    throw new Error(
      'bougie does not publish x86_64 macOS binaries; use an Apple Silicon ' +
        'runner (macos-latest), or build from source with `cargo install bougie`.'
    )
  }
  if (platform === 'win32' && arch === 'x64') {
    return {triple: 'x86_64-pc-windows-msvc', archive: 'zip'}
  }
  throw new Error(`unsupported platform/arch for bougie: ${platform}/${arch}`)
}

export function assetName(target: Target): string {
  return `bougie-${target.triple}.${target.archive}`
}
