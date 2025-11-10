# Firefly Rewrite - Contributor Documentation

Welcome to the Firefly contributor documentation! This guide will help you understand, contribute to, and extend the Firefly codebase.

## 📚 Documentation Structure

This documentation is organized into 5 main sections designed to minimize cognitive load and maximize efficiency:

### 1. [Project Overview & Execution Flow](./01-PROJECT-OVERVIEW.md)
**Start here for the big picture**
- Introduction to Firefly's purpose and scope
- Complete execution flow from CLI input to result output
- Context flow and immutability patterns
- Key architectural decisions and rationale
- Performance characteristics
- Error handling philosophy

### 2. [Architectural Blueprint](./02-ARCHITECTURE.md)
**Deep dive into the system design**
- Complete post-rewrite architecture (7 layers)
- Recent changes and why they were made
- Data models and their relationships
- Component interactions and communication
- Service layer design
- Task system architecture
- Comparison with old architecture

### 3. [Core Concepts & Mental Models](./03-CORE-CONCEPTS.md)
**Essential knowledge for contributors**
- Terminology dictionary (40+ terms)
- Mental models for thinking about the code
- Key directories and their purposes
- File naming conventions
- Code organization patterns
- Design patterns used throughout
- Common pitfalls and best practices

### 4. [Contributing Guide](./04-CONTRIBUTING.md)
**How to add features and fix bugs**
- Adding a new command (step-by-step)
- Adding a new task (with examples)
- Adding a new workflow
- Adding a new service
- Testing requirements and strategies
- Code style and conventions
- PR guidelines and review process

### 5. [Advanced Topics](./05-ADVANCED.md)
**For experienced contributors**
- Advanced patterns and techniques
- Performance optimization strategies
- Debugging and troubleshooting
- Security considerations
- Migration guide from old architecture
- Extension points and plugins
- Monitoring and observability

## �� Quick Start for New Contributors

### 1. Read the Documentation
Start with these in order:
1. **01-PROJECT-OVERVIEW** - Understand what Firefly does and how it works
2. **03-CORE-CONCEPTS** - Learn the terminology and mental models
3. **04-CONTRIBUTING** - Learn how to add features

### 2. Set Up Your Environment
```bash
# Clone the repository
git clone https://github.com/yehezkieldio/firefly.git
cd firefly

# Install dependencies
bun install

# Run tests
bun test

# Try the CLI
bun src/rewrite/cli/main.ts --help
```

### 3. Explore the Codebase
```bash
# Key directories to explore
src/rewrite/
├── cli/              # CLI entrypoint
├── commands/         # Command implementations
├── tasks/            # Task implementations
├── shared/           # Services (Git, FileSystem, etc.)
├── execution/        # Workflow orchestrator
└── __tests__/        # Test suite
```

### 4. Pick Your First Issue
Look for issues labeled:
- `good first issue` - Great for beginners
- `documentation` - Improve docs
- `enhancement` - Add new features
- `bug` - Fix issues

### 5. Make Your First Contribution
Follow the [Contributing Guide](./04-CONTRIBUTING.md) for detailed instructions.

## 🗺️ Documentation Roadmap

### Learning Paths

#### Path 1: New Contributor (First Week)
```
Day 1: PROJECT-OVERVIEW
Day 2: CORE-CONCEPTS (terminology)
Day 3: ARCHITECTURE (layers)
Day 4: CONTRIBUTING (how-to guides)
Day 5: Pick and implement "good first issue"
```

#### Path 2: Quick Reference (Returning Contributor)
```
- Need to add command? → CONTRIBUTING > Adding Commands
- Need to add task? → CONTRIBUTING > Adding Tasks
- Debugging issue? → ADVANCED > Troubleshooting
- Performance problem? → ADVANCED > Optimization
```

#### Path 3: Architecture Review
```
1. ARCHITECTURE > Recent Changes
2. ARCHITECTURE > Design Rationale
3. PROJECT-OVERVIEW > Architectural Decisions
4. ADVANCED > Migration Guide
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│         CLI Layer                   │  (main.ts, commander.ts)
├─────────────────────────────────────┤
│      Configuration Layer            │  (config-loader.ts)
├─────────────────────────────────────┤
│      Command Layer                  │  (command-registry, commands/*)
├─────────────────────────────────────┤
│      Orchestration Layer            │  (workflow-orchestrator)
├─────────────────────────────────────┤
│      Task Layer                     │  (task-registry, tasks/*)
├─────────────────────────────────────┤
│      Service Layer                  │  (shared/* - 11 services)
├─────────────────────────────────────┤
│      Context Layer                  │  (workflow-context)
└─────────────────────────────────────┘
```

