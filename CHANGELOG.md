# Changelog

All notable changes to this project will be documented in this file.

**NOTE:** Changes are ordered by date, starting with the most oldest to the most recent.

> This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

## firefly@4.0.0-alpha.0 (November 28, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`5d5a065`](https://github.com/yehezkieldio/firefly/commit/5d5a0655d871b1403f900017f2f82011cacf533b) config: Replace biome.jsonc with updated biome.json config
- [`72ec25c`](https://github.com/yehezkieldio/firefly/commit/72ec25cdadead42a97a7a70f00bae893dbfab1ef) config: Update tsconfig with stricter type checks
- [`3660391`](https://github.com/yehezkieldio/firefly/commit/3660391adb30fd33a7edd5de7f522482000c0d86) config: Update ts target to esnext and add Bun global
- [`cf58d4a`](https://github.com/yehezkieldio/firefly/commit/cf58d4a150dcc7120a4328a12397d1eb619154dd) config: Add js language to grit rule and remove firefly image asset
- [`4ab2c31`](https://github.com/yehezkieldio/firefly/commit/4ab2c3111f9a4eb0804481dfda052007bc5628ee) config: Enable isolatedDeclarations in tsconfig
- [`1822cd4`](https://github.com/yehezkieldio/firefly/commit/1822cd4ea73ac329f32afe3244c1306eb8a6935b) config: Remove vscode tasks and disable unused vars rule
- [`c205f0c`](https://github.com/yehezkieldio/firefly/commit/c205f0c6971abb0d19f4bd434377783b025d5fa1) config: Remove isolatedDeclarations from tsconfig
- [`4a87c57`](https://github.com/yehezkieldio/firefly/commit/4a87c5747987062616ceef0d4cf2e53938a0b6c1) config: Disable noEmptySource rule in biome nursery
- [`684cad5`](https://github.com/yehezkieldio/firefly/commit/684cad5f37436bb39be9728d05215abec29079f6) config: Add biome config and apply formatting updates
- [`97d3597`](https://github.com/yehezkieldio/firefly/commit/97d359737301ff26a600a4b5dedad42413c7ad66) config: Reformat configs and remove unused src modules
- [`e149a78`](https://github.com/yehezkieldio/firefly/commit/e149a782070365db3874a86b6d0c3f05a57cff80) config: Reformat json files, update deps, simplify log import
- [`c4661f4`](https://github.com/yehezkieldio/firefly/commit/c4661f4eb3b7ac3890cc2ea29802bafefa3c26a0) Add temp stuff
- [`af2b184`](https://github.com/yehezkieldio/firefly/commit/af2b184b8db327f2d063f4e78088ae48d64e6e95) Remove everything
- [`4e456a8`](https://github.com/yehezkieldio/firefly/commit/4e456a86c810643ba706c6dd2d3c8e38a67ae32c) Actually remove everything
- [`509dc68`](https://github.com/yehezkieldio/firefly/commit/509dc682fcaf7d55353785c9c9378a84f1ca57ef) config: Add biome setup, vscode settings, tsconfig, and project metadata
- [`3c32ce6`](https://github.com/yehezkieldio/firefly/commit/3c32ce693d5d93d27b780eb174238f704cddbb79) config: Disable noParameterProperties rule in biome config

### <!-- 16 -->🤖 CI/CD
- [`b2650ea`](https://github.com/yehezkieldio/firefly/commit/b2650ea1141fb5b6f8d200f6cf2826637bdb0f86) ci: Temporarily remove continuous delivery workflow

### <!-- 2 -->🧩 Dependencies Updates
- [`3005c1d`](https://github.com/yehezkieldio/firefly/commit/3005c1dbe37d57ec6f5a6e3a422ba6f4eef41c72) deps: Add ultracite dependency
- [`05bf223`](https://github.com/yehezkieldio/firefly/commit/05bf22389d104d9031cffafad54bf5281cc74e97) deps: Update c12, biome, types, and tsdown versions
- [`9e78323`](https://github.com/yehezkieldio/firefly/commit/9e78323b50b518c253b96f81e7dd8a6d6fe6ca5f) deps: Update @types/node and tsdown
- [`91224f9`](https://github.com/yehezkieldio/firefly/commit/91224f91b71dda260e0036c428f3f11dd0201e8a) deps: Update biome, tsdown, and ultracite to latest patch versions
- [`f490d3b`](https://github.com/yehezkieldio/firefly/commit/f490d3b18116b213e67ffddff14fa1a359f6147e) deps: Add c12, commander, and git-cliff dependencies and dev script

### <!-- 3 -->🚀 New Features
- [`2b78efd`](https://github.com/yehezkieldio/firefly/commit/2b78efdbdb20162a56133ec8a439a95b5bdf66e6) utils: Add error handling and logging modules
- [`0f828fd`](https://github.com/yehezkieldio/firefly/commit/0f828fd73cefa3680398af7bb7e69855371ca7e4) utils: Add result handling and schema parsing helpers
- [`0dee51a`](https://github.com/yehezkieldio/firefly/commit/0dee51a21ba8d0337b77c19093c734d5a8f64787) context: Add workflow context and builder utilities
- [`7ad55f0`](https://github.com/yehezkieldio/firefly/commit/7ad55f04925501884b0b6f39dfcfd2c599527813) task-system: Add task builder, registry and types
- [`5d7aa16`](https://github.com/yehezkieldio/firefly/commit/5d7aa16a78927dfa89f183b4efa8b4061e953438) utils: Add error and result handling utilities
- [`8e24709`](https://github.com/yehezkieldio/firefly/commit/8e2470912a3ab7e7fc0726142090d67ab8a1ff18) context: Implement workflow context and builder classes
- [`cf77e9f`](https://github.com/yehezkieldio/firefly/commit/cf77e9f8ac5dd46d0217d7ce19d1c5f49423458b) core: Add modular workflow engine with command and task registries
- [`6e4a1d3`](https://github.com/yehezkieldio/firefly/commit/6e4a1d316805d2710460c27bf72debf1c9b12393) release: Add release command config schemas and data models
- [`a02486f`](https://github.com/yehezkieldio/firefly/commit/a02486fae762434d73ea752cbaff7f78030f4a1a) cli: Implement command-line interface with config loader and command registry
- [`6cece0d`](https://github.com/yehezkieldio/firefly/commit/6cece0d7855df1096b099760578616b5819ec271) cli: Add unified configuration schema for Firefly CLI
- [`9a78521`](https://github.com/yehezkieldio/firefly/commit/9a785212a3a200af02775df9b32f7e32af6d20b1) Add stuff

### <!-- 4 -->🐛 Bug Fixes
- [`124489b`](https://github.com/yehezkieldio/firefly/commit/124489b0e7efa0ef49f38be864b9fe839e51c47a) cli: Adjust config log message and improve option shorthand handling

### <!-- 5 -->📚 Documentation
- [`55590d5`](https://github.com/yehezkieldio/firefly/commit/55590d5c71b20cc4f78e0b4a7e403a8b20a555d1) Adjust headings in AGENTS.md for consistent markdown structure

### <!-- 7 -->🚜 Refactor
- [`fce47e7`](https://github.com/yehezkieldio/firefly/commit/fce47e708c1d543213f12240550482dd3d1b84bf) utils: Simplify logger creation and remove custom reporters
- [`b22c2ae`](https://github.com/yehezkieldio/firefly/commit/b22c2ae84d756522a61f0da8880a6e07587d323d) utils: Inline formatOptions in logger configuration
- [`557ce12`](https://github.com/yehezkieldio/firefly/commit/557ce12fba1bf760641e3a4446372fcf86e9bec0) config-loader: Remove redundant comments and fix zod type usage

### <!-- 8 -->🏗️ Build System
- [`900543f`](https://github.com/yehezkieldio/firefly/commit/900543ff0dc212172f45b987d167471435b3c882) config: Enable esm module type and add tsdown build settings

### <!-- 9 -->🎨 Code Styling
- [`e55f872`](https://github.com/yehezkieldio/firefly/commit/e55f872efe6074d12ec2d499f6c1ffa883bdc4e3) utils/error: Remove unnecessary blank lines

### <!-- 99 -->🌀 Other
- [`7d071c9`](https://github.com/yehezkieldio/firefly/commit/7d071c9b9195007dd9f6419109a0106e91338b41) Cleanup
