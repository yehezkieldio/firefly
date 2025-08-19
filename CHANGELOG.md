# Changelog

All notable changes to this project will be documented in this file.

**NOTE:** Changes are ordered by date, starting with the most oldest to the most recent.

> This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

## firefly@2.1.5 (August 19, 2025)

### <!-- 3 -->🚀 New Features
- [`a995711`](https://github.com/yehezkieldio/firefly/commit/a995711b6e68c31cf1341e14f4e5cd81b1ebaad7)  Enrich preReleaseId from package.json if not explicitly provided
- [`8c00b34`](https://github.com/yehezkieldio/firefly/commit/8c00b34c3ec82f8ae8849c907fb6566d993edc25)  Ensure help is shown when no command is provided

### <!-- 4 -->🐛 Bug Fixes
- [`21ecd9e`](https://github.com/yehezkieldio/firefly/commit/21ecd9e565577a320a8b90d5b21a0710cca0f254)  Set default preReleaseId to an empty string instead of "alpha"
- [`4d8e975`](https://github.com/yehezkieldio/firefly/commit/4d8e975d94c733c1e81a9eb6c25c2bd245fe766f)  Improve preReleaseId enrichment logic from package.json
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
