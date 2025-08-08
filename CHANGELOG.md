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
