# Technical Report: Firefly CLI Refactor & Rearchitecture

**Date:** November 8, 2025  
**Version:** 1.0  
**Author:** Technical Architecture Team  
**Status:** Proposed

---

## Executive Summary

This report presents a comprehensive analysis and refactoring plan for the Firefly CLI to support multiple commands with enhanced extensibility, simplified architecture, and improved maintainability. The goal is to evolve Firefly from a single-purpose release automation tool into a flexible, multi-command CLI framework while preserving its existing strengths.

### Current State
- Single command: `firefly release`
- Well-architected task-based orchestration system
- Clean hexagonal architecture with feature-sliced modules

### Target State
- Multiple commands: `release`, `autocommit`, `commit`
- Pluggable command registration system
- Shared infrastructure with command-specific implementations
- Improved developer experience for adding new commands

---

## 1. Current Architecture Analysis

### 1.1 Architecture Overview

Firefly currently implements a sophisticated **Hexagonal Architecture** combined with **Feature-Slice Design**:

```
src/
├── application/        # Cross-feature orchestration layer
│   ├── context.ts     # Application-wide context definitions
│   └── workflows/     # Command workflows
├── modules/           # Feature-sliced business logic
│   ├── changelog/
│   ├── configuration/
│   ├── filesystem/
│   ├── git/
│   ├── github/
│   ├── orchestration/ # Core workflow orchestration framework
│   ├── preflight/
│   └── semver/
├── platform/          # Infrastructure & CLI entry points
│   ├── cli/          # CLI command registration & parsing
│   └── config/       # Configuration exports
└── shared/           # Cross-cutting utilities
    ├── logger.ts
    ├── schema/
    ├── types/
    └── utils/
```

### 1.2 Key Architectural Components

#### Task-Based Orchestration System

The orchestration module provides a sophisticated task execution framework:

**Task Interface:**
```typescript
interface Task<TContext> {
    readonly id: string;
    readonly description: string;
    execute(context: TContext): FireflyAsyncResult<void>;
    validate?(context: TContext): FireflyResult<void>;
    canUndo?(): boolean;
    undo?(context: TContext): FireflyAsyncResult<void>;
    compensate?(context: TContext): FireflyAsyncResult<void>;
    getDependencies?(context?: TContext): string[];
    // ... lifecycle hooks
}
```

**Workflow Interface:**
```typescript
interface Workflow<TCommand extends CommandName> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly command: TCommand;
    buildTasks(context: WorkflowContext<TCommand>): FireflyResult<Task[]>;
    beforeExecute?(context: WorkflowContext<TCommand>): FireflyAsyncResult<void>;
    afterExecute?(result: WorkflowResult, context: WorkflowContext<TCommand>): FireflyAsyncResult<void>;
}
```

**Key Features:**
- Sequential task execution with dependencies
- Conditional task execution via `ConditionalTask`
- Rollback and compensation strategies
- Feature flags for task gating
- Comprehensive lifecycle hooks
- Dry-run mode support

#### Command Registration System

The current CLI registration is minimal but functional:

```typescript
export function createCLI(): Command {
    const registry = new CommandRegistry();
    registry.register(
        ConfigSchemaProvider.get("release"), 
        createReleaseWorkflow_sequential
    );
    return registry.create(ConfigSchemaProvider.base());
}
```

**Process Flow:**
1. `CommandRegistry` registers command with schema and workflow factory
2. Commander.js parses CLI options
3. Options are normalized and merged with config file
4. Context is created with merged configuration
5. Workflow is instantiated and orchestrator executes tasks

#### Configuration System

Firefly uses a flexible configuration system:

```typescript
// Command-specific schemas
const schemas = {
    release: ReleaseConfigSchema,
} as const;

// Schema provider with type safety
class ConfigSchemaProvider {
    static get(command?: CommandName) { /* ... */ }
    static getEffect<C extends CommandName>(command: C) { /* ... */ }
}
```

