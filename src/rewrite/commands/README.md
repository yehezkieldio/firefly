# Firefly Commands

This directory contains the three main Firefly commands implemented using the new architecture.

## Commands

### 1. firefly release

**Status:** Scaffold implemented, awaiting full implementation

**Purpose:** Automated semantic versioning, changelog generation using git-cliff, and GitHub release creation

**Key Features:**
- Automatic version bump from conventional commits
- Manual version selection
- Changelog generation via git-cliff
- Git operations (tag, commit, push)
- GitHub/GitLab release creation

**Files:**
- `release/index.ts` - Command definition with task flow
- `release/config.ts` - Configuration schema
- `release/types.ts` - TypeScript types

**Usage:**
```bash
firefly release                              # Auto bump, generate changelog, create release
firefly release --type patch                 # Explicit patch bump
firefly release --type major --skip-git      # Major bump without git operations
firefly release --bump-strategy manual --manual-version 2.0.0
```

**Task Flow:**
1. Preflight checks (git status, remote, auth)
2. Initialize current version (from package.json)
3. Determine bump strategy (automatic/manual/prompt)
4. Calculate next version
5. Update version in files (package.json, etc.)
6. Generate changelog (git-cliff)
7. Stage changes
8. Commit changes
9. Create git tag
10. Push commit and tag
11. Create platform release (GitHub/GitLab)

---

### 2. firefly autocommit

**Status:** Scaffold implemented, awaiting full implementation

**Purpose:** AI-generated conventional commit messages via Azure AI or other LLM providers

**Key Features:**
- Analyze staged changes / Efficient diff generation
- Generate conventional commit message using AI
- Support for multi-line commit bodies
- Breaking change detection
- Commit type and scope inference
- Interactive approval/editing workflow
- Context aware (uses `.github/copilot-commit-instructions.md` as system prompt)

**Files:**
- `autocommit/index.ts` - Command definition with task flow
- `autocommit/config.ts` - Configuration schema (supports multiple AI providers)
- `autocommit/types.ts` - TypeScript types and AI provider interface

**Usage:**
```bash
firefly autocommit                           # Generate and commit with AI
firefly autocommit --provider openai         # Use OpenAI instead of Azure AI
firefly autocommit --no-require-approval     # Auto-commit without confirmation
firefly autocommit --auto-stage              # Stage all changes before generating
```

**Task Flow:**
1. Check prerequisites (git repo, API credentials)
2. Load system prompt (from `.github/copilot-commit-instructions.md`)
3. Get staged changes (or auto-stage if configured)
4. Generate efficient diff for AI
5. Gather context (recent commits, file types)
6. Call AI provider to generate commit message
7. Parse and validate generated message
8. Display message to user
9. Prompt for approval/editing
10. Commit changes with generated message

**AI Providers:**
- Azure AI (default)
- OpenAI
- Anthropic
- Extensible interface for custom providers

---

### 3. firefly commit

**Status:** Scaffold implemented, awaiting full implementation

**Purpose:** Interactive conventional commit creation with guided prompts

**Key Features:**
- Select commit type (feat, fix, etc.)
- Enter scope (optional)
- Write commit message
- Add commit body (optional)
- Mark breaking changes
- Validate conventional commit format
- Parse commit types from `cliff.toml` automatically

**Files:**
- `commit/index.ts` - Command definition with task flow
- `commit/config.ts` - Configuration schema
- `commit/types.ts` - TypeScript types

**Usage:**
```bash
firefly commit                               # Interactive commit creation
firefly commit --auto-stage                  # Stage all changes first
firefly commit --no-prompt-for-body          # Skip body prompt
firefly commit --no-show-emoji               # Don't show emoji in type selection
```

**Task Flow:**
1. Check prerequisites (git repo, staged changes)
2. Load commit types (from `cliff.toml` or defaults)
3. Prompt for commit type
4. Prompt for scope (optional)
5. Prompt for subject/message
6. Prompt for body (optional)
7. Prompt for breaking changes
8. Prompt for footer (optional)
9. Validate commit message format
10. Show preview
11. Confirm and commit

**Cliff.toml Integration:**
The command automatically parses `cliff.toml` `[git] commit_parsers` to extract:
- Available commit types
- Type descriptions (from commit groups)
- Emoji mappings (if present)

Falls back to default types if `cliff.toml` not found.

---

## Implementation Status

All commands are **scaffold implementations** with:
- ✅ Complete task flow defined
- ✅ Configuration schemas
- ✅ Type definitions
- ✅ Task dependencies mapped
- ✅ Skip conditions identified
- ⚠️ Actual task implementations marked as TODO

Each command is structured using the new architecture:
- Task Builder API for task creation
- Immutable context with forking
- Clear dependency declaration
- Rollback support where applicable

---

## Shared Infrastructure

See [SHARED_INFRASTRUCTURE.md](./SHARED_INFRASTRUCTURE.md) for detailed analysis of:
- Common services across commands (Git, FileSystem, Prompts, etc.)
- Command-specific infrastructure
- Implementation priorities
- Recommended structure

Key shared services identified:
1. **GitService** - Used by all commands
2. **ConventionalCommitParser** - Used by all commands
3. **PromptService** - Used by all commands
4. **FileService** - Used by all commands
5. **CliffConfigParser** - Used by release and commit

---

## Next Steps

### For Implementation

1. **Implement Shared Services** (see SHARED_INFRASTRUCTURE.md)
   - GitService
   - FileService
   - PromptService
   - ConventionalCommitParser
   - CliffConfigParser

2. **Implement Command-Specific Tasks**
   - Replace TODO comments with actual implementations
   - Add error handling
   - Add validation

3. **Testing**
   - Unit tests for shared services
   - Integration tests for commands
   - Manual testing of workflows

4. **Documentation**
   - Update command examples
   - Add configuration documentation
   - Create migration guide from old to new

### For Extension

Each command can be extended with:
- Additional configuration options
- More AI providers (for autocommit)
- Additional platforms (GitLab, Bitbucket for release)
- Custom validation rules
- Plugin system for custom tasks

---

## Architecture Benefits

These commands demonstrate the new architecture's strengths:

1. **Clear Structure**: Each command is self-contained with its own config and tasks
2. **Task Builder**: Fluent API makes task creation intuitive
3. **Dependency Management**: Tasks declare dependencies, registry handles ordering
4. **Skip Conditions**: Conditional logic is clear and testable
5. **Rollback Support**: Tasks can define undo operations
6. **Type Safety**: Full TypeScript types throughout
7. **Testability**: Each task can be tested in isolation

---

## Contributing

When implementing tasks:
1. Follow the scaffold structure
2. Use shared services where appropriate
3. Add error handling
4. Include validation
5. Write tests
6. Update documentation

See the main README for architecture guidelines.
