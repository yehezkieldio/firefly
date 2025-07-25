export const TRANSITION_KEYWORDS = ["graduate", "pre-release transition"];

export const REPOSITORY_PATTERNS = [
    /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /^https:\/\/gitlab\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /^git@gitlab\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /^https?:\/\/[^/]+\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /^git@[^:]+:([^/]+)\/([^/.]+?)(?:\.git)?$/,
] as const;