## 📊 Documentation Stats

- **6 documentation files**
- **~4,200 lines of documentation**
- **~55,000 words**
- **120+ code examples**
- **20+ diagrams**
- **40+ core concepts explained**

## ❓ Frequently Asked Questions

### How do I add a new command?
See [04-CONTRIBUTING.md > Adding a New Command](./04-CONTRIBUTING.md#adding-a-new-command)

### How do I add a new task?
See [04-CONTRIBUTING.md > Adding a New Task](./04-CONTRIBUTING.md#adding-a-new-task)

### What's the difference between a Command and a Task?
- **Command:** User-facing feature (e.g., `firefly release`)
- **Task:** Internal step within a command (e.g., "update version", "create tag")

### Why use Result types instead of exceptions?
Result types provide type-safe error handling, force explicit error handling, and make error paths testable. See [01-PROJECT-OVERVIEW.md > Error Handling Philosophy](./01-PROJECT-OVERVIEW.md#error-handling-philosophy)

### How does the immutable context work?
Context uses a forking pattern where each task returns a new context with additional data, leaving the original unchanged. See [01-PROJECT-OVERVIEW.md > Context Flow](./01-PROJECT-OVERVIEW.md#context-flow)

### Where should I put my new code?
- New command? → `commands/my-command/`
- New task? → `tasks/my-feature/`
- New service? → `shared/my-service/`
- See [03-CORE-CONCEPTS.md > Key Directories](./03-CORE-CONCEPTS.md#key-directories)

### How do I run tests?
```bash
bun test                          # All tests
bun test __tests__/shared/        # Service tests
bun test --watch                  # Watch mode
bun test --coverage               # Coverage report
```

### What's the code style?
See [04-CONTRIBUTING.md > Code Style](./04-CONTRIBUTING.md#code-style-and-conventions)

## �� Getting Help

### Documentation
1. Search this documentation (use Ctrl+F in your editor)
2. Check [03-CORE-CONCEPTS.md](./03-CORE-CONCEPTS.md) for terminology
3. See [05-ADVANCED.md > Troubleshooting](./05-ADVANCED.md#troubleshooting-guide)

### Community
- **GitHub Issues:** Ask questions, report bugs
- **GitHub Discussions:** General discussions, ideas
- **Pull Requests:** Get code review and feedback

### Best Practices
- Always search documentation first
- Include context when asking questions
- Share what you've already tried
- Provide code examples and error messages

## 🤝 Contributing to Documentation

Found an error? Have a suggestion? Want to improve the docs?

### Quick Fixes
- Fix typos and grammar
- Add missing examples
- Clarify confusing sections
- Update outdated information

### Larger Contributions
- Add new sections for uncovered topics
- Create visual diagrams
- Write tutorials
- Add FAQs

### How to Contribute
1. Edit the relevant `.md` file in `src/rewrite/docs/`
2. Follow the existing style and structure
3. Add code examples where helpful
4. Submit a PR with your changes

## 📝 Documentation Principles

This documentation follows these principles:

1. **Progressive Disclosure:** Simple concepts first, advanced later
2. **Example-Driven:** Show, don't just tell
3. **Searchable:** Clear headings and structure
4. **Maintainable:** Modular organization
5. **Living:** Updated as code evolves
6. **Contributor-Focused:** Written for people who will use it

## 🎯 Documentation Goals

- ✅ Reduce onboarding time from days to hours
- ✅ Enable self-service learning
- ✅ Preserve institutional knowledge
- ✅ Increase contribution quality
- ✅ Build contributor confidence
- ✅ Reduce maintainer burden

## 🚦 Next Steps

**New Contributors:**
1. Read [01-PROJECT-OVERVIEW.md](./01-PROJECT-OVERVIEW.md)
2. Read [03-CORE-CONCEPTS.md](./03-CORE-CONCEPTS.md)
3. Read [04-CONTRIBUTING.md](./04-CONTRIBUTING.md)
4. Pick a "good first issue"
5. Start coding!

**Returning Contributors:**
- Jump to the section you need
- Use docs as quick reference
- Update docs when you add features

**Architecture Reviewers:**
- Read [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)
- Review design decisions and rationale
- Understand trade-offs made

---

**Happy Contributing! 🎉**

If you have questions or suggestions for improving this documentation, please open an issue or PR.