**Features:**
- Zod-based runtime validation with TypeScript inference
- Command-specific configuration schemas
- File-based configuration (`firefly.config.ts`)
- CLI option overrides
- Auto-detection from `package.json` and git

#### Context System

Each command has a typed context that flows through tasks:

```typescript
export const ReleaseContextDataSchema = z.object({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    basePath: z.string().default(process.cwd()),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: ConfigSchemaProvider.get("release").optional(),
});
```

### 1.3 Strengths of Current Architecture

1. **Strong Type Safety**: Zod schemas provide runtime validation + compile-time types
2. **Explicit Error Handling**: `neverthrow` Result types eliminate exceptions
3. **Separation of Concerns**: Clear boundaries between platform, application, and domain
4. **Task Composability**: Tasks are independent, reusable units
5. **Testability**: Pure functions, dependency injection-ready
6. **Rollback Support**: Built-in compensation and undo mechanisms
7. **Developer Experience**: Clear structure, predictable patterns

### 1.4 Limitations & Pain Points

1. **Single Command Focus**: Architecture designed primarily for `release` command
2. **Manual Command Registration**: Adding new commands requires multiple file changes
3. **Rigid Context Structure**: Command-specific context requires boilerplate
4. **Hardcoded Command Names**: `CommandName` type is manually maintained
5. **Workflow Discovery**: No automatic workflow discovery mechanism
6. **Shared vs Command-Specific**: Unclear boundaries for shared vs command-specific code
7. **Task Reusability**: Tasks are command-agnostic but lack clear reuse patterns

---

## 2. Requirements Analysis

### 2.1 New Commands Overview

#### Command 1: `firefly release` (Current)
**Status:** Existing  
**Purpose:** Automated semantic versioning, changelog generation, and GitHub release creation  
**Key Features:**
- Automatic version bump from conventional commits
- Manual version selection
- Changelog generation via git-cliff
- Git operations (tag, commit, push)
- GitHub release creation

#### Command 2: `firefly autocommit`
**Status:** New  
**Purpose:** AI-generated conventional commit messages via Azure AI  
**Key Features:**
- Analyze staged changes
- Generate conventional commit message using AI
- Support for multi-line commit bodies
- Breaking change detection
- Commit type and scope inference
- Interactive approval/editing workflow

**Estimated Tasks:**
1. `AnalyzeStagedChangesTask` - Read git diff of staged files
2. `GenerateCommitMessageTask` - Call Azure AI API
3. `PromptCommitApprovalTask` - Show generated message, allow editing
4. `CommitWithMessageTask` - Execute git commit

#### Command 3: `firefly commit`
**Status:** New  
**Purpose:** Interactive conventional commit creation with guided prompts  
**Key Features:**
- Select commit type (feat, fix, etc.)
- Enter scope (optional)
- Write commit message
- Add commit body (optional)
- Mark breaking changes
- Validate conventional commit format

**Estimated Tasks:**
1. `PromptCommitTypeTask` - Interactive type selection
2. `PromptCommitScopeTask` - Optional scope entry
3. `PromptCommitMessageTask` - Message entry with validation
4. `PromptCommitBodyTask` - Optional body entry
5. `PromptBreakingChangeTask` - Breaking change indicator
6. `BuildCommitMessageTask` - Construct final message
7. `CommitWithMessageTask` - Execute git commit (reused)

### 2.2 Shared Infrastructure Identification

**Common to All Commands:**
- Git operations (stage, commit, status)
- Configuration loading
- CLI option parsing
- Logger and error handling
- Dry-run support
- Context management

**Command-Specific:**
- Task implementations
- Context data schemas
- CLI options
- Configuration schemas
- Workflow definitions

**Potentially Shared:**
- Prompting utilities (for `commit` and `autocommit`)
- Git analysis (for `release` and `autocommit`)
- Commit message formatting (for all)

---

## 3. Proposed Architecture

### 3.1 Design Principles

