<div align="center">

<img src=".github/assets/firefly.jpg" align="center" width="150px" height="200px">

<h3>Firefly</h3>
<p>CLI orchestrator for automatic semantic versioning, changelog generation, and creating releases.</p>

</div>

---

Firefly is a flexible Command Line Interface (CLI) tool designed to streamline and automate the entire release process. It encompasses semantic versioning, comprehensive changelog generation, and GitHub releases, ensuring a consistent and efficient workflow for myself and possibly for you too.

Structured around the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit message formatting and strictly adheres to [Semantic Versioning](https://semver.org/) principles. The tool emphasizes automation without sacrificing control, offering both automatic version inference through commits and manual version selection for precise release management.

**How It Works:**

Built exclusively for [Bun](https://bun.sh/), leveraging Bun APIs for performance and reliability, it will:

- Runs preflight checks to ensure a safe environment
- Determines the next version automatically from commit history or via manual selection
- Bumps the version in `package.json` (using `bun pm pkg` or file manipulation)
- Generates changelogs with [git-cliff](https://github.com/orhun/git-cliff), fully respecting your configuration
- Creates GitHub releases using the GitHub CLI
- Stages changes, creates a commit and tag, and pushes to the remote repository

---

## Getting Started

#### Prerequisites

Firefly requires [Bun](https://bun.sh/) v1.2.19+ and the [GitHub CLI](https://cli.github.com/) installed and authenticated.

#### Per-Project Installation

For project-specific installations, add Firefly as a development dependency:

```bash
bun add -D @yehezkieldio/firefly
```

#### Global Installation

For system-wide access across multiple projects:

```bash
bun install -g @yehezkieldio/firefly
```

### Usage

> Firefly is under reconstruction, stay tuned for updates!

## License

This project is licensed under the [MIT license](LICENSE).