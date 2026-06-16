#!/usr/bin/env node
// check-marketplace.mjs — guard the marketplace catalog against the regression that forced
// users into the uninstall/reinstall dance.
//
// THE BUG IT PREVENTS:
//   A hardcoded `version` field in a plugin's marketplace entry freezes Claude Code's
//   version resolution at that string. Per the docs, version resolves from the first of:
//     1. version in the plugin's own plugin.json (at the source ref)
//     2. version in the marketplace entry          <-- a stale value here SHORT-CIRCUITS #1
//     3. the git commit SHA of the source
//   If the resolved version matches what the user already has, /plugin update + auto-update
//   SKIP the plugin. So a frozen `version: "0.2.2"` makes every newer release invisible.
//
// THE RULE: plugin entries must NOT carry a `version` field, so resolution falls through to
//   the plugin's own plugin.json on the `release` branch (the live, correct version).
//
// Pure Node, no deps. Exits non-zero (fails CI) on any violation.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(HERE, '..', '.claude-plugin', 'marketplace.json');

const fail = (msg) => { console.error(`  ✗ ${msg}`); process.exitCode = 1; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log('Checking .claude-plugin/marketplace.json …');

let raw, manifest;
try {
  raw = readFileSync(manifestPath, 'utf8');
} catch (e) {
  fail(`cannot read marketplace.json: ${e.message}`);
  process.exit(1);
}
try {
  manifest = JSON.parse(raw);
  ok('valid JSON');
} catch (e) {
  fail(`marketplace.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const plugins = Array.isArray(manifest.plugins) ? manifest.plugins : [];
if (plugins.length === 0) fail('no plugins[] entries found');

for (const p of plugins) {
  const name = p && p.name ? p.name : '(unnamed)';

  // ── THE GUARD: no hardcoded version on a plugin entry ──
  if (Object.prototype.hasOwnProperty.call(p, 'version')) {
    fail(`plugin "${name}" has a hardcoded "version" field ("${p.version}"). `
      + `Remove it — a frozen version blocks /plugin update + auto-update for every user. `
      + `The version is read from the plugin's own plugin.json at the source ref.`);
  } else {
    ok(`plugin "${name}": no hardcoded version (updates resolve from the source plugin.json)`);
  }

  // ── sanity: the source must resolve to something updatable ──
  const src = p && p.source;
  if (!src) {
    fail(`plugin "${name}" has no "source"`);
  } else if (typeof src === 'object' && src.source === 'github') {
    if (!src.repo) fail(`plugin "${name}" github source has no "repo"`);
    else ok(`plugin "${name}": github source ${src.repo}${src.ref ? `@${src.ref}` : ''}`);
    // a github source pinned to an exact sha would also freeze updates — warn loudly.
    if (src.sha) fail(`plugin "${name}" source pins an exact "sha" — that freezes updates too; `
      + `use a moving "ref" (e.g. "release") instead.`);
  } else {
    ok(`plugin "${name}": source present (${typeof src === 'string' ? src : src.source})`);
  }
}

// top-level marketplace version is harmless metadata, but flag it so nobody assumes it drives updates.
if (Object.prototype.hasOwnProperty.call(manifest, 'version')) {
  console.log(`  • note: top-level marketplace "version" is "${manifest.version}" — `
    + `this is catalog metadata only and does NOT drive plugin update detection.`);
}

if (process.exitCode === 1) {
  console.error('\nMarketplace check FAILED. See the rule in scripts/check-marketplace.mjs.');
  process.exit(1);
}
console.log('\nMarketplace check passed.');
