# Firefly Configuration Guide

This document explains how CLI flags, file configuration, and defaults interact in the rewritten Firefly architecture.

## Table of Contents

1. [Configuration Sources](#configuration-sources)
2. [Priority Order](#priority-order)
3. [Configuration Formats](#configuration-formats)
4. [CLI Flags](#cli-flags)
5. [File Configuration](#file-configuration)
6. [Flexibility and Best Practices](#flexibility-and-best-practices)
7. [Examples](#examples)

---

## Configuration Sources

Firefly can be configured through multiple sources:

1. **Default Values** - Built into command schemas
2. **File Configuration** - From `firefly.config.{ts,js,mjs,json}`
3. **CLI Flags** - Command-line arguments
4. **Environment Variables** - (Future enhancement)

---

## Priority Order

Configuration sources are merged with the following priority (highest to lowest):

```
CLI Flags > File Configuration > Schema Defaults
```

**Example:**
- Schema default: `dryRun: false`
- File config: `dryRun: true`
- CLI flag: `--dry-run`
- **Result:** `dryRun: true` (CLI flag wins)

---

## Configuration Formats

### Schema Defaults

Each command defines its schema with default values:

```typescript
// commands/release/config.ts
export const ReleaseConfigSchema = z.object({
    releaseType: z.enum(["patch", "minor", "major"]).optional(),
    generateChangelog: z.boolean().default(true),
    createTag: z.boolean().default(true),
    push: z.boolean().default(true),
    remoteName: z.string().default("origin"),
    branchName: z.string().default("main"),
    // ... more options
});
```

**Defaults are applied when:**
- No file config provided
- No CLI flag provided
- Field is optional

---

## CLI Flags

### Global Flags

Available to all commands:

```bash
firefly <command> [options]

Global Options:
  -c, --config <path>       Path to configuration file
  --dry-run                 Run without making actual changes
  --verbose                 Enable verbose logging
  --no-enable-rollback      Disable automatic rollback on failure
  -h, --help               Display help
  -V, --version            Display version
```

### Command-Specific Flags

Each command has its own flags derived from its schema:

```bash
# Release command
firefly release [options]

Options:
  --release-type <value>          Release type (patch, minor, major)
  --bump-strategy <value>         Bump strategy (automatic, manual, prompt)
  --manual-version <value>        Manual version to use
  --no-generate-changelog         Disable changelog generation
  --cliff-config-path <value>     Path to cliff.toml
  --no-create-tag                 Disable git tag creation
  --no-push                       Disable push to remote
  --remote-name <value>           Remote name (default: "origin")
  --branch-name <value>           Branch name (default: "main")
  --create-release                Create platform release
  --release-platform <value>      Platform (github, gitlab)
  --release-latest                Mark as latest release
  --release-pre-release           Mark as pre-release
  --release-draft                 Mark as draft
  --skip-git                      Skip git operations
```

```bash
# Autocommit command
firefly autocommit [options]

Options:
  --provider <value>              AI provider (azure-ai, openai, anthropic)
  --api-endpoint <value>          API endpoint
  --api-key <value>               API key
  --model <value>                 Model/deployment name
  --temperature <number>          Temperature (0-1)
  --max-tokens <number>           Maximum tokens
  --system-prompt-path <value>    Path to system prompt
  --no-include-diff               Exclude diff from prompt
  --max-diff-length <number>      Max diff length
  --no-detect-breaking-changes    Disable breaking change detection
  --commit-types <items...>       Commit types to consider
  --no-require-approval           Skip approval prompt
  --no-allow-edit                 Disable message editing
  --auto-stage                    Auto-stage all changes
  --no-include-recent-commits     Exclude recent commits context
  --recent-commits-count <number> Number of recent commits
```

```bash
# Commit command
firefly commit [options]

Options:
  --cliff-config-path <value>     Path to cliff.toml
  --no-show-emoji                 Hide emoji in type selection
  --no-prompt-for-scope           Skip scope prompt
  --no-prompt-for-body            Skip body prompt
  --prompt-for-footer             Enable footer prompt
  --no-prompt-for-breaking        Skip breaking changes prompt
  --max-subject-length <number>   Max subject length
  --max-body-line-length <number> Max body line length
  --no-validate-format            Skip format validation
  --auto-stage                    Auto-stage changes
  --no-show-preview               Skip preview
  --no-require-confirmation       Skip confirmation
```

### Flag Naming Convention

- **Camel case in schema** → **kebab-case in CLI**
  - `generateChangelog` → `--generate-changelog`
  - `releaseType` → `--release-type`

- **Boolean defaults**:
  - `default(true)` → `--no-flag` to disable
  - `default(false)` → `--flag` to enable

---

## File Configuration

### File Locations

Firefly looks for configuration files in this order:

1. Path specified by `--config` flag
2. `firefly.config.ts`
3. `firefly.config.js`
4. `firefly.config.mjs`
5. `firefly.config.json`

### Flat Structure (Simple)

All configuration at root level:

```typescript
// firefly.config.ts
import { defineConfig } from "firefly/config";

export default defineConfig({
    // Global options
    dryRun: false,
    verbose: true,
    enableRollback: true,

    // Release options
    releaseType: "patch",
    generateChangelog: true,
    createRelease: false,
    remoteName: "origin",
    branchName: "main",

    // Autocommit options
    provider: "azure-ai",
    requireApproval: true,
    autoStage: false,

    // Commit options
    showEmoji: true,
    promptForBody: true,
});
```

**Pros:**
- ✅ Simple and concise
- ✅ Easy to understand
- ✅ Good for small configs

**Cons:**
- ❌ All commands share the same config
- ❌ Can't have command-specific overrides

### Nested Structure (Flexible)

Command-specific configuration sections:

```typescript
// firefly.config.ts
import { defineConfig } from "firefly/config";

export default defineConfig({
    // Global options apply to all commands
    dryRun: false,
    verbose: true,
    enableRollback: true,

    // Release-specific configuration
    release: {
        releaseType: "patch",
        generateChangelog: true,
        createRelease: true,
        releasePlatform: "github",
        releaseLatest: true,
        remoteName: "origin",
        branchName: "main",
    },

    // Autocommit-specific configuration
    autocommit: {
        provider: "azure-ai",
        requireApproval: true,
        allowEdit: true,
        autoStage: false,
        includeRecentCommits: true,
        recentCommitsCount: 5,
    },

    // Commit-specific configuration
    commit: {
        showEmoji: true,
        promptForScope: true,
        promptForBody: true,
        promptForBreaking: true,
        requireConfirmation: true,
        maxSubjectLength: 72,
    },
});
```

**Pros:**
- ✅ Clear separation between commands
- ✅ Different configs per command
- ✅ Global options still apply
- ✅ Easier to maintain

**Cons:**
- ❌ More verbose

### Hybrid Structure (Recommended)

Mix of shared and command-specific:

```typescript
// firefly.config.ts
import { defineConfig } from "firefly/config";

export default defineConfig({
    // Shared across all commands
    verbose: true,
    enableRollback: true,

    // Release-specific
    release: {
        generateChangelog: true,
        createRelease: true,
        releasePlatform: "github",
    },

    // Autocommit-specific
    autocommit: {
        provider: "openai",
        requireApproval: true,
    },

    // Commit uses defaults for most options
    commit: {
        showEmoji: true,
    },
});
```

**This is the recommended approach** for most use cases.

---

## Flexibility and Best Practices

### Question: Do CLI flags map directly to file config?

**Answer:** Yes, with flexibility:

1. **Direct Mapping** - Most flags have 1:1 correspondence
   ```bash
   # CLI flag
   --release-type patch

   # File config (equivalent)
   releaseType: "patch"
   ```

2. **File Config Can Be More Expressive**
   ```typescript
   // File config can include complex values
   commitTypes: [
       { type: "feat", description: "A new feature", emoji: "✨" },
       { type: "fix", description: "A bug fix", emoji: "🐛" },
   ]

   // CLI would need multiple flags or JSON
   --commit-types feat fix docs
   ```

3. **File Config Supports Comments**
   ```typescript
   {
       // Use GitHub for releases
       releasePlatform: "github",

       // Always create as draft first
       releaseDraft: true,
   }
   ```

### Question: Can file config have fields not available as CLI flags?

**Answer:** Yes! File config is validated against the command schema, not limited to CLI flags.

**Example:**
```typescript
// This is valid in file config even if not a CLI flag
{
    release: {
        // Custom validation rules (if schema supports it)
        customField: "value",

        // Complex nested objects
        githubOptions: {
            owner: "myorg",
            repo: "myrepo",
        },
    }
}
```

The schema is the source of truth - if the schema accepts it, file config can include it.

### Best Practices

#### 1. Use File Config for Stable Settings

Put rarely-changed settings in file config:

```typescript
{
    release: {
        remoteName: "origin",
        branchName: "main",
        cliffConfigPath: "cliff.toml",
    }
}
```

#### 2. Use CLI Flags for Variable Settings

Use flags for settings that change per run:

```bash
# Different release types
firefly release --release-type major

# Dry run for testing
firefly release --dry-run

# Skip certain steps
firefly release --no-push
```

#### 3. Combine Both

File config for defaults, CLI for overrides:

```typescript
// firefly.config.ts
{
    release: {
        generateChangelog: true,
        createRelease: true,
    }
}
```

```bash
# Override for this run only
firefly release --no-create-release
```

#### 4. Use Nested Config for Multi-Command Projects

```typescript
{
    // All commands use verbose mode
    verbose: true,

    // But different settings per command
    release: {
        createRelease: true,
    },
    commit: {
        showEmoji: false,  // Different from release
    },
}
```

#### 5. Version Control File Config, Not Secrets

```typescript
// ✅ Good - commit to git
{
    release: {
        releasePlatform: "github",
        remoteName: "origin",
    }
}

// ❌ Bad - use environment variables instead
{
    autocommit: {
        apiKey: "sk-secret-key-here",  // Don't commit!
    }
}
```

For secrets, use environment variables:

```typescript
{
    autocommit: {
        // Reference env var in code, not in config
        provider: "openai",
    }
}
```

---

## Examples

### Example 1: Release with File Config

**File: firefly.config.ts**
```typescript
export default {
    release: {
        generateChangelog: true,
        createRelease: true,
        remoteName: "origin",
        branchName: "main",
    },
};
```

**Command:**
```bash
# Uses file config defaults
firefly release

# Override specific option
firefly release --release-type major

# Dry run with file config
firefly release --dry-run
```

### Example 2: Autocommit with CLI Only

**No file config, all via CLI:**
```bash
firefly autocommit \
  --provider openai \
  --model gpt-4 \
  --no-require-approval \
  --auto-stage
```

### Example 3: Mixed Approach

**File: firefly.config.ts**
```typescript
export default {
    verbose: true,
    enableRollback: true,

    autocommit: {
        provider: "azure-ai",
        temperature: 0.3,
        maxTokens: 500,
        requireApproval: true,
    },
};
```

**Command:**
```bash
# Use file config but override approval
firefly autocommit --no-require-approval

# Use different provider for this run
firefly autocommit --provider openai
```

### Example 4: Multi-Environment Configs

**Development:**
```typescript
// firefly.dev.config.ts
export default {
    dryRun: true,  // Always dry run in dev
    verbose: true,
    release: {
        skipGit: true,
        createRelease: false,
    },
};
```

```bash
firefly release --config firefly.dev.config.ts
```

**Production:**
```typescript
// firefly.prod.config.ts
export default {
    dryRun: false,
    release: {
        createRelease: true,
        releaseLatest: true,
    },
};
```

```bash
firefly release --config firefly.prod.config.ts
```

---

## Configuration Validation

All configuration (file and CLI) is validated against command schemas:

```typescript
// If schema requires a string
releaseType: z.enum(["patch", "minor", "major"])

// These are invalid:
releaseType: "huge"           // ❌ Not in enum
releaseType: 123              // ❌ Wrong type

// These are valid:
releaseType: "patch"          // ✅
releaseType: "major"          // ✅
```

**Validation happens:**
1. When loading file config
2. When parsing CLI flags
3. Before command execution

**Validation errors show:**
- Which field is invalid
- What was provided
- What was expected

---

## Summary

### Configuration Flow

```
1. Load Schema Defaults
   ↓
2. Load File Config (if exists)
   ↓
3. Merge with CLI Flags (CLI wins)
   ↓
4. Validate Against Schema
   ↓
5. Execute Command
```

### Key Principles

1. **CLI flags always override file config**
2. **File config can be more expressive than CLI**
3. **Schema is the source of truth**
4. **Both flat and nested config structures are supported**
5. **Command-specific configs can coexist with global settings**

### Recommendations

- ✅ Use file config for stable, team-wide settings
- ✅ Use CLI flags for per-run overrides
- ✅ Use nested structure for multi-command projects
- ✅ Keep secrets out of config files
- ✅ Commit config files to version control
- ✅ Use different configs for different environments

---

## TypeScript Support

Full type safety with `defineConfig`:

```typescript
import { defineConfig } from "firefly/config";

// TypeScript will validate this
export default defineConfig({
    release: {
        releaseType: "patch",     // ✅ Valid
        invalidField: true,       // ❌ TypeScript error
    },
});
```

---

## Future Enhancements

Potential additions:

1. **Environment Variable Support**
   ```
   FIREFLY_RELEASE_TYPE=patch
   FIREFLY_DRY_RUN=true
   ```

2. **Config Presets**
   ```typescript
   import { presets } from "firefly/config";
   export default presets.github;
   ```

3. **Config Inheritance**
   ```typescript
   import base from "./firefly.base.config";
   export default {
       ...base,
       release: { ...base.release, createRelease: true },
   };
   ```

4. **Interactive Config Generator**
   ```bash
   firefly init --interactive
   ```
