# Project Overview & General Execution Flow

## Introduction to the Codebase

### Purpose
Firefly is a CLI orchestrator for automatic semantic versioning, changelog generation, and release management. The rewritten architecture focuses on:

- **Plugin-based commands** - Self-registering commands with zero core modifications
- **Immutable context** - Fork-based updates preventing mutation bugs
- **Function-based tasks** - 50% less boilerplate than class-based approach
- **Runtime adaptability** - Tasks skip intelligently based on configuration
- **Type-safe throughout** - Result types eliminate exception handling

### Key Value Proposition

**For Users:**
- Single command to bump version, generate changelog, and create releases
- AI-powered commit message generation
- Interactive conventional commit creation
- Dry-run mode to preview changes
- Type-safe configuration with validation

**For Developers:**
- Easy to add new commands (single file, no core changes)
- Reusable tasks and services
- Comprehensive test suite
- Clear separation of concerns
- Predictable execution flow

### Scope

**Three Core Commands:**

1. **`firefly release`** - Automated versioning and release creation
   - Analyze commits for semantic versioning
   - Generate changelogs with git-cliff
   - Create GitHub/GitLab releases
   - Tag and push to remote

2. **`firefly autocommit`** - AI-generated commit messages
   - Analyze staged changes
   - Generate conventional commits using AI (Azure/OpenAI/Anthropic)
   - Context-aware with system prompts
   - Interactive approval workflow

3. **`firefly commit`** - Interactive commit creation
   - Guided prompts for commit type, scope, message
   - Conventional commit format validation
   - Auto-parse cliff.toml for commit types
   - Emoji support

## General Execution Flow

### High-Level Flow

```
User Input (CLI)
    ↓
CLI Parser (Commander.js)
    ↓
Config Loader (merge file + CLI flags)
    ↓
Command Registry (lookup command)
    ↓
Workflow Orchestrator
    ↓
Command.buildTasks() → Task[]
    ↓
Task Registry (resolve dependencies, topological sort)
    ↓
Workflow Executor (sequential execution)
    ↓
For each task:
    - Check skip conditions
    - Execute task
    - Fork context with results
    - Handle errors (rollback if needed)
    ↓
Return final context or error
    ↓
Display results to user
```

### Detailed Execution Path

#### 1. CLI Entry Point (`cli/main.ts`)

```typescript
// User runs: bun src/rewrite/cli/main.ts release --dry-run

1. Parse CLI arguments with Commander.js
2. Extract command name ("release")
3. Extract global options (--dry-run, --verbose, --config)
4. Extract command-specific options (--bump-strategy, --manual-version, etc.)
```

#### 2. Configuration Loading (`cli/config-loader.ts`)

```typescript
1. Look for config file (firefly.config.ts/js/json)
2. Load file config using c12 (supports TypeScript)
3. Merge configs with priority:
   CLI flags (highest) > File config > Schema defaults (lowest)
4. Validate against command's Zod schema
5. Report validation errors if any
6. Return validated config object
```

#### 3. Command Lookup (`command-registry/command-registry.ts`)

```typescript
1. CommandRegistry.get("release")
2. Returns Command object with:
   - meta: { name, description, configSchema }
   - buildTasks: (ctx) => Task[]
3. If not found, show "Unknown command" error
```

#### 4. Workflow Orchestration (`execution/workflow-orchestrator.ts`)

```typescript
1. Create initial WorkflowContext with:
   - config: validated config object
   - data: {} (empty, tasks will populate)

2. Call command.buildTasks(context)
   - Command returns array of Task objects
   - Tasks have dependencies declared

3. Pass tasks to WorkflowExecutor
```

#### 5. Task Resolution (`task-system/task-registry.ts`)

```typescript
1. Register all tasks in TaskRegistry
2. Build dependency graph
3. Detect circular dependencies (error if found)
4. Perform topological sort for execution order
5. Return ordered task list
```

#### 6. Sequential Execution (`execution/workflow-executor.ts`)

```typescript
For each task in order:
    1. Evaluate shouldSkip(context)
       - If skip: log skip reason, continue to next
       - If error: abort execution

    2. Execute task.execute(context)
       - Returns Result<newContext, Error>
       - New context is forked (immutable)

    3. Handle result:
       - If Ok: use new context for next task
       - If Err: 
           a. Log error
           b. If rollback enabled, call undo() on completed tasks in reverse
           c. Stop execution
           d. Return error

    4. Continue to next task with updated context

Return final context after all tasks complete
```

#### 7. Result Display

```typescript
1. If execution succeeded:
   - Display summary (version bumped, files changed, etc.)
   - If dry-run: show what would have happened
   - Exit code 0

2. If execution failed:
   - Display error message
   - Show which task failed
   - If rollback happened, show restored state
   - Exit code 1
```

### Example: Release Command Flow