1. **Command Independence**: Each command is self-contained with minimal coupling
2. **Progressive Enhancement**: Add new commands without modifying existing ones
3. **Explicit Over Implicit**: Prefer explicit registration over magic/convention
4. **Type-Safe by Default**: Leverage TypeScript and Zod for safety
5. **Developer Experience**: Make adding commands intuitive and fast
6. **Backward Compatibility**: Maintain existing `release` command behavior

### 3.2 Core Architecture Changes

#### Change 1: Command Registration System

**Current:**
```typescript
// Hardcoded in createCLI()
registry.register(ConfigSchemaProvider.get("release"), createReleaseWorkflow_sequential);
```

**Proposed:**
```typescript
// Centralized command registry
export const commands = {
    release: {
        schema: ReleaseConfigSchema,
        workflow: createReleaseWorkflow,
        context: ReleaseContextDataSchema,
    },
    autocommit: {
        schema: AutocommitConfigSchema,
        workflow: createAutocommitWorkflow,
        context: AutocommitContextDataSchema,
    },
    commit: {
        schema: CommitConfigSchema,
        workflow: createCommitWorkflow,
        context: CommitContextDataSchema,
    },
} as const;

// Auto-register all commands
export function createCLI(): Command {
    const registry = new CommandRegistry();
    
    for (const [name, command] of Object.entries(commands)) {
        registry.register(name, command.schema, command.workflow);
    }
    
    return registry.create(ConfigSchemaProvider.base());
}
```

**Benefits:**
- Single source of truth for commands
- Type-safe command definitions
- Easy to add new commands
- Automatic type inference

#### Change 2: Modular Command Structure

**File Structure:**
```
src/
├── application/
│   ├── context.ts                    # Removed - contexts moved to commands
│   └── commands/                     # NEW: Command definitions
│       ├── registry.ts               # Command registry
│       ├── release/
│       │   ├── release.context.ts    # Release-specific context
│       │   ├── release.schema.ts     # Release-specific config
│       │   └── release.workflow.ts   # Release workflow
│       ├── autocommit/
│       │   ├── autocommit.context.ts
│       │   ├── autocommit.schema.ts
│       │   └── autocommit.workflow.ts
│       └── commit/
│           ├── commit.context.ts
│           ├── commit.schema.ts
│           └── commit.workflow.ts
├── modules/
│   ├── git/                          # Shared git operations
│   ├── commit/                       # NEW: Commit-related shared logic
│   │   ├── services/
│   │   │   ├── commit-builder.service.ts
│   │   │   └── conventional-commit.service.ts
│   │   └── tasks/
│   │       └── commit-with-message.task.ts
│   ├── ai/                           # NEW: AI integration
│   │   ├── azure-ai.provider.ts
│   │   └── services/
│   │       └── message-generator.service.ts
│   └── prompting/                    # NEW: Shared prompting utilities
│       ├── services/
│       │   └── prompt.service.ts
│       └── tasks/
│           ├── prompt-select.task.ts
│           └── prompt-input.task.ts
```

**Key Changes:**
- Move `application/context.ts` → command-specific context files
- Create `application/commands/` for command definitions
- Add new modules: `commit/`, `ai/`, `prompting/`
- Keep existing modules: `git/`, `orchestration/`, etc.

#### Change 3: Enhanced Configuration Schema Provider

**Current:**
```typescript
const schemas = {
    release: ReleaseConfigSchema,
} as const;
```

**Proposed:**
```typescript
// Auto-derive from command registry
import { commands } from "#/application/commands/registry";

type CommandName = keyof typeof commands;

export class ConfigSchemaProvider {
    private static readonly schemas = Object.fromEntries(
        Object.entries(commands).map(([name, cmd]) => [name, cmd.schema])
    );
    
    // ... rest of implementation
}
```

**Benefits:**
- Automatic type inference from command registry
- No manual schema mapping
- Single source of truth

#### Change 4: Context System Improvements

**Current:**
```typescript
// Manually maintained in context.ts
export const ReleaseContextDataSchema = z.object({ /* ... */ });
ContextDataSchemas["release"] = ReleaseContextDataSchema;
```

