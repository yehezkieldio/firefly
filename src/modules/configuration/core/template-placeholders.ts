export const VALID_TEMPLATE_PLACEHOLDERS = ["{{name}}", "{{unscopedName}}", "{{version}}"] as const;

export type TemplatePlaceholder = (typeof VALID_TEMPLATE_PLACEHOLDERS)[number];
