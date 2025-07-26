# Changelog

All notable changes to Firefly will be documented in this file.

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