**Proposed:**
```typescript
// In application/commands/release/release.context.ts
export const ReleaseContextDataSchema = BaseContextDataSchema.extend({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
});

// In application/commands/registry.ts
export const commands = {
    release: {
        context: ReleaseContextDataSchema,
        // ...
    },
    // ...
};
```

**Benefits:**
- Co-located context with command definition
- Automatic type inference
- No manual schema registry

### 3.3 Task Reusability Strategy

**Shared Task Categories:**

1. **Git Tasks** (existing in `modules/git/tasks/`)
   - `StageChangesTask`
   - `CommitChangesTask` → refactor to accept custom message
   - `CreateTagTask`
   - `PushCommitTask`
   - `PushTagTask`

2. **Prompting Tasks** (new in `modules/prompting/tasks/`)
   - `PromptSelectTask` - Generic select prompt
   - `PromptInputTask` - Generic text input
   - `PromptConfirmTask` - Yes/No confirmation
   - `PromptMultilineTask` - Multi-line text input

3. **Commit Tasks** (new in `modules/commit/tasks/`)
   - `CommitWithMessageTask` - Execute commit with message
   - `ValidateConventionalCommitTask` - Validate format
   - `AnalyzeStagedChangesTask` - Get git diff

4. **Command-Specific Tasks**
   - `release/*` - Version bumping, changelog
   - `autocommit/*` - AI message generation
   - `commit/*` - Interactive commit building

**Task Parameterization:**
```typescript
// Before: Hardcoded behavior
class CommitChangesTask extends Task {
    execute(context: ReleaseTaskContext) {
        const message = context.config?.commitMessage || "default";
        // ...
    }
}

// After: Parameterized behavior
class CommitWithMessageTask extends Task {
    constructor(private getMessage: (context: TaskContext) => string) {}
    
    execute(context: TaskContext) {
        const message = this.getMessage(context);
        // ...
    }
}
```

### 3.4 New Modules

#### Module: `modules/ai/`
**Purpose:** Azure AI integration for commit message generation

**Structure:**
```typescript
// azure-ai.provider.ts
export class AzureAIProvider {
    async generateCommitMessage(diff: string): FireflyAsyncResult<string> {
        // Call Azure AI API
    }
}

// services/message-generator.service.ts
export class MessageGeneratorService {
    constructor(private aiProvider: AzureAIProvider) {}
    
    async generate(context: AutocommitTaskContext): FireflyAsyncResult<string> {
        // Analyze diff and generate message
    }
}
```

#### Module: `modules/commit/`
**Purpose:** Shared commit-related functionality

**Structure:**
```typescript
// services/commit-builder.service.ts
export class CommitBuilderService {
    build(params: {
        type: string;
        scope?: string;
        subject: string;
        body?: string;
        breaking?: string;
    }): string {
        // Build conventional commit message
    }
}

// services/conventional-commit.service.ts
export class ConventionalCommitService {
    validate(message: string): FireflyResult<void> {
        // Validate conventional commit format
    }
    
    parse(message: string): FireflyResult<CommitParts> {
        // Parse conventional commit
    }
}
```

#### Module: `modules/prompting/`
**Purpose:** Reusable prompting tasks and utilities

**Structure:**
```typescript
// services/prompt.service.ts (wrapper around consola/prompts)
export class PromptService {
    async select<T>(options: SelectOptions<T>): FireflyAsyncResult<T> {
        // Generic select prompt
    }
    
    async input(options: InputOptions): FireflyAsyncResult<string> {
        // Generic text input
    }
}

// tasks/prompt-select.task.ts
export class PromptSelectTask<T> extends Task {
    constructor(
        private id: string,
        private description: string,
        private getOptions: (context: TaskContext) => SelectOptions<T>,
        private setResult: (context: TaskContext, value: T) => void
    ) {}
    
    execute(context: TaskContext): FireflyAsyncResult<void> {
        const options = this.getOptions(context);
        return new PromptService().select(options)
            .map(value => this.setResult(context, value));
    }
}
```

---

## 4. Implementation Plan

### Phase 1: Foundation & Refactoring (Week 1-2)

