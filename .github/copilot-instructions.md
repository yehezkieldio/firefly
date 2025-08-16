# Development Instruction

## 1. Technology Stack

- **CLI:** Commander for building the command-line interface.
- **Validation:** Zod for runtime validation and compile-time type inference.
- **Runtime:** Bun for execution and package management.
- **Changelog Generation:** git-cliff for generating changelog.
- **Configuration:** c12 for file-based configuration loading.

## 2. Coding Standards

- **TypeScript First:** Prefer explicit, advanced types for safety and clarity; never use `any`.
- **Defensive Programming:** Validate all inputs/outputs at boundaries; treat external data as potentially invalid.
- **Readable & Intentional:** Code should convey *why* it exists; avoid redundant comments on *how* it works.
- **Clear Module Boundaries:** Each module has a single, well-defined purpose, ownership, and dependency scope.
- **Immutable State:** Prefer immutability; only mutate when modeling inherently mutable behavior.
- **Extract Complex Expressions:** Break down complex expressions into well-named intermediate variables or functions.

## 3. Architectural Patterns

- **Composition Over Inheritance:** Build from small, focused, composable modules.
- **Locality of Behavior:** Keep related logic close together.
- **Inward Dependency Flow:** Outer layers depend on inner layers, never the reverse.
- **Explicit Interfaces:** Define clear contracts between layers and modules.
- **Performance:** Every component, function, and hook should be optimized for performance by default

## 3. Result & Error Handling

- **Rust-Style Semantics:** Use neverthrow for explicit success/error handling.
- **No try/catch:** Do not use `try/catch` at all, forget it exists.
- **No Mixed Error Models:** Do not mix `throw` with `Result` in the same execution path.
- **Explicit Unpacking:** Use `isOk()` / `isErr()` guards for clarity and control flow.
- **Shallow Method Chains:** Limit chaining to two links; use named variables for intermediate results.

### Types

- `FireflyResult<T>`
  - A synchronous `Result<T, FireflyError>`.

- `FireflyAsyncResult<T>`
  - An asynchronous `ResultAsync<T, FireflyError>` — behaves like `Promise<Result<T, FireflyError>>`.
  - **Do not** wrap it in `Promise`.
  - **Do not** mark a function returning `FireflyAsyncResult<T>` as `async`.

- `Promise<FireflyResult<T>>`
  - Use **only** when you need to `await` inside the function body (e.g., to unwrap a `FireflyAsyncResult`).
  - This is the correct type for functions that internally `await` other async operations and then return a `FireflyResult`.

#### Examples

```ts
// ✅ Correct: returns FireflyAsyncResult<T>
function getUser(id: string): FireflyAsyncResult<User> {
  return ResultAsync.fromPromise(fetchUser(id), toFireflyError);
}

// ✅ Correct: returns Promise<FireflyResult<T>>
async function getUserCommits(id: string): Promise<FireflyResult<Commit[]>> {
  const userRes = await getUser(id);
  if (userRes.isErr()) return FireflyErr(userRes.error);
  const commitsRes = await fetchCommits(userRes.value);
  return commitsRes;
}
```

## 4. Operating Principles

- **Variables:** Use descriptive names with auxiliary verbs (e.g., `isLoading`, `hasError`, `canDelete`).
- **Functions, Variables, Object Properties:** Use camelCase (e.g., `fetchData`, `userList`).
- **Files and Directories:** Use kebab-case (e.g., `user-profile.tsx`, `api-routes/`).
- **Architecture:** Hexagonal + Feature Slicing
  - Preserve inward-facing dependency rules.
  - **Global Structure:**
    - `application/` — Cross-feature orchestration, no business logic or infra.
    - `platform/` — CLI startup, config, env bootstrap, process lifecycle.
    - `shared/` — Shared stateless utilities, constants, errors, types.
    - `modules/<feature>` — Each capability with:
      - `core/` — Pure domain logic, infra-agnostic.
      - `application/` — Module-specific orchestration.
      - `infrastructure/` — I/O, side effects, infra integrations.
  - Organize by capability, not just layer; cross-cutting concerns in `shared/`.
