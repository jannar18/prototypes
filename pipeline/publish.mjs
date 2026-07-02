#!/usr/bin/env node
/**
 * publish.mjs
 * -----------
 * Registers a captured GIF as a new (or updated) project in the site manifest
 * (projects.json), copies the GIF into the site's gifs/ dir, commits, and pushes.
 *
 * Usage:
 *   node publish.mjs --gif <path.gif> --title "<Title>" --description "<one sentence>"
 *      [--repo <url>] [--project-dir <dir>] [--tags "a,b,c"] [--date YYYY-MM-DD]
 *      [--id prototype-NN] [--no-push]
 *
 * Dependencies: Node built-ins only.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Minimal argument parser (no external deps).
// --flag value  and  --flag (boolean, e.g. --no-push).
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function fail(msg) {
  console.error(`\n[publish] ERROR: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Normalize a git remote URL to https://github.com/owner/name form.
// Handles: git@github.com:owner/name.git  and  https://github.com/owner/name.git
// ---------------------------------------------------------------------------
function normalizeRepoUrl(raw) {
  let url = String(raw).trim();
  if (!url) return '';

  // SSH form: git@host:owner/name(.git)
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const repoPath = sshMatch[2];
    return `https://${host}/${repoPath}`;
  }

  // ssh://git@host/owner/name(.git)
  const sshProto = url.match(/^ssh:\/\/git@([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshProto) {
    return `https://${sshProto[1]}/${sshProto[2]}`;
  }

  // https / http form: strip trailing .git
  url = url.replace(/\.git$/, '');
  return url;
}

// ---------------------------------------------------------------------------
// Derive a repo URL from a project dir's git origin remote.
// Returns '' if it cannot be determined.
// ---------------------------------------------------------------------------
function repoFromProjectDir(dir) {
  try {
    const out = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return normalizeRepoUrl(out);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Zero-pad a number to 2 digits.
// ---------------------------------------------------------------------------
function pad2(n) {
  return String(n).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // --- Validate required options -----------------------------------------
  if (!args.gif || args.gif === true) fail('--gif <path.gif> is required.');
  if (!args.title || args.title === true) fail('--title "<Title>" is required.');
  if (!args.description || args.description === true) {
    fail('--description "<one sentence>" is required.');
  }

  const gifSrc = path.resolve(String(args.gif));
  if (!fs.existsSync(gifSrc)) fail(`GIF not found: ${gifSrc}`);

  // --- Resolve site paths -------------------------------------------------
  const SITE = path.resolve(__dirname, '..');
  const manifestPath = path.join(SITE, 'projects.json');
  const gifsDir = path.join(SITE, 'gifs');

  // --- Load or default the manifest --------------------------------------
  const defaultManifest = {
    profile: { name: 'Julianna Roberts', tagline: 'Prototypes & Experiments' },
    projects: [],
  };
  let manifest = defaultManifest;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
    } catch (e) {
      fail(`Could not parse existing manifest ${manifestPath}: ${e.message}`);
    }
    if (!manifest.profile) manifest.profile = defaultManifest.profile;
    if (!Array.isArray(manifest.projects)) manifest.projects = [];
  }

  // --- Resolve repo URL ---------------------------------------------------
  let repo = '';
  if (args.repo && args.repo !== true) {
    repo = normalizeRepoUrl(args.repo);
  } else if (args['project-dir'] && args['project-dir'] !== true) {
    repo = repoFromProjectDir(path.resolve(String(args['project-dir'])));
  }

  // --- Determine number / id / label (insert vs update) ------------------
  const requestedId = args.id && args.id !== true ? String(args.id) : null;
  let existingIndex = -1;
  if (requestedId) {
    existingIndex = manifest.projects.findIndex((p) => p.id === requestedId);
  }

  let number;
  if (existingIndex !== -1) {
    // UPDATE in place: keep the existing number.
    number = manifest.projects[existingIndex].number;
  } else {
    // New project: number = max(existing) + 1, starting at 1.
    const maxNum = manifest.projects.reduce((m, p) => Math.max(m, p.number || 0), 0);
    number = maxNum + 1;
  }

  const id = `prototype-${pad2(number)}`;
  const label = `Prototype ${pad2(number)}`;

  // If an explicit --id was given but didn't match, warn that we computed our own.
  if (requestedId && existingIndex === -1 && requestedId !== id) {
    console.warn(
      `[publish] Note: --id ${requestedId} not found; creating new project as ${id}.`
    );
  }

  // --- Tags ---------------------------------------------------------------
  const tags =
    args.tags && args.tags !== true
      ? String(args.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  // --- Date ---------------------------------------------------------------
  const date =
    args.date && args.date !== true
      ? String(args.date)
      : new Date().toISOString().slice(0, 10);

  // --- Copy the GIF into SITE/gifs/<id>.gif ------------------------------
  await fsp.mkdir(gifsDir, { recursive: true });
  const gifRel = `gifs/${id}.gif`;
  const gifDest = path.join(SITE, gifRel);
  await fsp.copyFile(gifSrc, gifDest);

  // --- Build the project record ------------------------------------------
  const project = {
    id,
    number,
    label,
    title: String(args.title),
    description: String(args.description),
    gif: gifRel,
    repo,
    date,
    tags,
  };

  // --- Insert or replace --------------------------------------------------
  if (existingIndex !== -1) {
    manifest.projects[existingIndex] = project;
  } else {
    manifest.projects.push(project);
  }

  // Keep array sorted ascending by number.
  manifest.projects.sort((a, b) => (a.number || 0) - (b.number || 0));

  // --- Write manifest back (2-space indent + trailing newline) -----------
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // --- Git: add + commit --------------------------------------------------
  const action = existingIndex !== -1 ? 'Update' : 'Add';
  const commitMsg = `${action} ${label}: ${project.title}`;
  let committed = false;
  let pushed = false;
  let pushNote = '';

  try {
    execFileSync('git', ['-C', SITE, 'add', '-A'], { stdio: 'inherit' });
    execFileSync('git', ['-C', SITE, 'commit', '-m', commitMsg], { stdio: 'inherit' });
    committed = true;
  } catch (e) {
    // Commit can fail if there is nothing to commit; report and continue.
    console.warn(`[publish] git commit did not complete (nothing to commit?): ${e.message}`);
  }

  // --- Git: push (unless --no-push) --------------------------------------
  const noPush = args['no-push'] === true || args['no-push'] === 'true';
  if (!noPush && committed) {
    try {
      execFileSync('git', ['-C', SITE, 'push'], { stdio: 'inherit' });
      pushed = true;
    } catch (e) {
      pushNote =
        'Commit succeeded but push FAILED (no remote configured yet?). ' +
        'Add a remote / create the GitHub repo, then run `git -C ' +
        SITE +
        ' push` manually.';
      console.warn(`[publish] ${pushNote}`);
    }
  }

  // --- Summary ------------------------------------------------------------
  console.log('\n[publish] Done.');
  console.log(`  id:        ${id}`);
  console.log(`  label:     ${label}`);
  console.log(`  title:     ${project.title}`);
  console.log(`  gif:       ${gifRel}  ->  ${gifDest}`);
  console.log(`  repo:      ${repo || '(none)'}`);
  console.log(`  date:      ${date}`);
  console.log(`  tags:      ${tags.length ? tags.join(', ') : '(none)'}`);
  console.log(`  manifest:  ${manifestPath} (${manifest.projects.length} project(s))`);
  console.log(`  committed: ${committed ? 'yes' : 'no'}`);
  console.log(`  pushed:    ${pushed ? 'yes' : noPush ? 'skipped (--no-push)' : 'no'}`);
}

main().catch((err) => {
  console.error(`\n[publish] FAILED: ${err?.stack || err?.message || err}\n`);
  process.exit(1);
});
