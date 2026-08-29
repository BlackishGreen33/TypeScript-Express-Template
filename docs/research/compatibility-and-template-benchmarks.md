# Compatibility and Starter Template Benchmarks

Date: 2026-08-29

## Summary

The practical compatibility target for this repository should be Node.js 22 and 24. Node.js lists v24 and v22 as LTS releases, while v20 is EOL, so supporting Node 20 would increase the test matrix for an unsupported runtime. Source: https://nodejs.org/en/about/previous-releases

The limiting current direct dependency is ESLint 10. The npm registry metadata for `eslint@10.2.1` and `@eslint/js@10.0.1` declares `node: ^20.19.0 || ^22.13.0 || >=24`. Because Node 20 is EOL, the repository's engines can safely be widened from `>=24` to `>=22.13.0` if CI proves both LTS lines work. Sources: https://registry.npmjs.org/eslint/10.2.1 and https://registry.npmjs.org/@eslint/js/10.0.1

Other checked direct dependencies are less restrictive: `commander@14.0.3` requires Node `>=20`, `typescript@6.0.3` requires `>=14.17`, `express@5.2.1` requires `>= 18`, `tsx@4.21.0` requires `>=18.0.0`, `tsc-alias@1.8.16` requires `>=16.20.2`, and `supertest@7.2.2` requires `>=14.18.0`. Sources: [commander](https://registry.npmjs.org/commander/14.0.3), [TypeScript](https://registry.npmjs.org/typescript/6.0.3), [Express](https://registry.npmjs.org/express/5.2.1), [tsx](https://registry.npmjs.org/tsx/4.21.0), [tsc-alias](https://registry.npmjs.org/tsc-alias/1.8.16), and [Supertest](https://registry.npmjs.org/supertest/7.2.2) registry metadata.

## Adopt Now

- Test Node 22 and 24 in CI, and set both root and `template/` engines to `>=22.13.0`. This matches the strictest active LTS-compatible dependency while avoiding Node 20.
- Keep the npm initializer as the main one-command path. The existing repo is an initializer package, not the generated app; GitHub template mode would copy the initializer source rather than the app in `template/`.
- Add community-health files: Dependabot config, issue forms, PR template, `SECURITY.md`, and `CONTRIBUTING.md`. GitHub supports issue forms in `.github/ISSUE_TEMPLATE`, PR templates in `.github/pull_request_template.md`, and Dependabot configuration in `.github/dependabot.yml`. Sources: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository, https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository, https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference

## Useful Patterns From Similar Starters

- `create-vite` supports direct non-interactive scaffolding with a project name and template, supports `.` as the target directory, and documents `--no-interactive`. This repo already has a CLI initializer; the low-cost improvement is to keep non-interactive examples prominent and eventually add explicit template or preset flags only when there are real variants. Source: https://vite.dev/guide/
- `create-next-app` exposes flags for common defaults such as TypeScript, ESLint, Tailwind, app directory, source directory, import alias, package manager, empty app, examples, and `--yes`. The useful lesson is not to copy all flags, but to ensure defaults are strong and each option maps to a real generated-file difference. Source: https://nextjs.org/docs/pages/api-reference/cli/create-next-app
- Nest CLI documents `--dry-run`, `--skip-git`, `--skip-install`, `--skip-tests`, `--package-manager`, language selection, and strict mode. The most relevant low-cost idea for this repo is a future `--dry-run` if users need previewable filesystem changes. Source: https://docs.nestjs.com/cli/usages
- Express Generator focuses on a small skeleton and view choices. This project already improves on that by adding TypeScript, linting, tests, Docker, and CI, so copying Express Generator's simplicity matters more than adding many framework opinions. Source: https://expressjs.com/en/starter/generator/
- Fastify CLI shows the value of one-command generation plus runnable start scripts. This repo already has the one-command path; keeping generated scripts obvious and tested is the right equivalent. Sources: https://github.com/fastify/fastify-cli and https://fastify.dev/docs/latest/Guides/Getting-Started/

## Needs More Validation

- A separate generated-app repository could be made a true GitHub template repository. That would satisfy the GitHub UI "Use this template" flow without confusing it with this initializer source repository. It should be generated from the CLI and refreshed deliberately, not hand-maintained in parallel.
- `--dry-run` could be useful, but only after the current file generation path is stable enough to preview all writes without duplicating logic.
- Package-manager selection beyond npm should wait until lockfile generation, CI, and template docs are tested for each manager.

## Do Not Adopt Now

- Do not support Node 20. It is already EOL in the Node.js release table, and ESLint 10 support for it does not justify testing an unsupported runtime.
- Do not turn this repository itself into a GitHub template repository for app users. It would copy the initializer project, not the generated Express app.
- Do not add a large preset matrix yet. The project already has optional API features through the initializer; extra template branches would duplicate that surface and raise maintenance cost.
