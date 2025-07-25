<div align="center">

<img src=".github/assets/firefly.jpg" align="center" width="150px" height="200px">

<h3>Firefly</h3>
<p>CLI orchestrator for automatic semantic versioning, changelog generation, and creating releases.</p>

</div>

---

Firefly is a flexible Command Line Interface (CLI) tool designed to streamline and automate the entire release process. It encompasses semantic versioning, comprehensive changelog generation, and GitHub releases, ensuring a consistent and efficient workflow for myself and possibly for you too.

Firefly is structured around the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit message formatting and strictly adheres to [Semantic Versioning](https://semver.org/) principles. The tool emphasizes automation without sacrificing control, offering both automatic version inference through commits and manual version selection for precise release management.

**Key Features:**
- Built exclusively for [Bun](https://bun.sh/), leveraging Bun APIs for performance and reliability
- Automatically determines the next version or allows manual version selection
- Generates changelogs using [git-cliff](https://github.com/orhun/git-cliff), fully respecting your own configuration for format and rules
- Unified configuration system using CLI flags and file-based config (`firefly.config.ts`)
- Creates GitHub releases using the GitHub CLI, supporting draft, pre-release, and latest release options
- Flexible support for scoped package names and repository roots for complex project structures
- Atomic release operations with automatic rollback on failure


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

#### The release Command

Firefly consolidates the entire release workflow into a single command that orchestrates version bumping, changelog generation, and GitHub release creation.

```bash
firefly release
```

#### Inference and Overrides

By default, Firefly intelligently infers project details from your environment:

- **Project name**: Extracted from `package.json` name field
- **Repository**: Detected from Git remote origin URL
- **Changelog path**: Defaults to `CHANGELOG.md` in the project root
- **Current version**: Read from `package.json` version field
- **Scope**: Automatically parsed from scoped package names

These inferred values provide sensible defaults but can be overridden through CLI flags or from the configuration file.

#### Command Line Options Reference

```bash
Usage: firefly release [options]

Create a new release

Options:
  --bs,--bump-strategy <strategy>  Bump strategy (auto, manual) (default: "manual")
  --rt, --release-type <type>      Release type (major, minor, patch, prerelease, etc.)
  --dry-run                        Run in dry-run mode without making changes (default: false)
  --verbose                        Enable verbose logging (default: false)
  --name <name>                    Project name (defaults to package.json name)
  --scope <scope>                  Organization or user scope (without @)
  --base <path>                    Base path for the project, if not the current directory
  --repository <repo>              Repository identifier (owner/repo)
  --changelog-path <path>          Path to changelog file (default: "CHANGELOG.md")
  --branch <branch>                Target branch, defaults to current branch if not specified
  --ci                             Indicate if running in a CI environment (default: false)
  --pre-release-id <id>            Pre-release identifier
  --pre-release-base <base>        Pre-release base version
  --release-notes <notes>          Custom release notes
  --commit-message <message>       Commit message template
  --tag-name <name>                Tag name template
  --release-title <title>          Release title template
  --skip-bump                      Skip version bump (default: false)
  --skip-changelog                 Skip changelog generation (default: false)
  --skip-github-release            Skip GitHub release creation (default: false)
  --skip-commit                    Skip git commit (default: false)
  --skip-tag                       Skip git tag creation (default: false)
  --skip-push                      Skip git push (default: false)
  --skip-git                       Skip all git-related steps (default: false)
  --release-latest                 Mark as latest release (default: true)
  --release-prerelease             Mark as pre-release (GitHub only) (default: false)
  --release-draft                  Create as draft release (GitHub only) (default: false)
  -h, --help                       Display help information
```

#### Version Bumping Strategies

Firefly offers two primary strategies for version determination.

##### Automatic Strategy (`--bump-strategy auto`)

The automatic strategy analyzes your commit history using conventional commit standards to determine the appropriate version increment. This approach ensures consistent versioning based on the actual changes made:

- **MAJOR**: Triggered by commits with `BREAKING CHANGE:` footer or `!` after type/scope
  ```bash
  feat!: remove deprecated API endpoints
  # or
  feat: add new user system

  BREAKING CHANGE: The old user API has been removed
  ```

- **MINOR**: Triggered by `feat:` commits introducing new functionality
  ```bash
  feat: add user profile customization
  feat(api): implement rate limiting
  ```

- **PATCH**: Triggered by `fix:` commits and other non-breaking changes
  ```bash
  fix: resolve memory leak in parser
  docs: update installation instructions
  ```

##### Manual Strategy (`--bump-strategy manual`)

The manual strategy presents you with a generated list of potential version increments based on your current version. When using manual strategy, you can bypass the interactive prompt by specifying `--release-type`:

```bash
firefly release --bump-strategy manual --release-type minor # 1.0.0 → 1.1.0
```

##### Bumping Pre-Release Versions

Firefly supports comprehensive pre-release versioning for testing and staging workflows. Pre-release versions follow the pattern `major.minor.patch-identifier.number`:

**Pre-release Types:**
- **premajor**: `1.0.0 → 2.0.0-alpha.0`
- **preminor**: `1.0.0 → 1.1.0-alpha.0`
- **prepatch**: `1.0.0 → 1.0.1-alpha.0`
- **prerelease**: `1.0.0-alpha.0 → 1.0.0-alpha.1`

**Customizing Pre-release Identifiers:**

The default pre-release identifier is `alpha`, but you can customize it using `--pre-release-id`:

```bash
firefly release --bump-strategy manual --release-type preminor --pre-release-id beta
# Result: 1.0.0 → 1.1.0-beta.0
```

**Advanced Pre-release Configuration:**

Use `--pre-release-base` to control the starting number for pre-releases (defaults to 0):

```bash
firefly release --release-type prepatch --pre-release-id rc --pre-release-base 1
# Result: 1.0.0 → 1.0.1-rc.1
```

## Advanced Configuration & Customization

### The Configuration File

Firefly's configuration system centers around the `firefly.config.ts` file, that should be placed at the root of your project and exports a configuration object that satisfies the `FireflyConfig` interface.

#### Basic Configuration Structure

```ts
import type { FireflyConfig } from "@yehezkieldio/firefly";

export default {
    // Basic project information
    name: "my-awesome-package",
    scope: "myorg",

    // Versioning strategy
    bumpStrategy: "auto",

    // Template customization
    commitMessage: "chore(release): release {{name}}@{{version}}",
    tagName: "v{{version}}",
    releaseTitle: "{{name}} v{{version}}",
} satisfies FireflyConfig;
```

#### Project Name and Scope

The `name` and `scope` configuration options provide fine-grained control over how Firefly identifies and names your project:

**Automatic Detection:**

```json
// package.json
{
  "name": "@myorg/awesome-package"
}
```
Firefly automatically extracts `scope: "myorg"` and `name: "awesome-package"`.

**Override for Unscoped Releases:**

```ts
export default {
    name: "awesome-package",
    scope: "", // Explicitly disable scope
};
```

**Custom Naming for Monorepos:**

```ts
// packages/languages/firefly.config.ts
export default {
    name: "languages",
    scope: "project-imperia",
    base: "packages/languages", // Path from repo root
};
```

#### Templating for Release Artifacts

Firefly's templating system enables dynamic content generation across commit messages, tag names, and release titles.

Templates use double-brace syntax and support several powerful variables:

##### Available Template Variables

- `{{name}}`: The complete project name, including scope if present (`@myorg/package` or `package`)
- `{{unscopedName}}`: The project name without scope (`package`)
- `{{version}}`: The new version being released (`1.2.0`)

##### Customizing Commit Messages

Default: `"chore(release): release {{name}}@{{version}}"`

```ts
export default {
    commitMessage: "chore: bump {{name}} version {{version}}",
    // Result: "chore: bump @myorg/package version 1.2.0"
};
```

##### Customizing Tag Names

Default: `"{{name}}@{{version}}"`

```ts
export default {
    tagName: "v{{version}}", // Simple semantic versioning tags
    // Result: "v1.2.0"

    // Or for scoped packages:
    tagName: "{{unscopedName}}-{{version}}",
    // Result: "package-1.2.0"
};
```

##### Customizing Release Titles

Default: `"{{name}}@{{version}}"`

```ts
export default {
    releaseTitle: "Release {{unscopedName}} {{version}}",
    // Result: "Release package 1.2.0"
};
```

##### Customizing Release Notes

```ts
export default {
    releaseNotes: "This release includes important updates to {{unscopedName}}. See changelog for details.",
};
```
> See [git-cliff > Adding Tag Messages](https://git-cliff.org/docs/usage/adding-tag-messages/) on how to include release notes in the changelog.

#### Skipping Release Steps

Firefly provides granular control over which steps to execute, enabling flexible workflows for different scenarios:

**Common Skip Patterns:**

```bash
# Skip changelog
firefly release --skip-changelog

# Skip GitHub release
firefly release --skip-github-release

# Skip commit and tag and push
firefly release --skip-commit --skip-tag --skip-push

# Dry run to preview changes
firefly release --dry-run
```

**Configuration File Approach:**

```ts
export default {
    skipCommit: false,
    skipTag: false,
    skipPush: false,
    skipChangelog: false,
    skipGithubRelease: false,
};
```

### Integrating with git-cliff

Firefly leverages git-cliff's powerful changelog generation capabilities while respecting your existing configuration.

**Configuration Discovery**

Firefly automatically locates `cliff.toml` at the root of your project.

**Basic cliff.toml for conventional commits:**

```toml
[changelog]
header = "# Changelog
"
body = """
{% for group, commits in commits | group_by(attribute="group") %}
### {{ group | upper_first }}
{% for commit in commits %}
- {{ commit.message | upper_first }}
{% endfor %}
{% endfor %}
"""

[git]
conventional_commits = true
filter_unconventional = false
commit_parsers = [
    { message = "^feat", group = "Features" },
    { message = "^fix", group = "Bug Fixes" },
    { message = "^docs", group = "Documentation" },
]
```

> For more customization options, refer to the [git-cliff > Configuration](https://git-cliff.org/docs/configuration).

## License

This project is licensed under the [MIT license](LICENSE).