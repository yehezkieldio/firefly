# Implementation Roadmap

This document outlines the prioritized tasks to complete the Firefly rewrite.

---

## 🚨 Phase 1: Critical Path (Week 1)

### 1.1 Wire Up Release Command
**Goal**: Make `firefly release` fully functional

**Tasks**:
- [ ] Replace scaffolded tasks with extracted task functions
  - Import from `tasks/release`
  - Remove TODO comments
  - Wire up dependencies
- [ ] Implement `createChangelogTask()`
  - Add `ChangelogService` in `shared/changelog/`
  - Call git-cliff CLI
  - Parse output and write to CHANGELOG.md
  - Add rollback support
- [ ] Implement `createPlatformReleaseTask()`
  - Add `PlatformReleaseService` in `shared/platform/`
  - Implement `GitHubClient` (using Octokit)
  - Add authentication handling
  - Support release notes and asset upload
- [ ] Add comprehensive logging throughout
- [ ] Test end-to-end with real repository

**Files to Modify**:
- `commands/release/index.ts` - Replace scaffolded tasks
- `shared/changelog/changelog-service.ts` - NEW
- `shared/platform/github-client.ts` - NEW
- `shared/platform/platform-service.ts` - NEW
- `tasks/release/changelog-tasks.ts` - NEW
- `tasks/release/platform-tasks.ts` - NEW

**Estimated**: 2 days

---

## 📝 Phase 2: Commit Commands (Week 1-2)

### 2.1 Implement Commit Command
**Goal**: Make `firefly commit` fully functional

**Tasks**:
- [ ] Extract interactive prompt tasks
  - `createSelectTypeTask()` - Use PromptService
  - `createPromptScopeTask()` - Text input
  - `createPromptSubjectTask()` - Text input with validation
  - `createPromptBodyTask()` - Multi-line editor
  - `createPromptBreakingTask()` - Confirmation
  - `createBuildMessageTask()` - Format commit message
  - `createValidateTask()` - Use ConventionalCommitService
  - `createCommitTask()` - Use GitService
- [ ] Load commit types from cliff.toml
- [ ] Add emoji support
- [ ] Add auto-stage functionality
- [ ] Test with real repository

**Files to Create**:
- `tasks/commit/prompt-tasks.ts`
- `tasks/commit/validation-tasks.ts`
- `tasks/commit/commit-tasks.ts`
- `tasks/commit/index.ts`

**Files to Modify**:
- `commands/commit/index.ts` - Use extracted tasks

**Estimated**: 1.5 days

### 2.2 Implement Autocommit Command
**Goal**: Make `firefly autocommit` fully functional with AI

**Tasks**:
- [ ] Implement `AIProviderService`
  - Create interface for providers
  - Implement `AzureAIProvider`
  - Implement `OpenAIProvider`
  - Implement `AnthropicProvider`
  - Add token counting and limits
  - Handle rate limiting
- [ ] Extract autocommit tasks
  - `createLoadSystemPromptTask()` - Read .github/copilot-commit-instructions.md
  - `createGetDiffTask()` - Use GitService with optimization
  - `createGatherContextTask()` - Get recent commits, branch info
  - `createGenerateCommitTask()` - Call AI provider
  - `createApprovalTask()` - Interactive approval/edit
  - `createCommitTask()` - Use GitService
- [ ] Add diff optimization (truncate large diffs)
- [ ] Add context awareness
- [ ] Test with multiple providers

**Files to Create**:
- `shared/ai/ai-provider.ts` - Interface
- `shared/ai/azure-ai-provider.ts`
- `shared/ai/openai-provider.ts`
- `shared/ai/anthropic-provider.ts`
- `shared/ai/ai-provider-factory.ts`
- `shared/ai/index.ts`
- `tasks/autocommit/prerequisite-tasks.ts`
- `tasks/autocommit/diff-tasks.ts`
- `tasks/autocommit/ai-tasks.ts`
- `tasks/autocommit/approval-tasks.ts`
- `tasks/autocommit/commit-tasks.ts`
- `tasks/autocommit/index.ts`

**Files to Modify**:
- `commands/autocommit/index.ts` - Use extracted tasks

**Estimated**: 2.5 days

---

## 🔧 Phase 3: Infrastructure Improvements (Week 2)

### 3.1 Enhanced Logging
**Goal**: Replace old logger with new LoggerService

**Tasks**:
- [ ] Create `LoggerService` in `shared/logger/`
- [ ] Support log levels (debug, info, warn, error)
- [ ] Support structured logging (JSON format)
- [ ] Add task lifecycle logging
- [ ] Integrate with verbose flag from config
- [ ] Replace all imports of old `#/shared/logger`

