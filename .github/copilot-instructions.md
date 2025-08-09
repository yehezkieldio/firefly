# Development Instructions

## Overview

Firefly is a CLI orchestrator for automatic semantic versioning, changelog generation, and creating releases.

It is imperative that any AI-assisted development, automation, or related workflows strictly adhere to the contents of this document as foundational context for all tasks within this project.

## Operating Principles

- **Hexagonal Architecture + Feature Slicing**
    - Still preserve inward-facing dependency rules.
    - Organize by business capability (feature), not only by technical layer.
    - Each feature folder contains its own core/, application/, and infrastructure/ subfolders.
    - Global orchestration, platform integration, and cross-cutting utilities live outside feature modules.

### Architectural Guidelines

#### Feature Module Structure

```
src/
    modules/
        <feature-name>
            core/
            application/
            infrastructure/
```

- **`core/`** — Contains timeless, pure domain logic and business rules.
    - Must be framework-agnostic and free from side effects.
    - May reference shared types or interfaces from other layers for boundary definitions or interoperability.
    - Should be fully unit-testable without requiring infrastructure dependencies.

- **`application/`** — Implements use cases, orchestrates workflows, coordinates tasks, and manages rollbacks.
    - Acts as the mediator between `core/` and `infrastructure/`.
    - Responsible for enforcing application-specific rules and sequencing operations.
    - Should handle transaction-like flows and ensure consistent state transitions.

- **`infrastructure/`** — Handles all side effects and integration points.
    - Examples: file I/O, Git operations, HTTP requests, CLI interactions, database access.
    - Implements the interfaces defined in `core/` or `application/`.
    - Should be replaceable without impacting core or application logic.

#### Global Structure

```
src/
    modules/
    application/
    platform/
    shared/
```

- **`application/`** (root)
    - Cross-feature orchestrators, workflows, and global application state
    - Composition of tasks from multiple features into end-to-end flows.

- **`platform/`**
    - Cross-cutting integration points not tied to a single feature.
    - CLI startup, config loading, environment bootstrap.

- **`shared/`**
    - Stateless utilities, constants, error/result handling, and type definitions.

## Development Standards

- **TypeScript First:** Fully leverage TypeScript’s type system to ensure correctness and maintainability. Avoid `any` unless absolutely unavoidable, and prefer precise, explicit types.
- **Defensive Programming:** Validate inputs and outputs at module boundaries. Assume external data may be malformed and guard accordingly.
- **Composition Over Inheritance:** Build functionality by composing smaller, focused modules rather than modifying existing ones or relying on inheritance.
- **Locality of Behavior:** Keep related logic close together so each unit is understandable in isolation without requiring deep context.
- **Readable Code:** Code should be self-explanatory in how it works. Use comments to explain *why* decisions were made, not *how* they work.
- **Clear Module Boundaries:** Each module should have a well-defined purpose, know what it owns, what it exposes, and what it depends on.

## Code Structure

- **Dependency Management:** Avoid circular dependencies, deep nesting, and unnecessary indirection. Keep imports minimal and explicit.
- **Type Safety:** Use Zod for schema validation and to infer TypeScript types, ensuring runtime and compile-time safety remain in sync.
- **Validation:** Assume data has been validated before entering a module. Use the type system to enforce correctness rather than relying on runtime checks.
- **State Management:** Avoid mutating state unless explicitly modeling mutable behavior. Prefer immutable patterns and copying over in-place changes.

## Architectural Composition Principles

- **Keep dependencies flowing inward:** Outer layers depend on inner layers, never the reverse.
- **Define clear, explicit interfaces:** For all interactions between layers.
- **Infrastructure replaceability:** Ensure that replacing an infrastructure component requires no changes to core or application logic.
- **Favor small, composable modules:** Over large, monolithic ones to improve maintainability and testability.

## Result and Error Handling

- `ok`, `err`, `okAsync` and `errAsync` are still imported from `neverthrow`.
- Always use `FireflyResult<T>` and `AsyncFireflyResult<T>` from `shared/utils/result.util.ts` (built on `neverthrow`) for consistent, type-safe error handling and result propagation.
    - **`FireflyResult<T>`**: For synchronous operations where the result is immediately available without awaiting.
    - **`AsyncFireflyResult<T>`**: For asynchronous operations where the result must be awaited before accessing the value or error.
- All errors must be mapped to a clear, domain-specific `FireflyError` (see `shared/utils/error.util.ts` for the error hierarchy) to ensure consistent error semantics across the codebase.
- **NEVER** use `try/catch` under any circumstances — all error handling must be implemented using `FireflyResult` or `AsyncFireflyResult`.
- Do not mix `throw` statements with `Result` handling in the same execution path.
