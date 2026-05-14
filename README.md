# Repo Polaroid

[![npm](https://img.shields.io/npm/v/repo-polaroid?style=flat-square)](https://www.npmjs.com/package/repo-polaroid)
[![CI](https://img.shields.io/github/actions/workflow/status/rylandx/repo-polaroid/ci.yml?style=flat-square)](https://github.com/rylandx/repo-polaroid/actions)
[![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

Turn any local Git repository or folder into a vintage polaroid-style SVG for your README, with a playful persona, rarity badge, and optional AI caption.

![Repo Polaroid example](./assets/demo.svg)

Repo Polaroid reads your local file tree and, when available, Git history. It creates a shareable card with language mix, activity, health signals, notable files, repo weather, caption source, persona type, and rarity.

```bash
npm install -g repo-polaroid
repo-polaroid .
repo-polaroid . --out repo-polaroid.svg --write-readme
```

Embed the generated SVG:

```md
![Repo Polaroid](./repo-polaroid.svg)
```

## Why

- **Make repos scannable**: show language mix, project shape, activity, and health signals at a glance.
- **Make repos playful**: every card gets a stable persona and rarity badge.
- **Works anywhere local**: committed Git repos use Git history; plain folders use file modification times.
- **README friendly**: the output is a single SVG file with no backend, account, or API key required.

## Usage

```bash
repo-polaroid [path]
repo-polaroid . --out repo-polaroid.svg --write-readme
repo-polaroid . --theme auto --profile --out repo-polaroid.svg
```

Options:

```text
--out <file>      Write SVG to a specific path
--json            Print analysis JSON instead of writing SVG
--open            Open the generated SVG after writing it
--preview         Generate and open a local preview HTML page
--format <name>   Use svg, png, or html
--profile         Render a wide GitHub profile card
--in-place        Write default output into the input directory
--share           Print a short share caption
--at <ref>        Render a committed Git repository at a Git ref
--write-readme    Insert or update the README embed block
--readme <file>   Use a specific README path and enable --write-readme
--theme <name>    Use classic, darkroom, sunset, blueprint, terminal, kodak, or auto
--max-files <n>   Stop scanning after this many files (default: 20000)
--caption-ai      Try to replace the local caption with an AI caption
-h, --help        Show help
```

## Themes

```bash
repo-polaroid . --theme classic
repo-polaroid . --theme darkroom
repo-polaroid . --theme sunset
```

`classic` is the default. `darkroom` leans high-contrast and moody. `sunset` is warmer for showcases. `blueprint`, `terminal`, and `kodak` add stronger visual identities. Use `--theme auto` to choose from the project profile.

## Play Modes

```bash
repo-polaroid init
repo-polaroid . --format png --out repo-polaroid.png
repo-polaroid . --format html --out repo-polaroid.html
repo-polaroid . --share
repo-polaroid . --at HEAD~10 --out old-polaroid.svg
repo-polaroid compare ./before ./after --out compare.html
repo-polaroid album /Users/fanli/projects --theme auto --out album.html
```

`--profile` renders a wide card for GitHub profile READMEs. `compare` and `album` output static HTML files with embedded SVG cards.

## JSON Output

Use `--json` when you want the analysis data without writing an SVG:

```bash
repo-polaroid . --json
```

Use `--json --out` to get parseable JSON on stdout while still writing the SVG:

```bash
repo-polaroid . --json --out repo-polaroid.svg
```

The JSON keeps compatibility fields such as `commitsLast30Days` and adds clearer fields:

- `activityKind`: `commits` for Git repos, `modified-files` for folders.
- `activityCount`: commits or modified files in the last 30 days.
- `firstSeenAt` and `lastTouchedAt`: source-aware timestamps.
- `notableFiles`: weighted files selected for the card.
- `captionSource`: `local`, `ai`, or `fallback`.
- `personaType`, `personaReasons`, `rarity`, and `rarityScore`: playful local badges for the card.
- `repoWeather`: a lightweight project mood such as `Sunny`, `Cloudy`, or `Spring Clean`.

## AI Captions

Repo Polaroid works without AI. If you want a more playful caption, provide an OpenAI API key:

```bash
OPENAI_API_KEY=... repo-polaroid . --caption-ai
```

OpenAI-compatible APIs work too. For DeepSeek:

```bash
REPO_POLAROID_API_KEY=... \
REPO_POLAROID_API_BASE=https://api.deepseek.com \
REPO_POLAROID_MODEL=deepseek-v4-pro \
repo-polaroid . --caption-ai
```

For DeepSeek URLs, Repo Polaroid disables V4 thinking mode automatically because captions should return directly in `content`.

If the key is missing or the request fails, the CLI keeps going with the local caption generator.

## README Workflow

Use `--write-readme` to insert or update a managed embed block:

```bash
repo-polaroid . --out repo-polaroid.svg --write-readme
```

Repo Polaroid updates this block when it exists, or inserts it after the README title:

```md
<!-- repo-polaroid:start -->
![Repo Polaroid](./repo-polaroid.svg)
<!-- repo-polaroid:end -->
```

Use `--preview` to open a local HTML page with the generated card, Markdown snippet, theme, caption source, persona, and rarity.

## GitHub Action

Use the bundled action metadata to update the card in CI:

```yaml
name: Repo Polaroid
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g repo-polaroid
      - run: repo-polaroid . --theme auto --out repo-polaroid.svg --write-readme
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update repo polaroid"
```

## Local Development

```bash
npm install
npm test
npm run build
npm run dev -- . --theme sunset --out repo-polaroid.svg
```

## Troubleshooting

**`Path is not a directory`**

Pass a local directory path:

```bash
repo-polaroid /path/to/project
```

**`File limit exceeded`**

Repo Polaroid stops at 20,000 files by default so accidental scans of huge folders fail quickly. Raise the limit when you mean it:

```bash
repo-polaroid . --max-files 50000
```