**Files to Create**:
- `shared/logger/logger-service.ts`
- `shared/logger/logger-types.ts`
- `shared/logger/index.ts`

**Estimated**: 0.5 days

### 3.2 Error Enhancement
**Goal**: Better error handling with codes and hints

**Tasks**:
- [ ] Define `ErrorCode` enum for all error types
- [ ] Add error categories (git, filesystem, config, validation)
- [ ] Add recovery hints
- [ ] Add context chaining
- [ ] Update all services to use enhanced errors
- [ ] Create error formatting utility

**Files to Create**:
- `shared/errors/error-codes.ts`
- `shared/errors/error-types.ts`
- `shared/errors/error-formatter.ts`
- `shared/errors/index.ts`

**Files to Modify**:
- All service files (update error creation)

**Estimated**: 1 day

### 3.3 Validation Service
**Goal**: Centralized validation logic

**Tasks**:
- [ ] Create `ValidationService`
- [ ] Move validation logic from services
- [ ] Add reusable validators (semver, commit, git remote, etc.)
- [ ] Add validation schemas
- [ ] Update services to use ValidationService

**Files to Create**:
- `shared/validation/validation-service.ts`
- `shared/validation/validators.ts`
- `shared/validation/index.ts`

**Estimated**: 0.5 days

### 3.4 Event System
**Goal**: Enable extensibility and monitoring

**Tasks**:
- [ ] Create `WorkflowEventEmitter`
- [ ] Define event types
- [ ] Emit events in executor
- [ ] Add event handlers in CLI
- [ ] Add progress tracking handler
- [ ] Document event system

**Files to Create**:
- `execution/event-emitter.ts`
- `execution/event-types.ts`

**Files to Modify**:
- `execution/workflow-executor.ts` - Emit events
- `cli/commander.ts` - Listen to events

**Estimated**: 1 day

---

## 🧪 Phase 4: Testing (Week 3)

### 4.1 Unit Tests for Services
**Goal**: 80%+ test coverage for shared services

**Tasks**:
- [ ] Setup test infrastructure (test runner, mocks)
- [ ] Write tests for GitService
- [ ] Write tests for FileSystemService
- [ ] Write tests for ConventionalCommitService
- [ ] Write tests for VersionService
- [ ] Write tests for PromptService (with mocked inquirer)
- [ ] Write tests for CliffConfigService
- [ ] Add coverage reporting

**Files to Create**:
- `tests/unit/services/git-service.test.ts`
- `tests/unit/services/filesystem-service.test.ts`
- `tests/unit/services/conventional-commit-service.test.ts`
- `tests/unit/services/version-service.test.ts`
- `tests/unit/services/prompts-service.test.ts`
- `tests/unit/services/cliff-config-service.test.ts`

**Estimated**: 2 days

### 4.2 Integration Tests for Commands
**Goal**: Test complete command workflows

**Tasks**:
- [ ] Create test fixtures (mock repos, configs)
- [ ] Write integration tests for release command
- [ ] Write integration tests for commit command
- [ ] Write integration tests for autocommit command
- [ ] Test error scenarios
- [ ] Test rollback scenarios

**Files to Create**:
- `tests/integration/commands/release.test.ts`
- `tests/integration/commands/commit.test.ts`
- `tests/integration/commands/autocommit.test.ts`
- `tests/fixtures/` - Test data

**Estimated**: 2 days

### 4.3 E2E Tests for CLI
**Goal**: Test CLI from end user perspective

**Tasks**:
- [ ] Create test git repositories
- [ ] Test CLI argument parsing
- [ ] Test config file loading
- [ ] Test command execution
- [ ] Test error handling and messages
- [ ] Test dry-run mode

**Files to Create**:
- `tests/e2e/cli/release.test.ts`
- `tests/e2e/cli/commit.test.ts`
- `tests/e2e/cli/autocommit.test.ts`
- `tests/e2e/cli/config.test.ts`

**Estimated**: 1.5 days

---

## 🎨 Phase 5: Polish & DX (Week 3-4)

### 5.1 Better Dry Run
**Goal**: Comprehensive dry-run reporting

**Tasks**:
- [ ] Create `DryRunReporter`
- [ ] Update all tasks to check dry-run flag
- [ ] Generate detailed report of what would happen
- [ ] Add dry-run validation (catch errors without side effects)

**Files to Create**:
- `execution/dry-run-reporter.ts`

**Estimated**: 0.5 days

### 5.2 Progress Reporting
**Goal**: Beautiful progress indicators

**Tasks**:
- [ ] Add `ProgressService` using ora or similar
- [ ] Add spinners for long operations
- [ ] Add progress bars for multi-step workflows
- [ ] Integrate with event system

