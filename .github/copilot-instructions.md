# Firefly Instructions

## Overview

Firefly is a CLI orchestrator for semantic versioning, changelog generation, and creating releases.

This document outlines the development and coding standards for the Firefly project. Adherence to these standards ensures high code quality, maintainability, and consistency across the codebase.

## Architecture Principles

Firefly follows **Hexagonal Architecture**:

- `core/` — Pure domain logic (business rules, pure functions, versioning decisions).
- `application/` — Use cases and orchestration (command flow, task coordination).
- `infrastructure/` — External integrations (Git, filesystem, CLI tools).
- `shared/` — Cross-cutting utilities (types, constants, logging, error wrappers).

This separation promotes testability, maintainability, and long-term evolution.

## Operating Principles

- Designed to be run with Bun as the runtime, Node.js is not supported.
- Command line arguments are parsed using the `commander` library for a consistent CLI experience.
- File Configuration is loaded via `c12` with support for file-based (`firefly.config.ts`) configuration.
- CLI arguments and file-based configuration are merged into a single unified configuration object.
- All error handling should use `neverthrow`; avoid throwing exceptions in flow logic.
- Version bumping uses `conventional-recommended-bump` but supports for manual choosing of versions.
- Changelogs are generated with `git-cliff` based on commit messages, uses `smol-toml` to parse its configuration.
- The release process automates versioning, changelog, Git tagging, and GitHub releases.

## Class and Function Design

- **Encapsulation First**: Group related logic using classes. Prefer composition over inheritance.
- **Short & Focused Methods**: Keep methods concise (≤ 30 lines when practical) and single-purpose.
- **Explicit Naming**: Prioritize clarity over brevity. Avoid cryptic abbreviations.
- **Guard Clauses**: Use early returns to reduce nesting and improve readability.
- **Pure Core Logic**: Functions in `core/` should be deterministic and side-effect-free when possible.

## Development Standards

- Code explains how, comments explain why.
- Use defensive programming: validate and check types at boundaries (e.g., parsing config, external data).
- Always use `unknown` instead of `any` for values of uncertain type. Narrow types with type guards before usage.