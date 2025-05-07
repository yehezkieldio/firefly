# Changelog

All notable changes to this project will be documented in this file.

## 📦 artemis@1.0.1 (May 7, 2025)


### 🔹 <!-- 17 -->CI/CD Configuration

-  Update conditional for continuous delivery job ([`9192e33`](https://github.com/yehezkieldio/artemis/commit/9192e33c5a81269b97f18aca440d727129535440))

## 📦 artemis@1.0.0 (May 7, 2025)


### 🔹 <!-- 12 -->Project Maintenance

-  Add changelog file to document project updates ([`2ed469f`](https://github.com/yehezkieldio/artemis/commit/2ed469fb291754782d9bd2cd5e43430b6d6ba1ef))
-  Update changelog configuration for better commit parsing ([`d1937b3`](https://github.com/yehezkieldio/artemis/commit/d1937b39f5842dea23acafad1180c5d0b346cb97))
- **git-cliff:** Remove unnecessary footer definition in changelog template ([`f0a6b4c`](https://github.com/yehezkieldio/artemis/commit/f0a6b4cb140548c275344356bd881e9d8a87edbd))

### 🔹 <!-- 17 -->CI/CD Configuration

-  Update condition for next job in continuous delivery workflow ([`289ef75`](https://github.com/yehezkieldio/artemis/commit/289ef757c44b78f047af47cf62f319704158bc33))
-  Update continuous delivery workflow for branch handling ([`97d202a`](https://github.com/yehezkieldio/artemis/commit/97d202a325d8ab6f0d1ebce0c4fd173ef2173e65))

### 🔹 <!-- 18 -->Miscellaneous Changes

-  Merge pull request #5 from yehezkieldio/rewrite/phoenix ([`4bf860a`](https://github.com/yehezkieldio/artemis/commit/4bf860a394e662f26a9ede98b2d99238c9cd3527)) ([#5](https://github.com/yehezkieldio/artemis/pull/5) by @yehezkieldio)
-  Merge pull request #4 from yehezkieldio/renovate/tsdown-0.x ([`56b9c25`](https://github.com/yehezkieldio/artemis/commit/56b9c259422c6c0df2f36746a8b830f760bfc62c)) ([#4](https://github.com/yehezkieldio/artemis/pull/4) by @yehezkieldio)

### 🔹 <!-- 2 -->Dependencies Updates

- **deps:** Update dependency tsdown to ^0.11.0 ([`3b17c9a`](https://github.com/yehezkieldio/artemis/commit/3b17c9aa31df658356d8bcc4af1f3b8e50e99871))

### 🔹 <!-- 3 -->New Features

- **preflight:** Implement preflight checks for git repository and config ([`5825ce4`](https://github.com/yehezkieldio/artemis/commit/5825ce421ac6994f74289ca4a50c37a8b91aa71b))
- **release:** Add support for GitLab release creation and rollback ([`2ebf76d`](https://github.com/yehezkieldio/artemis/commit/2ebf76d806ae2dd0519a163f97485a5650c7996c))
- **push:** Implement push and rollback functionality for commits and tags ([`5d98b2f`](https://github.com/yehezkieldio/artemis/commit/5d98b2fb65139648f9d37221e58a51b77eab30cb))
- **commander:** Add branch option for release configuration ([`d62456e`](https://github.com/yehezkieldio/artemis/commit/d62456ebdbfbdc6cbb4a780e2db46abfdc30796e))
- **config:** Add branch option for release configuration ([`dfcc9a2`](https://github.com/yehezkieldio/artemis/commit/dfcc9a260811fdce837349bd2413fcecb191a680))
- **tag:** Implement create and rollback version tag functionality ([`20bc1fd`](https://github.com/yehezkieldio/artemis/commit/20bc1fd33611ceddb03cbd6b8bf5faa2db17527c))
- **commit:** Implement create and rollback commit functionality ([`c42cc97`](https://github.com/yehezkieldio/artemis/commit/c42cc9775553ccc44d2beceaa5ea830cc99455d3))
- **changelog:** Implement changelog generation and rollback functionality ([`760fa2f`](https://github.com/yehezkieldio/artemis/commit/760fa2f5da3a64a9884e23d8d9d2d01e3f97053e))
- **bump-version:** Implement version bumping and rollback functionality ([`b2284cd`](https://github.com/yehezkieldio/artemis/commit/b2284cd300814c981b4856ba1828fc173b4874b4))
- **pipeline:** Update promptVersionPipeline to generate version ([`b91fe1f`](https://github.com/yehezkieldio/artemis/commit/b91fe1fae9b39abd46cca29bd636d06749d74498))
- **git:** Enhance token retrieval and repository URL extraction ([`8554fc4`](https://github.com/yehezkieldio/artemis/commit/8554fc4998682589c9cc74c06eddd7051bed5a2f))
- **gitlab:** Add GitLab release creation functionality ([`f3a977f`](https://github.com/yehezkieldio/artemis/commit/f3a977fa126318b3529d29c3174d7d4d8c4254f6))
- **github:** Implement GitHub release creation with parameters handling ([`bb8ed89`](https://github.com/yehezkieldio/artemis/commit/bb8ed891934555fe7d184e64e45c8329e35a3674))
- **changelog:** Implement changelog generation and update functionality ([`0a6c543`](https://github.com/yehezkieldio/artemis/commit/0a6c5435948f7613fe548fcf4e4818adc0a3d7c7))
- **versioning:** Implement automatic and manual version bump strategies ([`0a56f03`](https://github.com/yehezkieldio/artemis/commit/0a56f03406873ce57718c595c62e50b41756a1d0))
-  Add context enrichment and options sanitization functions ([`350d0e8`](https://github.com/yehezkieldio/artemis/commit/350d0e8a73bc6ffaff95adaa6fcbed746d5c498c))
-  Implement repository and package configuration handling ([`edfa875`](https://github.com/yehezkieldio/artemis/commit/edfa87544fd22dca6956d6291e1c9daeb84345fe))
-  Add preflight checks to ReleaseOrchestrator run method ([`6acb58e`](https://github.com/yehezkieldio/artemis/commit/6acb58eda364c38446095172e26e3906087b672d))
-  Implement rollback functions to return void instead of context ([`5212c37`](https://github.com/yehezkieldio/artemis/commit/5212c37de9feb62f92a6f805b2e4f78f77461d0c))
-  Implement pipelines for version bumping, commits, and releases ([`4211a56`](https://github.com/yehezkieldio/artemis/commit/4211a56f43dcfaa5122a667ec54d01c96538ac1d))
-  Implement ReleaseOrchestrator and integrate with CLI context ([`7f1595b`](https://github.com/yehezkieldio/artemis/commit/7f1595b3d78d20699a1e62cd03873351065d702c))
-  Add default options and merge function for ArtemisOptions ([`1db6f76`](https://github.com/yehezkieldio/artemis/commit/1db6f7607a2974ad2d306bb48c7c9a868de23376))
-  Implement CLI command structure and validation functions ([`36e3c4d`](https://github.com/yehezkieldio/artemis/commit/36e3c4d1374e592f9aca56e23e5a1f743380c168))
-  Implement ArtemisContext and related context management functions ([`240f25f`](https://github.com/yehezkieldio/artemis/commit/240f25f72c792be1c6ca6ffe7fbcd106c42b6491))
-  Add ArtemisOptions interface and versioning files for release process ([`d2056d9`](https://github.com/yehezkieldio/artemis/commit/d2056d9fb9f98148466d8515c74f6dbcf655daf0))
-  Add initial implementation for various application components ([`758e6fb`](https://github.com/yehezkieldio/artemis/commit/758e6fbd818af5ce9feff17e21c89ac20466fb8a))
-  Add constants and utility function for error handling ([`7ce5c1a`](https://github.com/yehezkieldio/artemis/commit/7ce5c1a68d04e48703b196ce606afa975ed5a2fc))
-  Define configuration function for Artemis release process ([`7ac375e`](https://github.com/yehezkieldio/artemis/commit/7ac375eaf6ad4b5da9db3e65e064732398e49719))
-  Add ArtemisOptions interface and related types for configuration ([`702686c`](https://github.com/yehezkieldio/artemis/commit/702686c985bc15a5bfb15d5cf4c3ade7961392ce))
-  Add initial cli implementation ([`0cab0d2`](https://github.com/yehezkieldio/artemis/commit/0cab0d2b9004d4dd09d7a3b99520b9e64170afc9))
-  Remove src dir as start of project rework ([`1943c2a`](https://github.com/yehezkieldio/artemis/commit/1943c2a4ddb2756b6de427d88e4332ea1b0253ce))

### 🔹 <!-- 4 -->Bug Fixes

- **commander:** Remove commented-out option for skipping GitLab release ([`7eb9456`](https://github.com/yehezkieldio/artemis/commit/7eb9456d8bfa8540a91f49031088a5e3c13b830d))
-  Update import path for ArtemisOptions in index.ts ([`84f296e`](https://github.com/yehezkieldio/artemis/commit/84f296ed0838438c71d6984ec5c15e6df287a632))

### 🔹 <!-- 7 -->Code Refactoring

-  Update ArtemisOptions type definition in config ([`022520d`](https://github.com/yehezkieldio/artemis/commit/022520d74ad86d5b6c8f935935b1ef6dadc87295))
-  Update mergeOptions to return Result type for better error handling ([`c26cd14`](https://github.com/yehezkieldio/artemis/commit/c26cd14a25cab018b5644c895c36dfdf3b1b1690))

## 📦 artemis@0.2.5 (May 1, 2025)


### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.5 ([`87ffb4c`](https://github.com/yehezkieldio/artemis/commit/87ffb4c82812429a1c5c6140673e719193efcfa5))

### 🔹 <!-- 12 -->Project Maintenance

- **tsdown:** Improve type annotations for config ([`5137a96`](https://github.com/yehezkieldio/artemis/commit/5137a96877ed14ee25fad83364efd5745b6a807f))

### 🔹 <!-- 18 -->Miscellaneous Changes

-  Merge pull request #3 from yehezkieldio/renovate/tsdown-0.x ([`76e3280`](https://github.com/yehezkieldio/artemis/commit/76e32801ed2deb491448a4796e4cc1d6c58abc5d)) ([#3](https://github.com/yehezkieldio/artemis/pull/3) by @yehezkieldio)

### 🔹 <!-- 2 -->Dependencies Updates

- **deps:** Update dependency biome to beta 2 ([`fd93270`](https://github.com/yehezkieldio/artemis/commit/fd93270f6fbf23554f94fe545502438a5f45da33))
- **deps:** Update dependency tsdown to ^0.10.0 ([`1370c61`](https://github.com/yehezkieldio/artemis/commit/1370c615a82cfc00d6f8dbfc667650925c6337f9))

## 📦 artemis@0.2.4 (April 24, 2025)


### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.4 ([`ca0e8c2`](https://github.com/yehezkieldio/artemis/commit/ca0e8c22380664f02925b2e7c1ee125d9dfde4bb))

### 🔹 <!-- 11 -->Build System

-  Replace build script with tsdown ([`ab7ff09`](https://github.com/yehezkieldio/artemis/commit/ab7ff09ec273a475f7aa98906e55d5b636e76bed))

### 🔹 <!-- 14 -->Compatibility Changes

- **types:** Add type annotations for exported constants ([`e535c69`](https://github.com/yehezkieldio/artemis/commit/e535c6912a48aa69757a433e046b97e6cf7e1c66))

### 🔹 <!-- 2 -->Dependencies Updates

- **deps:** Update bun.lock file with latest package versions ([`0ca9776`](https://github.com/yehezkieldio/artemis/commit/0ca9776bb8e32c06e8d348c38664bd2e10f51cd2))

### 🔹 <!-- 7 -->Code Refactoring

- **git-cliff:** Reorganize commit message groups ([`5945868`](https://github.com/yehezkieldio/artemis/commit/59458680769164b5f4ed48408ab01f234b926bf8))

### 🔹 <!-- 9 -->Code Styling

- **biome:** Update includes pattern for better file matching ([`f289885`](https://github.com/yehezkieldio/artemis/commit/f28988565dc9d140df539dfa3e58519c38e92563))

## 📦 artemis@0.2.3 (April 22, 2025)


### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.3 ([`74ac0ad`](https://github.com/yehezkieldio/artemis/commit/74ac0ad959b705e8c2717d69ce69b0f63271d788))

### 🔹 <!-- 7 -->Code Refactoring

- **preflight:** Remove uncommitted changes check from pipeline ([`e94e049`](https://github.com/yehezkieldio/artemis/commit/e94e049c6a163767692d62731b725fae0c376568))

## 📦 artemis@0.2.2 (April 22, 2025)


### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.2 ([`0bdbf6b`](https://github.com/yehezkieldio/artemis/commit/0bdbf6b4afd522f51f32b0b383a6853ef5471662))

### 🔹 <!-- 3 -->New Features

- **cli:** Add option to specify release notes in CLI ([`895be1a`](https://github.com/yehezkieldio/artemis/commit/895be1aea44cdde3da2bed242b30e193619ff55b))

### 🔹 <!-- 5 -->Documentation Updates

- **changelog:** Update changelog format and structure for clarity ([`081a23a`](https://github.com/yehezkieldio/artemis/commit/081a23a91f3fa670a904cf7644a5aa4954e90c68))

### 🔹 <!-- 7 -->Code Refactoring

- **config:** Remove tag annotation from configuration ([`bb70fcf`](https://github.com/yehezkieldio/artemis/commit/bb70fcf255538dc5fbfcd9d568522fb85628119f))
- **changelog:** Include message in changelog body template ([`f968d29`](https://github.com/yehezkieldio/artemis/commit/f968d29d261678405e7fd5ac20e836e64beb0a34))

## 📦 artemis@0.2.1 (April 22, 2025)


### 📝 Release Notes
artemis@0.2.1

### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.1 ([`020294b`](https://github.com/yehezkieldio/artemis/commit/020294b39096fd06125c2c549ef9ebcca58154a6))

### 🔹 <!-- 3 -->New Features

- **preflight:** Add debug option to skip preflight checks ([`6424e44`](https://github.com/yehezkieldio/artemis/commit/6424e449fc5515ae76cc99d5d80268be517901f4))

### 🔹 <!-- 7 -->Code Refactoring

- **changelog:** Remove additional metadata before changes ([`c413374`](https://github.com/yehezkieldio/artemis/commit/c413374bad74d82333bbed23044d2f2640b774ea))

## 📦 artemis@0.2.0 (April 22, 2025)


### 📝 Release Notes
artemis@0.2.0

### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.2.0 ([`2d7c819`](https://github.com/yehezkieldio/artemis/commit/2d7c819ed060860120989fb23d99e8ad16ac9b13))

### 🔹 <!-- 12 -->Project Maintenance

-  Remove renovate config ([`e3116d2`](https://github.com/yehezkieldio/artemis/commit/e3116d2fcf42470a4b4c86d8a763045d2b177f72))
-  Remove github copilot settings ([`8985720`](https://github.com/yehezkieldio/artemis/commit/8985720ac367ee82a8686e1d9c66819ae27d24f4))

### 🔹 <!-- 5 -->Documentation Updates

-  Update commit message guidelines and formatting instructions ([`8c3b81e`](https://github.com/yehezkieldio/artemis/commit/8c3b81e5ad461c45fbe08b2bb0be4a9d73994aca))

### 🔹 <!-- 7 -->Code Refactoring

- **changelog:** Improve header and body template checks ([`50bba21`](https://github.com/yehezkieldio/artemis/commit/50bba21b219b691c6c727fbeb6247944a5b03963))
- **context:** Move enrichWithVersion to context.ts ([`85e3345`](https://github.com/yehezkieldio/artemis/commit/85e3345e8e2a85952cb67ed71369a119b3b7a1ac))

## 📦 artemis@0.1.2 (April 20, 2025)


### 📝 Release Notes
artemis@0.1.2

### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.1.2 ([`3235b4f`](https://github.com/yehezkieldio/artemis/commit/3235b4fc51c91f801a8ae9b0e3a2aead0a610771))

### 🔹 <!-- 12 -->Project Maintenance

-  Add commit message generation instructions ([`d142fd5`](https://github.com/yehezkieldio/artemis/commit/d142fd5da00192ea72980149743c6833bc7249e2))

### 🔹 <!-- 7 -->Code Refactoring

- **pipeline:** Extract preflight checks ([`f95f18f`](https://github.com/yehezkieldio/artemis/commit/f95f18ff2effc29bcbba89332afd74a78ed339b3))

## 📦 artemis@0.1.1 (April 20, 2025)


### 📝 Release Notes
artemis@0.1.1

### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.1.1 ([`8939658`](https://github.com/yehezkieldio/artemis/commit/89396589673379cab15235630ea6ebc639fa176e))

### 🔹 <!-- 12 -->Project Maintenance

- **renovate:** Format file ([`d9b2dbc`](https://github.com/yehezkieldio/artemis/commit/d9b2dbc576b484dce3a42852940b49272c589ebc))

### 🔹 <!-- 17 -->CI/CD Configuration

-  Update continuous delivery workflow to publish to npmjs ([`f09c8b4`](https://github.com/yehezkieldio/artemis/commit/f09c8b423155c9fb65555a8cd5dc4532f16f94b0))

### 🔹 <!-- 18 -->Miscellaneous Changes

-  Merge pull request #1 from yehezkieldio/renovate/configure ([`2b29b10`](https://github.com/yehezkieldio/artemis/commit/2b29b1081395ee042d50bb51d9f44475acc7639c)) ([#1](https://github.com/yehezkieldio/artemis/pull/1) by @yehezkieldio)
-  Add renovate.json ([`614c225`](https://github.com/yehezkieldio/artemis/commit/614c225c314ddae2d1030e036b710d81b9a73724))

## 📦 artemis@0.1.0 (April 20, 2025)


### 📝 Release Notes
artemis@0.1.0

### 🔹 <!-- 0 -->Release Versioning

- **release:** Release artemis@0.1.0 ([`741beb4`](https://github.com/yehezkieldio/artemis/commit/741beb47907d395ed468d735455bd14d649de58f))

### 🔹 <!-- 12 -->Project Maintenance

-  Initialize project with essential configuration files ([`eb0a26b`](https://github.com/yehezkieldio/artemis/commit/eb0a26b651d0b9d12abddba6174781684a1e6a32))

### 🔹 <!-- 3 -->New Features

-  Add funding and renovate configuration files; update tag format ([`9392ed7`](https://github.com/yehezkieldio/artemis/commit/9392ed773f25ec308a9deade3dd174676a26b585))
- **readme:** Add detailed usage instructions and configuration examples ([`1e5f843`](https://github.com/yehezkieldio/artemis/commit/1e5f843358a319e52d3f770728a1b7c1599be6f1))
- **pipeline:** Add environment checks and improve rollback ([`6dbfacb`](https://github.com/yehezkieldio/artemis/commit/6dbfacb119b10ad7e6b825866ebfa44b521ed535))
- **pipeline:** Add preflight pipeline for context validation ([`595f868`](https://github.com/yehezkieldio/artemis/commit/595f868a60c10bb6a4cfb5196325d38f4bd1a391))
- **github-release:** Add dry run indicator to release logging ([`e7faf95`](https://github.com/yehezkieldio/artemis/commit/e7faf959b772e44741e29904ebc43c077c0fadff))
- **release:** Implement github release rollback ([`fcb670d`](https://github.com/yehezkieldio/artemis/commit/fcb670d85a4a433caa4980be32554bb3ffc60333))
- **github-release:** Add options for GitHub release management ([`47ecddc`](https://github.com/yehezkieldio/artemis/commit/47ecddc14416eaefa776ccc516374f68eb9607df))
- **context:** Add branch option to ArtemisConfiguration interface ([`3a67541`](https://github.com/yehezkieldio/artemis/commit/3a67541bdcc9b01a9971ffe2987461dce346ec00))
- **pipelines:** Add rollback functionality for version tag creation ([`f5b644b`](https://github.com/yehezkieldio/artemis/commit/f5b644b80051a4305415a493ba1f2e0138ce80cd))
- **changelog:** Simplify rollback by removing backup functionality ([`3c9c600`](https://github.com/yehezkieldio/artemis/commit/3c9c6009d8e5a7f9803ba548c60c11cdbbec1e37))
- **changelog:** Add rollback functionality for changelog generation ([`092838a`](https://github.com/yehezkieldio/artemis/commit/092838abe71452d971f34b2b44da9c61bc4f23a2))
- **commit:** Add dry run support and rollback functionality ([`afbf1f1`](https://github.com/yehezkieldio/artemis/commit/afbf1f13c9494dc29e5e2478af450ad9d75ab38d))
- **config:** Add skip options and check name/ scope from package.json ([`2b34e21`](https://github.com/yehezkieldio/artemis/commit/2b34e2165935ea5e0a1cbb9eaa2ed3af4ae8527e))
- **commit:** Implement createCommitPipeline with staging functionality ([`b352ff2`](https://github.com/yehezkieldio/artemis/commit/b352ff2ca8b64f2f3e172f6c0ebc28058c928e9c))
- **bump-version:** Add rollback functionality for version bumping ([`b9d6576`](https://github.com/yehezkieldio/artemis/commit/b9d6576e1045d190ae333668c7baa7b7eb6d2b25))
- **cli:** Add options to skip commit, tag, and push steps ([`862f717`](https://github.com/yehezkieldio/artemis/commit/862f7171e4e051374b1c6911d14edf04fbe4a4d7))
- **git-cliff:** Add verbose logging for changelog generation process ([`6db0ca1`](https://github.com/yehezkieldio/artemis/commit/6db0ca12ae3f5b3c3e0984ce63a583a7973da7dd))
- **git-cliff:** Enhance changelog generation with dry run support ([`ecc380b`](https://github.com/yehezkieldio/artemis/commit/ecc380be26533b5f3e3b4d717db0273b70330cbf))
- **cli:** Add option to skip changelog generation step ([`21bd5f2`](https://github.com/yehezkieldio/artemis/commit/21bd5f2926b3fd4c218aaf7bfcdd5ab485cd8906))
- **changelog:** Implement changelog generation using Git Cliff ([`50d4727`](https://github.com/yehezkieldio/artemis/commit/50d47270047f66c3793082692ce7fac19f37f5a4))
- **git-cliff:** Add Git Cliff integration and changelog generation ([`e8b6c79`](https://github.com/yehezkieldio/artemis/commit/e8b6c794bcc25e1a5a63617810f80ba2ddbafa73))
- **config:** Add configuration options for changelog and release formats ([`ce95ceb`](https://github.com/yehezkieldio/artemis/commit/ce95ceb36a626b38b684ed95e8717c459cb63177))
- **git-cliff:** Add TOML parsing for Git Cliff configuration ([`ccc0e97`](https://github.com/yehezkieldio/artemis/commit/ccc0e974876f8596a2abd3cc85be2e718d312153))
- **config:** Add repository auto-detection and version enrichment ([`fc7658c`](https://github.com/yehezkieldio/artemis/commit/fc7658cd88f9263612076a30987aca79eef5b4bb))
- **github:** Add Octokit integration for GitHub API authentication ([`ff684c5`](https://github.com/yehezkieldio/artemis/commit/ff684c5d7a5602e6cd9876ecdecc00a7cfe86d20))
- **git:** Enhance GitHub CLI integration and token retrieval logic ([`7127faf`](https://github.com/yehezkieldio/artemis/commit/7127fafa1902cc0af0715a362938006e85bb5437))
- **pipeline:** Add dry run support and logging for version bumping ([`2125b35`](https://github.com/yehezkieldio/artemis/commit/2125b353a27fddc8b0de5fd55b8748a3215447af))
- **pipeline:** Add support for skipping steps in rollback execution ([`56a278e`](https://github.com/yehezkieldio/artemis/commit/56a278ed5eec47adb33af8c04517f26ab7564232))
- **cli:** Add options to skip version bump and GitHub release ([`4f908e9`](https://github.com/yehezkieldio/artemis/commit/4f908e9a4c10668c3295f95c2f0d716b7da66138))
-  Implement CLI with version bumping and configuration management ([`1a9ec91`](https://github.com/yehezkieldio/artemis/commit/1a9ec91de2e11a7b33d9ccc22d01c5ac1e88a684))

### 🔹 <!-- 4 -->Bug Fixes

- **readme:** Align title and header formatting for consistency ([`a4e6186`](https://github.com/yehezkieldio/artemis/commit/a4e618695d860d3494bf06d0b9b53202e6e23778))
- **readme:** Clarify compatibility with Node.js and other runtimes ([`bb7da3c`](https://github.com/yehezkieldio/artemis/commit/bb7da3c02648f567a92b8fe1ccd986e3968003d1))
- **readme:** Remove redundant configurable feature mention ([`15fe995`](https://github.com/yehezkieldio/artemis/commit/15fe995e8ebe0796b0fb7916f2f1cb5029b06575))
- **readme:** Correct description of CLI functionality ([`99b8e96`](https://github.com/yehezkieldio/artemis/commit/99b8e9667190b75a0d5ebe93aab51070149d25c2))
- **pipelines:** Log created tag message in createTag function ([`72a5236`](https://github.com/yehezkieldio/artemis/commit/72a5236d7c5e7bb1f9f30234f5aa9dcfea1391db))
- **cli:** Change logger info to log for version display ([`0b28ad1`](https://github.com/yehezkieldio/artemis/commit/0b28ad16930707ff06bd6e920a30d3584357ac07))

### 🔹 <!-- 7 -->Code Refactoring

- **pipeline:** Update entrypoints and improve logging messages ([`0d4b08c`](https://github.com/yehezkieldio/artemis/commit/0d4b08cdab45ca501cf07e63e8e35ac1c227d1f9))
- **create-version-tag:** Improve tag creation logic and error handling ([`e0ddca3`](https://github.com/yehezkieldio/artemis/commit/e0ddca38f625ae2176259b69149c9de7f7b2031f))
-  Remove some verbose logging ([`76beabb`](https://github.com/yehezkieldio/artemis/commit/76beabb3070a3b0ddba88639327ad934e8276700))
- **github-release:** Update tag name format and improve logging ([`ce219aa`](https://github.com/yehezkieldio/artemis/commit/ce219aa6d34bf6308cafeda1b8403b68f4eaba8f))
- **config:** Update package name formatting to use scope ([`622fe43`](https://github.com/yehezkieldio/artemis/commit/622fe43b4a1be204702360486daa8168a7416344))
- **config:** Update configuration loading to use cwd and defaults ([`a26ce27`](https://github.com/yehezkieldio/artemis/commit/a26ce27962f7e0f615d1edc7b2982c4bc873cd83))
- **github-release:** Improve log message formatting for releases ([`dcd6e98`](https://github.com/yehezkieldio/artemis/commit/dcd6e9848f8919bccaeba632c8665ce5eadc994d))
- **github-release:** Truncate log output for release parameters ([`559f49f`](https://github.com/yehezkieldio/artemis/commit/559f49f4b3775c53efbc84df17919341c1d9d15a))
- **pipelines:** Update dry run logging message for tag creation ([`b2fd6a9`](https://github.com/yehezkieldio/artemis/commit/b2fd6a902009d671e817c805ea484e90c86fcf07))
- **pipelines:** Enhance dry run logging for push operations ([`7e8e067`](https://github.com/yehezkieldio/artemis/commit/7e8e067e1222fc4eaf16e0f44bc6e6a0e0965825))
- **pipelines:** Update logging messages for push operations ([`42ae4df`](https://github.com/yehezkieldio/artemis/commit/42ae4dfba0f2e36f7af43f1996dfce9a4681d95c))
- **pipelines:** Improve dry run logging in createCommitPipeline ([`e9afa1c`](https://github.com/yehezkieldio/artemis/commit/e9afa1cd982b9f1c6ab9b13d8613e4960c573a54))
- **pipelines:** Simplify createVersionTagPipeline and improve logging ([`a5ef9f3`](https://github.com/yehezkieldio/artemis/commit/a5ef9f3f8a079c50fedde740610d32a3f64f6d2a))
- **fs:** Add dry run option to createIfNotExists function ([`55880dc`](https://github.com/yehezkieldio/artemis/commit/55880dcc72798d9142ff4529ea751dc0038f4a04))
- **github:** Reorganize GitHub CLI functions and improve imports ([`5af9e82`](https://github.com/yehezkieldio/artemis/commit/5af9e82b02887898ec8e5ac460543f9f901d2ad7))
- **git:** Rename function for consistency and improve repo extraction ([`4f2f006`](https://github.com/yehezkieldio/artemis/commit/4f2f006777a85b972a323db4444a35efa5b3431a))
- **context:** Add type parameters to Object.freeze for clarity ([`077db61`](https://github.com/yehezkieldio/artemis/commit/077db61672dfef7c736cc9370de1fea921e358d7))
- **utils:** Simplify error handling in createErrorFromUnknown ([`0980436`](https://github.com/yehezkieldio/artemis/commit/0980436c5799ceb70f385362f335ba058855bbc3))

