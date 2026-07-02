# Prototypes — Julianna Roberts

A living portfolio of prototypes and experiments, published with **one command** and
**zero manual editing**. Live at **https://jannar18.github.io/prototypes/**

Each entry is a short looping **GIF** captured at the prototype's best moment, with a
`Prototype NN` label, a one-line description, tech tags, and a link to its GitHub repo.

---

## Publish a new prototype

From inside any project directory, in Claude Code:

```
/post-prototype
```

Optionally steer it:

```
/post-prototype show the drag-and-drop canvas          # a focus hint
/post-prototype --recording ~/Desktop/demo.mov         # use your own screen clip
/post-prototype --dir ~/Dev/some-project               # target another dir
```

That's it. The pipeline:

1. **Understands** the project (reads the README / entry files) and picks the best thing to show.
2. **Captures** a GIF — auto-launches the web app in headless Chromium, drives a showcase
   interaction (or a custom one for the focus hint), records it, and optimizes it to a clean
   looping GIF via a two-pass ffmpeg palette. (Or converts your own recording.)
3. **Writes** the title, one-sentence description, and tags.
4. **Links** the GitHub repo (derived from the project's `git remote`).
5. **Publishes** — assigns the next `Prototype NN`, updates `projects.json`, commits, and pushes.
   GitHub Pages redeploys automatically.

## The moving parts

| Path | Role |
|------|------|
| `index.html`, `styles.css`, `app.js` | The static site. Renders `projects.json` into a card grid. |
| `projects.json` | The manifest — the single source of truth for what's on the site. |
| `gifs/` | The captured GIFs, one per prototype (`prototype-NN.gif`). |
| `pipeline/capture.mjs` | Records a running web project with Playwright → optimized looping GIF. |
| `pipeline/publish.mjs` | Registers a GIF in the manifest, copies it in, commits, pushes. |
| `pipeline/interaction.example.mjs` | Example custom showcase interaction (hover/click/drag). |
| `~/.claude/commands/post-prototype.md` | The `/post-prototype` orchestrator (the intelligence). |

### Running the scripts directly (optional)

```bash
# Capture a static site
node pipeline/capture.mjs --serve /path/to/site --out pipeline/.tmp/out.gif --width 900 --fps 15

# Capture a dev-server app
node pipeline/capture.mjs --start "npm run dev" --port 3000 --cwd /path/to/app --out pipeline/.tmp/out.gif

# Publish it
node pipeline/publish.mjs --gif pipeline/.tmp/out.gif --title "My Thing" \
  --description "What it does in one sentence." --project-dir /path/to/app --tags "webgl,interactive"
```

## Requirements

Node, `ffmpeg`, and Playwright's Chromium (`npx playwright install chromium`, already installed).
