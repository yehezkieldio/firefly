import { ResultAsync } from "neverthrow";
import { toFireflyError, type FireflyAsyncResult } from "#/shared/errors";

export interface AIProviderConfig {
    provider: "azure-ai" | "openai" | "anthropic";
    apiKey?: string;
    endpoint?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface GenerateCommitRequest {
    diff: string;
    context?: string;
    systemPrompt?: string;
    files?: string[];
}

export interface GenerateCommitResponse {
    message: string;
    type?: string;
    scope?: string;
    breaking?: boolean;
    confidence?: number;
}

export class AIProviderService {
    constructor(private readonly config: AIProviderConfig) {}

    generateCommitMessage(request: GenerateCommitRequest): FireflyAsyncResult<GenerateCommitResponse> {
        return ResultAsync.fromPromise(
            this.callProvider(request),
            (error) => toFireflyError(error, "Failed to generate commit message"),
        );
    }

    private async callProvider(request: GenerateCommitRequest): Promise<GenerateCommitResponse> {
        const prompt = this.buildPrompt(request);

        switch (this.config.provider) {
            case "azure-ai":
                return this.callAzureAI(prompt);
            case "openai":
                return this.callOpenAI(prompt);
            case "anthropic":
                return this.callAnthropic(prompt);
            default:
                throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }

    private buildPrompt(request: GenerateCommitRequest): string {
        const parts: string[] = [];

        if (request.systemPrompt) {
            parts.push(request.systemPrompt);
            parts.push("\n\n");
        } else {
            parts.push("You are an expert at writing conventional commit messages.");
            parts.push("\n\n");
        }

        parts.push("Generate a conventional commit message for the following changes:");
        parts.push("\n\n");

        if (request.files && request.files.length > 0) {
            parts.push(`Files changed: ${request.files.join(", ")}`);
            parts.push("\n\n");
        }

        if (request.context) {
            parts.push("Context:");
            parts.push(request.context);
            parts.push("\n\n");
        }

        parts.push("Diff:");
        parts.push(request.diff);
        parts.push("\n\n");
        parts.push("Format: type(scope): subject");

        return parts.join("");
    }

    private async callAzureAI(prompt: string): Promise<GenerateCommitResponse> {
        // TODO: Implement actual Azure AI API call
        // For now, return a mock response
        return {
            message: "feat: implement AI-generated commit messages",
            type: "feat",
            breaking: false,
            confidence: 0.95,
        };
    }

    private async callOpenAI(prompt: string): Promise<GenerateCommitResponse> {
        // TODO: Implement actual OpenAI API call
        return {
            message: "feat: implement AI-generated commit messages",
            type: "feat",
            breaking: false,
            confidence: 0.95,
        };
    }

    private async callAnthropic(prompt: string): Promise<GenerateCommitResponse> {
        // TODO: Implement actual Anthropic API call
        return {
            message: "feat: implement AI-generated commit messages",
            type: "feat",
            breaking: false,
            confidence: 0.95,
        };
    }
}
