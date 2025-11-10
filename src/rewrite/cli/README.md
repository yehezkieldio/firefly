# Firefly CLI

This directory contains the CLI initialization and configuration management for the rewritten Firefly architecture.

## Overview

The CLI module provides:

1. **Command Registration** - Automatic registration of commands from the command registry
2. **Option Management** - Automatic CLI flag generation from Zod schemas
3. **Configuration Loading** - File-based configuration with CLI override support
4. **Execution Flow** - Command execution through the workflow orchestrator

## Files

### `main.ts`

Entry point for the CLI application. Run with:

```bash
bun src/rewrite/cli/main.ts <command> [options]
```

**Responsibilities:**
- Environment setup
- Version information
- Error handling
- CLI initialization

### `commander.ts`

CLI program setup using Commander.js.

**Responsibilities:**
- Create CLI program
- Register commands
- Register options
- Execute commands
- Merge configuration sources

**Key Functions:**
- `createFireflyCLI()` - Creates and configures the CLI program
- `registerCommand()` - Registers a single command
- `executeCommand()` - Executes a command with configuration
- `logVersionInfo()` - Displays version information

### `config-loader.ts`

Configuration file loader using c12.

**Responsibilities:**
- Load configuration from file
- Support multiple file formats (.ts, .js, .mjs, .json)
- Extract command-specific config
- Merge base and command-specific config

**Key Classes:**
- `ConfigLoader` - Loads and processes configuration files

**Supported Files:**
- `firefly.config.ts`
- `firefly.config.js`
- `firefly.config.mjs`
- `firefly.config.json`
- Custom path via `--config` flag

### `options-registrar.ts`

Automatic CLI option generation from Zod schemas.

**Responsibilities:**
- Register global options
- Generate command-specific options from schemas
- Handle different Zod types
- Convert camelCase to kebab-case

**Key Classes:**
- `OptionsRegistrar` - Registers CLI options

**Supported Zod Types:**
- `ZodBoolean` → `--flag` or `--no-flag`
- `ZodString` → `--flag <value>`
- `ZodNumber` → `--flag <number>`
- `ZodEnum` → `--flag <value>` with choices
- `ZodArray` → `--flag <items...>`
- `ZodOptional`, `ZodNullable`, `ZodDefault` → Unwrapped

### `types.ts`

TypeScript type definitions for CLI.

**Key Types:**
- `CLIOptions` - Base CLI options (config, dryRun, verbose, etc.)
- `CommandConfig` - Configuration structure for file configs

### `CONFIG_GUIDE.md`

Comprehensive guide on configuration management.

**Contents:**
- Configuration sources and priority
- CLI flags reference
- File configuration formats
- Best practices
- Examples

## Architecture

### Configuration Flow

```
┌─────────────────┐
│  Schema Defaults│
│  (from commands)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  File Config    │
│  (firefly.config)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CLI Flags      │
│  (highest priority)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validation     │
│  (against schema)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Execute Command│
└─────────────────┘
```

### Command Execution Flow

```
1. User runs: firefly release --dry-run
   │
   ▼
2. CLI parses arguments
   │
   ▼
3. Load file config (if exists)
   │
   ▼
4. Merge: file config + CLI flags
   │
   ▼
5. Get command from registry
   │
   ▼
6. Create WorkflowOrchestrator
   │
   ▼
7. Execute command with merged config
   │
   ▼
8. Display results / handle errors
```

## Usage

### Running Commands

```bash
# Run with defaults
bun src/rewrite/cli/main.ts release

# With CLI flags
bun src/rewrite/cli/main.ts release --dry-run --verbose

# With custom config file
bun src/rewrite/cli/main.ts release --config my-config.ts

# Autocommit command
bun src/rewrite/cli/main.ts autocommit --provider openai

# Commit command
bun src/rewrite/cli/main.ts commit --auto-stage
```

### Global Options

Available to all commands:

```bash
-c, --config <path>       # Path to configuration file
--dry-run                 # Run without making changes
--verbose                 # Enable verbose logging
--no-enable-rollback      # Disable rollback on failure
-h, --help               # Display help
-V, --version            # Display version
```

### Configuration File

Create `firefly.config.ts` in your project root:

