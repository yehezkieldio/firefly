# Development Instructions

## Firefly

Firefly is a CLI orchestrator for automatic semantic versioning, git-cliff changelog generation, and creating release all in one command.

## 1. Technology Stack

- **Runtime:** `Bun` for execution and package management.
- **Validation:** `Zod` for runtime validation and compile-time type inference.

## 2. Coding Standards

- **YAGNI Principle:** Start simple and add complexity only when you have concrete requirements for it.
- **Defensive Programming:** Validate all inputs/outputs at boundaries; treat external data as potentially invalid.
- **Readable & Intentional:** Code should convey why it exists; avoid redundant comments on how it works.
- **Extract Complex Expressions:** Break down complex expressions into well-named intermediate variables or functions/classes.

## 3. Coding Patterns

- **Locality of Behavior:** Keep related logic close together.
- **Inward Dependency Flow:** Outer layers depend on inner layers, never the reverse.
- **Explicit Interfaces:** Define clear contracts between layers and modules.
- **Performance:** Optimize by default and avoid common pitfalls; favor clarity over premature micro-optimizations.

## 4. Result & Error Handling

- **Rust-Style Semantics:** Use `neverthrow` for explicit success/error handling.
- **No try/catch and throw:** Do not use `try/catch` and `throw` at all.
- **Explicit Unpacking:** Use `isOk()` / `isErr()` guards for clarity and control flow.
- **Shallow Method Chains:** Limit chaining to two links; use named variables for intermediate results.

## 5. Operating Principles

- **Type Safety**: Never use any; leverage full TypeScript type system and advanced types.
- **Naming Conventions**:
  - Use `kebab-case` for files and directories.
  - Use descriptive, `camelCase` names with auxiliary verbs for variables, functions, and object properties.
  - Use `PascalCase` for types, interfaces, and classes.
- **Architecture:** Hexagonal + Feature Slicing
  - **Project Tree:**
    - `application/` — Cross-feature orchestration, no business logic or infra.
    - `platform/` — CLI startup.
    - `shared/` — Shared stateless utilities.
    - `modules/<feature>` — Each capability with:
      - `core/` — Pure domain logic, infra-agnostic.
      - `application/` — Module-specific orchestration.
      - `infrastructure/` — I/O, side effects, infra integrations.