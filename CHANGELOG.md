# Changelog

All notable changes to this project will be documented in this file.

## 📦 artemis@0.2.1
📅 April 22, 2025 🔍 [Compare changes](https://github.com/yehezkieldio/artemis/compare/artemis@0.2.0...artemis@0.2.1)


### 🔹 <!-- 3 -->New Features

- **preflight:** Add debug option to skip preflight checks ([`6424e44`](https://github.com/yehezkieldio/artemis/commit/6424e449fc5515ae76cc99d5d80268be517901f4))

### 🔹 <!-- 7 -->Code Refactoring

- **changelog:** Remove additional metadata before changes ([`c413374`](https://github.com/yehezkieldio/artemis/commit/c413374bad74d82333bbed23044d2f2640b774ea))

## 📦 artemis@0.2.0
📅 April 22, 2025 🔍 [Compare changes](https://github.com/yehezkieldio/artemis/compare/artemis@0.1.2...artemis@0.2.0)


### 🔹 <!-- 11 -->Project Maintenance

-  Remove renovate config ([`e3116d2`](https://github.com/yehezkieldio/artemis/commit/e3116d2fcf42470a4b4c86d8a763045d2b177f72))
-  Remove github copilot settings ([`8985720`](https://github.com/yehezkieldio/artemis/commit/8985720ac367ee82a8686e1d9c66819ae27d24f4))

### 🔹 <!-- 5 -->Documentation Updates

-  Update commit message guidelines and formatting instructions ([`8c3b81e`](https://github.com/yehezkieldio/artemis/commit/8c3b81e5ad461c45fbe08b2bb0be4a9d73994aca))

### 🔹 <!-- 7 -->Code Refactoring

- **changelog:** Improve header and body template checks ([`50bba21`](https://github.com/yehezkieldio/artemis/commit/50bba21b219b691c6c727fbeb6247944a5b03963))
- **context:** Move enrichWithVersion to context.ts ([`85e3345`](https://github.com/yehezkieldio/artemis/commit/85e3345e8e2a85952cb67ed71369a119b3b7a1ac))

# [artemis@0.1.2](https://github.com/yehezkieldio/artemis/compare/artemis@0.1.1...artemis@0.1.2) (2025-04-20)

## <!-- 4 -->Refactor

- **pipeline:** Extract preflight checks ([f95f18f](https://github.com/yehezkieldio/artemis/commit/f95f18ff2effc29bcbba89332afd74a78ed339b3))

## <!-- 7 -->Miscellaneous Tasks

- Add commit message generation instructions ([d142fd5](https://github.com/yehezkieldio/artemis/commit/d142fd5da00192ea72980149743c6833bc7249e2))

# [artemis@0.1.1](https://github.com/yehezkieldio/artemis/compare/artemis@0.1.0...artemis@0.1.1) (2025-04-20)

## <!-- 7 -->Miscellaneous Tasks

- Update continuous delivery workflow to publish to npmjs ([f09c8b4](https://github.com/yehezkieldio/artemis/commit/f09c8b423155c9fb65555a8cd5dc4532f16f94b0))
- **renovate:** Format file ([d9b2dbc](https://github.com/yehezkieldio/artemis/commit/d9b2dbc576b484dce3a42852940b49272c589ebc))

# [artemis@0.1.0](https://github.com/yehezkieldio/artemis/tree/artemis@0.1.0) (2025-04-20)

## <!-- 0 -->Features

- Add funding and renovate configuration files; update tag format ([9392ed7](https://github.com/yehezkieldio/artemis/commit/9392ed773f25ec308a9deade3dd174676a26b585))
- **readme:** Add detailed usage instructions and configuration examples ([1e5f843](https://github.com/yehezkieldio/artemis/commit/1e5f843358a319e52d3f770728a1b7c1599be6f1))
- **pipeline:** Add environment checks and improve rollback ([6dbfacb](https://github.com/yehezkieldio/artemis/commit/6dbfacb119b10ad7e6b825866ebfa44b521ed535))
- **pipeline:** Add preflight pipeline for context validation ([595f868](https://github.com/yehezkieldio/artemis/commit/595f868a60c10bb6a4cfb5196325d38f4bd1a391))
- **github-release:** Add dry run indicator to release logging ([e7faf95](https://github.com/yehezkieldio/artemis/commit/e7faf959b772e44741e29904ebc43c077c0fadff))
- **release:** Implement github release rollback ([fcb670d](https://github.com/yehezkieldio/artemis/commit/fcb670d85a4a433caa4980be32554bb3ffc60333))
- **github-release:** Add options for GitHub release management ([47ecddc](https://github.com/yehezkieldio/artemis/commit/47ecddc14416eaefa776ccc516374f68eb9607df))
- **context:** Add branch option to ArtemisConfiguration interface ([3a67541](https://github.com/yehezkieldio/artemis/commit/3a67541bdcc9b01a9971ffe2987461dce346ec00))
- **pipelines:** Add rollback functionality for version tag creation ([f5b644b](https://github.com/yehezkieldio/artemis/commit/f5b644b80051a4305415a493ba1f2e0138ce80cd))
- **changelog:** Simplify rollback by removing backup functionality ([3c9c600](https://github.com/yehezkieldio/artemis/commit/3c9c6009d8e5a7f9803ba548c60c11cdbbec1e37))
- **changelog:** Add rollback functionality for changelog generation ([092838a](https://github.com/yehezkieldio/artemis/commit/092838abe71452d971f34b2b44da9c61bc4f23a2))
- **commit:** Add dry run support and rollback functionality ([afbf1f1](https://github.com/yehezkieldio/artemis/commit/afbf1f13c9494dc29e5e2478af450ad9d75ab38d))
- **config:** Add skip options and check name/ scope from package.json ([2b34e21](https://github.com/yehezkieldio/artemis/commit/2b34e2165935ea5e0a1cbb9eaa2ed3af4ae8527e))
- **commit:** Implement createCommitPipeline with staging functionality ([b352ff2](https://github.com/yehezkieldio/artemis/commit/b352ff2ca8b64f2f3e172f6c0ebc28058c928e9c))
- **bump-version:** Add rollback functionality for version bumping ([b9d6576](https://github.com/yehezkieldio/artemis/commit/b9d6576e1045d190ae333668c7baa7b7eb6d2b25))
- **cli:** Add options to skip commit, tag, and push steps ([862f717](https://github.com/yehezkieldio/artemis/commit/862f7171e4e051374b1c6911d14edf04fbe4a4d7))
- **git-cliff:** Add verbose logging for changelog generation process ([6db0ca1](https://github.com/yehezkieldio/artemis/commit/6db0ca12ae3f5b3c3e0984ce63a583a7973da7dd))
- **git-cliff:** Enhance changelog generation with dry run support ([ecc380b](https://github.com/yehezkieldio/artemis/commit/ecc380be26533b5f3e3b4d717db0273b70330cbf))
- **cli:** Add option to skip changelog generation step ([21bd5f2](https://github.com/yehezkieldio/artemis/commit/21bd5f2926b3fd4c218aaf7bfcdd5ab485cd8906))
- **changelog:** Implement changelog generation using Git Cliff ([50d4727](https://github.com/yehezkieldio/artemis/commit/50d47270047f66c3793082692ce7fac19f37f5a4))
- **git-cliff:** Add Git Cliff integration and changelog generation ([e8b6c79](https://github.com/yehezkieldio/artemis/commit/e8b6c794bcc25e1a5a63617810f80ba2ddbafa73))
- **config:** Add configuration options for changelog and release formats ([ce95ceb](https://github.com/yehezkieldio/artemis/commit/ce95ceb36a626b38b684ed95e8717c459cb63177))
- **git-cliff:** Add TOML parsing for Git Cliff configuration ([ccc0e97](https://github.com/yehezkieldio/artemis/commit/ccc0e974876f8596a2abd3cc85be2e718d312153))
- **config:** Add repository auto-detection and version enrichment ([fc7658c](https://github.com/yehezkieldio/artemis/commit/fc7658cd88f9263612076a30987aca79eef5b4bb))
- **github:** Add Octokit integration for GitHub API authentication ([ff684c5](https://github.com/yehezkieldio/artemis/commit/ff684c5d7a5602e6cd9876ecdecc00a7cfe86d20))
- **git:** Enhance GitHub CLI integration and token retrieval logic ([7127faf](https://github.com/yehezkieldio/artemis/commit/7127fafa1902cc0af0715a362938006e85bb5437))
- **pipeline:** Add dry run support and logging for version bumping ([2125b35](https://github.com/yehezkieldio/artemis/commit/2125b353a27fddc8b0de5fd55b8748a3215447af))
- **pipeline:** Add support for skipping steps in rollback execution ([56a278e](https://github.com/yehezkieldio/artemis/commit/56a278ed5eec47adb33af8c04517f26ab7564232))
- **cli:** Add options to skip version bump and GitHub release ([4f908e9](https://github.com/yehezkieldio/artemis/commit/4f908e9a4c10668c3295f95c2f0d716b7da66138))
- Implement CLI with version bumping and configuration management ([1a9ec91](https://github.com/yehezkieldio/artemis/commit/1a9ec91de2e11a7b33d9ccc22d01c5ac1e88a684))

## <!-- 1 -->Bug Fixes

- **readme:** Align title and header formatting for consistency ([a4e6186](https://github.com/yehezkieldio/artemis/commit/a4e618695d860d3494bf06d0b9b53202e6e23778))
- **readme:** Clarify compatibility with Node.js and other runtimes ([bb7da3c](https://github.com/yehezkieldio/artemis/commit/bb7da3c02648f567a92b8fe1ccd986e3968003d1))
- **readme:** Remove redundant configurable feature mention ([15fe995](https://github.com/yehezkieldio/artemis/commit/15fe995e8ebe0796b0fb7916f2f1cb5029b06575))
- **readme:** Correct description of CLI functionality ([99b8e96](https://github.com/yehezkieldio/artemis/commit/99b8e9667190b75a0d5ebe93aab51070149d25c2))
- **pipelines:** Log created tag message in createTag function ([72a5236](https://github.com/yehezkieldio/artemis/commit/72a5236d7c5e7bb1f9f30234f5aa9dcfea1391db))
- **cli:** Change logger info to log for version display ([0b28ad1](https://github.com/yehezkieldio/artemis/commit/0b28ad16930707ff06bd6e920a30d3584357ac07))

## <!-- 4 -->Refactor

- **pipeline:** Update entrypoints and improve logging messages ([0d4b08c](https://github.com/yehezkieldio/artemis/commit/0d4b08cdab45ca501cf07e63e8e35ac1c227d1f9))
- **create-version-tag:** Improve tag creation logic and error handling ([e0ddca3](https://github.com/yehezkieldio/artemis/commit/e0ddca38f625ae2176259b69149c9de7f7b2031f))
- Remove some verbose logging ([76beabb](https://github.com/yehezkieldio/artemis/commit/76beabb3070a3b0ddba88639327ad934e8276700))
- **github-release:** Update tag name format and improve logging ([ce219aa](https://github.com/yehezkieldio/artemis/commit/ce219aa6d34bf6308cafeda1b8403b68f4eaba8f))
- **config:** Update package name formatting to use scope ([622fe43](https://github.com/yehezkieldio/artemis/commit/622fe43b4a1be204702360486daa8168a7416344))
- **config:** Update configuration loading to use cwd and defaults ([a26ce27](https://github.com/yehezkieldio/artemis/commit/a26ce27962f7e0f615d1edc7b2982c4bc873cd83))
- **github-release:** Improve log message formatting for releases ([dcd6e98](https://github.com/yehezkieldio/artemis/commit/dcd6e9848f8919bccaeba632c8665ce5eadc994d))
- **github-release:** Truncate log output for release parameters ([559f49f](https://github.com/yehezkieldio/artemis/commit/559f49f4b3775c53efbc84df17919341c1d9d15a))
- **pipelines:** Update dry run logging message for tag creation ([b2fd6a9](https://github.com/yehezkieldio/artemis/commit/b2fd6a902009d671e817c805ea484e90c86fcf07))
- **pipelines:** Enhance dry run logging for push operations ([7e8e067](https://github.com/yehezkieldio/artemis/commit/7e8e067e1222fc4eaf16e0f44bc6e6a0e0965825))
- **pipelines:** Update logging messages for push operations ([42ae4df](https://github.com/yehezkieldio/artemis/commit/42ae4dfba0f2e36f7af43f1996dfce9a4681d95c))
- **pipelines:** Improve dry run logging in createCommitPipeline ([e9afa1c](https://github.com/yehezkieldio/artemis/commit/e9afa1cd982b9f1c6ab9b13d8613e4960c573a54))
- **pipelines:** Simplify createVersionTagPipeline and improve logging ([a5ef9f3](https://github.com/yehezkieldio/artemis/commit/a5ef9f3f8a079c50fedde740610d32a3f64f6d2a))
- **fs:** Add dry run option to createIfNotExists function ([55880dc](https://github.com/yehezkieldio/artemis/commit/55880dcc72798d9142ff4529ea751dc0038f4a04))
- **github:** Reorganize GitHub CLI functions and improve imports ([5af9e82](https://github.com/yehezkieldio/artemis/commit/5af9e82b02887898ec8e5ac460543f9f901d2ad7))
- **git:** Rename function for consistency and improve repo extraction ([4f2f006](https://github.com/yehezkieldio/artemis/commit/4f2f006777a85b972a323db4444a35efa5b3431a))
- **context:** Add type parameters to Object.freeze for clarity ([077db61](https://github.com/yehezkieldio/artemis/commit/077db61672dfef7c736cc9370de1fea921e358d7))
- **utils:** Simplify error handling in createErrorFromUnknown ([0980436](https://github.com/yehezkieldio/artemis/commit/0980436c5799ceb70f385362f335ba058855bbc3))

## <!-- 7 -->Miscellaneous Tasks

- Initialize project with essential configuration files ([eb0a26b](https://github.com/yehezkieldio/artemis/commit/eb0a26b651d0b9d12abddba6174781684a1e6a32))