```typescript
import { defineConfig } from "firefly/config";

export default defineConfig({
    // Global options
    verbose: true,
    enableRollback: true,

    // Command-specific
    release: {
        generateChangelog: true,
        createRelease: true,
    },

    autocommit: {
        provider: "azure-ai",
        requireApproval: true,
    },

    commit: {
        showEmoji: true,
        promptForBody: true,
    },
});
```

## Design Decisions

### Why Commander.js?

- ✅ Mature and widely used
- ✅ Good TypeScript support
- ✅ Flexible option parsing
- ✅ Built-in help generation
- ✅ Already used in existing Firefly

### Why c12 for Config Loading?

- ✅ Supports multiple formats (.ts, .js, .json)
- ✅ TypeScript config support out of the box
- ✅ Jiti for TypeScript runtime
- ✅ Package.json loading (if needed)
- ✅ Used by modern tools (Nuxt, UnJS ecosystem)

### Why Automatic Option Generation?

- ✅ DRY - Options derived from schemas
- ✅ Type-safe - Schema is source of truth
- ✅ Maintainable - Add schema field, get CLI flag
- ✅ Consistent - Same naming conventions

### Why Support Both Flat and Nested Config?

- ✅ Flexibility - Simple projects use flat, complex use nested
- ✅ Migration - Easy to start flat, grow to nested
- ✅ Clarity - Nested makes command separation obvious

## Integration

### Adding a New Command

1. **Create command** in `commands/`:
   ```typescript
   // commands/my-command/index.ts
   export const myCommand = createCommand({
       meta: {
           name: "my-command",
           configSchema: MyConfigSchema,
       },
       buildTasks: (ctx) => { /* ... */ },
   });
   ```

2. **Register in CLI**:
   ```typescript
   // cli/commander.ts
   import { myCommand } from "#/rewrite/commands/my-command";

   commandRegistry.register(myCommand);
   ```

3. **CLI flags are automatic!**
   ```bash
   firefly my-command --help  # Shows auto-generated flags
   ```

### Customizing Option Generation

If automatic generation doesn't work for a field:

```typescript
// In options-registrar.ts
private createOption(key: string, zodType: any) {
    // Add custom handling
    if (key === "mySpecialField") {
        return { flags: "--special", description: "Special flag" };
    }
    // ... existing logic
}
```

## Testing

### Manual Testing

```bash
# Test help
bun src/rewrite/cli/main.ts --help
bun src/rewrite/cli/main.ts release --help

# Test command execution
bun src/rewrite/cli/main.ts release --dry-run --verbose

# Test config loading
echo "export default { verbose: true }" > test.config.ts
bun src/rewrite/cli/main.ts release --config test.config.ts
```

### Unit Testing (Future)

```typescript
import { createFireflyCLI } from "./commander";

describe("CLI", () => {
    it("should register commands", () => {
        const cli = createFireflyCLI();
        expect(cli.commands.map(c => c.name())).toContain("release");
    });
});
```

## Future Enhancements

1. **Environment Variables**
   - Support `FIREFLY_*` env vars
   - Override config and CLI

2. **Config Validation**
   - Validate on load
   - Show clear error messages

3. **Interactive Mode**
   - `firefly --interactive`
   - Prompt for all options

4. **Config Generator**
   - `firefly init`
   - Generate config file

5. **Completion**
   - Shell completion scripts
   - Generate with `firefly completion bash`

6. **Aliases**
   - Short command aliases
   - `ff` instead of `firefly`

## Troubleshooting

### "Command not found"

Make sure command is registered in `commander.ts`:

```typescript
commandRegistry.register(myCommand);
```

### "Config file not found"

Check file name and location:
- Must be `firefly.config.{ts,js,mjs,json}`
- Must be in CWD or specified with `--config`

### "Invalid configuration"

Check schema validation errors:
- Type mismatch (string vs number)
- Missing required fields
- Invalid enum values

### "CLI flag not working"

Check:
- Flag name is kebab-case version of schema field
- Field is not in skipFields list
- Schema field type is supported

## Related Documentation

- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - Configuration management guide
- [../commands/README.md](../commands/README.md) - Command documentation
- [../README.md](../README.md) - Architecture overview
