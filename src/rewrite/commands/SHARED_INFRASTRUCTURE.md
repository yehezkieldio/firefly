# Shared Infrastructure Analysis

This document identifies shared infrastructure, common tasks, and command-specific components across the three Firefly commands.

## Commands Overview

### 1. firefly release
- **Purpose:** Automated semantic versioning, changelog generation, and release creation
- **Complexity:** High (multi-step workflow)
- **External Dependencies:** git-cliff, GitHub/GitLab API

### 2. firefly autocommit
- **Purpose:** AI-generated conventional commit messages
- **Complexity:** Medium (AI integration)
- **External Dependencies:** Azure AI / OpenAI / Anthropic API

### 3. firefly commit
- **Purpose:** Interactive conventional commit creation
- **Complexity:** Low (user prompts)
- **External Dependencies:** None (just git)

---

## Shared Infrastructure

### Core Services (Potentially Shared)

#### 1. Git Operations
**Status:** Should be shared
**Location:** `src/rewrite/shared/git/`

Common operations:
- Check if directory is a git repository
- Get repository status (uncommitted changes)
- Stage files (`git add`)
- Commit with message (`git commit`)
- Create tags (`git tag`)
- Push to remote (`git push`)
- Get commit history (`git log`)
- Get staged/unstaged files
- Get file diffs (`git diff`)
- Reset commits (`git reset`)

**Used by:**
- ✅ release: All git operations
- ✅ autocommit: Staging, committing, getting diffs
- ✅ commit: Staging, committing, status checks

**Implementation:**
```typescript
// src/rewrite/shared/git/git-service.ts
export class GitService {
    isRepository(): Promise<boolean>;
    hasUncommittedChanges(): Promise<boolean>;
    getStagedFiles(): Promise<Array<{ path: string; status: string }>>;
    getDiff(options?: DiffOptions): Promise<string>;
    stageFiles(files: string[]): Promise<void>;
    commit(message: string): Promise<string>; // returns SHA
    createTag(name: string, message?: string): Promise<void>;
    push(remote: string, branch: string, tags?: boolean): Promise<void>;
    getRecentCommits(count: number): Promise<Array<CommitInfo>>;
    reset(mode: 'soft' | 'mixed' | 'hard', ref: string): Promise<void>;
}
```

---

#### 2. Conventional Commit Parsing/Validation
**Status:** Should be shared
**Location:** `src/rewrite/shared/conventional-commit/`

Common operations:
- Parse conventional commit message
- Validate conventional commit format
- Format conventional commit message
- Extract type, scope, subject, body, footer
- Detect breaking changes
- Validate commit types against cliff.toml

**Used by:**
- ✅ release: Parse commits for automatic versioning
- ✅ autocommit: Validate AI-generated messages
- ✅ commit: Validate user-created messages

**Implementation:**
```typescript
// src/rewrite/shared/conventional-commit/parser.ts
export class ConventionalCommitParser {
    parse(message: string): ConventionalCommit;
    validate(message: string): ValidationResult;
    format(commit: ConventionalCommit): string;
    isBreakingChange(commit: ConventionalCommit): boolean;
    extractType(message: string): string | null;
}
```

---

#### 3. Cliff.toml Parser
**Status:** Should be shared
**Location:** `src/rewrite/shared/cliff/`

Common operations:
- Parse cliff.toml configuration
- Extract commit types and patterns
- Extract commit parsers
- Get changelog configuration

**Used by:**
- ✅ release: Read for changelog generation
- ⚠️ autocommit: Could use for commit type validation
- ✅ commit: Read commit_parsers for type selection

**Implementation:**
```typescript
// src/rewrite/shared/cliff/cliff-parser.ts
export class CliffConfigParser {
    parse(configPath: string): Promise<CliffConfig>;
    getCommitTypes(): Array<CommitType>;
    getCommitParsers(): Array<CommitParser>;
    getChangelogConfig(): ChangelogConfig;
}
```

---

#### 4. File System Operations
**Status:** Should be shared
**Location:** `src/rewrite/shared/filesystem/`

Common operations:
- Read file
- Write file
- Check file exists
- Read JSON (e.g., package.json)
- Write JSON with formatting
- Read/write TOML

**Used by:**
- ✅ release: Read/write package.json, CHANGELOG.md
- ✅ autocommit: Read system prompt file
- ✅ commit: Read cliff.toml

**Implementation:**
```typescript
// src/rewrite/shared/filesystem/file-service.ts
export class FileService {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    readJSON<T>(path: string): Promise<T>;
    writeJSON<T>(path: string, data: T, pretty?: boolean): Promise<void>;
    readTOML<T>(path: string): Promise<T>;
}
```

---

#### 5. Prompt/Interactive UI
**Status:** Should be shared
**Location:** `src/rewrite/shared/prompts/`

Common operations:
- Select from list (arrow keys)
- Text input
- Multi-line text input
- Yes/No confirmation
- Number input
- Password/secret input

**Used by:**
- ✅ release: Prompt for version, confirm actions
- ✅ autocommit: Approve/edit generated message
- ✅ commit: All interactive prompts

**Implementation:**
```typescript
// src/rewrite/shared/prompts/prompt-service.ts
export class PromptService {
    select<T>(options: SelectOptions<T>): Promise<T>;
    input(options: InputOptions): Promise<string>;
    multiline(options: MultilineOptions): Promise<string>;
    confirm(message: string, defaultValue?: boolean): Promise<boolean>;
    number(options: NumberOptions): Promise<number>;
}
```

---

