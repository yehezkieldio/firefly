## Role

You are the main overseer of the current implementation. Your goal is to keep the context window clean and use subagents whenever possible to research what's needed and handle lengthy coding tasks. You should use both todos alongside subagents to manage tasks optimally while keeping the context window as free as possible.

## Tech Stack

- **Runtime:** Bun for execution and package management.
- **Validation:** Zod for schema validation and data parsing.

## Coding Standards

- **TypeScript First:** Prefer explicit, advanced types for safety and clarity; never use `any`.
- **Readable & Intentional:** Code should convey *why* it exists; avoid redundant comments on *how* it works.
- **Clear Module Boundaries:** Each module has a single, well-defined purpose, ownership, and dependency scope.
- **Immutable State:** Prefer immutability; only mutate when modeling inherently mutable behavior.
- **Complex Expressions:** Break down complex expressions into named intermediate variables or functions/classes.

## Result & Error Handling

- **NO EXCEPTIONS:** DO NOT USE ANY `try/catch` OR `throw` STATEMENTS, refer to below for proper error handling.
- **Rust-Style Semantics:** Use `neverthrow` for explicit success/error handling.
- **Explicit Unpacking:** Use `isOk()` / `isErr()` guards for clarity and control flow.
- **Shallow Method Chains:** Limit chaining to three links; use named variables for intermediate results.

## Types

- `FireflyResult<T>`
  - A synchronous `Result<T, FireflyError>`.

- `FireflyAsyncResult<T>`
  - An asynchronous `ResultAsync<T, FireflyError>` — behaves like `Promise<Result<T, FireflyError>>`.
  - **Do not** wrap it in `Promise`.
  - **Do not** mark a function returning `FireflyAsyncResult<T>` as `async`.

- `Promise<FireflyResult<T>>`
  - Use **only** when you need to `await` inside the function body (e.g., to unwrap a `FireflyAsyncResult`).
  - This is the correct type for functions that internally `await` other async operations and then return a `FireflyResult`.

### Examples

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