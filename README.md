# setup-bougie

Set up [bougie](https://github.com/cresset-tools/bougie) — the
Composer-compatible package manager and PHP toolchain manager — in your
GitHub Actions workflows, with caching for PHP interpreters, Composer
packages, and dev-service runtimes.

## Usage

```yaml
- uses: cresset-tools/setup-bougie@v1
  with:
    telemetry: true
- run: bougie sync
```

`bougie sync` installs the PHP interpreter and extensions your project
pins, plus everything in `composer.lock` — no separate `setup-php` step
needed.

### Bring up a Magento / Mage-OS shop

`bougie start` stands up the full stack — PHP, Composer packages,
MariaDB, Redis, OpenSearch, RabbitMQ, the dev server — and runs the
Magento installer, gated on freshness so re-runs are fast no-ops:

```yaml
- uses: actions/checkout@v4
- uses: cresset-tools/setup-bougie@v1
  with:
    telemetry: true
- run: bougie start --format json-v1
- name: Smoke-test the storefront
  run: curl -fsS "$(bougie server --format json-v1 | jq -r .url)"
```

`--format json-v1` keeps every command non-interactive (no prompts, no
log attach), and `bougie up` semantics block until services report
healthy, so exit codes double as readiness gates. The dev server
listens on `127.0.0.1:7080`; `*.bougie.run` hostnames publicly resolve
to `127.0.0.1`, so the printed URL works as-is inside the runner.

Notes for shop checkouts:

- On first run the magento recipe may declare services in
  `composer.json` (`extra.bougie.services`), dirtying the working tree.
  Commit that block to keep CI runs no-op clean.
- A committed `app/etc/env.php` marks the shop as installed, so
  `setup:install` is skipped by the freshness gate.

### Collecting logs on failure

```yaml
- name: Upload bougie logs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: bougie-logs
    path: |
      ~/.local/share/bougie/state/bougied.log
      ~/.local/share/bougie/state/services/**/log/*
    if-no-files-found: ignore
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `version` | `latest` | bougie version to install, e.g. `0.43.2`. |
| `php-version` | — | Pre-install a PHP version (`bougie php install`). Projects normally pin PHP themselves; use this for running PHP outside a project. |
| `telemetry` | `false` | `true` opts the workflow in to bougie's anonymous usage telemetry; `local` only writes events to disk. Off unless set. |
| `cache` | `true` | Cache PHP interpreters, Composer packages, and service runtimes. |
| `cache-dependency-glob` | `**/composer.lock` | Newline-separated globs hashed into the cache key. |
| `cache-suffix` | — | Extra key segment to isolate parallel jobs sharing a lockfile. |
| `github-token` | `${{ github.token }}` | Used to resolve `latest` against the Releases API. |

## Outputs

| Output | Description |
| --- | --- |
| `version` | The bougie version that was installed (resolved from `latest`). |
| `cache-hit` | `true` when the cache was restored from an exact key match. |

## Caching

The action caches `$BOUGIE_HOME` (PHP interpreters, extensions, tools)
and `$BOUGIE_CACHE` (index responses, Composer dists and metadata) —
several hundred MB for a service-heavy project (the OpenSearch runtime
alone is ~274 MB), which turns multi-minute cold installs into seconds.

`$BOUGIE_HOME/state/` is deliberately excluded: it holds the project
registry, tenant ledgers, and daemon runtime state, none of which may
leak across runs.

The key is `setup-bougie-v1-<platform>-<arch>-bougie<version>-<lock
hash>`, with a prefix restore key so a lockfile change still restores
the (still valid) interpreters and service runtimes from the previous
entry. `BOUGIE_HOME` / `BOUGIE_CACHE` env overrides are respected —
export them before this action runs if you relocate them.

## Version pinning

`version: latest` resolves through the GitHub Releases API at run time.
Pin an exact version for reproducible workflows:

```yaml
- uses: cresset-tools/setup-bougie@v1
  with:
    version: '0.43.2'
```

Downloads come from the `bougie-v<version>` GitHub release and are
verified against the release's SHA-256 checksums. The action also sets
`BOUGIE_NO_SELF_UPDATE=1` so nothing mutates the toolchain mid-job.

## Private Composer repositories

bougie implements Composer's exact auth precedence, so the standard
[`COMPOSER_AUTH`](https://getcomposer.org/doc/03-cli.md#composer-auth)
secret works unchanged:

```yaml
- run: bougie sync
  env:
    COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

## Telemetry

bougie's telemetry is consent-based and **silently off in CI** unless
the workflow author opts in. Setting `telemetry: true` exports
`BOUGIE_TELEMETRY=on` for subsequent steps — writing it into your
workflow file *is* the consent. CI events are tagged as such and
aggregated separately, `DO_NOT_TRACK` always wins, and `telemetry:
local` records events to disk without sending anything. See the
[bougie telemetry docs](https://github.com/cresset-tools/bougie/blob/main/TELEMETRY.md).

## Platform support

| Runner | Status |
| --- | --- |
| `ubuntu-*` (x64) | ✅ full stack (server + services) |
| `macos-*` (Apple Silicon) | ✅ full stack |
| `windows-*` (x64) | ✅ package management + `bougie server`; the services daemon is Unix-only |
| linux arm64 | ❌ no published binary — build with `cargo install bougie` |

## License

[EUPL-1.2](LICENSE), same as bougie.
