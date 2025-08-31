# Changelog

All notable changes to this project will be documented in this file.

**NOTE:** Changes are ordered by date, starting with the most oldest to the most recent.

> This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

## firefly@3.0.0-alpha.6 (August 31, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`9eba96f`](https://github.com/yehezkieldio/firefly/commit/9eba96f998316b509328980e54faa10f3cf5f255)  Cleanup everything
- [`1ccf158`](https://github.com/yehezkieldio/firefly/commit/1ccf1584f0e3434111d10d31e7e205c2766f6431) biome: Add neverthrow error handling diagnostics
- [`1e35d6b`](https://github.com/yehezkieldio/firefly/commit/1e35d6b92714bdd0a5aa52117fc1e3923ace8599) biome: Simplify error handling diagnostic registration format
- [`4fe85a1`](https://github.com/yehezkieldio/firefly/commit/4fe85a1237121d0cd554bb252d5561f8022e572a)  Correct version mismatch

### <!-- 2 -->🧩 Dependencies Updates
- [`de33552`](https://github.com/yehezkieldio/firefly/commit/de33552bb74ad66bf3db77735f89b42ca986dee2) deps: Update dependency zod to ^4.1.5 ([#68](https://github.com/yehezkieldio/firefly/issues/68)) by renovate[bot]
- [`fca4893`](https://github.com/yehezkieldio/firefly/commit/fca489381ca572e3ffbdb41a6ff89006d5dc7128) deps: Update dependency ultracite to ^5.2.10 ([#69](https://github.com/yehezkieldio/firefly/issues/69)) by renovate[bot]
- [`6fc5312`](https://github.com/yehezkieldio/firefly/commit/6fc53121dc4f7ffb4a9d2de3b0d0c9d7e4d090d6) deps: Remove ultracite dependency

### <!-- 3 -->🚀 New Features
- [`360ca7f`](https://github.com/yehezkieldio/firefly/commit/360ca7f35e017b1959903d13a4625fc0f4e134a8) logger: Add logger utility with custom formatting
- [`2d18bc8`](https://github.com/yehezkieldio/firefly/commit/2d18bc8a96d1457087755411089ed84fbfc8ade3) utils: Implement firefly error handling utilities

### <!-- 5 -->📚 Documentation
- [`1914e7a`](https://github.com/yehezkieldio/firefly/commit/1914e7a70c414f37608d3fd2f5348bccc9e67d7d) copilot: Update development instructions for clarity
- [`77b92f5`](https://github.com/yehezkieldio/firefly/commit/77b92f5c7c7f431637dd095829e836fed143f37a) copilot: Update commit message guidelines
## firefly@3.0.0-alpha.4 (August 19, 2025)

### <!-- 3 -->🚀 New Features
- [`a8ac9c3`](https://github.com/yehezkieldio/firefly/commit/a8ac9c329a7aefb882b0acbd3d8c5af7e775b641) orchestration: Add context, task, and workflow interfaces
- [`514d027`](https://github.com/yehezkieldio/firefly/commit/514d027245e2974fa6a5b62ee1dd33ac6a3c98f7) orchestration: Add execution strategy interface for tasks
- [`c630a21`](https://github.com/yehezkieldio/firefly/commit/c630a210df722371181e59b68a69674396dfe826) orchestration: Implement feature manager for toggling features
- [`e898683`](https://github.com/yehezkieldio/firefly/commit/e8986838fb4390e5fa561d7fca7aa1493a056ca6) core: Implement rollback manager for task handling
- [`0d06021`](https://github.com/yehezkieldio/firefly/commit/0d06021dc21ef1c33b77557365cc3c3f5bdc0b54) orchestration: Add scoped context for command execution
- [`7d8b94e`](https://github.com/yehezkieldio/firefly/commit/7d8b94ea327804b648f28fd89112bd4dbc4e7a84) orchestration: Implement task execution service with lifecycle
- [`9e92823`](https://github.com/yehezkieldio/firefly/commit/9e92823384b3c8101e3997571510050712498671) orchestration: Add sequential execution strategy implementation
- [`3c787f8`](https://github.com/yehezkieldio/firefly/commit/3c787f84f3e30b838623c038fbe37f2b296dee9b) orchestration: Implement task orchestrator service
- [`f7db227`](https://github.com/yehezkieldio/firefly/commit/f7db227fec6bd93582e7d8f127eeb2d686bb1744) orchestration: Implement workflow executor service
- [`6f8f6fc`](https://github.com/yehezkieldio/firefly/commit/6f8f6fc5dba23fd1c94cf45343dab14bebe5b341) orchestration: Implement rollback management in sequential strategy
- [`8de65f5`](https://github.com/yehezkieldio/firefly/commit/8de65f5444d834f213fdd152830628ee3a44df10) configuration: Implement config loader service
- [`8944356`](https://github.com/yehezkieldio/firefly/commit/89443563b70dafb61a8683d4b190218951379bcf) cli: Implement command-line interface manager
- [`b098d32`](https://github.com/yehezkieldio/firefly/commit/b098d32d38dd2cbec7e89db5f5c39848aa310742) orchestration: Add release context data schema
- [`3ccd653`](https://github.com/yehezkieldio/firefly/commit/3ccd65301bcd46f213a6ba5f9479294989daf9ce) cli: Implement command-line interface entry point
- [`26bf72c`](https://github.com/yehezkieldio/firefly/commit/26bf72cb88dce3b02e6604cb430053584b0eff56) cli: Add release command to CLI manager

### <!-- 5 -->📚 Documentation
- [`81bff3d`](https://github.com/yehezkieldio/firefly/commit/81bff3d90dedc493ed883d17bfe3148701ec5ac7) config: Add documentation for configuration schemas

### <!-- 7 -->🚜 Refactor
- [`711eab5`](https://github.com/yehezkieldio/firefly/commit/711eab50d6bed40a253e723a401396eee93fadf8) utils: Improve type inference in validateWithResult
- [`40b390e`](https://github.com/yehezkieldio/firefly/commit/40b390eedef48c09456de2533e64cb88438a3bd2) orchestration: Improve context data schema handling
- [`ef7d7a5`](https://github.com/yehezkieldio/firefly/commit/ef7d7a5e00873690a4a2bad77e1ba999efd25f28) utils: Simplify validateWithResult signature
- [`696fea0`](https://github.com/yehezkieldio/firefly/commit/696fea0adf1958f0e01affd676fd9d48b1d94852) orchestration: Update execution ID initialization

### <!-- 9 -->🎨 Code Styling
- [`97dae45`](https://github.com/yehezkieldio/firefly/commit/97dae453e0f7de076b127831e60b13df467c2489) copilot: Clarify typescript usage guidelines
## firefly@3.0.0-alpha.3 (August 18, 2025)

### <!-- 3 -->🚀 New Features
- [`40a3e1a`](https://github.com/yehezkieldio/firefly/commit/40a3e1a876b24d4ca86c7633e803117e3f0ac9c0) schema: Add json schema generation

### <!-- 4 -->🐛 Bug Fixes
- [`fe2cf23`](https://github.com/yehezkieldio/firefly/commit/fe2cf23010f57d85e224785d254d37cc539cb70f) config: Correct exports path for config module
- [`09aa1a2`](https://github.com/yehezkieldio/firefly/commit/09aa1a2c348731a2b1123d0d8a8336e7eb14c9b4) config: Preserve full type by keeping Zod schema literal types

### <!-- 5 -->📚 Documentation
- [`3d5bdad`](https://github.com/yehezkieldio/firefly/commit/3d5bdad26bfeba9f3988ab34eaf67ca33f2949c3)  Update readme

### <!-- 7 -->🚜 Refactor
- [`0f6807d`](https://github.com/yehezkieldio/firefly/commit/0f6807d13c47852c58b02e286163aa80c051d1c3) config: Rename FireflyConfig type to _FireflyConfig
## firefly@3.0.0-alpha.2 (August 18, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`8895c77`](https://github.com/yehezkieldio/firefly/commit/8895c77ef52f7fd8978b06dd2970de63b11afba8)  Rename package to fireflyy
- [`0e11133`](https://github.com/yehezkieldio/firefly/commit/0e11133ca3e006c63eb80c2eb84c62977827f3bc)  Clean codebase (again)
- [`b1c9184`](https://github.com/yehezkieldio/firefly/commit/b1c918448938ce7129573f725f4adb6e882bfac2) copilot: Update coding standards to account for classes

### <!-- 16 -->🤖 CI/CD
- [`a9ae951`](https://github.com/yehezkieldio/firefly/commit/a9ae9515efd50b780fa36ef38bdb2c6fc3739b7c)  Disable pre-release publishing

### <!-- 3 -->🚀 New Features
- [`08dcff9`](https://github.com/yehezkieldio/firefly/commit/08dcff9d359bb104572b694e20835b7fc1d53519) semver: Add bump strategy and release type constants
- [`578a7a4`](https://github.com/yehezkieldio/firefly/commit/578a7a459305f4d738e05cb2dfc3d31aef926c91) schema: Add repository schema
- [`8bfa3b5`](https://github.com/yehezkieldio/firefly/commit/8bfa3b598524f2a45a8da9f031ee560ed4c3c462) config: Add configuration schemas for base and release

### <!-- 5 -->📚 Documentation
- [`9b26674`](https://github.com/yehezkieldio/firefly/commit/9b26674a7b43d9671969745222537b3d044f0189)  Update readme
## firefly@3.0.0-alpha.1 (August 17, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`45e6ba2`](https://github.com/yehezkieldio/firefly/commit/45e6ba2a507419606b9eea54486465d2f89713f4) copilot: Add GPT-5 mini adaptive chatmode
- [`407b17b`](https://github.com/yehezkieldio/firefly/commit/407b17bca431e6e8cf0a9452a7ee5adcd35507f8) biome: Disable noStaticOnlyClass rule
- [`f7a1dbc`](https://github.com/yehezkieldio/firefly/commit/f7a1dbc98c7eb349ad8addd79530a97474af9d06)  Spike/new architecture redux ([#59](https://github.com/yehezkieldio/firefly/issues/59)) by [@yehezkieldio](https://github.com/yehezkieldio)

### <!-- 16 -->🤖 CI/CD
- [`8ce3c7d`](https://github.com/yehezkieldio/firefly/commit/8ce3c7d9493b13b5c59359722dc6bbaaf118aed3)  Remove continuous delivery workflow
- [`a511b92`](https://github.com/yehezkieldio/firefly/commit/a511b9286c0ae1d1c4b9b077b6bcdd0333fa6675)  Remove caching steps from code quality workflow
- [`f2c0beb`](https://github.com/yehezkieldio/firefly/commit/f2c0bebe06b83755804120235e92a20366c1b679) code-quality: Rename jobs and improve clarity
- [`875c7e0`](https://github.com/yehezkieldio/firefly/commit/875c7e014705581f1f33b4f190358068e9a25e29)  Add continuous delivery workflow
- [`a949076`](https://github.com/yehezkieldio/firefly/commit/a949076e703380e9d28a1cde373da33fe6c5f03b)  Format continuous delivery workflow

### <!-- 3 -->🚀 New Features
- [`25e7748`](https://github.com/yehezkieldio/firefly/commit/25e7748ed942ac82deeee20c10823a856cc0102c)  Prepare for codebase rework
   - 💥 **BREAKING CHANGE:** Clean various entities for a full CLI architectural rewrite.
- [`1724653`](https://github.com/yehezkieldio/firefly/commit/17246533541ba236a4ab45fcea045f8b5f1a210e) utils: Add error handling utilities
- [`2fb545f`](https://github.com/yehezkieldio/firefly/commit/2fb545f7bfb8855eb22efcc55f43110e7a80fe9a) semver: Add bump strategy and release type constants
- [`1e11b83`](https://github.com/yehezkieldio/firefly/commit/1e11b8337c101bc01630b76c4be8c84f2cc732e1) config: Add command and release configuration schemas
- [`9ebe98d`](https://github.com/yehezkieldio/firefly/commit/9ebe98d0fef3a9423e3233802a2fb9e83f6216f6) config: Add helper function to define file configuration
- [`bbb7cb1`](https://github.com/yehezkieldio/firefly/commit/bbb7cb11ea0804e96c12f54c25dc5bceaf9d1306) logger: Add logger implementation
- [`2c5a1f5`](https://github.com/yehezkieldio/firefly/commit/2c5a1f57cfe8babd41e87a511b9ee8d90549c166) schema: Add JSON schema for configuration options
- [`e848144`](https://github.com/yehezkieldio/firefly/commit/e848144ce65ddf8359a9937fdfa1494e14277e0b) schema: Implement schema registry for commands
- [`53dd5e0`](https://github.com/yehezkieldio/firefly/commit/53dd5e0b2e731094e4939499577a69ceeb69ab3a) context: Implement application context management
- [`4595d2d`](https://github.com/yehezkieldio/firefly/commit/4595d2d076096cedfe1b05d53a706b3c50f0e170) orchestration: Add a task orchestration engine
- [`31982a0`](https://github.com/yehezkieldio/firefly/commit/31982a0449d60b022afd70ccd78acf4f86abcae3) orchestration: Add workflow error handling and lifecycle support
- [`94d455f`](https://github.com/yehezkieldio/firefly/commit/94d455feb9f39515b5532aa8ff28aa9d6c603ad5) workflow: Add preflight task for release checks
- [`719cbf1`](https://github.com/yehezkieldio/firefly/commit/719cbf11994758d48aacb7a3e8e41118a85b7cc2) config: Add config loader with validation and merging
- [`70072e1`](https://github.com/yehezkieldio/firefly/commit/70072e10155f10a93628d8fa0e48d043c2d68b59) cli: Add CLI runner and command for releases
- [`d0deee6`](https://github.com/yehezkieldio/firefly/commit/d0deee6ad9d4a6f880a2748d55daa2521ee31443) workflow: Add narrowed context system for workflows
- [`208cfbb`](https://github.com/yehezkieldio/firefly/commit/208cfbb61f16073077e2b28b9835b797b5a3104c) workflow: Add release preflight task for validation
- [`ba00e4a`](https://github.com/yehezkieldio/firefly/commit/ba00e4a7482c7cbb604680904bc84d752acfd0cb) context: Add release context data schema
- [`369ba25`](https://github.com/yehezkieldio/firefly/commit/369ba2528e30080b7f31698306649db1aee76d55) cli: Add command options registration utility
- [`9274b76`](https://github.com/yehezkieldio/firefly/commit/9274b7635a19712690fd9ba5f487474c8471a880) cli: Implement CLI service for command registration
- [`ac41837`](https://github.com/yehezkieldio/firefly/commit/ac418374d9394b1df2e2b358bf12c2fe20575636) build: Add build script for project compilation

### <!-- 4 -->🐛 Bug Fixes
- [`52ef3ac`](https://github.com/yehezkieldio/firefly/commit/52ef3aca50fc38559049f236c0b8fde7fa8db6d4) config: Correct import path for schema registry

### <!-- 5 -->📚 Documentation
- [`80ad3eb`](https://github.com/yehezkieldio/firefly/commit/80ad3eb75bccdd629488282a01dbb237167c9753) cli: Add comments for CLI service methods
- [`ca84eda`](https://github.com/yehezkieldio/firefly/commit/ca84edadf043ae9c19e8b3ff5a6d27dad5aaba7f)  Update README with early alpha warning and details
- [`a2324e7`](https://github.com/yehezkieldio/firefly/commit/a2324e7f1108b4497adaeeaf4430d8adee2f75f2)  Update stable release link
- [`4d99c25`](https://github.com/yehezkieldio/firefly/commit/4d99c25ba1a29530167f82092bc60fe765efb4f4)  Update README
- [`375a230`](https://github.com/yehezkieldio/firefly/commit/375a23030da076699a9a6ef79931cf377f226b26)  Update README content and formatting

### <!-- 7 -->🚜 Refactor
- [`90fa167`](https://github.com/yehezkieldio/firefly/commit/90fa167faa9bc63c74aad56cacc09fb8809adfe9) config: Update getFinalConfigSchema for optional command
- [`a8c6569`](https://github.com/yehezkieldio/firefly/commit/a8c6569f58edacec0614b188f15c2173563d9b82) schema: Replace getFinalConfigSchema with SchemaRegistry
- [`93eedbb`](https://github.com/yehezkieldio/firefly/commit/93eedbb405ece4e19e50cb5216de56eec522a56f) schema: Simplify schema generation logic
- [`e734d47`](https://github.com/yehezkieldio/firefly/commit/e734d4727851ec9530872adcb960cd393c19b751) workflow: Remove pause, resume, and cancel methods
- [`71e6cc8`](https://github.com/yehezkieldio/firefly/commit/71e6cc848cc29cf3a8322dd6fe80d2534be5c843) core: Update context data imports
- [`dca5914`](https://github.com/yehezkieldio/firefly/commit/dca5914124c50b61b5ae8874d1efaf0ca9683552) configuration: Rename schema registry imports
- [`844da6f`](https://github.com/yehezkieldio/firefly/commit/844da6ff3f1190f2524312932e02535fefa888c8) core: Simplify orchestration completion logging

### <!-- 9 -->🎨 Code Styling
- [`9ca6544`](https://github.com/yehezkieldio/firefly/commit/9ca6544c6dbe8b9b5d004eb4de8dff469f3196c7)  Simplify no try/catch registration format
- [`f0e7244`](https://github.com/yehezkieldio/firefly/commit/f0e7244163a91261dc9e947d872e73eb822cdf43) copilot: Update coding standards for TypeScript usage
## firefly@2.1.4 (August 17, 2025)

### <!-- 2 -->🧩 Dependencies Updates
- [`e261e49`](https://github.com/yehezkieldio/firefly/commit/e261e4978166e2387df178922cc81b9d06137508) deps: Update dependency ultracite to ^5.1.9 ([#56](https://github.com/yehezkieldio/firefly/issues/56)) by renovate[bot]
- [`be37f21`](https://github.com/yehezkieldio/firefly/commit/be37f21d83f4ba14d31fc6823597727875c42d3f) deps: Update dependency ultracite to ^5.2.1 ([#57](https://github.com/yehezkieldio/firefly/issues/57)) by renovate[bot]
- [`eed7033`](https://github.com/yehezkieldio/firefly/commit/eed7033eb1627fdf9d6347c7f141d200fd598e32) deps: Update dependency ultracite to ^5.2.4 ([#58](https://github.com/yehezkieldio/firefly/issues/58)) by renovate[bot]

### <!-- 4 -->🐛 Bug Fixes
- [`ee00d24`](https://github.com/yehezkieldio/firefly/commit/ee00d24d2de800cb81d5996c99803f3c470068a2)  Enforce releaseLatest to false when releasePreRelease is enabled
## firefly@2.1.3 (August 16, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`93805b6`](https://github.com/yehezkieldio/firefly/commit/93805b62ff2c9e268ba6afb3e637696a2bfe4154) config: Update biome configuration
- [`aaa356a`](https://github.com/yehezkieldio/firefly/commit/aaa356a8aaa862d7100d175ab2b90670ed7997b2) config: Disable noParameterProperties rule
- [`223ea3b`](https://github.com/yehezkieldio/firefly/commit/223ea3b152c6338e14f3ee0562fddf50f5b0e57e) config: Disable useIterableCallbackReturn rule
- [`1d418b4`](https://github.com/yehezkieldio/firefly/commit/1d418b42f4630d5ef11506ef56293f0669848899) config: Disable noMagicNumbers rule

### <!-- 2 -->🧩 Dependencies Updates
- [`ad32444`](https://github.com/yehezkieldio/firefly/commit/ad32444bb23830310cfd7debd399087069cd20df) deps: Update dependency tsdown to ^0.13.4 ([#41](https://github.com/yehezkieldio/firefly/issues/41)) by renovate[bot]
- [`17329fd`](https://github.com/yehezkieldio/firefly/commit/17329fd09374f939bcbe7d68bd987ba2757b7983) deps: Update dependency @types/node to ^24.2.1 ([#42](https://github.com/yehezkieldio/firefly/issues/42)) by renovate[bot]
- [`3036785`](https://github.com/yehezkieldio/firefly/commit/30367857764cc3cb9b7a0dd4602b95ca6ee23fae) deps: Update dependency zod to ^4.0.16 ([#43](https://github.com/yehezkieldio/firefly/issues/43)) by renovate[bot]
- [`19657e2`](https://github.com/yehezkieldio/firefly/commit/19657e2ec9eaac91a106a4c7df52056994a8bc4e) deps: Update dependency smol-toml to ^1.4.2 ([#44](https://github.com/yehezkieldio/firefly/issues/44)) by renovate[bot]
- [`3dc355a`](https://github.com/yehezkieldio/firefly/commit/3dc355a6fdb6a3448e8f991f044e55d13214dda6) deps: Update dependency zod to ^4.0.17 ([#45](https://github.com/yehezkieldio/firefly/issues/45)) by renovate[bot]
- [`1bb82c3`](https://github.com/yehezkieldio/firefly/commit/1bb82c3776a5926235fa35099fac2d8049c2cf10) deps: Update dependency tsdown to ^0.13.5 ([#46](https://github.com/yehezkieldio/firefly/issues/46)) by renovate[bot]
- [`2602720`](https://github.com/yehezkieldio/firefly/commit/26027209480361787bafae9882d30a1ac9cd60cb) deps: Update dependency tsdown to ^0.14.0 ([#47](https://github.com/yehezkieldio/firefly/issues/47)) by renovate[bot]
- [`55a4de9`](https://github.com/yehezkieldio/firefly/commit/55a4de9df38d00b19fc2cb6c5166dca557a653f8) deps: Update dependency @types/bun to ^1.2.20 ([#48](https://github.com/yehezkieldio/firefly/issues/48)) by renovate[bot]
- [`ae65051`](https://github.com/yehezkieldio/firefly/commit/ae65051cd296eb4f7f154b3a590d54f8bb57ebbe) deps: Update dependency tsdown to ^0.14.1 ([#49](https://github.com/yehezkieldio/firefly/issues/49)) by renovate[bot]
- [`cf04639`](https://github.com/yehezkieldio/firefly/commit/cf0463948e5aeeec3a6e115752b928d7ed1daf85) deps: Update dependency @biomejs/biome to v2.2.0 ([#50](https://github.com/yehezkieldio/firefly/issues/50)) by renovate[bot]
- [`36d2400`](https://github.com/yehezkieldio/firefly/commit/36d2400bd9b94f938542ac9863437eee588e0d1d) deps: Update dependency ultracite to ^5.1.5 ([#51](https://github.com/yehezkieldio/firefly/issues/51)) by renovate[bot]
- [`e89939b`](https://github.com/yehezkieldio/firefly/commit/e89939bc7c85ec3800c091d3cdcde234e49323fa) deps: Update dependency @types/node to ^24.3.0 ([#52](https://github.com/yehezkieldio/firefly/issues/52)) by renovate[bot]
- [`bf9ab3e`](https://github.com/yehezkieldio/firefly/commit/bf9ab3ead1888f233cc568e170bafa14bfd800c3) deps: Update dependency ultracite to ^5.1.6 ([#53](https://github.com/yehezkieldio/firefly/issues/53)) by renovate[bot]
- [`421b941`](https://github.com/yehezkieldio/firefly/commit/421b941e17b8b0a2053ba3bca797adbfa00c72ae) deps: Update dependency ultracite to ^5.1.7 ([#54](https://github.com/yehezkieldio/firefly/issues/54)) by renovate[bot]
- [`a5f70e7`](https://github.com/yehezkieldio/firefly/commit/a5f70e730c88923d35ce0c31ea728b18ad99196b) deps: Update dependency ultracite to ^5.1.8 ([#55](https://github.com/yehezkieldio/firefly/issues/55)) by renovate[bot]

### <!-- 9 -->🎨 Code Styling
- [`35d5061`](https://github.com/yehezkieldio/firefly/commit/35d5061406b840373853caa7e32a52e43f789b9b)  Format files
- [`632ccc9`](https://github.com/yehezkieldio/firefly/commit/632ccc97767cafce6e807362e9d3e0a3032666ee)  Lint fix files
- [`22ad4ed`](https://github.com/yehezkieldio/firefly/commit/22ad4edda0dcc2b9f00837282543a134282338ad)  Clarify adapter check in TokenService
- [`27b7620`](https://github.com/yehezkieldio/firefly/commit/27b7620c4a39c7229173a2ddfead812248c26f56)  Clarify release type  in VersionChoices
- [`31574cc`](https://github.com/yehezkieldio/firefly/commit/31574cc737bb151f8e1c2580bf5292e17f889556)  Remove unnecessary biome ignore comment
- [`11e06bd`](https://github.com/yehezkieldio/firefly/commit/11e06bd8106291d3365eb7f829ccbc239a919cb4)  Clarify recommended type  in BumpStrategy
- [`7ba36f5`](https://github.com/yehezkieldio/firefly/commit/7ba36f57bd3c99013e58cd0060e0bc8b107f2c59)  Remove unnecessary biome ignore comment
- [`f5875ef`](https://github.com/yehezkieldio/firefly/commit/f5875ef305cae735df366a08455c2ed475665900)  Remove unnecessary biome ignore comment
- [`b6a8ad0`](https://github.com/yehezkieldio/firefly/commit/b6a8ad01dcb15839b83684443951ee644b169192)  Refine isComplexIdentifier check to ensure identifier is a string
## firefly@2.1.2 (August 8, 2025)

### <!-- 11 -->🛠️ Miscellaneous
- [`45e28e3`](https://github.com/yehezkieldio/firefly/commit/45e28e3b8575fff40a9125e13cfe27729523452b) ci: Remove unnecessary id-token permission and registry configuration
- [`82e56d9`](https://github.com/yehezkieldio/firefly/commit/82e56d9e4cc9704212fe28c787eabd7700622a9f) renovate: Use bump for renovate range strategy
- [`b1c5208`](https://github.com/yehezkieldio/firefly/commit/b1c520878d27488881b9dc891f3083f809139d42)  Update renovate configuration for package rules
- [`7d6d939`](https://github.com/yehezkieldio/firefly/commit/7d6d939a56af1d2a065996238babb4455e281999) copilot: Remove chatmodes
- [`aa1f698`](https://github.com/yehezkieldio/firefly/commit/aa1f698d019f8b16f2915baf261ed6b59f0a6442) git-cliff: Update changelog formatting

### <!-- 17 -->🛠️ Miscellaneous
- [`b52e6e3`](https://github.com/yehezkieldio/firefly/commit/b52e6e3f6a27076ba865b90dfd2f9551718cd29a)  Merge branch 'master' of github.com:yehezkieldio/firefly
- [`6076246`](https://github.com/yehezkieldio/firefly/commit/6076246bd140605693ff0f2e56b4fb1b5c1d987c)  Merge branch 'master' of github.com:yehezkieldio/firefly

### <!-- 2 -->🧩 Dependencies Updates
- [`d3754bf`](https://github.com/yehezkieldio/firefly/commit/d3754bf9dd8bfb19ed8ffb83769bc5bfebbfb06e) deps: Update dependency @biomejs/biome to ^2.1.3 ([#28](https://github.com/yehezkieldio/firefly/issues/28)) by renovate[bot]
- [`b3bb1f4`](https://github.com/yehezkieldio/firefly/commit/b3bb1f44f9e9b4e3ffeaafe60b380dacdcc87dbe) deps: Update dependency tsdown to ^0.13.2 ([#30](https://github.com/yehezkieldio/firefly/issues/30)) by renovate[bot]
- [`2df0d3c`](https://github.com/yehezkieldio/firefly/commit/2df0d3cf062327a804e5caaa8b96be3e2bd9fc98) deps: Update dependency @types/bun to ^1.2.19 ([#29](https://github.com/yehezkieldio/firefly/issues/29)) by renovate[bot]
- [`561464c`](https://github.com/yehezkieldio/firefly/commit/561464c7f33c0bd36d5cdbf5b7ca07489127bc52) deps: Update dependency typescript to ^5.9.2 ([#31](https://github.com/yehezkieldio/firefly/issues/31)) by renovate[bot]
- [`e31f2b4`](https://github.com/yehezkieldio/firefly/commit/e31f2b45a783b9e7064a6ff0ee5973aa83e7bf99) deps: Update dependency zod to ^4.0.14 ([#32](https://github.com/yehezkieldio/firefly/issues/32)) by renovate[bot]
- [`6343013`](https://github.com/yehezkieldio/firefly/commit/6343013c213e652361b682c706fa281a329ad962) deps: Update dependency @types/node to ^24.1.0 ([#33](https://github.com/yehezkieldio/firefly/issues/33)) by renovate[bot]
- [`d9c14d1`](https://github.com/yehezkieldio/firefly/commit/d9c14d1f7ca447b549758db56c691b42b89bc3ff) deps: Update dependency ultracite to ^5.1.2 ([#34](https://github.com/yehezkieldio/firefly/issues/34)) by renovate[bot]
- [`292f300`](https://github.com/yehezkieldio/firefly/commit/292f300706b8f8f948331ce0fd96074875ca97c8) deps: Update dependency c12 to ^3.2.0 ([#35](https://github.com/yehezkieldio/firefly/issues/35)) by renovate[bot]
- [`7ba0e4c`](https://github.com/yehezkieldio/firefly/commit/7ba0e4cc4558a84b4b5d692442c163c3900c5c59) deps: Update dependency git-cliff to ^2.10.0 ([#36](https://github.com/yehezkieldio/firefly/issues/36)) by renovate[bot]
- [`4c97b2e`](https://github.com/yehezkieldio/firefly/commit/4c97b2e3ee56a710153461abf6926d53ee25672d) deps: Update dependency @types/node to ^24.2.0 ([#37](https://github.com/yehezkieldio/firefly/issues/37)) by renovate[bot]
- [`df8fc35`](https://github.com/yehezkieldio/firefly/commit/df8fc357be7a3ad80a17f24201b1bbd305b34484) deps: Update dependency tsdown to ^0.13.3 ([#38](https://github.com/yehezkieldio/firefly/issues/38)) by renovate[bot]
- [`1af3947`](https://github.com/yehezkieldio/firefly/commit/1af3947818133ecec25d01f71eedef10c259ddb6) deps: Update dependency zod to ^4.0.15 ([#39](https://github.com/yehezkieldio/firefly/issues/39)) by renovate[bot]
- [`860cd5f`](https://github.com/yehezkieldio/firefly/commit/860cd5f969630a309d8d226742757acb4b2124f6) deps: Update dependency @biomejs/biome to v2.1.4 ([#40](https://github.com/yehezkieldio/firefly/issues/40)) by renovate[bot]
## firefly@2.1.1 (August 3, 2025)


### <!-- 11 -->🛠️ Miscellaneous

- [`f50bdaa`](https://github.com/yehezkieldio/firefly/commit/f50bdaa2c1549f42074ea247be6a30b8217326c2)  Release v2.0.2 ([#20](https://github.com/yehezkieldio/firefly/issues/20)) ([#20](https://github.com/yehezkieldio/firefly/pull/20) by [@github-actions[bot]](https://github.com/github-actions[bot])
- [`9c9f03d`](https://github.com/yehezkieldio/firefly/commit/9c9f03d32c4a20f2c0c2c3cf8c21fdf503b318db)  Merge branch 'master' of github.com:yehezkieldio/firefly
- [`e14e1bd`](https://github.com/yehezkieldio/firefly/commit/e14e1bd4bf9b2ac0eb5cb057c8f5852b18383ed0) ci: Try trusted publishing

### <!-- 17 -->🛠️ Miscellaneous

- [`a29a498`](https://github.com/yehezkieldio/firefly/commit/a29a498d4d93f74680c18579b82d8c30110de8ed)  Merge branch 'stable' into master

### <!-- 2 -->🧩 Dependencies Updates

- [`2e1b47d`](https://github.com/yehezkieldio/firefly/commit/2e1b47d55bf3e33b3003184b6a0f068fa58162b6) deps: Update dependency @biomejs/biome to v2.1.3 ([#27](https://github.com/yehezkieldio/firefly/issues/27)) by renovate[bot]

### <!-- 4 -->🐛 Bug Fixes

- [`3e866aa`](https://github.com/yehezkieldio/firefly/commit/3e866aa01505b1f23ed7d39667e4f0b88f12ed68) ci: Uncomplicate release workflow
- [`74eb278`](https://github.com/yehezkieldio/firefly/commit/74eb278787b91853c7cbda077fa43b5a17d936c2) ci: Improve change detection for src directory
- [`4fb4a7a`](https://github.com/yehezkieldio/firefly/commit/4fb4a7a32146167bd8b4579b4bd12778cc8c7095) ci: Ensure fetch-depth is set for checkout step
- [`f5f12c4`](https://github.com/yehezkieldio/firefly/commit/f5f12c4ef7fb15b5b5f04b388dc6aad0d3b49bbb) ci: Readd npm token

### <!-- 7 -->🚜 Refactor

- [`2edaf01`](https://github.com/yehezkieldio/firefly/commit/2edaf010e40ac0952933f25faee04fcce2e8ba4e) ci: Trigger next release on changes to src dir
- [`6d45444`](https://github.com/yehezkieldio/firefly/commit/6d454447042011fccd6e96b9774fe9501fbeb65a) commit-retriever: Remove redundant comments and logging in commit parsing methods

### <!-- 9 -->🎨 Code Styling

- [`9a0437c`](https://github.com/yehezkieldio/firefly/commit/9a0437cbc40f6fcf95c222da270e7ec325dda0db) result: Enhance documentation for FireflyResult and AsyncFireflyResult types
- [`17bd44a`](https://github.com/yehezkieldio/firefly/commit/17bd44a1d1c211bc96c3a8b43535e93fcc2d663b) logger: Remove unnecessary comment

## firefly@2.1.0 (July 26, 2025)


### 📝 Release Notes
This minor release addresses a key issue in the automatic commit analyzer, which previously fetched the entire commit history rather than only the commits since the last tag. The commit bumping logic has been replaced with a provisional solution that now correctly considers only recent commits for version recommendations.

While this update provides a more accurate and efficient version bumping process, it is intended as a temporary fix until a more robust and comprehensive rework of the commit analysis and versioning system is implemented in a future release.

### <!-- 3 -->🚀 New Features

- [`d848312`](https://github.com/yehezkieldio/firefly/commit/d848312b3ce0aa2720db72fdbf1b9d65ff022e9f)  Replace `ConventionalBumperAdapter` with `SemanticVersionService` for version recommendation

### <!-- 4 -->🐛 Bug Fixes

- [`f14d164`](https://github.com/yehezkieldio/firefly/commit/f14d1648be53384e846546207ee53b4c61328fef)  Update pull request title format

### <!-- 5 -->📚 Documentation

- [`bbfd65b`](https://github.com/yehezkieldio/firefly/commit/bbfd65b67a87970eada194bc45166fbe6893ec75)  Update radme structure and enhance key features section

### <!-- 7 -->🚜 Refactor

- [`5a9428e`](https://github.com/yehezkieldio/firefly/commit/5a9428e4b44ad0f1caf1b605f787f1f78f3bc813) config: Enchance `mergeConfigWithPriority` with strong typing
- [`cf4b52c`](https://github.com/yehezkieldio/firefly/commit/cf4b52cf8cd8d46538360a5a303b237b02c1fa2f) deps: Remove `conventional-recommended-bump`

## firefly@2.0.2 (July 25, 2025)


### <!-- 11 -->🛠️ Miscellaneous

- [`00d7912`](https://github.com/yehezkieldio/firefly/commit/00d79120c9c45075f17d82cf205973b4ea76138a)  Update permissions for CI workflow