#### 6. Version Management
**Status:** Potentially shared (mostly release-specific)
**Location:** `src/rewrite/shared/version/` or command-specific

Common operations:
- Parse semver version
- Compare versions
- Bump version (patch/minor/major)
- Validate version format
- Determine version from commits

**Used by:**
- ✅ release: Core functionality
- ❌ autocommit: Not needed
- ❌ commit: Not needed

**Implementation:**
```typescript
// src/rewrite/shared/version/version-service.ts
export class VersionService {
    parse(version: string): SemanticVersion;
    bump(version: string, type: BumpType): string;
    compare(v1: string, v2: string): number;
    validate(version: string): boolean;
    calculateBumpFromCommits(commits: string[]): BumpType;
}
```

---

## Command-Specific Infrastructure

### Release Command Only

1. **Changelog Generation**
   - Call git-cliff CLI
   - Parse git-cliff output
   - Update CHANGELOG.md
   - **Location:** `src/rewrite/commands/release/tasks/`

2. **GitHub/GitLab Release**
   - Authenticate with platform
   - Create release via API
   - Upload release assets
   - **Location:** `src/rewrite/commands/release/tasks/`

3. **Package.json Updates**
   - Read current version
   - Write new version
   - Maintain formatting
   - **Location:** Could be shared if other commands need it

---

### Autocommit Command Only

1. **AI Provider Integration**
   - Azure AI SDK
   - OpenAI SDK
   - Anthropic SDK
   - Generic provider interface
   - **Location:** `src/rewrite/commands/autocommit/providers/`

2. **Diff Optimization**
   - Generate efficient diffs for AI
   - Limit diff size
   - Highlight important changes
   - **Location:** `src/rewrite/commands/autocommit/tasks/`

3. **System Prompt Management**
   - Load custom prompts
   - Default prompt template
   - Context injection
   - **Location:** `src/rewrite/commands/autocommit/tasks/`

---

### Commit Command Only

1. **Interactive Prompt Workflow**
   - Type selection UI
   - Scope input
   - Multi-step form
   - **Location:** `src/rewrite/commands/commit/tasks/`

2. **Commit Type Display**
   - Emoji rendering
   - Type descriptions
   - Cliff.toml parsing specific to UI
   - **Location:** `src/rewrite/commands/commit/tasks/`

---

## Recommended Structure

```
src/rewrite/
├── commands/
│   ├── release/
│   │   ├── index.ts               # Command definition
│   │   ├── config.ts              # Configuration schema
│   │   ├── types.ts               # Command-specific types
│   │   └── tasks/                 # Command-specific tasks
│   │       ├── changelog.task.ts
│   │       ├── github-release.task.ts
│   │       └── package-version.task.ts
│   ├── autocommit/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── tasks/
│   │   │   ├── diff-generator.task.ts
│   │   │   └── prompt-loader.task.ts
│   │   └── providers/
│   │       ├── azure-ai.ts
│   │       ├── openai.ts
│   │       └── anthropic.ts
│   ├── commit/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── types.ts
│   │   └── tasks/
│   │       ├── type-selector.task.ts
│   │       └── message-builder.task.ts
│   └── SHARED_INFRASTRUCTURE.md   # This file
├── shared/                         # Shared infrastructure
│   ├── git/
│   │   ├── git-service.ts
│   │   └── types.ts
│   ├── conventional-commit/
│   │   ├── parser.ts
│   │   ├── validator.ts
│   │   └── types.ts
│   ├── cliff/
│   │   ├── cliff-parser.ts
│   │   └── types.ts
│   ├── filesystem/
│   │   ├── file-service.ts
│   │   └── types.ts
│   ├── prompts/
│   │   ├── prompt-service.ts
│   │   └── types.ts
│   └── version/
│       ├── version-service.ts
│       └── types.ts
├── core/                           # Core architecture (existing)
│   ├── command/
│   ├── task/
│   ├── context/
│   └── execution/
└── ...
```

---

## Implementation Priority

### Phase 1: Core Shared Services (Highest Priority)
1. ✅ GitService - Used by all commands
2. ✅ FileService - Used by all commands
3. ✅ PromptService - Used by all commands

### Phase 2: Commit-Related Services
4. ✅ ConventionalCommitParser - Used by all commands
5. ✅ CliffConfigParser - Used by 2 commands

### Phase 3: Command-Specific
6. ⚠️ VersionService - Release only
7. ⚠️ AI Providers - Autocommit only

### Phase 4: Advanced Features
8. 🔄 Changelog generation integration
9. 🔄 Platform release APIs
10. 🔄 Diff optimization

---

## Potential Task Reuse

### Shared Tasks

These tasks could be reused across commands:

1. **Preflight Check Task**
   - Check git repository
   - Validate prerequisites
   - Used by: All commands

2. **Stage Changes Task**
   - Stage files for commit
   - Used by: autocommit, commit

3. **Commit Task**
   - Execute git commit
   - Used by: release, autocommit, commit

4. **Load Config Task**
   - Load cliff.toml or other config
   - Used by: release, commit

---

## Summary

### Highly Shared (3/3 commands)
- Git operations
- File system operations
- Interactive prompts
- Conventional commit parsing

### Moderately Shared (2/3 commands)
- Cliff.toml parsing (release, commit)
- Commit validation (autocommit, commit)

### Command-Specific (1/3 commands)
- Version management (release only)
- AI providers (autocommit only)
- Changelog generation (release only)
- Platform releases (release only)

### Recommendation
Start by implementing the **Highly Shared** services as they provide the most value across all commands. Then implement command-specific features as needed.