**Goal:** Prepare existing codebase for multi-command support

#### Tasks:
1. **Create Command Registry Structure**
   - Create `src/application/commands/` directory
   - Create `registry.ts` with command definitions
   - Move `release.workflow.ts` to `commands/release/`
   - Create `release.context.ts` and `release.schema.ts`
   - Update imports across codebase

2. **Refactor Context System**
   - Remove `application/context.ts`
   - Update `ContextDataSchemas` to auto-populate from registry
   - Update `BaseContextDataSchema` to support all commands
   - Test release command still works

3. **Refactor ConfigSchemaProvider**
   - Auto-derive schemas from command registry
   - Update type definitions
   - Ensure backward compatibility
   - Test configuration loading

4. **Extract Shared Git Tasks**
   - Refactor `CommitChangesTask` to accept message parameter
   - Ensure all git tasks are reusable
   - Add unit tests for git tasks

5. **Create Shared Modules**
   - Create `modules/prompting/` with base prompt service
   - Create `modules/commit/` with commit utilities
   - Move shared code from release tasks

**Deliverables:**
- Refactored command registration system
- Release command fully working with new structure
- Shared modules scaffolded
- All tests passing (if any exist)

### Phase 2: Implement `firefly commit` (Week 3-4)

**Goal:** Add interactive conventional commit command

#### Tasks:
1. **Create Commit Command Structure**
   - Create `commands/commit/commit.context.ts`
   - Create `commands/commit/commit.schema.ts`
   - Create `commands/commit/commit.workflow.ts`
   - Register command in registry

2. **Implement Commit Tasks**
   - `PromptCommitTypeTask` - Select from feat/fix/etc
   - `PromptCommitScopeTask` - Optional scope
   - `PromptCommitMessageTask` - Subject line
   - `PromptCommitBodyTask` - Optional body
   - `PromptBreakingChangeTask` - Breaking change indicator
   - `BuildCommitMessageTask` - Construct message
   - Reuse `CommitWithMessageTask`

3. **Implement Commit Services**
   - `CommitBuilderService` - Build conventional commit
   - `ConventionalCommitService` - Validate/parse commits

4. **CLI Integration**
   - Add command to CLI
   - Add command-specific options
   - Update help text

5. **Testing & Validation**
   - Test all commit types
   - Test with/without scope
   - Test breaking changes
   - Test dry-run mode

**Deliverables:**
- Working `firefly commit` command
- Interactive prompts for all commit parts
- Conventional commit validation
- Documentation

### Phase 3: Implement `firefly autocommit` (Week 5-6)

**Goal:** Add AI-powered commit message generation

#### Tasks:
1. **Create Autocommit Command Structure**
   - Create `commands/autocommit/autocommit.context.ts`
   - Create `commands/autocommit/autocommit.schema.ts`
   - Create `commands/autocommit/autocommit.workflow.ts`
   - Register command in registry

2. **Implement AI Module**
   - Create `modules/ai/azure-ai.provider.ts`
   - Implement Azure AI API client
   - Add error handling for API failures
   - Add configuration for API key/endpoint

3. **Implement Autocommit Tasks**
   - `AnalyzeStagedChangesTask` - Get git diff
   - `GenerateCommitMessageTask` - Call AI API
   - `PromptCommitApprovalTask` - Show/edit message
   - Reuse `CommitWithMessageTask`

4. **Configuration**
   - Add Azure AI config options
   - Add prompt templates for AI
   - Add fallback behavior if AI fails

5. **Testing & Validation**
   - Mock AI responses for testing
   - Test with various staged changes
   - Test approval/editing workflow
   - Test error scenarios

**Deliverables:**
- Working `firefly autocommit` command
- Azure AI integration
- Interactive approval workflow
- Documentation & examples

### Phase 4: Polish & Documentation (Week 7)

**Goal:** Finalize implementation and documentation

#### Tasks:
1. **Code Quality**
   - Run linter on all new code
   - Ensure consistent error handling
   - Add JSDoc comments
   - Remove dead code

