# Changelog

All notable changes to this project will be documented in this file.

**NOTE:** Changes are ordered by date, starting with the most oldest to the most recent.

> This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

## fireflyy@4.0.0-alpha.13 (December 3, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`c94480d`](https://github.com/yehezkieldio/firefly/commit/c94480d4f7e581230cd876207fd8646c02ad6035) biome: Disable noUndeclaredVariables
- [`384f39a`](https://github.com/yehezkieldio/firefly/commit/384f39aaf465c6fd850e9e636dc5fb6e385a85ab) config: Enable tsgo experimental flag and add branch field to schema

### <!-- 3 -->🚀 New Features
- [`25c80f6`](https://github.com/yehezkieldio/firefly/commit/25c80f6fd7a2142f43c36fc88d303f95bb1c031e) workflow.executor: Add runtime environment warnings for dev and prerelease builds
- [`8bd4659`](https://github.com/yehezkieldio/firefly/commit/8bd465901e17f629d8e3ba73d631593f4712a269) core: Add commit analysis and versioning services
- [`58cfef2`](https://github.com/yehezkieldio/firefly/commit/58cfef2eda62aa119ae87b210b93f0438e68d6cf) release: Implement interactive bump strategy prompt and type integration

### <!-- 4 -->🐛 Bug Fixes
- [`51f744d`](https://github.com/yehezkieldio/firefly/commit/51f744d74be5e8ddd0607b70140be2b5563b7977) release: Support selected release and bump strategy from data
- [`df58d2b`](https://github.com/yehezkieldio/firefly/commit/df58d2b0821535cd1bda91d7da828cd3c4d6ce9f) release: Update bump tasks to use selected strategy from context for accurate skip conditions

### <!-- 5 -->📚 Documentation
- [`660b1f0`](https://github.com/yehezkieldio/firefly/commit/660b1f0371d3167693f19f9d226dab362028423d) domain: Expand JSDoc comments for clarity and consistency across semver and commit type models
## firefly@4.0.0-alpha.12 (December 2, 2025)

### <!-- 3 -->🚀 New Features
- [`53d1f70`](https://github.com/yehezkieldio/firefly/commit/53d1f702b95d4ea0b65e2a3106de4e149c082806) release: Initialize release version from package.json
- [`644fea9`](https://github.com/yehezkieldio/firefly/commit/644fea97c907d756188158fa85fecf204d2c748c) services: Add verbose logger integration for filesystem, git, and package-json services

### <!-- 5 -->📚 Documentation
- [`1ffda94`](https://github.com/yehezkieldio/firefly/commit/1ffda9422900e9b21f32b45bd39851e88b0da00f) release: Clarify version extraction logic in comments

### <!-- 7 -->🚜 Refactor
- [`928dd95`](https://github.com/yehezkieldio/firefly/commit/928dd958ed7d09b16d6eafab754e6c2c5a9ea16c) release: Centralize HydratedConfig interface in release.data for reuse across tasks
- [`43b01f8`](https://github.com/yehezkieldio/firefly/commit/43b01f8cd3000e3d9078b9849459359b9812d755) core: Simplify workflow data typings and improve type safety
- [`72ee2f2`](https://github.com/yehezkieldio/firefly/commit/72ee2f2723ef3445a872e149fd2add7b196e8509) release: Simplify version initialization logging and context handling
## firefly@4.0.0-alpha.11 (December 2, 2025)
## fireflyy@4.0.0-alpha.10 (December 2, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`d3ede06`](https://github.com/yehezkieldio/firefly/commit/d3ede06fa5811f9895bc1027bdce9e8662050f83) config: Replace firefly config from ts to toml format for release definition
- [`fd79cb3`](https://github.com/yehezkieldio/firefly/commit/fd79cb318a5b504a9a392de2c7a5c56858ade395) prepare-release-config.task: Detect current git branch when not provided
- [`3f79464`](https://github.com/yehezkieldio/firefly/commit/3f79464ad7ee5c48f42300fd6734c303215a5c0f) Re-enable renovate
- [`4721ae4`](https://github.com/yehezkieldio/firefly/commit/4721ae41fff120a08d1caae2b03cafaa7691db68) vscode: Remove obsolete tasks configuration file

### <!-- 16 -->🤖 CI/CD
- [`d7b4777`](https://github.com/yehezkieldio/firefly/commit/d7b477713a2d4087e421d4dadbb6816c01849645) Add concurrency control to prevent duplicate runs
- [`a8f6ba0`](https://github.com/yehezkieldio/firefly/commit/a8f6ba031360f17a2faca825bc7ce9f7cd0a4d1d) Enhance src change detection logic in workflow for better commit handling and add logging of detect-changes outputs
- [`c18562b`](https://github.com/yehezkieldio/firefly/commit/c18562b6bf53730f26a19afbecccf6e69764cd10) Remove env vars and hardcode branch and regex patterns

### <!-- 2 -->🧩 Dependencies Updates
- [`7af3188`](https://github.com/yehezkieldio/firefly/commit/7af318845a2ec3b64806883b241a7971b0b571f2) deps: Update dependency @biomejs/biome to v2.3.8 by renovate[bot] ([#139](https://github.com/yehezkieldio/firefly/issues/139))
- [`ab9a109`](https://github.com/yehezkieldio/firefly/commit/ab9a109bfdc585ad1b3e088dfdfd818eed85cc5a) deps: Update dependency tsdown to ^0.17.0-beta.5 by renovate[bot] ([#140](https://github.com/yehezkieldio/firefly/issues/140))
- [`94e1060`](https://github.com/yehezkieldio/firefly/commit/94e10601a6c1efb567279cfd63a286960b4095e1) deps: Update dependency ultracite to v6.3.8 by renovate[bot] ([#141](https://github.com/yehezkieldio/firefly/issues/141))

### <!-- 3 -->🚀 New Features
- [`79c10d9`](https://github.com/yehezkieldio/firefly/commit/79c10d9d04c3dec1b13d365a6503af2f7f83442a) release: Add support for branch field hydration in config
- [`03d6842`](https://github.com/yehezkieldio/firefly/commit/03d68428252f960af3e03f45d189c99e7274c76b) git: Add repository URL inference fallback strategy

### <!-- 4 -->🐛 Bug Fixes
- [`f8302d5`](https://github.com/yehezkieldio/firefly/commit/f8302d528db2932c77903adaec3670b563ea5d8d) config: Remove leading dot from dist path in package bin definitions
- [`352994a`](https://github.com/yehezkieldio/firefly/commit/352994a16fbc1e0456ac74bbb31b248fda549a14) result: Use strict null comparison in fromNullable helpers
- [`8fe8422`](https://github.com/yehezkieldio/firefly/commit/8fe8422cc4818ca76e1d064b4882a6c5f0aa6663) result: Handle undefined values and replace okAsync with FireflyOkAsync

### <!-- 7 -->🚜 Refactor
- [`71d5146`](https://github.com/yehezkieldio/firefly/commit/71d51467d3ca3d7d1baa4b68cca6eee9733e65d8) release: Simplify repository hydration logic and set git verbose default to true
## fireflyy@4.0.0-alpha.9 (December 2, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`d3ede06`](https://github.com/yehezkieldio/firefly/commit/d3ede06fa5811f9895bc1027bdce9e8662050f83) config: Replace firefly config from ts to toml format for release definition
- [`fd79cb3`](https://github.com/yehezkieldio/firefly/commit/fd79cb318a5b504a9a392de2c7a5c56858ade395) prepare-release-config.task: Detect current git branch when not provided
- [`3f79464`](https://github.com/yehezkieldio/firefly/commit/3f79464ad7ee5c48f42300fd6734c303215a5c0f) Re-enable renovate
- [`4721ae4`](https://github.com/yehezkieldio/firefly/commit/4721ae41fff120a08d1caae2b03cafaa7691db68) vscode: Remove obsolete tasks configuration file

### <!-- 16 -->🤖 CI/CD
- [`d7b4777`](https://github.com/yehezkieldio/firefly/commit/d7b477713a2d4087e421d4dadbb6816c01849645) Add concurrency control to prevent duplicate runs
- [`a8f6ba0`](https://github.com/yehezkieldio/firefly/commit/a8f6ba031360f17a2faca825bc7ce9f7cd0a4d1d) Enhance src change detection logic in workflow for better commit handling and add logging of detect-changes outputs

### <!-- 2 -->🧩 Dependencies Updates
- [`7af3188`](https://github.com/yehezkieldio/firefly/commit/7af318845a2ec3b64806883b241a7971b0b571f2) deps: Update dependency @biomejs/biome to v2.3.8 by renovate[bot] ([#139](https://github.com/yehezkieldio/firefly/issues/139))
- [`ab9a109`](https://github.com/yehezkieldio/firefly/commit/ab9a109bfdc585ad1b3e088dfdfd818eed85cc5a) deps: Update dependency tsdown to ^0.17.0-beta.5 by renovate[bot] ([#140](https://github.com/yehezkieldio/firefly/issues/140))
- [`94e1060`](https://github.com/yehezkieldio/firefly/commit/94e10601a6c1efb567279cfd63a286960b4095e1) deps: Update dependency ultracite to v6.3.8 by renovate[bot] ([#141](https://github.com/yehezkieldio/firefly/issues/141))

### <!-- 3 -->🚀 New Features
- [`79c10d9`](https://github.com/yehezkieldio/firefly/commit/79c10d9d04c3dec1b13d365a6503af2f7f83442a) release: Add support for branch field hydration in config
- [`03d6842`](https://github.com/yehezkieldio/firefly/commit/03d68428252f960af3e03f45d189c99e7274c76b) git: Add repository URL inference fallback strategy

### <!-- 4 -->🐛 Bug Fixes
- [`f8302d5`](https://github.com/yehezkieldio/firefly/commit/f8302d528db2932c77903adaec3670b563ea5d8d) config: Remove leading dot from dist path in package bin definitions
- [`352994a`](https://github.com/yehezkieldio/firefly/commit/352994a16fbc1e0456ac74bbb31b248fda549a14) result: Use strict null comparison in fromNullable helpers
- [`8fe8422`](https://github.com/yehezkieldio/firefly/commit/8fe8422cc4818ca76e1d064b4882a6c5f0aa6663) result: Handle undefined values and replace okAsync with FireflyOkAsync

### <!-- 7 -->🚜 Refactor
- [`71d5146`](https://github.com/yehezkieldio/firefly/commit/71d51467d3ca3d7d1baa4b68cca6eee9733e65d8) release: Simplify repository hydration logic and set git verbose default to true
## firefly@4.0.0-alpha.8 (December 1, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`0489acf`](https://github.com/yehezkieldio/firefly/commit/0489acfe80496ae2fc1c7e83fa1e5022c5b4adf0) package: Add author metadata and project repository info

### <!-- 16 -->🤖 CI/CD
- [`cb60144`](https://github.com/yehezkieldio/firefly/commit/cb601445600fb7e3f928b0dd40bbd5b70fe64fbd) Add code quality workflow for linting and type checking
- [`5b58e60`](https://github.com/yehezkieldio/firefly/commit/5b58e60fe0b825cb7a621ee31ca562f0d686baba) Add continuous delivery workflow for automated npm publishing

### <!-- 3 -->🚀 New Features
- [`7d42ceb`](https://github.com/yehezkieldio/firefly/commit/7d42cebcd21e86fea2c7c1725f8e61ef0eb62ffb) core/environment: Add debug and runtime env classes
- [`a8fcf2d`](https://github.com/yehezkieldio/firefly/commit/a8fcf2dddcda2a7832d342cedd396867cb57d4dc) config: Add cwd to schema and postbuild step for json schema generation

### <!-- 7 -->🚜 Refactor
- [`f555b02`](https://github.com/yehezkieldio/firefly/commit/f555b02c2a1d8d8f89d8b4f9797f5bdf35e4ffd2) cli: Centralize camelToKebab utility and improve validation error formatting
## firefly@4.0.0-alpha.7 (December 1, 2025)

### <!-- 99 -->🌀 Other
- [`a73ba0e`](https://github.com/yehezkieldio/firefly/commit/a73ba0e02fef5e5b025cd88a5d3376dbc8901dc2) Merge remote-tracking branch 'origin/v3'
## firefly@4.0.0-alpha.6 (December 1, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.6

### <!-- 11 -->🛠️ Miscellaneous
- [`e95f91f`](https://github.com/yehezkieldio/firefly/commit/e95f91fbb505f57a3fda04b960290e9b85e98c86) copilot-docs: Remove documentation modules

### <!-- 3 -->🚀 New Features
- [`c60d395`](https://github.com/yehezkieldio/firefly/commit/c60d3954eb0b4a503aeafc176945da564c3fb489) cli: Add workspace support for cwd-aware execution
- [`5b6abb9`](https://github.com/yehezkieldio/firefly/commit/5b6abb935ba66c1f511c0d5f6e67e2e52b18dc04) release: Add packageJson hydration and preflight cliff.toml check

### <!-- 4 -->🐛 Bug Fixes
- [`8f20480`](https://github.com/yehezkieldio/firefly/commit/8f204801f8fc62bab8908e06983d7d6a7a23d460) config: Set default cwd in config loader and remove redundant comment
- [`cd882fa`](https://github.com/yehezkieldio/firefly/commit/cd882facae16eb88be2d700c88a0d36124407e37) release: Make preReleaseId optional and extract from package version for better flexibility
- [`82f8919`](https://github.com/yehezkieldio/firefly/commit/82f89198588b73396bb5e4f70362ce670b3a7965) cli: Improve error logging and add raw debug output option

### <!-- 5 -->📚 Documentation
- [`cd4e7bf`](https://github.com/yehezkieldio/firefly/commit/cd4e7bf128f9834c156560c7f814a6bc6a53c72a) release: Add detailed comments for release task behavior and preparation steps

### <!-- 7 -->🚜 Refactor
- [`2751d58`](https://github.com/yehezkieldio/firefly/commit/2751d58834e3ef703e53cb34a100b96f49f3f5d4) services: Switch package-json service to async result pattern for cleaner chaining and better error handling

### <!-- 9 -->🎨 Code Styling
- [`c3992a5`](https://github.com/yehezkieldio/firefly/commit/c3992a57fc79d225fd50044d810fd04ade40cd93) release-preflight: Improve logger messages for clarity and consistency
## firefly@4.0.0-alpha.5 (November 30, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.5

### <!-- 3 -->🚀 New Features
- [`24ee453`](https://github.com/yehezkieldio/firefly/commit/24ee453d41e53fbb385689333550728e6cacd31d) commits: Add commit parsing and type definitions for git history analysis
- [`73c11e3`](https://github.com/yehezkieldio/firefly/commit/73c11e3a1c1cfe72ae54c64d5c451920abdbd89e) release: Add config and version setup tasks to release workflow
- [`1b5fde5`](https://github.com/yehezkieldio/firefly/commit/1b5fde5c5863306c47dc90da1011aa5659ead1b1) commit-history: Add commit history service and extend git service with tag and commit retrieval methods
- [`d81969f`](https://github.com/yehezkieldio/firefly/commit/d81969fb6be7db4e1b55a590b57db0ca5af3a9b7) semver: Add Version class for parsing and handling semantic versions
- [`aa5c34f`](https://github.com/yehezkieldio/firefly/commit/aa5c34ffb411a2280f834d2047a68c8ed539ffe4) release: Add bump strategy task group for version management
- [`52d69e9`](https://github.com/yehezkieldio/firefly/commit/52d69e94c9a423ea35478e5dbc454c112a575192) release: Add bump execution and version bump tasks to release flow
- [`251d26c`](https://github.com/yehezkieldio/firefly/commit/251d26c055140c65ce8abe5ef77a961ae5455d4c) release: Extend release workflow with git service integration and preflight validation
- [`0989372`](https://github.com/yehezkieldio/firefly/commit/0989372f90f8b0c6812382e50ed856adc82362b4) git: Extend git service with commit, tag, push and status APIs
- [`69b71af`](https://github.com/yehezkieldio/firefly/commit/69b71afa998e9d41bd896ffc866c6dfc63af5604) git: Add tag management methods and isClean flag to git interfaces
- [`9e0ca2f`](https://github.com/yehezkieldio/firefly/commit/9e0ca2fbffcc81673fbb276e539af2b4c3d3dac3) git: Add methods to retrieve staged and unstaged file statuses
- [`f9c6042`](https://github.com/yehezkieldio/firefly/commit/f9c6042e833394f92a0572959d5380c2ea9c15c7) git: Add branch listing and parsing to git service
- [`7f2010c`](https://github.com/yehezkieldio/firefly/commit/7f2010c37164fc8c77fb36e09038232a31fd39ad) release: Add dependency on prepare-release-config in initialization task
- [`4a77d0e`](https://github.com/yehezkieldio/firefly/commit/4a77d0e221261b8de33fd6bce3910e4c65e72086) release-preflight: Add checks for git status, unpushed commits and cliff config

### <!-- 4 -->🐛 Bug Fixes
- [`f2e8f46`](https://github.com/yehezkieldio/firefly/commit/f2e8f461bccefa40753592ea4b82b0a77ffc9b1a) release-preflight: Use isInsideRepository instead of isRepository for proper repo check

### <!-- 7 -->🚜 Refactor
- [`631421b`](https://github.com/yehezkieldio/firefly/commit/631421bc27b1db1d86442b5879633ad9ba2ca5df) git.interface: Extend dry-run options across git operation interfaces to reduce duplication and improve consistency
- [`581cd9d`](https://github.com/yehezkieldio/firefly/commit/581cd9d72b392f5617d9e499415489772914cb3b) git: Redesign git service and interfaces for cleaner API and remove obsolete commit-history service
## firefly@4.0.0-alpha.4 (November 30, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.4

### <!-- 5 -->📚 Documentation
- [`a5ee438`](https://github.com/yehezkieldio/firefly/commit/a5ee438bc60a7fb4dd4520b10bad3bd59974d7b5) copilot-docs: Add Firefly result module documentation file
## firefly@4.0.0-alpha.3 (November 30, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.3

### <!-- 3 -->🚀 New Features
- [`9ac502e`](https://github.com/yehezkieldio/firefly/commit/9ac502ed260f405019962d66194970e0ee02d03a) core: Add git service with repository detection capability

### <!-- 4 -->🐛 Bug Fixes
- [`e81bca6`](https://github.com/yehezkieldio/firefly/commit/e81bca6edd0554330721bc1f3c21e5a96b532212) cli: Improve camel-to-kebab conversion for compound words

### <!-- 5 -->📚 Documentation
- [`5644b2e`](https://github.com/yehezkieldio/firefly/commit/5644b2ee9f31f9ef5b4df3e4d09a44a0cbd2865a) copilot: Add Firefly Service Module documentation
- [`c0909c9`](https://github.com/yehezkieldio/firefly/commit/c0909c940977ecf56d85c54b534b30de4e245c6b) copilot: Add Firefly module documentation set

### <!-- 7 -->🚜 Refactor
- [`f14fa00`](https://github.com/yehezkieldio/firefly/commit/f14fa00b9a099bd271afc3ee5dd184f0b3a7be35) cli: Simplify option merging and improve verbose logging
- [`5202be2`](https://github.com/yehezkieldio/firefly/commit/5202be27f5e01813e3d6c4d6671d511c92a2b16a) workflow-executor: Prefix all verbose logs with class name for clearer tracing
- [`40b8696`](https://github.com/yehezkieldio/firefly/commit/40b8696183e9a90f203d984a11e531ac6ead2f6a) logging: Enhance logger with custom reporter and verbose output handling
- [`a3e2ca8`](https://github.com/yehezkieldio/firefly/commit/a3e2ca888896b7bc7bca4175f5734a86e6467056) task-graph: Extract graph logging into reusable function and simplify release command debug handling
## firefly@4.0.0-alpha.2 (November 30, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.2

### <!-- 11 -->🛠️ Miscellaneous
- [`ca47864`](https://github.com/yehezkieldio/firefly/commit/ca4786403bf3235b51e04560adab97ff9b0460f1) Cleanup
- [`ac99b96`](https://github.com/yehezkieldio/firefly/commit/ac99b965d016dde48321a907c73933fbdf1640fe) vscode: Add biome format and fix task configuration
- [`40e6469`](https://github.com/yehezkieldio/firefly/commit/40e646962b7a17854989fd79cf04fce3187e8faa) vscode: Add Biome workspace task for check format and fix
- [`7588512`](https://github.com/yehezkieldio/firefly/commit/7588512b9d350cbe70c70a619ab1a06c203ad938) config: Enable incremental compilation in tsconfig
- [`d07b581`](https://github.com/yehezkieldio/firefly/commit/d07b581131d644a63ba0440ae2bd16357bc12bf6) vscode: Add TypeScript type-check workspace task
- [`c58996f`](https://github.com/yehezkieldio/firefly/commit/c58996f867ca3d0d5c76c575dc13c21d57bf7d19) Adjust file names
- [`44a508e`](https://github.com/yehezkieldio/firefly/commit/44a508e77e23e92ff772704b58d29a5ca20519a6) cli: Add bun shebang for direct script execution

### <!-- 3 -->🚀 New Features
- [`816e094`](https://github.com/yehezkieldio/firefly/commit/816e094f6eeee37c6b401a8de5ab8169a21bf6e4) core: Add error handling utilities and schemas
- [`c7aaf26`](https://github.com/yehezkieldio/firefly/commit/c7aaf263616fa78c7e2edcb90a9a007d5d17ee0f) logging: Add consola-based logger for structured output
- [`5e9791c`](https://github.com/yehezkieldio/firefly/commit/5e9791cb6cfdb4a06cf43cee674faa9b1c3084f6) executors: Add Git and GitHub CLI command executors with error handling and dry-run support
- [`b34a3f5`](https://github.com/yehezkieldio/firefly/commit/b34a3f5dcdd24a0c8b6cbc8754653e4d33e0d0b2) gh-command-executor: Add sensitive arg redaction for secure logging
- [`746fa7d`](https://github.com/yehezkieldio/firefly/commit/746fa7d18defef79c8ec22a0db8cff0223e9fbbf) infrastructure: Add dry-run utility and integrate into command executors for consistent simulation handling
- [`6a85c25`](https://github.com/yehezkieldio/firefly/commit/6a85c255aad0c90d4e25f37ad99aaeae13ecb9a5) core/service: Add service registry and type definitions for dependency injection system
- [`e4e09ce`](https://github.com/yehezkieldio/firefly/commit/e4e09ce23db8b8c8fc099315ace82797f546697b) filesystem: Add filesystem service interface and implementation
- [`25d8360`](https://github.com/yehezkieldio/firefly/commit/25d8360f3c0b639b832b3644bb95aed7ebd39cfa) core/service: Add lazy and eager service resolution with filesystem support
- [`ca2f5fb`](https://github.com/yehezkieldio/firefly/commit/ca2f5fb32c17005aad555bb0b6e3c7d7b16d75fc) core/service: Add dependency-aware service resolution with circular detection
- [`7c942b4`](https://github.com/yehezkieldio/firefly/commit/7c942b48d237d3a644f5d05b4b3d7dc6e64b8c7b) core/service: Add package-json service for reading and updating version
- [`0427429`](https://github.com/yehezkieldio/firefly/commit/04274297d9aada854d8107df60c5a2820e73cb24) core/context: Add immutable workflow context implementation
- [`a8e256a`](https://github.com/yehezkieldio/firefly/commit/a8e256a5c3f1bad5f9b37ff0fc50a5b4b0de06d6) context: Add fluent builder for workflow context creation
- [`7e6876c`](https://github.com/yehezkieldio/firefly/commit/7e6876c5d48fed64ab37fa1650301b8fa59aa34e) core/task: Add task system
- [`2897cea`](https://github.com/yehezkieldio/firefly/commit/2897cea6b14ddc68c42bdbd453ed2f6a809203c0) task: Add helpers to collect and combine task groups
- [`f3fd052`](https://github.com/yehezkieldio/firefly/commit/f3fd052d4b5c1d64a98233663b191a4931eeafa8) workflow: Add workflow executor for sequential task execution with rollback and error handling
- [`a6f91d6`](https://github.com/yehezkieldio/firefly/commit/a6f91d62dc63acad0646b39677023b5680d9210a) core: Add helper to wrap error messages with context prefix
- [`d1758e1`](https://github.com/yehezkieldio/firefly/commit/d1758e1ff2987d332987f7d3da43b7a5915998bc) core/command: Add typed command factory and types for workflow commands
- [`3be08e8`](https://github.com/yehezkieldio/firefly/commit/3be08e8ae2dd5bd56fe4ca167e70546f2585b45f) execution: Add workflow orchestrator to manage command lifecycle execution
- [`c647a9e`](https://github.com/yehezkieldio/firefly/commit/c647a9ed8d15a928dbbd56049eba3ca8d7fea965) release: Add initial release command workflow with setup tasks and config validation
- [`60588b9`](https://github.com/yehezkieldio/firefly/commit/60588b99f9ddb626bcccc50bcb662d553256a5a8) semver: Add version bump and strategy schemas for release handling
- [`7ffa0e1`](https://github.com/yehezkieldio/firefly/commit/7ffa0e19bc3296ca59578bf97c7871c83f500055) service: Add defineServiceKeys helper for typed service key tuples
- [`0ae59ac`](https://github.com/yehezkieldio/firefly/commit/0ae59ac2ca1d908da399ece6a07bc5e5f04d63f3) registry: Add command registry for managing workflow commands
- [`65176ab`](https://github.com/yehezkieldio/firefly/commit/65176ab69e20a3eafa6ab3cfe219066772a5dad0) cli: Implement firefly cli core with config loader and options system
- [`3e204b9`](https://github.com/yehezkieldio/firefly/commit/3e204b9f507cee5818f378ef2694ea17621b8f1f) config: Add type-safe Firefly config helper and update build entry path
- [`9791fa7`](https://github.com/yehezkieldio/firefly/commit/9791fa7d04f1ba4d101099e7560ddc893867bc87) scripts: Add script to generate json schema from config schema

### <!-- 4 -->🐛 Bug Fixes
- [`6f3a7bc`](https://github.com/yehezkieldio/firefly/commit/6f3a7bcf458b559507d3ea1a0d84ce168279eeb7) gh-command.executor: Trim env vars before boolean conversion to avoid malformed values

### <!-- 5 -->📚 Documentation
- [`e21ff5b`](https://github.com/yehezkieldio/firefly/commit/e21ff5bcb711a7a4981eb4e0f611972867d16844) copilot-docs: Add Firefly task module documentation
- [`5db3975`](https://github.com/yehezkieldio/firefly/commit/5db39755f8c478acd79902a958a08ad76fb8d853) config: Clean up comments in configuration schema for clarity

### <!-- 7 -->🚜 Refactor
- [`b78df8e`](https://github.com/yehezkieldio/firefly/commit/b78df8efb22bef003f8bc480154f588db7447e0b) context: Centralize WorkflowData and DefaultServices types for reuse across modules
- [`a6f3048`](https://github.com/yehezkieldio/firefly/commit/a6f304868e828841224ec8d64cc167d6db01cc39) core: Centralize task sequencing and simplify skip handling
## firefly@4.0.0-alpha.1 (November 29, 2025)
### 📝 Release Notes
firefly@4.0.0-alpha.1

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
- [`3782fe3`](https://github.com/yehezkieldio/firefly/commit/3782fe376c704e090dc7e5cec98d7d8f17b2ddd8) config: Add changelog and bump version to 4.0.0-alpha.0
- [`a94702b`](https://github.com/yehezkieldio/firefly/commit/a94702b19db071eb8e8cd6a443cda76833d78183) Add task helper
- [`5ba780c`](https://github.com/yehezkieldio/firefly/commit/5ba780cfb57342de163cee4298201157ffc75a7c) Add more task
- [`a540804`](https://github.com/yehezkieldio/firefly/commit/a5408040e6b76c8ab40f8adbb588e2a26b87ce5c) Add more tasks
- [`1f48b5f`](https://github.com/yehezkieldio/firefly/commit/1f48b5fde93085d7ecdc741adf7e5095a8caa610) Add task group
- [`dcc0af6`](https://github.com/yehezkieldio/firefly/commit/dcc0af6dfbf07a205b6213f981f3cf9acf6a8640) Add more stuff

### <!-- 16 -->🤖 CI/CD
- [`b2650ea`](https://github.com/yehezkieldio/firefly/commit/b2650ea1141fb5b6f8d200f6cf2826637bdb0f86) ci: Temporarily remove continuous delivery workflow
- [`f91c5ea`](https://github.com/yehezkieldio/firefly/commit/f91c5eab3b18c5b20e46256609812adce44c4d35) ci: Add funding configuration and renovate setup for repo maintenance

### <!-- 2 -->🧩 Dependencies Updates
- [`3005c1d`](https://github.com/yehezkieldio/firefly/commit/3005c1dbe37d57ec6f5a6e3a422ba6f4eef41c72) deps: Add ultracite dependency
- [`05bf223`](https://github.com/yehezkieldio/firefly/commit/05bf22389d104d9031cffafad54bf5281cc74e97) deps: Update c12, biome, types, and tsdown versions
- [`9e78323`](https://github.com/yehezkieldio/firefly/commit/9e78323b50b518c253b96f81e7dd8a6d6fe6ca5f) deps: Update @types/node and tsdown
- [`91224f9`](https://github.com/yehezkieldio/firefly/commit/91224f91b71dda260e0036c428f3f11dd0201e8a) deps: Update biome, tsdown, and ultracite to latest patch versions
- [`f490d3b`](https://github.com/yehezkieldio/firefly/commit/f490d3b18116b213e67ffddff14fa1a359f6147e) deps: Add c12, commander, and git-cliff dependencies and dev script
- [`dcb7d7f`](https://github.com/yehezkieldio/firefly/commit/dcb7d7f125665db175f1a5a41ad8c6ac6b773dd5) deps: Add semver and @types/semver

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
- [`6dd45ee`](https://github.com/yehezkieldio/firefly/commit/6dd45ee4a94f654e68f43acb1167270e6478395d) shared: Add git and filesystem service integration with workflow context
- [`70e0f48`](https://github.com/yehezkieldio/firefly/commit/70e0f48ad5bf19d5cb4d16b28a0b9f35531637bf) context: Add generic service registry and typed workflow context integration
- [`4c77fae`](https://github.com/yehezkieldio/firefly/commit/4c77faed6be89ead9d41d8e0814389944731c209) Consolidate stuff
- [`9beafe8`](https://github.com/yehezkieldio/firefly/commit/9beafe8106849da1c4af588b4bda64e0e8060cd0) Consolidate cli stuff
- [`1d06ac0`](https://github.com/yehezkieldio/firefly/commit/1d06ac00aeeefefeabac3ebc45e8aa6c83680b81) release: Add skipBump flag and improve skip logic handling
- [`23396d7`](https://github.com/yehezkieldio/firefly/commit/23396d7145be09721c81aac7d5c91a28a0209f05) release: Add interactive version bump and semver management
- [`94a6e34`](https://github.com/yehezkieldio/firefly/commit/94a6e340a67f47b9dfba941b3dcc2253d629af53) release: Implement automatic semantic version bump logic
- [`fef155e`](https://github.com/yehezkieldio/firefly/commit/fef155edec5ce1c48b5d2622ead8828dd89b5a56) release: Implement version bump and dry-run support
- [`6362484`](https://github.com/yehezkieldio/firefly/commit/636248494dbd8af04687576242685577863c05f7) release: Implement git-cliff changelog generation and template service
- [`a4b8d0d`](https://github.com/yehezkieldio/firefly/commit/a4b8d0d04b311709460455aba2b2e2ef3c0c3682) release: Implement full straight bump version resolution logic
- [`d3fa0ee`](https://github.com/yehezkieldio/firefly/commit/d3fa0ee827e4dda175f139652f31a2d5d6cc0b23) release: Implement full git and github release workflow with tasks
- [`677badd`](https://github.com/yehezkieldio/firefly/commit/677badd81146b9a89a2b1825cdcfaab6adb28d82) core: Add debugging tags, cancellation and streaming support

### <!-- 4 -->🐛 Bug Fixes
- [`124489b`](https://github.com/yehezkieldio/firefly/commit/124489b0e7efa0ef49f38be864b9fe839e51c47a) cli: Adjust config log message and improve option shorthand handling
- [`c7915dd`](https://github.com/yehezkieldio/firefly/commit/c7915ddd70bec36916758d63192b6fe05a1e137a) cli: Validate config schema and handle compound words in kebab-case conversion
- [`9e32587`](https://github.com/yehezkieldio/firefly/commit/9e325877ccc714c2f72840cdabc09997fd339deb) release: Update straight-bump task dependency to initialize-version

### <!-- 5 -->📚 Documentation
- [`55590d5`](https://github.com/yehezkieldio/firefly/commit/55590d5c71b20cc4f78e0b4a7e403a8b20a555d1) Adjust headings in AGENTS.md for consistent markdown structure
- [`6161b7f`](https://github.com/yehezkieldio/firefly/commit/6161b7f35b74528303f14c5c6471d1b79c100e3c) Add code quality section and update vscode settings configuration

### <!-- 7 -->🚜 Refactor
- [`fce47e7`](https://github.com/yehezkieldio/firefly/commit/fce47e708c1d543213f12240550482dd3d1b84bf) utils: Simplify logger creation and remove custom reporters
- [`b22c2ae`](https://github.com/yehezkieldio/firefly/commit/b22c2ae84d756522a61f0da8880a6e07587d323d) utils: Inline formatOptions in logger configuration
- [`557ce12`](https://github.com/yehezkieldio/firefly/commit/557ce12fba1bf760641e3a4446372fcf86e9bec0) config-loader: Remove redundant comments and fix zod type usage
- [`5868190`](https://github.com/yehezkieldio/firefly/commit/5868190bf8e1743e3f08d487f421675996361e70) config-loader: Replace ResultAsync.fromPromise with wrapPromise
- [`3507fa5`](https://github.com/yehezkieldio/firefly/commit/3507fa553d4a7d90cd967c114c5a8f21991bf0af) task-system: Add generics to TaskBuilder for type safety and update release preflight task usage
- [`7f6c760`](https://github.com/yehezkieldio/firefly/commit/7f6c760d8f4d1a584deaff6bbc79d77b4104cd9e) core: Remove redundant comments and dead code for clarity
- [`13edce0`](https://github.com/yehezkieldio/firefly/commit/13edce0320c717b6fce5015dab2d856e470d29a5) shared: Move service types and factories to dedicated definitions module
- [`d092e44`](https://github.com/yehezkieldio/firefly/commit/d092e444ed395d672872c5f2ae33c6b29eb8db69) core: Introduce branded types and structural sharing for context and services
- [`fb16e41`](https://github.com/yehezkieldio/firefly/commit/fb16e41babb06dc779ee018e1b3ed6cde27c90cf) service-registry: Use ResultAsync for lazy service proxy instantiation

### <!-- 8 -->🏗️ Build System
- [`900543f`](https://github.com/yehezkieldio/firefly/commit/900543ff0dc212172f45b987d167471435b3c882) config: Enable esm module type and add tsdown build settings

### <!-- 9 -->🎨 Code Styling
- [`e55f872`](https://github.com/yehezkieldio/firefly/commit/e55f872efe6074d12ec2d499f6c1ffa883bdc4e3) utils/error: Remove unnecessary blank lines

### <!-- 99 -->🌀 Other
- [`7d071c9`](https://github.com/yehezkieldio/firefly/commit/7d071c9b9195007dd9f6419109a0106e91338b41) Cleanup
## firefly@3.0.7 (November 9, 2025)
### 📝 Release Notes
firefly@3.0.7

### <!-- 11 -->🛠️ Miscellaneous
- [`a4d599d`](https://github.com/yehezkieldio/firefly/commit/a4d599d67107078c2c3944b8fa99357a79ccadf3) renovate: Temporarily disable for to not distrupt major redesign
## firefly@4.0.0-alpha.6 (December 1, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`e95f91f`](https://github.com/yehezkieldio/firefly/commit/e95f91fbb505f57a3fda04b960290e9b85e98c86) copilot-docs: Remove documentation modules

### <!-- 3 -->🚀 New Features
- [`c60d395`](https://github.com/yehezkieldio/firefly/commit/c60d3954eb0b4a503aeafc176945da564c3fb489) cli: Add workspace support for cwd-aware execution
- [`5b6abb9`](https://github.com/yehezkieldio/firefly/commit/5b6abb935ba66c1f511c0d5f6e67e2e52b18dc04) release: Add packageJson hydration and preflight cliff.toml check

### <!-- 4 -->🐛 Bug Fixes
- [`8f20480`](https://github.com/yehezkieldio/firefly/commit/8f204801f8fc62bab8908e06983d7d6a7a23d460) config: Set default cwd in config loader and remove redundant comment
- [`cd882fa`](https://github.com/yehezkieldio/firefly/commit/cd882facae16eb88be2d700c88a0d36124407e37) release: Make preReleaseId optional and extract from package version for better flexibility
- [`82f8919`](https://github.com/yehezkieldio/firefly/commit/82f89198588b73396bb5e4f70362ce670b3a7965) cli: Improve error logging and add raw debug output option

### <!-- 5 -->📚 Documentation
- [`cd4e7bf`](https://github.com/yehezkieldio/firefly/commit/cd4e7bf128f9834c156560c7f814a6bc6a53c72a) release: Add detailed comments for release task behavior and preparation steps

### <!-- 7 -->🚜 Refactor
- [`2751d58`](https://github.com/yehezkieldio/firefly/commit/2751d58834e3ef703e53cb34a100b96f49f3f5d4) services: Switch package-json service to async result pattern for cleaner chaining and better error handling

### <!-- 9 -->🎨 Code Styling
- [`c3992a5`](https://github.com/yehezkieldio/firefly/commit/c3992a57fc79d225fd50044d810fd04ade40cd93) release-preflight: Improve logger messages for clarity and consistency
## firefly@4.0.0-alpha.5 (November 30, 2025)

### <!-- 3 -->🚀 New Features
- [`24ee453`](https://github.com/yehezkieldio/firefly/commit/24ee453d41e53fbb385689333550728e6cacd31d) commits: Add commit parsing and type definitions for git history analysis
- [`73c11e3`](https://github.com/yehezkieldio/firefly/commit/73c11e3a1c1cfe72ae54c64d5c451920abdbd89e) release: Add config and version setup tasks to release workflow
- [`1b5fde5`](https://github.com/yehezkieldio/firefly/commit/1b5fde5c5863306c47dc90da1011aa5659ead1b1) commit-history: Add commit history service and extend git service with tag and commit retrieval methods
- [`d81969f`](https://github.com/yehezkieldio/firefly/commit/d81969fb6be7db4e1b55a590b57db0ca5af3a9b7) semver: Add Version class for parsing and handling semantic versions
- [`aa5c34f`](https://github.com/yehezkieldio/firefly/commit/aa5c34ffb411a2280f834d2047a68c8ed539ffe4) release: Add bump strategy task group for version management
- [`52d69e9`](https://github.com/yehezkieldio/firefly/commit/52d69e94c9a423ea35478e5dbc454c112a575192) release: Add bump execution and version bump tasks to release flow
- [`251d26c`](https://github.com/yehezkieldio/firefly/commit/251d26c055140c65ce8abe5ef77a961ae5455d4c) release: Extend release workflow with git service integration and preflight validation
- [`0989372`](https://github.com/yehezkieldio/firefly/commit/0989372f90f8b0c6812382e50ed856adc82362b4) git: Extend git service with commit, tag, push and status APIs
- [`69b71af`](https://github.com/yehezkieldio/firefly/commit/69b71afa998e9d41bd896ffc866c6dfc63af5604) git: Add tag management methods and isClean flag to git interfaces
- [`9e0ca2f`](https://github.com/yehezkieldio/firefly/commit/9e0ca2fbffcc81673fbb276e539af2b4c3d3dac3) git: Add methods to retrieve staged and unstaged file statuses
- [`f9c6042`](https://github.com/yehezkieldio/firefly/commit/f9c6042e833394f92a0572959d5380c2ea9c15c7) git: Add branch listing and parsing to git service
- [`7f2010c`](https://github.com/yehezkieldio/firefly/commit/7f2010c37164fc8c77fb36e09038232a31fd39ad) release: Add dependency on prepare-release-config in initialization task
- [`4a77d0e`](https://github.com/yehezkieldio/firefly/commit/4a77d0e221261b8de33fd6bce3910e4c65e72086) release-preflight: Add checks for git status, unpushed commits and cliff config

### <!-- 4 -->🐛 Bug Fixes
- [`f2e8f46`](https://github.com/yehezkieldio/firefly/commit/f2e8f461bccefa40753592ea4b82b0a77ffc9b1a) release-preflight: Use isInsideRepository instead of isRepository for proper repo check

### <!-- 7 -->🚜 Refactor
- [`631421b`](https://github.com/yehezkieldio/firefly/commit/631421bc27b1db1d86442b5879633ad9ba2ca5df) git.interface: Extend dry-run options across git operation interfaces to reduce duplication and improve consistency
- [`581cd9d`](https://github.com/yehezkieldio/firefly/commit/581cd9d72b392f5617d9e499415489772914cb3b) git: Redesign git service and interfaces for cleaner API and remove obsolete commit-history service
## firefly@4.0.0-alpha.4 (November 30, 2025)

### <!-- 5 -->📚 Documentation
- [`a5ee438`](https://github.com/yehezkieldio/firefly/commit/a5ee438bc60a7fb4dd4520b10bad3bd59974d7b5) copilot-docs: Add Firefly result module documentation file
## firefly@4.0.0-alpha.3 (November 30, 2025)

### <!-- 3 -->🚀 New Features
- [`9ac502e`](https://github.com/yehezkieldio/firefly/commit/9ac502ed260f405019962d66194970e0ee02d03a) core: Add git service with repository detection capability

### <!-- 4 -->🐛 Bug Fixes
- [`e81bca6`](https://github.com/yehezkieldio/firefly/commit/e81bca6edd0554330721bc1f3c21e5a96b532212) cli: Improve camel-to-kebab conversion for compound words

### <!-- 5 -->📚 Documentation
- [`5644b2e`](https://github.com/yehezkieldio/firefly/commit/5644b2ee9f31f9ef5b4df3e4d09a44a0cbd2865a) copilot: Add Firefly Service Module documentation
- [`c0909c9`](https://github.com/yehezkieldio/firefly/commit/c0909c940977ecf56d85c54b534b30de4e245c6b) copilot: Add Firefly module documentation set

### <!-- 7 -->🚜 Refactor
- [`f14fa00`](https://github.com/yehezkieldio/firefly/commit/f14fa00b9a099bd271afc3ee5dd184f0b3a7be35) cli: Simplify option merging and improve verbose logging
- [`5202be2`](https://github.com/yehezkieldio/firefly/commit/5202be27f5e01813e3d6c4d6671d511c92a2b16a) workflow-executor: Prefix all verbose logs with class name for clearer tracing
- [`40b8696`](https://github.com/yehezkieldio/firefly/commit/40b8696183e9a90f203d984a11e531ac6ead2f6a) logging: Enhance logger with custom reporter and verbose output handling
- [`a3e2ca8`](https://github.com/yehezkieldio/firefly/commit/a3e2ca888896b7bc7bca4175f5734a86e6467056) task-graph: Extract graph logging into reusable function and simplify release command debug handling
## firefly@4.0.0-alpha.2 (November 30, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`ca47864`](https://github.com/yehezkieldio/firefly/commit/ca4786403bf3235b51e04560adab97ff9b0460f1) Cleanup
- [`ac99b96`](https://github.com/yehezkieldio/firefly/commit/ac99b965d016dde48321a907c73933fbdf1640fe) vscode: Add biome format and fix task configuration
- [`40e6469`](https://github.com/yehezkieldio/firefly/commit/40e646962b7a17854989fd79cf04fce3187e8faa) vscode: Add Biome workspace task for check format and fix
- [`7588512`](https://github.com/yehezkieldio/firefly/commit/7588512b9d350cbe70c70a619ab1a06c203ad938) config: Enable incremental compilation in tsconfig
- [`d07b581`](https://github.com/yehezkieldio/firefly/commit/d07b581131d644a63ba0440ae2bd16357bc12bf6) vscode: Add TypeScript type-check workspace task
- [`c58996f`](https://github.com/yehezkieldio/firefly/commit/c58996f867ca3d0d5c76c575dc13c21d57bf7d19) Adjust file names
- [`44a508e`](https://github.com/yehezkieldio/firefly/commit/44a508e77e23e92ff772704b58d29a5ca20519a6) cli: Add bun shebang for direct script execution

### <!-- 3 -->🚀 New Features
- [`816e094`](https://github.com/yehezkieldio/firefly/commit/816e094f6eeee37c6b401a8de5ab8169a21bf6e4) core: Add error handling utilities and schemas
- [`c7aaf26`](https://github.com/yehezkieldio/firefly/commit/c7aaf263616fa78c7e2edcb90a9a007d5d17ee0f) logging: Add consola-based logger for structured output
- [`5e9791c`](https://github.com/yehezkieldio/firefly/commit/5e9791cb6cfdb4a06cf43cee674faa9b1c3084f6) executors: Add Git and GitHub CLI command executors with error handling and dry-run support
- [`b34a3f5`](https://github.com/yehezkieldio/firefly/commit/b34a3f5dcdd24a0c8b6cbc8754653e4d33e0d0b2) gh-command-executor: Add sensitive arg redaction for secure logging
- [`746fa7d`](https://github.com/yehezkieldio/firefly/commit/746fa7d18defef79c8ec22a0db8cff0223e9fbbf) infrastructure: Add dry-run utility and integrate into command executors for consistent simulation handling
- [`6a85c25`](https://github.com/yehezkieldio/firefly/commit/6a85c255aad0c90d4e25f37ad99aaeae13ecb9a5) core/service: Add service registry and type definitions for dependency injection system
- [`e4e09ce`](https://github.com/yehezkieldio/firefly/commit/e4e09ce23db8b8c8fc099315ace82797f546697b) filesystem: Add filesystem service interface and implementation
- [`25d8360`](https://github.com/yehezkieldio/firefly/commit/25d8360f3c0b639b832b3644bb95aed7ebd39cfa) core/service: Add lazy and eager service resolution with filesystem support
- [`ca2f5fb`](https://github.com/yehezkieldio/firefly/commit/ca2f5fb32c17005aad555bb0b6e3c7d7b16d75fc) core/service: Add dependency-aware service resolution with circular detection
- [`7c942b4`](https://github.com/yehezkieldio/firefly/commit/7c942b48d237d3a644f5d05b4b3d7dc6e64b8c7b) core/service: Add package-json service for reading and updating version
- [`0427429`](https://github.com/yehezkieldio/firefly/commit/04274297d9aada854d8107df60c5a2820e73cb24) core/context: Add immutable workflow context implementation
- [`a8e256a`](https://github.com/yehezkieldio/firefly/commit/a8e256a5c3f1bad5f9b37ff0fc50a5b4b0de06d6) context: Add fluent builder for workflow context creation
- [`7e6876c`](https://github.com/yehezkieldio/firefly/commit/7e6876c5d48fed64ab37fa1650301b8fa59aa34e) core/task: Add task system
- [`2897cea`](https://github.com/yehezkieldio/firefly/commit/2897cea6b14ddc68c42bdbd453ed2f6a809203c0) task: Add helpers to collect and combine task groups
- [`f3fd052`](https://github.com/yehezkieldio/firefly/commit/f3fd052d4b5c1d64a98233663b191a4931eeafa8) workflow: Add workflow executor for sequential task execution with rollback and error handling
- [`a6f91d6`](https://github.com/yehezkieldio/firefly/commit/a6f91d62dc63acad0646b39677023b5680d9210a) core: Add helper to wrap error messages with context prefix
- [`d1758e1`](https://github.com/yehezkieldio/firefly/commit/d1758e1ff2987d332987f7d3da43b7a5915998bc) core/command: Add typed command factory and types for workflow commands
- [`3be08e8`](https://github.com/yehezkieldio/firefly/commit/3be08e8ae2dd5bd56fe4ca167e70546f2585b45f) execution: Add workflow orchestrator to manage command lifecycle execution
- [`c647a9e`](https://github.com/yehezkieldio/firefly/commit/c647a9ed8d15a928dbbd56049eba3ca8d7fea965) release: Add initial release command workflow with setup tasks and config validation
- [`60588b9`](https://github.com/yehezkieldio/firefly/commit/60588b99f9ddb626bcccc50bcb662d553256a5a8) semver: Add version bump and strategy schemas for release handling
- [`7ffa0e1`](https://github.com/yehezkieldio/firefly/commit/7ffa0e19bc3296ca59578bf97c7871c83f500055) service: Add defineServiceKeys helper for typed service key tuples
- [`0ae59ac`](https://github.com/yehezkieldio/firefly/commit/0ae59ac2ca1d908da399ece6a07bc5e5f04d63f3) registry: Add command registry for managing workflow commands
- [`65176ab`](https://github.com/yehezkieldio/firefly/commit/65176ab69e20a3eafa6ab3cfe219066772a5dad0) cli: Implement firefly cli core with config loader and options system
- [`3e204b9`](https://github.com/yehezkieldio/firefly/commit/3e204b9f507cee5818f378ef2694ea17621b8f1f) config: Add type-safe Firefly config helper and update build entry path
- [`9791fa7`](https://github.com/yehezkieldio/firefly/commit/9791fa7d04f1ba4d101099e7560ddc893867bc87) scripts: Add script to generate json schema from config schema

### <!-- 4 -->🐛 Bug Fixes
- [`6f3a7bc`](https://github.com/yehezkieldio/firefly/commit/6f3a7bcf458b559507d3ea1a0d84ce168279eeb7) gh-command.executor: Trim env vars before boolean conversion to avoid malformed values

### <!-- 5 -->📚 Documentation
- [`e21ff5b`](https://github.com/yehezkieldio/firefly/commit/e21ff5bcb711a7a4981eb4e0f611972867d16844) copilot-docs: Add Firefly task module documentation
- [`5db3975`](https://github.com/yehezkieldio/firefly/commit/5db39755f8c478acd79902a958a08ad76fb8d853) config: Clean up comments in configuration schema for clarity

### <!-- 7 -->🚜 Refactor
- [`b78df8e`](https://github.com/yehezkieldio/firefly/commit/b78df8efb22bef003f8bc480154f588db7447e0b) context: Centralize WorkflowData and DefaultServices types for reuse across modules
- [`a6f3048`](https://github.com/yehezkieldio/firefly/commit/a6f304868e828841224ec8d64cc167d6db01cc39) core: Centralize task sequencing and simplify skip handling
## firefly@4.0.0-alpha.1 (November 29, 2025)

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
- [`3782fe3`](https://github.com/yehezkieldio/firefly/commit/3782fe376c704e090dc7e5cec98d7d8f17b2ddd8) config: Add changelog and bump version to 4.0.0-alpha.0
- [`a94702b`](https://github.com/yehezkieldio/firefly/commit/a94702b19db071eb8e8cd6a443cda76833d78183) Add task helper
- [`5ba780c`](https://github.com/yehezkieldio/firefly/commit/5ba780cfb57342de163cee4298201157ffc75a7c) Add more task
- [`a540804`](https://github.com/yehezkieldio/firefly/commit/a5408040e6b76c8ab40f8adbb588e2a26b87ce5c) Add more tasks
- [`1f48b5f`](https://github.com/yehezkieldio/firefly/commit/1f48b5fde93085d7ecdc741adf7e5095a8caa610) Add task group
- [`dcc0af6`](https://github.com/yehezkieldio/firefly/commit/dcc0af6dfbf07a205b6213f981f3cf9acf6a8640) Add more stuff

### <!-- 16 -->🤖 CI/CD
- [`b2650ea`](https://github.com/yehezkieldio/firefly/commit/b2650ea1141fb5b6f8d200f6cf2826637bdb0f86) ci: Temporarily remove continuous delivery workflow
- [`f91c5ea`](https://github.com/yehezkieldio/firefly/commit/f91c5eab3b18c5b20e46256609812adce44c4d35) ci: Add funding configuration and renovate setup for repo maintenance

### <!-- 2 -->🧩 Dependencies Updates
- [`3005c1d`](https://github.com/yehezkieldio/firefly/commit/3005c1dbe37d57ec6f5a6e3a422ba6f4eef41c72) deps: Add ultracite dependency
- [`05bf223`](https://github.com/yehezkieldio/firefly/commit/05bf22389d104d9031cffafad54bf5281cc74e97) deps: Update c12, biome, types, and tsdown versions
- [`9e78323`](https://github.com/yehezkieldio/firefly/commit/9e78323b50b518c253b96f81e7dd8a6d6fe6ca5f) deps: Update @types/node and tsdown
- [`91224f9`](https://github.com/yehezkieldio/firefly/commit/91224f91b71dda260e0036c428f3f11dd0201e8a) deps: Update biome, tsdown, and ultracite to latest patch versions
- [`f490d3b`](https://github.com/yehezkieldio/firefly/commit/f490d3b18116b213e67ffddff14fa1a359f6147e) deps: Add c12, commander, and git-cliff dependencies and dev script
- [`dcb7d7f`](https://github.com/yehezkieldio/firefly/commit/dcb7d7f125665db175f1a5a41ad8c6ac6b773dd5) deps: Add semver and @types/semver

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
- [`6dd45ee`](https://github.com/yehezkieldio/firefly/commit/6dd45ee4a94f654e68f43acb1167270e6478395d) shared: Add git and filesystem service integration with workflow context
- [`70e0f48`](https://github.com/yehezkieldio/firefly/commit/70e0f48ad5bf19d5cb4d16b28a0b9f35531637bf) context: Add generic service registry and typed workflow context integration
- [`4c77fae`](https://github.com/yehezkieldio/firefly/commit/4c77faed6be89ead9d41d8e0814389944731c209) Consolidate stuff
- [`9beafe8`](https://github.com/yehezkieldio/firefly/commit/9beafe8106849da1c4af588b4bda64e0e8060cd0) Consolidate cli stuff
- [`1d06ac0`](https://github.com/yehezkieldio/firefly/commit/1d06ac00aeeefefeabac3ebc45e8aa6c83680b81) release: Add skipBump flag and improve skip logic handling
- [`23396d7`](https://github.com/yehezkieldio/firefly/commit/23396d7145be09721c81aac7d5c91a28a0209f05) release: Add interactive version bump and semver management
- [`94a6e34`](https://github.com/yehezkieldio/firefly/commit/94a6e340a67f47b9dfba941b3dcc2253d629af53) release: Implement automatic semantic version bump logic
- [`fef155e`](https://github.com/yehezkieldio/firefly/commit/fef155edec5ce1c48b5d2622ead8828dd89b5a56) release: Implement version bump and dry-run support
- [`6362484`](https://github.com/yehezkieldio/firefly/commit/636248494dbd8af04687576242685577863c05f7) release: Implement git-cliff changelog generation and template service
- [`a4b8d0d`](https://github.com/yehezkieldio/firefly/commit/a4b8d0d04b311709460455aba2b2e2ef3c0c3682) release: Implement full straight bump version resolution logic
- [`d3fa0ee`](https://github.com/yehezkieldio/firefly/commit/d3fa0ee827e4dda175f139652f31a2d5d6cc0b23) release: Implement full git and github release workflow with tasks
- [`677badd`](https://github.com/yehezkieldio/firefly/commit/677badd81146b9a89a2b1825cdcfaab6adb28d82) core: Add debugging tags, cancellation and streaming support

### <!-- 4 -->🐛 Bug Fixes
- [`124489b`](https://github.com/yehezkieldio/firefly/commit/124489b0e7efa0ef49f38be864b9fe839e51c47a) cli: Adjust config log message and improve option shorthand handling
- [`c7915dd`](https://github.com/yehezkieldio/firefly/commit/c7915ddd70bec36916758d63192b6fe05a1e137a) cli: Validate config schema and handle compound words in kebab-case conversion
- [`9e32587`](https://github.com/yehezkieldio/firefly/commit/9e325877ccc714c2f72840cdabc09997fd339deb) release: Update straight-bump task dependency to initialize-version

### <!-- 5 -->📚 Documentation
- [`55590d5`](https://github.com/yehezkieldio/firefly/commit/55590d5c71b20cc4f78e0b4a7e403a8b20a555d1) Adjust headings in AGENTS.md for consistent markdown structure
- [`6161b7f`](https://github.com/yehezkieldio/firefly/commit/6161b7f35b74528303f14c5c6471d1b79c100e3c) Add code quality section and update vscode settings configuration

### <!-- 7 -->🚜 Refactor
- [`fce47e7`](https://github.com/yehezkieldio/firefly/commit/fce47e708c1d543213f12240550482dd3d1b84bf) utils: Simplify logger creation and remove custom reporters
- [`b22c2ae`](https://github.com/yehezkieldio/firefly/commit/b22c2ae84d756522a61f0da8880a6e07587d323d) utils: Inline formatOptions in logger configuration
- [`557ce12`](https://github.com/yehezkieldio/firefly/commit/557ce12fba1bf760641e3a4446372fcf86e9bec0) config-loader: Remove redundant comments and fix zod type usage
- [`5868190`](https://github.com/yehezkieldio/firefly/commit/5868190bf8e1743e3f08d487f421675996361e70) config-loader: Replace ResultAsync.fromPromise with wrapPromise
- [`3507fa5`](https://github.com/yehezkieldio/firefly/commit/3507fa553d4a7d90cd967c114c5a8f21991bf0af) task-system: Add generics to TaskBuilder for type safety and update release preflight task usage
- [`7f6c760`](https://github.com/yehezkieldio/firefly/commit/7f6c760d8f4d1a584deaff6bbc79d77b4104cd9e) core: Remove redundant comments and dead code for clarity
- [`13edce0`](https://github.com/yehezkieldio/firefly/commit/13edce0320c717b6fce5015dab2d856e470d29a5) shared: Move service types and factories to dedicated definitions module
- [`d092e44`](https://github.com/yehezkieldio/firefly/commit/d092e444ed395d672872c5f2ae33c6b29eb8db69) core: Introduce branded types and structural sharing for context and services
- [`fb16e41`](https://github.com/yehezkieldio/firefly/commit/fb16e41babb06dc779ee018e1b3ed6cde27c90cf) service-registry: Use ResultAsync for lazy service proxy instantiation

### <!-- 8 -->🏗️ Build System
- [`900543f`](https://github.com/yehezkieldio/firefly/commit/900543ff0dc212172f45b987d167471435b3c882) config: Enable esm module type and add tsdown build settings

### <!-- 9 -->🎨 Code Styling
- [`e55f872`](https://github.com/yehezkieldio/firefly/commit/e55f872efe6074d12ec2d499f6c1ffa883bdc4e3) utils/error: Remove unnecessary blank lines

### <!-- 99 -->🌀 Other
- [`7d071c9`](https://github.com/yehezkieldio/firefly/commit/7d071c9b9195007dd9f6419109a0106e91338b41) Cleanup
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
