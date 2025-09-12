<div align="center">

<img src=".github/assets/firefly.jpg" align="center" width="150px" height="200px">

<h3>Firefly</h3>
<p>Automatic semantic versioning, changelog generation, and creating GitHub releases via a CLI.</p>

</div>

---

Firefly is a Command Line Interface (CLI) tool designed to streamline and automate the entire release process of semantic versioning, changelog generation, and a GitHub release, ensuring consistent and efficient steps for me and possibly for you too. It is built on the principles of [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) to deliver predictable versioning and clear, structured commit history for any project.

**How It Works:**

- Runs preflight checks to ensure a safe environment
- Determines the next version automatically from commit history or via manual selection
- Bumps the version in `package.json`
- Generates changelogs with [git-cliff](https://github.com/orhun/git-cliff)
- Commits the changes and creates a Git tag
- Pushes the changes to the remote repository
- Creates a GitHub release with the generated changelog via GitHub CLI

## Getting Started

#### Prerequisites

Firefly requires [Bun](https://bun.sh/) and the [GitHub CLI](https://cli.github.com/) installed and authenticated.


#### Per-Project Installation

For project-specific installations, add Firefly as a development dependency:

```bash
bun add -D fireflyy
```

#### Global Installation

For system-wide access across multiple projects:

```bash
bun install -g fireflyy
```

### Usage

#### The release Command

Firefly consolidates the entire release steps into a single command that orchestrates version bumping, changelog generation, and GitHub release creation.

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
- **Branch**: Current Git branch

These inferred values provide sensible defaults but can be overridden through CLI flags or from the configuration file.

#### Command Line Options Reference

```bash
Usage: firefly release [options]

Bump a new version, generate a changelog, and publish the release.

Options:
  --ci                                   Run in CI environment.
  --repository <repository>              Repo in 'owner/repo' format, auto-detected if omitted. (default: "")
  --verbose                              Enable verbose logging.
  --dry-run                              Simulate execution without changes.
  --branch <branch>                      Branch to run on, defaults to current.
  --name <name>                          Unscoped project name. Auto-detected from package.json.
  --scope <scope>                        Org/user scope without "@". Auto-detected from package.json.
  --base <base>                          Relative path from repository root to project root. Useful for monorepos. (default: "")
  --changelog-path <changelog-path>      Changelog file path, relative to project root. (default: "CHANGELOG.md")
  --bump-strategy <bump-strategy>        "auto" (from commits) or "manual" (user-specified). (default: "")
  --release-type <release-type>          The release type to bump.
  --pre-release-id <pre-release-id>      Pre-release ID (e.g., "alpha", "beta"). (default: "alpha")
  --pre-release-base <pre-release-base>  Starting version for pre-releases.
  --release-notes <release-notes>        Custom release notes for changelog. (default: "")
  --commit-message <commit-message>      Commit message template with placeholders. (default: "chore(release): release {{name}}@{{version}}")
  --tag-name <tag-name>                  Tag name template with placeholders. (default: "{{name}}@{{version}}")
  --skip-bump                            Skip version bump step.
  --skip-changelog                       Skip changelog generation step.
  --skip-push                            Skip push step.
  --skip-github-release                  Skip GitHub release step.
  --skip-git                             Skip all git-related steps.
  --skip-preflight-check                 Skip preflight checks.
  --release-title <release-title>        GitHub release title with placeholders. (default: "{{name}}@{{version}}")
  --release-latest                       Mark as latest release.
  --release-pre-release                  Mark as pre-release.
  --release-draft                        Release as draft version.
  -h, --help                             display help for command
```

#### Version Bumping Strategies

Firefly offers two primary strategies for version determination.

##### Automatic Strategy (`--bump-strategy auto`)

The automatic strategy analyzes your commit history using conventional commit standards to determine the appropriate version increment.

**How It Works:**

Firefly's automatic versioning follows a three-stage process:

1. Fetches all commits since the last Git tag (or all commits if no tags exist)
2. Parses each commit using conventional commit patterns to extract type, scope, and breaking change indicators
3. Determines the appropriate version level based on the highest-impact change detected

**Version Level Determination:**

The system prioritizes changes in the following hierarchy:

- **MAJOR (0)**: Breaking changes take absolute precedence
  - Commits with `BREAKING CHANGE:` footer
  - Commits with `!` after type/scope (e.g., `feat!:`, `fix(api)!:`)
  - Scoped breaking changes

- **MINOR (1)**: New features when no breaking changes exist
  - `feat:` commit types

- **PATCH (2)**: Bug fixes and maintenance when no features or breaking changes exist
  - `fix:`, `perf:`, `refactor:`, `style:`, `test:`, `build:`, `ci:`, `chore:`, `docs:`, `security:`

**Commit Analysis:**

The analyzer performs deep inspection of commit metadata:

- Scans commit headers, bodies, and footers for breaking change indicators
-  Identifies commits indicating graduation from pre-release to stable versions
- Properly categorizes revert commits based on what they're reverting

**Repository State Handling:**

- When no Git tags exist, Firefly can either analyze all commits or default to patch increment
- If no commits exist since the last tag, defaults to patch increment for safety
- Always selects the highest-impact change (breaking > feature > patch)

> [!NOTE]
> Analyzer customization is planned for future releases, allowing tailored commit parsing rules and more.

---

##### Manual Strategy (`--bump-strategy manual`)

The manual strategy presents you with a generated list of potential version increments based on your current version.

<!-- ```bash
❯ Select version bump
● prerelease (3.0.0-alpha.21)
○ graduate (3.0.0)
○ patch (3.0.1)
○ minor (3.1.0)
○ major (4.0.0)
```

You can bypass the prompt by specifying the desired release type directly:

```bash
firefly release --release-type minor # 1.0.0 → 1.1.0
``` -->

- **Prompt**: Interactive selection of the desired version bump
  ```bash
  ❯ Select version bump
  ● prerelease (3.0.0-alpha.21)
  ○ graduate (3.0.0)
  ○ patch (3.0.1)
  ○ minor (3.1.0)
  ○ major (4.0.0)
  ```

- **Direct Specification**: Use `--release-type` to specify the desired bump directly
    ```bash
    firefly release --release-type minor # 1.0.0 → 1.1.0
    ```

##### Bumping Pre-Release Versions

Firefly supports comprehensive pre-release versioning for testing and staging workflows.

Pre-release versions follow the pattern `major.minor.patch-identifier.number`:

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

Firefly's configuration system centers around the `firefly.config.ts` file, that should be placed at the root of your project. By default, Firefly doesn't require a configuration file, but it can be used to customize behavior and defaults.

#### Basic Configuration Structure

```ts
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
};
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

Or `--release-notes` flag to provide custom release notes directly via CLI.

> See [git-cliff > Adding Tag Messages](https://git-cliff.org/docs/usage/adding-tag-messages/) on how to include release notes in the changelog.

#### Skipping Release Steps

Firefly provides granular control over which steps to execute, enabling flexible workflows for different scenarios:

**Common Skip Patterns:**

```bash
# Skip changelog
firefly release --skip-changelog

# Skip GitHub release
firefly release --skip-github-release

# Dry run to preview changes
firefly release --dry-run
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