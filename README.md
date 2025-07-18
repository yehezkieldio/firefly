# Artemis

A CLI orchestrator for automatic semantic versioning, changelog generation, and creating releases.

## Features

- 🚀 **Automatic Semantic Versioning**: Intelligent version bumping based on conventional commits or manual specification
- 📝 **Changelog Generation**: Powered by git-cliff for beautiful, readable changelogs
- 🏷️ **Release Creation**: Automated GitHub/GitLab releases with proper tagging
- 🔄 **Rollback Support**: Comprehensive rollback mechanism for failed operations
- 🏗️ **Monorepo Support**: Works seamlessly with monorepos and multi-package projects
- 🔧 **Configurable**: Flexible configuration via config files or CLI arguments
- 🧪 **Dry Run Mode**: Preview changes before applying them

## Installation

```bash
bun add -g @yehezkieldio/artemis
```

## Quick Start

### Initialize Configuration

```bash
artemis init
```

### Create a Release

```bash
artemis release
```

### Bump Version Only

```bash
artemis bump --release-type patch
```

### Generate Changelog

```bash
artemis changelog
```

## Configuration

Artemis can be configured through:

1. **Config File**: `artemis.config.ts` (recommended)
2. **CLI Arguments**: Override config file settings
3. **Environment Variables**: For tokens and sensitive data

### Example Configuration

```typescript
// artemis.config.ts
export default {
  name: "my-package",
  scope: "my-org",
  repository: "my-org/my-package",
  changelogPath: "CHANGELOG.md",
  bumpStrategy: "auto",
  commitMessage: "chore(release): release {{name}}@{{version}}",
  tagName: "v{{version}}",
  branch: "main",
  releaseLatest: true,
  skipGitHubRelease: false,
};
```

## CLI Commands

### `artemis release`

Create a complete release with version bump, changelog generation, and platform release.

**Options:**
- `--release-type <type>` - Specify release type (major, minor, patch, prerelease, etc.)
- `--dry-run` - Preview changes without applying them
- `--skip-changelog` - Skip changelog generation
- `--skip-github-release` - Skip GitHub release creation
- `--skip-commit` - Skip git commit
- `--skip-tag` - Skip git tag creation
- `--skip-push` - Skip git push

### `artemis bump`

Bump version without creating a release.

**Options:**
- `--release-type <type>` - Specify release type (required)
- `--skip-commit` - Skip git commit
- `--skip-tag` - Skip git tag creation

### `artemis changelog`

Generate changelog without creating a release.

**Options:**
- `--from <version>` - Generate changelog from specific version
- `--to <version>` - Generate changelog to specific version
- `--unreleased` - Generate unreleased changes only

### `artemis config`

Show current configuration.

### `artemis init`

Initialize Artemis configuration.

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Project name | Package.json name |
| `scope` | Organization scope | Auto-detected |
| `repository` | Repository (owner/repo) | Auto-detected |
| `changelogPath` | Changelog file path | `CHANGELOG.md` |
| `bumpStrategy` | Version bump strategy | `auto` |
| `branch` | Target branch | `main` |
| `commitMessage` | Commit message template | `chore(release): release {{name}}@{{version}}` |
| `tagName` | Tag name template | `{{name}}@{{version}}` |
| `releaseTitle` | Release title template | `{{name}}@{{version}}` |

## Authentication

### GitHub

Artemis supports multiple authentication methods for GitHub:

1. **Environment Variable**: `GITHUB_TOKEN`
2. **Config File**: `githubToken` option
3. **CLI Argument**: `--github-token`
4. **GitHub CLI**: Uses `gh` CLI if authenticated

### GitLab

1. **Environment Variable**: `GITLAB_TOKEN`
2. **Config File**: `gitlabToken` option
3. **CLI Argument**: `--gitlab-token`

## Architecture

Artemis follows a clean architecture with:

- **Domain Models**: Core business entities (Version, Release, Changelog, Repository)
- **Ports**: Interfaces for external dependencies
- **Adapters**: Implementations for Git, GitHub, GitLab, and other services
- **Use Cases**: Business logic orchestration
- **Command Pattern**: Reversible operations with rollback support

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Lint and format
bun run lint
bun run format
```

## Built With

- **Bun**: JavaScript runtime and package manager
- **TypeScript**: Type-safe JavaScript
- **Commander.js**: CLI framework
- **git-cliff**: Changelog generation
- **Zod**: Schema validation
- **neverthrow**: Railway-oriented programming

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT © [Yehezkiel Dio Sinolungan](https://github.com/yehezkieldio)