**Files to Create**:
- `shared/progress/progress-service.ts`

**Estimated**: 0.5 days

### 5.3 Config Wizard
**Goal**: Interactive setup for new users

**Tasks**:
- [ ] Create `firefly init` command
- [ ] Interactive prompts for setup
- [ ] Generate firefly.config.ts
- [ ] Detect project settings (git remote, etc.)

**Files to Create**:
- `commands/init/index.ts`
- `commands/init/wizard.ts`

**Estimated**: 1 day

### 5.4 Better Type Exports
**Goal**: Easier imports

**Tasks**:
- [ ] Create barrel exports in `index.ts`
- [ ] Update documentation with simplified imports
- [ ] Test import paths

**Files to Modify**:
- `index.ts` - Add exports

**Estimated**: 0.25 days

---

## 📦 Phase 6: Command-Specific Features (Week 4)

### 6.1 Release Enhancements
**Tasks**:
- [ ] Add support for prerelease versions (alpha, beta, rc)
- [ ] Add support for build metadata
- [ ] Add support for custom version files
- [ ] Add support for GitLab releases
- [ ] Add support for release assets

**Estimated**: 1 day

### 6.2 Autocommit Enhancements
**Tasks**:
- [ ] Add support for custom system prompts per project
- [ ] Add caching of AI responses
- [ ] Add multi-file commit grouping
- [ ] Add commit message templates

**Estimated**: 1 day

### 6.3 Commit Enhancements
**Tasks**:
- [ ] Add commit message templates
- [ ] Add commit history search
- [ ] Add commit amendment support
- [ ] Add interactive rebase helper

**Estimated**: 0.5 days

---

## 🚀 Phase 7: Production Readiness (Week 4)

### 7.1 Documentation Updates
**Tasks**:
- [ ] Update README with complete examples
- [ ] Add troubleshooting guide
- [ ] Add FAQ
- [ ] Add API documentation
- [ ] Update MIGRATION_GUIDE with real examples

**Estimated**: 1 day

### 7.2 Performance Optimization
**Tasks**:
- [ ] Add caching for git operations
- [ ] Optimize diff generation
- [ ] Add lazy loading for services
- [ ] Profile and optimize hot paths

**Estimated**: 0.5 days

### 7.3 Security Audit
**Tasks**:
- [ ] Review all external command executions
- [ ] Validate all user inputs
- [ ] Check for injection vulnerabilities
- [ ] Review error messages for info leaks
- [ ] Add security documentation

**Estimated**: 0.5 days

---

## 📊 Summary

### Total Estimated Time: 3-4 weeks

| Phase | Days | Priority |
|-------|------|----------|
| Phase 1: Critical Path | 2 | 🔴 Critical |
| Phase 2: Commit Commands | 4 | 🔴 Critical |
| Phase 3: Infrastructure | 3 | 🟡 High |
| Phase 4: Testing | 5.5 | 🟡 High |
| Phase 5: Polish & DX | 2.25 | 🟢 Medium |
| Phase 6: Command Features | 2.5 | 🟢 Medium |
| Phase 7: Production Ready | 2 | 🟡 High |

### Milestones

**Milestone 1** (End of Week 1): Release command fully working
**Milestone 2** (End of Week 2): All commands working with infrastructure improvements
**Milestone 3** (End of Week 3): Comprehensive test coverage
**Milestone 4** (End of Week 4): Production-ready with polish

---

## 🎯 Quick Wins (Can Do Now)

These can be done immediately to improve the rewrite:

1. **Wire release command to use extracted tasks** (1-2 hours)
   - Simple import changes
   - Immediate improvement

2. **Add LoggerService** (2-3 hours)
   - Standalone addition
   - Better logging immediately

3. **Enhance error types** (2-3 hours)
   - Add error codes
   - Better DX

4. **Add barrel exports** (30 minutes)
   - Simplify imports
   - Better DX

5. **Update release command README** (1 hour)
   - Document current state
   - Help future contributors

---

## 🤝 Contribution Guidelines

When implementing these tasks:

1. **Follow existing patterns** - Consistency is key
2. **Write tests** - Especially for services
3. **Update documentation** - Keep docs in sync
4. **Use Result types** - For error handling
5. **Add logging** - For debugging
6. **Check dry-run** - Respect the flag
7. **Consider rollback** - For destructive operations

---

## 📝 Notes

- All phases can have some parallelization
- Phase 1 is blocking for other phases
- Testing (Phase 4) can start after Phase 2
- Phase 5-6 are nice-to-haves but improve UX significantly
- Prioritize based on actual usage and feedback

---

**Last Updated**: 2025-11-10  
**Status**: Planning Phase