```
$ firefly release --bump-strategy automatic --dry-run

1. CLI parses: command="release", options={ bumpStrategy: "automatic", dryRun: true }

2. Config loads:
   - file config: { generateChangelog: true, createRelease: true }
   - merged: { bumpStrategy: "automatic", dryRun: true, generateChangelog: true, ... }

3. Get release command from registry

4. Create initial context: { config: {...}, data: {} }

5. Build tasks:
   [
     createGitRepositoryCheckTask(),
     createInitVersionTask(),
     createCalculateVersionTask(),      // Will run (automatic)
     createSetManualVersionTask(),      // Will skip (not manual)
     createUpdateVersionTask(),
     createGenerateChangelogTask(),
     createStageChangesTask(),
     createCommitTask(),
     createTagTask(),
     createPushTask(),
     createPlatformReleaseTask(),
   ]

6. Resolve dependencies and sort

7. Execute tasks sequentially:
   a. Git check: verify repository → OK
   b. Init version: load from package.json → ctx.data.currentVersion = "1.0.0"
   c. Calculate: analyze commits → ctx.data.nextVersion = "1.1.0", bumpType = "minor"
   d. Set manual: SKIP (bumpStrategy !== "manual")
   e. Update: write package.json (dry-run: record action, don't write)
   f. Changelog: run git-cliff (dry-run: record action)
   g. Stage: git add (dry-run: record action)
   h. Commit: git commit (dry-run: record action)
   i. Tag: git tag (dry-run: record action)
   j. Push: git push (dry-run: record action)
   k. Release: GitHub API (dry-run: record action)

8. Display dry-run report:
   ========================================
   DRY RUN REPORT
   ========================================
   
   VERSION BUMP:
     • 1.0.0 → 1.1.0 (minor)
   
   FILE Operations:
     • update package.json
     • update CHANGELOG.md
   
   GIT Operations:
     • commit "chore: release v1.1.0"
     • tag v1.1.0
     • push origin main --tags
   
   API Calls:
     • Create GitHub release v1.1.0
   
   Total: 7 action(s) planned
   
   (Not executed - dry run mode)
```

## Context Flow

### Immutable Context Pattern

```typescript
// Initial context
ctx1 = { config: {...}, data: {} }

// Task 1: Load version
ctx2 = ctx1.fork("currentVersion", "1.0.0")
// ctx1 unchanged, ctx2 has currentVersion

// Task 2: Calculate next version
ctx3 = ctx2.forkMultiple({
    nextVersion: "1.1.0",
    bumpType: "minor",
    commits: [...]
})
// ctx2 unchanged, ctx3 has all three fields

// Task 3: Update package.json
ctx4 = ctx3.fork("versionUpdated", true)
// ctx3 unchanged, ctx4 has versionUpdated flag

// Each task receives previous context, returns new context
// No mutations, predictable state flow
```

## Key Architectural Decisions

### Why Plugin-Based Commands?

**Problem:** Old architecture required modifying core files to add commands
- Hardcoded `CommandName` enum
- Manual registration in multiple places
- Tight coupling between commands and core

**Solution:** Commands register themselves
- Single file per command
- No core modifications needed
- Dynamic discovery via registry

### Why Function-Based Tasks?

**Problem:** Class-based tasks had too much boilerplate
- 20+ lines just for structure
- Manual dependency wiring
- Complex inheritance hierarchies

**Solution:** Tasks as functions with metadata
- 5 lines for simple task
- Declarative dependencies
- Composition over inheritance

### Why Immutable Context?

**Problem:** Mutable context led to bugs
- Tasks could modify shared state
- Side effects were unpredictable
- Hard to debug and test

**Solution:** Fork-based updates
- Each task receives immutable context
- Returns new context with changes
- Previous contexts unchanged
- Predictable state flow

### Why Sequential Execution?

**Problem:** Parallel execution added complexity
- Race conditions
- Complex dependency resolution
- Unpredictable behavior

**Solution:** Simple sequential executor
- One task at a time
- Clear execution order
- Easy to debug
- Predictable behavior

## Performance Characteristics

### CLI Startup Time
- **Cold start:** ~50-100ms (Bun is fast)
- **Config loading:** ~10-20ms
- **Task resolution:** ~5-10ms

### Execution Time (Release Command)
- **Version calculation:** ~50ms (git log parsing)
- **Changelog generation:** ~200-500ms (git-cliff)
- **Git operations:** ~100-300ms (commit, tag, push)
- **Platform release:** ~500-1000ms (API calls)
- **Total:** ~1-2 seconds for full release

### Memory Usage
- **Base:** ~30MB
- **With tasks:** ~50-80MB
- **Peak (changelog):** ~100-150MB

### Test Suite Performance
- **Unit tests:** ~0.1-0.3s (50+ tests)
- **Integration tests:** ~0.5-1s (10+ tests)
- **Full suite:** ~0.6-1.3s (Bun is fast!)

## Error Handling Philosophy

### Result Types Over Exceptions

```typescript
// ❌ Old way (exceptions)
try {
    const version = parseVersion(input);
    const bumped = bumpVersion(version, "major");
    return bumped;
} catch (error) {
    // Handle error
}

// ✅ New way (Result types)
const versionResult = parseVersion(input);
if (versionResult.isErr()) {
    return err(versionResult.error);
}

const bumpResult = bumpVersion(versionResult.value, "major");
if (bumpResult.isErr()) {
    return err(bumpResult.error);
}

return ok(bumpResult.value);

// Or with neverthrow combinators
return parseVersion(input)
    .andThen(v => bumpVersion(v, "major"));
```

### Benefits
- Type-safe error handling
- No forgotten catch blocks
- Clear error propagation
- Easy to compose
- Testable error paths

## Next Steps

Continue to:
- **[02-ARCHITECTURE](./02-ARCHITECTURE.md)** - Deep dive into architecture
- **[03-CORE-CONCEPTS](./03-CORE-CONCEPTS.md)** - Essential concepts and terminology
- **[04-CONTRIBUTING](./04-CONTRIBUTING.md)** - Adding new features
- **[05-ADVANCED](./05-ADVANCED.md)** - Advanced patterns and techniques
