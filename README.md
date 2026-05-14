# Repo Polaroid

[![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

Turn any local Git repository or folder into a vintage polaroid-style SVG portrait.

![Repo Polaroid example](./assets/demo.svg)

Repo Polaroid reads your local file tree and, when available, Git history. It creates a shareable card with the project's language mix, activity, health signals, notable files, and a short personality caption.

> [!TIP]
> Drop the generated SVG into your README to give visitors an instant feel for the repository.

## Features

- **One-command project portrait**: generate a polished SVG from any local Git repository or plain folder.
- **Local-first by default**: no backend, no account, and no API key required.
- **Git-aware when possible**: use commit history for Git repositories, and file modification times for plain folders.
- **Readable health signals**: README, license, test, and config detection.
- **Optional AI caption**: use `--caption-ai` to try an OpenAI-powered caption, with automatic local fallback.

## Getting started

Install globally:

```bash
npm install -g repo-polaroid
```

Generate a polaroid for the current repository or folder:

```bash
repo-polaroid .
```

This writes `repo-polaroid.svg` in your current directory.

Generate one for a plain folder:

```bash
repo-polaroid /Users/fanli/projects/RAFT --out repo-polaroid.svg
```

## Usage

```bash
repo-polaroid [path]
repo-polaroid . --out repo-polaroid.svg
repo-polaroid . --json
repo-polaroid . --caption-ai
```

Embed the output in Markdown:

```md
![Repo Polaroid](./repo-polaroid.svg)
```

### JSON output

Use `--json` when you want the analysis data without writing an SVG:

```bash
repo-polaroid . --json
```

Use `--json --out` to get parseable JSON on stdout while still writing the SVG:

```bash
repo-polaroid . --json --out repo-polaroid.svg
```

### AI captions

Repo Polaroid works without AI. If you want a more playful caption, provide an OpenAI API key:

```bash
OPENAI_API_KEY=... repo-polaroid . --caption-ai
```

If the key is missing or the request fails, the CLI keeps going with the local caption generator.

## Local development

```bash
npm install
npm test
npm run build
npm run dev -- . --out repo-polaroid.svg
```

## Troubleshooting

**`Path is not a directory`**

Pass a local directory path:

```bash
repo-polaroid /path/to/project
```
