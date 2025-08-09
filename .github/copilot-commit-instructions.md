<commit_instructions>
  <output_requirements>
    <format>type(scope): message</format>
    <max_length>50</max_length>
    <tense>imperative mood (add, fix, update)</tense>
    <case>lowercase message start</case>
    <style>concise, direct, no explanations or reasoning</style>
    <return>commit message string only - no explanations or metadata</return>
  </output_requirements>
  <commit_types>
    <feat>brand new functionality or module that didn't exist before; NOT modifications to existing features</feat>
    <fix>bug corrections, error handling, or unintended behavior resolution</fix>
    <refactor>code structure changes and improvements without functional changes</refactor>
    <docs>documentation-only changes, no code logic modified</docs>
    <style>formatting, whitespace, linting - no functional changes</style>
    <perf>performance optimizations for speed, memory, or efficiency</perf>
    <test>adding or updating tests, no production code changes</test>
    <ci>CI/CD pipelines, workflows, automation</ci>
    <chore>maintenance tasks, tooling, configs, dependency updates</chore>
    <revert>undoing changes from a previous commit</revert>
    <security>vulnerability fixes, security patches</security>
  </commit_types>
  <scope_guidelines>
    <src_changes>feat, fix, refactor typically occur in src/ - use component/module scopes</src_changes>
    <non_src_changes>chore for configs, scripts, tooling outside src/</non_src_changes>
    <dependencies>chore(deps) for package.json, lock files, dependency updates</dependencies>
    <common_scopes>api, ui, auth, db, config, core, utils, deps</common_scopes>
  </scope_guidelines>
  <decision_tree>
    <step1>Dependencies changed? → chore(deps)</step1>
    <step2>Outside src/ folder? → chore</step2>
    <step3>Brand new feature/module in src/? → feat</step3>
    <step4>Fixing broken behavior in src/? → fix</step4>
    <step5>Improving code structure in src/? → refactor</step5>
    <step6>Default to most specific applicable type</step6>
  </decision_tree>
  <message_principles>
    <what_not_why>describe the change, never the reason</what_not_why>
    <no_reasoning>avoid "for clarity", "for consistency", "to improve"</no_reasoning>
    <no_filler>avoid "some", "various", "certain", "related"</no_filler>
    <active_voice>use action verbs, not passive descriptions</active_voice>
    <self_explanatory>commit explains itself without justification</self_explanatory>
  </message_principles>
  <examples>
    <good>feat(auth): add oauth2 login flow</good>
    <good>refactor(core): extract validation logic</good>
    <good>fix(api): handle empty response</good>
    <good>chore(deps): upgrade react to v18</good>
    <good>perf: optimize image loading</good>
    <bad>refactor(instructions): update commit message guidelines for clarity</bad>
    <bad>feat: improve user authentication system</bad>
    <bad>fix: fix some issues with AI prompts</bad>
    <bad>chore: update dependencies for better performance</bad>
  </examples>
  <processing_steps>
    <step1>Check if dependencies changed → chore(deps)</step1>
    <step2>Check if changes are outside src/ → chore</step2>
    <step3>For src/ changes: identify if NEW functionality (feat), broken behavior (fix), or structure improvement (refactor)</step3>
    <step4>Craft message describing WHAT changed - no reasoning</step4>
    <step5>Keep under 50 characters</step5>
    <step6>Output commit message string only</step6>
  </processing_steps>
</commit_instructions>