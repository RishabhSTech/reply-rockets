import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEmail, generateBatchEmails, estimateCost } from "@/lib/ai/email-generator";
import { validateEmail } from "@/lib/prompts/prompt-manager";
import type { PromptContext } from "@/lib/prompts/prompt-manager";

// Mock the AI provider module
vi.mock("@/lib/ai/ai-provider", () => ({
    callAIProvider: vi.fn(),
}));

import { callAIProvider } from "@/lib/ai/ai-provider";

describe("Email Generation System", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateEmail", () => {
        it("should generate a valid email with proper structure", async () => {
            // Mock AI response
            const mockResponse = {
                content: JSON.stringify({
                    subject: "Quick question about your marketing",
                    body: "Hi {{name}}, I noticed your company is growing fast. We help companies like yours reduce customer acquisition costs by 40%. Worth a quick chat?",
                }),
                usage: {
                    promptTokens: 500,
                    completionTokens: 200,
                    totalTokens: 700,
                },
            };

            vi.mocked(callAIProvider).mockResolvedValue(mockResponse);

            const context: PromptContext = {
                leadName: "John Doe",
                leadPosition: "CEO",
                leadCompany: "TechCorp",
                leadRequirement: "Reduce customer acquisition costs",
                tone: "professional",
                companyInfo: {
                    companyName: "ReplyRocket",
                    description: "AI-powered email outreach platform",
                },
            };

            const result = await generateEmail(context, {
                provider: "lovable",
                validateOutput: true,
            });

            expect(result.email).toBeDefined();
            expect(result.email.subject).toBeTruthy();
            expect(result.email.body).toBeTruthy();
            expect(result.provider).toBe("lovable");
            expect(result.usage).toBeDefined();
            expect(result.usage?.totalTokens).toBe(700);
        });

        it("should validate email output against quality rules", async () => {
            const mockResponse = {
                content: JSON.stringify({
                    subject: "Test subject",
                    body: "Short email body.",
                }),
                usage: {
                    promptTokens: 500,
                    completionTokens: 200,
                    totalTokens: 700,
                },
            };

            vi.mocked(callAIProvider).mockResolvedValue(mockResponse);

            const context: PromptContext = {
                leadName: "Jane Smith",
                leadPosition: "CTO",
                leadRequirement: "Improve email deliverability",
                tone: "casual",
            };

            const result = await generateEmail(context, {
                validateOutput: true,
            });

            expect(result.validation).toBeDefined();
            expect(result.validation?.isValid).toBeDefined();
            expect(result.validation?.errors).toBeDefined();
        });

        it("should handle different tone variations", async () => {
            const mockResponse = {
                content: JSON.stringify({
                    subject: "Quick question",
                    body: "Test body",
                }),
            };

            vi.mocked(callAIProvider).mockResolvedValue(mockResponse);

            const tones: Array<"professional" | "casual" | "friendly" | "direct"> = [
                "professional",
                "casual",
                "friendly",
                "direct",
            ];

            for (const tone of tones) {
                const context: PromptContext = {
                    leadName: "Test Lead",
                    leadPosition: "Manager",
                    leadRequirement: "Test requirement",
                    tone,
                };

                const result = await generateEmail(context);
                expect(result.email).toBeDefined();
                expect(result.provider).toBe("lovable"); // Default provider
            }
        });
    });

    describe("validateEmail", () => {
        it("should pass validation for compliant emails", () => {
            const email = {
                subject: "Quick question about your growth",
                body: "Hi there, I noticed your company is expanding. We help businesses reduce costs by 40%. Worth exploring?",
            };

            const validation = validateEmail(email);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should fail validation for emails exceeding word count", () => {
            const longBody = Array(100).fill("word").join(" ");
            const email = {
                subject: "Test",
                body: longBody,
            };

            const validation = validateEmail(email);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some((e) => e.includes("exceeds 90 words"))).toBe(true);
        });

        it("should fail validation for emails with exclamation marks", () => {
            const email = {
                subject: "Amazing opportunity!",
                body: "This is great!",
            };

            const validation = validateEmail(email);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some((e) => e.includes("exclamation marks"))).toBe(true);
        });

        it("should fail validation for emails with forbidden words", () => {
            const email = {
                subject: "Leverage our synergy",
                body: "We offer innovative and cutting-edge solutions.",
            };

            const validation = validateEmail(email);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some((e) => e.includes("forbidden words"))).toBe(true);
        });

        it("should fail validation for long subject lines", () => {
            const email = {
                subject: "This is a very long subject line that exceeds the maximum character limit",
                body: "Short body",
            };

            const validation = validateEmail(email);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some((e) => e.includes("Subject too long"))).toBe(true);
        });
    });

    describe("generateBatchEmails", () => {
        it("should generate emails for multiple leads", async () => {
            const mockResponse = {
                content: JSON.stringify({
                    subject: "Test subject",
                    body: "Test body",
                }),
            };

            vi.mocked(callAIProvider).mockResolvedValue(mockResponse);

            const contexts: PromptContext[] = [
                {
                    leadName: "Lead 1",
                    leadPosition: "CEO",
                    leadRequirement: "Requirement 1",
                    tone: "professional",
                },
                {
                    leadName: "Lead 2",
                    leadPosition: "CTO",
                    leadRequirement: "Requirement 2",
                    tone: "casual",
                },
            ];

            const results = await generateBatchEmails(contexts);

            expect(results).toHaveLength(2);
            expect(results[0].email).toBeDefined();
            expect(results[1].email).toBeDefined();
        });

        it("should continue processing even if one generation fails", async () => {
            vi.mocked(callAIProvider)
                .mockRejectedValueOnce(new Error("API error"))
                .mockResolvedValueOnce({
                    content: JSON.stringify({
                        subject: "Success",
                        body: "Success body",
                    }),
                });

            const contexts: PromptContext[] = [
                {
                    leadName: "Lead 1",
                    leadPosition: "CEO",
                    leadRequirement: "Requirement 1",
                    tone: "professional",
                },
                {
                    leadName: "Lead 2",
                    leadPosition: "CTO",
                    leadRequirement: "Requirement 2",
                    tone: "casual",
                },
            ];

            const results = await generateBatchEmails(contexts);

            // Should only have 1 result (the successful one)
            expect(results).toHaveLength(1);
            expect(results[0].email.subject).toBe("Success");
        });
    });

    describe("estimateCost", () => {
        it("should estimate token usage for email generation", () => {
            const context: PromptContext = {
                leadName: "Test Lead",
                leadPosition: "Manager",
                leadRequirement: "Test requirement with some context",
                tone: "professional",
                companyInfo: {
                    companyName: "TestCo",
                    description: "Test company description",
                },
            };

            const estimate = estimateCost(context, "lovable");

            expect(estimate.estimatedPromptTokens).toBeGreaterThan(0);
            expect(estimate.estimatedCompletionTokens).toBe(300);
            expect(estimate.estimatedTotalTokens).toBeGreaterThan(300);
            expect(estimate.provider).toBe("lovable");
        });

        it("should provide estimates for different providers", () => {
            const context: PromptContext = {
                leadName: "Test",
                leadPosition: "CEO",
                leadRequirement: "Test",
                tone: "professional",
            };

            const lovableEstimate = estimateCost(context, "lovable");
            const claudeEstimate = estimateCost(context, "claude");
            const openaiEstimate = estimateCost(context, "openai");

            expect(lovableEstimate.provider).toBe("lovable");
            expect(claudeEstimate.provider).toBe("claude");
            expect(openaiEstimate.provider).toBe("openai");

            // All should have same token estimates (provider doesn't affect estimation)
            expect(lovableEstimate.estimatedTotalTokens).toBe(claudeEstimate.estimatedTotalTokens);
            expect(lovableEstimate.estimatedTotalTokens).toBe(openaiEstimate.estimatedTotalTokens);
        });
    });
});
