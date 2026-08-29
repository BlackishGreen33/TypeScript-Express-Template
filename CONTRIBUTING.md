# Contributing

## Development

Node.js 24 is recommended; Node.js 22.13 or newer is supported.

Install dependencies and run the full local check:

```sh
npm ci
npm run check
```

The root package builds and tests the npm initializer. The generated Express application lives in `template/`; changes there should also pass:

```sh
npm --prefix template ci
npm --prefix template run check
```

## Pull Requests

Keep changes focused on one behavior or maintenance task. Include the commands you ran in the pull request validation section.

For CLI or template changes, include a smoke test with:

```sh
npm run test:smoke
```

## Issues

Use the issue forms when reporting bugs or requesting features. Remove secrets from logs before posting them publicly.
