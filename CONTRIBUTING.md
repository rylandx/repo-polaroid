# Contributing

Thanks for helping improve Repo Polaroid.

## Local Setup

```bash
npm install
npm test
npm run build
```

## Development

- Keep the CLI local-first and easy to run.
- Preserve JSON compatibility when adding fields.
- Add or update Vitest coverage for behavior changes.
- Keep generated SVGs self-contained and README-friendly.

## Before Opening a PR

```bash
npm test
npm run build
npm pack --dry-run
```

Use concise commit messages, for example `feat: add theme option` or `fix: escape SVG text`.
