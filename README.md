# AutoPilot Marketplace

Claude Code plugin marketplace catalog for **AutoPilot** — the autonomous platform-development substrate.

## Install

```
/plugin marketplace add Kohlex/autopilot-marketplace
/plugin install autopilot@kohlex-autopilot
```

The plugin source lives at [Kohlex/autopilot](https://github.com/Kohlex/autopilot) (the `release` branch — a plugin-clean payload built by CI on every version bump). This repo holds only the marketplace catalog (`.claude-plugin/marketplace.json`).

## Maintainer rule — do NOT add a `version` field to a plugin entry

Plugin entries in `marketplace.json` must **not** carry a hardcoded `version`. Claude Code
resolves a plugin's version from the first of: (1) the plugin's own `plugin.json` at the source
ref, (2) the marketplace entry's `version`, (3) the source git SHA. A frozen `version` here
short-circuits (1), so `/plugin update` and background auto-update see no change and **skip the
plugin** — forcing users to uninstall/reinstall to get new releases.

Leaving it out means the version is read live from `plugin.json` on the `release` branch, so
updates flow automatically. `scripts/check-marketplace.mjs` (run in CI via
`.github/workflows/check-marketplace.yml`) fails the build if a `version` field is re-added.
