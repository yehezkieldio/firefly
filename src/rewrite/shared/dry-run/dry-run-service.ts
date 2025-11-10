export interface DryRunAction {
    type: "file" | "git" | "api" | "command";
    action: string;
    target: string;
    details?: Record<string, unknown>;
}

export class DryRunService {
    private actions: DryRunAction[] = [];
    private enabled = false;

    enable(): void {
        this.enabled = true;
        this.actions = [];
    }

    disable(): void {
        this.enabled = false;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    recordAction(action: DryRunAction): void {
        if (this.enabled) {
            this.actions.push(action);
        }
    }

    recordFileChange(path: string, action: "create" | "update" | "delete"): void {
        this.recordAction({
            type: "file",
            action,
            target: path,
        });
    }

    recordGitOperation(operation: string, target: string, details?: Record<string, unknown>): void {
        this.recordAction({
            type: "git",
            action: operation,
            target,
            details,
        });
    }

    recordApiCall(api: string, endpoint: string, details?: Record<string, unknown>): void {
        this.recordAction({
            type: "api",
            action: endpoint,
            target: api,
            details,
        });
    }

    getActions(): DryRunAction[] {
        return [...this.actions];
    }

    generateReport(): string {
        if (this.actions.length === 0) {
            return "No actions would be performed.";
        }

        const lines: string[] = [
            "\n========================================",
            "DRY RUN REPORT",
            "========================================\n",
        ];

        const byType = this.groupByType();

        for (const [type, actions] of Object.entries(byType)) {
            lines.push(`\n${type.toUpperCase()} Operations:`);
            for (const action of actions) {
                lines.push(`  • ${action.action} ${action.target}`);
                if (action.details) {
                    for (const [key, value] of Object.entries(action.details)) {
                        lines.push(`    ${key}: ${value}`);
                    }
                }
            }
        }

        lines.push("\n========================================");
        lines.push(`Total: ${this.actions.length} action(s)\n`);

        return lines.join("\n");
    }

    clear(): void {
        this.actions = [];
    }

    private groupByType(): Record<string, DryRunAction[]> {
        return this.actions.reduce(
            (acc, action) => {
                if (!acc[action.type]) {
                    acc[action.type] = [];
                }
                acc[action.type].push(action);
                return acc;
            },
            {} as Record<string, DryRunAction[]>,
        );
    }
}

export const dryRunService = new DryRunService();