2. **Documentation**
   - Update README with new commands
   - Add `firefly commit` usage guide
   - Add `firefly autocommit` setup guide
   - Update configuration documentation
   - Add architecture diagram

3. **Testing**
   - Add integration tests
   - Test all commands together
   - Test error scenarios
   - Test dry-run mode

4. **Performance**
   - Profile task execution
   - Optimize slow operations
   - Add caching where beneficial

**Deliverables:**
- Comprehensive documentation
- All commands tested and working
- Performance optimized
- Ready for release

---

## 5. Migration Guide

### For Existing Users

**No Breaking Changes:**
- `firefly release` command works identically
- All existing config options supported
- `firefly.config.ts` format unchanged

**New Features:**
```bash
# Old (still works)
firefly release

# New commands
firefly commit              # Interactive commit
firefly autocommit          # AI-powered commit
```

### For Contributors

**Adding a New Command:**

1. **Create command directory:**
   ```
   src/application/commands/mycommand/
   ├── mycommand.context.ts
   ├── mycommand.schema.ts
   └── mycommand.workflow.ts
   ```

2. **Define context:**
   ```typescript
   export const MyCommandContextDataSchema = BaseContextDataSchema.extend({
       command: z.literal("mycommand"),
       // command-specific state
   });
   ```

3. **Define configuration:**
   ```typescript
   export const MyCommandConfigSchema = z.object({
       // command-specific options
   });
   ```

4. **Define workflow:**
   ```typescript
   export function createMyCommandWorkflow(): Workflow<"mycommand"> {
       return {
           id: "mycommand-workflow",
           name: "My Command",
           description: "Does something",
           command: "mycommand",
           buildTasks() {
               return ok([
                   // tasks
               ]);
           },
       };
   }
   ```

5. **Register command:**
   ```typescript
   // In application/commands/registry.ts
   export const commands = {
       // ...
       mycommand: {
           schema: MyCommandConfigSchema,
           workflow: createMyCommandWorkflow,
           context: MyCommandContextDataSchema,
       },
   };
   ```

That's it! The command is automatically registered and available.

---

## 6. Testing Strategy

### Unit Tests

**Module-Level Tests:**
- Git services (mock shell commands)
- AI provider (mock API calls)
- Commit builder/validator
- Prompt service
- Configuration loader

**Task-Level Tests:**
- Test each task in isolation
- Mock context dependencies
- Test success and error paths
- Test dry-run behavior

### Integration Tests

**Command-Level Tests:**
- Test full command execution
- Use temp git repository
- Mock external APIs (GitHub, Azure AI)
- Test rollback scenarios

### End-to-End Tests

**User Scenarios:**
- Complete release flow
- Interactive commit flow
- AI commit with approval
- Error recovery
- Dry-run mode

---

## 7. Risk Assessment

### High Risk
- **Breaking existing workflows:** Mitigated by extensive testing of release command
- **Performance degradation:** Mitigated by benchmarking
- **Azure AI API reliability:** Mitigated by fallback to manual mode

### Medium Risk
- **Complexity increase:** Mitigated by clear documentation and examples
- **Type system complexity:** Mitigated by helper types and clear patterns
- **Module boundaries:** Mitigated by clear ownership and guidelines

### Low Risk
- **Configuration incompatibility:** Backward compatible by design
- **Developer adoption:** Clear migration guide provided

---

## 8. Success Metrics

### Quantitative
- All 3 commands implemented and working
- Zero breaking changes to existing `release` command
- Test coverage >80% for new code
- Build time <5s
- Command execution <2s for simple operations

### Qualitative
- Clear, intuitive command structure
- Easy to add new commands
- Positive developer feedback
- Clear documentation
- Maintainable codebase

---

## 9. Conclusion

The proposed refactoring transforms Firefly from a single-purpose release tool into an extensible multi-command CLI framework while preserving its sophisticated task orchestration system. The key improvements are:

