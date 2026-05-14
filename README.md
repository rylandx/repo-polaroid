# Repo Polaroid

[![npm](https://img.shields.io/npm/v/repo-polaroid?style=flat-square)](https://www.npmjs.com/package/repo-polaroid)
[![CI](https://img.shields.io/github/actions/workflow/status/rylandx/repo-polaroid/ci.yml?style=flat-square)](https://github.com/rylandx/repo-polaroid/actions)
[![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

Turn any local Git repository or folder into a vintage polaroid-style SVG for your README.

![Repo Polaroid example](./assets/demo.svg)

Repo Polaroid reads your local file tree and, when available, Git history. It creates a shareable card with language mix, activity, health signals, notable files, and a short personality caption.

```bash
npm install -g repo-polaroid
repo-polaroid .
```

Embed the generated SVG:

```md
![Repo Polaroid](./repo-polaroid.svg)
```

## Why

- **Make repos scannable**: show language mix, project shape, activity, and health signals at a glance.
- **Works anywhere local**: committed Git repos use Git history; plain folders use file modification times.
- **README friendly**: the output is a single SVG file with no backend, account, or API key required.

## Usage

```bash
repo-polaroid [path]
repo-polaroid . --theme sunset --open
repo-polaroid /Users/fanli/projects/RAFT --out repo-polaroid.svg
```

Options:

```text
--out <file>      Write SVG to a specific path
--json            Print analysis JSON instead of writing SVG
--open            Open the generated SVG after writing it
--theme <name>    Use classic, darkroom, or sunset
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

`classic` is the default. `darkroom` leans high-contrast and moody. `sunset` is warmer and more colorful for project showcases.

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

## AI Captions

Repo Polaroid works without AI. If you want a more playful caption, provide an OpenAI API key:

```bash
OPENAI_API_KEY=... repo-polaroid . --caption-ai
```

If the key is missing or the request fails, the CLI keeps going with the local caption generator.

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
