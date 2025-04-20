<div align="center">

<h3>Artemis</h3>
<p>CLI for semantic versioning, changelog generation, and creating releases based on conventional commits.<p>

[![Built for](https://img.shields.io/badge/Built_for-Bun-fbf0df?style=flat&logo=bun)](https://bun.sh/)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

</div>

## Features

*   **Version Bumping:** Determines the next semantic version based on conventional commits or prompts the user.
*   **Changelog Generation:** Creates or updates a `CHANGELOG.md` using [`git-cliff`](https://github.com/orhun/git-cliff).
*   **Git Operations:** Creates commits for version bumps/changelog updates, tags the release, and pushes changes to the remote repository.
*   **GitHub Releases:** Creates GitHub releases with generated changelog notes.

## Installation

**NOTE:** Artemis is made exclusively for [Bun](https://bun.sh/)!

```bash
bun add -d @yehezkieldio/artemis # or as a global package via bun add -g @yehezkieldio/artemis
```

## Usage

Run Artemis in your project's root directory or subdirectory if you have a monorepo setup. It will automatically detect the root of your project:

```bash
artemis [options]
```

### Options

| Option                        | Alias | Description                                       | Default    |
| :---------------------------- | :---- | :------------------------------------------------ | :--------- |
| `--version`                   |       | Display version information                       |            |
| `--help`                      | `-h`  | Display help information                          |            |
| `--verbose`                   |       | Enable verbose output                             | `false`    |
| `--dry-run`                   |       | Enable dry run mode                               | `false`    |
| `--bump-strategy [strategy]`  | `-b`  | Specify bumping strategy (`auto` or `manual`)     | `manual`   |
| `--release-type [type]`       | `-r`  | Specify release type (e.g., `patch`, `minor`, `major`) | `""`       |
| `--pre-release-id [id]`       | `-p`  | Specify pre-release identifier (e.g., `beta`, `rc`) | `""`       |
| `--pre-release-base [base]`   | `-B`  | Specify pre-release base version (`0` or `1`)     | `0`        |
| `--skip-bump`                 |       | Skip the version bump in the changelog            | `false`    |
| `--skip-changelog`            |       | Skip changelog generation                         | `false`    |
| `--skip-github-release`       |       | Skip GitHub release creation                      | `false`    |
| `--skip-commit`               |       | Skip commit creation                              | `false`    |
| `--skip-tag`                  |       | Skip version tag creation                         | `false`    |
| `--skip-push`                 |       | Skip pushing changes                              | `false`    |
| `--github-release-draft`      |       | Create a draft GitHub release                     | `false`    |
| `--github-release-prerelease` |       | Create a pre-release GitHub release               | `false`    |
| `--github-release-latest`     |       | Create a latest GitHub release                    | `true`     |

**Example:** Create a new minor release automatically, skipping the push:

```bash
artemis --bump-strategy auto --release-type minor --skip-push
```

**Example:** Perform a dry run for a manual patch release:

```bash
artemis --bump-strategy manual --release-type patch --dry-run
```

## Configuration

Artemis is configured via CLI flags and a configuration file. It uses [`c12`](https://github.com/unjs/c12) to automatically load configuration from files like `artemis.config.js` or `artemis.config.ts`.

**Example `artemis.config.js`:**

```javascript
import { defineConfig } from '@yehezkieldio/artemis';

export default defineConfig({
    scope: "yehezkieldio",
    name: "artemis",
});
```

**Example Monorepo `artemis.config.js`:**

> A monorepo configuration can be set up in the root of your monorepo. Each subproject can have its own configuration file, and the root configuration will be used as a base. This configuration example is for a monorepo with a project in the `apps/bot` directory.

```javascript
import { defineConfig } from '@yehezkieldio/artemis';

export default defineConfig({
    scope: "imperia",
    name: "bot",
    base: "apps/bot",
});
```

### Prerequisites

1.  **Conventional Commits:** Your repository should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for automatic version bumping and meaningful changelogs.
2.  **`git-cliff` Configuration:** Artemis uses `git-cliff` for changelog generation. You need a `cliff.toml` configuration file in your project. See the [`git-cliff` documentation](https://github.com/orhun/git-cliff?tab=readme-ov-file#configuration) for details. A basic example is provided in this repository.
3.  **GitHub Authentication:** To create GitHub releases, Artemis needs authentication. It will attempt to use:
    *   A `GITHUB_TOKEN` environment variable.
    *   The GitHub CLI (`gh`) if installed and authenticated.

## Workflow

Artemis typically performs the following steps:

1.  **Preflight Checks:** Verifies Git status, prerequisites, etc.
2.  **Determine Next Version:** Based on `bumpStrategy` and commit history or user input.
3.  **Generate Changelog:** Uses `git-cliff` to update/create `CHANGELOG.md`.
4.  **Bump Version:** Updates `package.json` (if present) with the new version.
5.  **Create Commit:** Commits the changes (changelog, `package.json`).
6.  **Create Tag:** Creates a Git tag for the new version.
7.  **Push Changes:** Pushes the commit and tag to the remote repository.
8.  **Create GitHub Release:** Creates a release on GitHub with the relevant changelog section.

Steps can be skipped using the `--skip-*` flags.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