1. **Extensibility:** Adding new commands is straightforward and type-safe
2. **Simplicity:** Clear command structure with co-located concerns
3. **Reusability:** Shared modules reduce duplication
4. **Maintainability:** Better organization and documentation
5. **Type Safety:** Leverages TypeScript and Zod throughout

The phased implementation plan allows for incremental delivery with minimal risk, and the backward compatibility guarantee ensures existing users are not disrupted.

### Next Steps
1. Review and approve this technical report
2. Create implementation tickets for Phase 1
3. Begin refactoring foundation
4. Iterate based on feedback

---

## Appendix A: File Structure (Complete)

```
src/
├── application/
│   └── commands/
│       ├── registry.ts                       # Central command registry
│       ├── release/
│       │   ├── release.context.ts
│       │   ├── release.schema.ts
│       │   └── release.workflow.ts
│       ├── autocommit/
│       │   ├── autocommit.context.ts
│       │   ├── autocommit.schema.ts
│       │   └── autocommit.workflow.ts
│       └── commit/
│           ├── commit.context.ts
│           ├── commit.schema.ts
│           └── commit.workflow.ts
├── modules/
│   ├── ai/                                   # NEW: AI integration
│   │   ├── azure-ai.provider.ts
│   │   └── services/
│   │       └── message-generator.service.ts
│   ├── changelog/
│   │   ├── git-cliff.adapter.ts
│   │   ├── services/
│   │   └── tasks/
│   ├── commit/                               # NEW: Commit utilities
│   │   ├── services/
│   │   │   ├── commit-builder.service.ts
│   │   │   └── conventional-commit.service.ts
│   │   └── tasks/
│   │       ├── analyze-staged-changes.task.ts
│   │       ├── commit-with-message.task.ts
│   │       └── validate-conventional-commit.task.ts
│   ├── configuration/
│   │   ├── config-hydrator.service.ts
│   │   ├── config-loader.service.ts
│   │   ├── config-schema.provider.ts         # UPDATED: Auto-derive from registry
│   │   ├── constant/
│   │   ├── schema/
│   │   ├── services/
│   │   └── tasks/
│   ├── filesystem/
│   ├── git/
│   │   ├── git.provider.ts
│   │   ├── services/
│   │   ├── tasks/
│   │   │   ├── commit-changes.task.ts        # UPDATED: Accept message param
│   │   │   ├── create-tag.task.ts
│   │   │   ├── push-commit.task.ts
│   │   │   ├── push-tag.task.ts
│   │   │   └── stage-changes.task.ts
│   │   └── utils/
│   ├── github/
│   ├── orchestration/                        # Core framework (unchanged)
│   ├── preflight/
│   ├── prompting/                            # NEW: Prompting utilities
│   │   ├── services/
│   │   │   └── prompt.service.ts
│   │   └── tasks/
│   │       ├── prompt-confirm.task.ts
│   │       ├── prompt-input.task.ts
│   │       ├── prompt-multiline.task.ts
│   │       └── prompt-select.task.ts
│   └── semver/
├── platform/
│   ├── cli/
│   │   ├── commander.ts                      # UPDATED: Register all commands
│   │   ├── main.ts
│   │   ├── options/
│   │   └── registry.ts
│   └── config/
└── shared/
    ├── logger.ts
    ├── schema/
    ├── types/
    └── utils/
```

---

## Appendix B: Type Definitions (Key Changes)

```typescript
// Before: Manual maintenance
type CommandName = "release";

// After: Auto-derived
import { commands } from "#/application/commands/registry";
type CommandName = keyof typeof commands;

// Before: Manual mapping
const schemas = {
    release: ReleaseConfigSchema,
} as const;

// After: Auto-derived
const schemas = Object.fromEntries(
    Object.entries(commands).map(([name, cmd]) => [name, cmd.schema])
);

// Before: Manual context registration
ContextDataSchemas["release"] = ReleaseContextDataSchema;

// After: Auto-derived
const contextSchemas = Object.fromEntries(
    Object.entries(commands).map(([name, cmd]) => [name, cmd.context])
);
```

---

**End of Technical Report**
