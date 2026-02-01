import { describe, it, expect } from "vitest";
import {
    buildSystemPrompt,
    buildUserPrompt,
    validateEmail,
    getToneOptions,
    getIndustryContext,
} from "@/lib/prompts/prompt-manager";
import type { PromptContext } from "@/lib/prompts/prompt-manager";

describe("Prompt Manager", () => {
    describe("buildSystemPrompt", () => {
        it("should build a system prompt without company info", () => {
            const prompt = buildSystemPrompt();

            expect(prompt).toContain("Elite AI SDR");
            expect(prompt).toContain("WRITING PRINCIPLES");
            expect(prompt).toContain("AVOID ALL");
            expect(prompt).toContain("EMAIL FRAMEWORK");
            expect(prompt).toContain("OUTPUT FORMAT");
        });

        it("should include company info when provided", () => {
            const companyInfo = {
                companyName: "TestCo",
                description: "Test description",
                valueProposition: "Test value prop",
                targetAudience: "Test audience",
                keyBenefits: "Test benefits",
            };

            const prompt = buildSystemPrompt(companyInfo);

            expect(prompt).toContain("TestCo");
            expect(prompt).toContain("Test description");
            expect(prompt).toContain("Test value prop");
            expect(prompt).toContain("YOUR COMPANY");
        });

        it("should include forbidden words list", () => {
            const prompt = buildSystemPrompt();

            expect(prompt).toContain("agency");
            expect(prompt).toContain("synergy");
            expect(prompt).toContain("disruptive");
        });

        it("should specify subject line and cta rules", () => {
            const prompt = buildSystemPrompt();

            expect(prompt).toContain("SUBJECT LINE RULES");
            expect(prompt).toContain("CTA APPROACH");
        });
    });

    describe("buildUserPrompt", () => {
        it("should build a user prompt with lead context", () => {
            const context: PromptContext = {
                leadName: "John Doe",
                leadPosition: "CEO",
                leadCompany: "TechCorp",
                leadRequirement: "Reduce customer acquisition costs",
                tone: "professional",
            };

            const prompt = buildUserPrompt(context);

            expect(prompt).toContain("John Doe");
            expect(prompt).toContain("CEO");
            expect(prompt).toContain("TechCorp");
            expect(prompt).toContain("Reduce customer acquisition costs");
            expect(prompt).toContain("professional");
        });

        it("should include optional fields when provided", () => {
            const context: PromptContext = {
                leadName: "Jane Smith",
                leadPosition: "CTO",
                leadRequirement: "Test requirement",
                leadLinkedIn: "https://linkedin.com/in/janesmith",
                leadWebsite: "https://example.com",
                tone: "casual",
            };

            const prompt = buildUserPrompt(context);

            expect(prompt).toContain("linkedin.com/in/janesmith");
            expect(prompt).toContain("example.com");
        });

        it("should handle different tones", () => {
            const tones: Array<"professional" | "casual" | "friendly" | "direct"> = [
                "professional",
                "casual",
                "friendly",
                "direct",
            ];

            tones.forEach((tone) => {
                const context: PromptContext = {
                    leadName: "Test",
                    leadPosition: "Manager",
                    leadRequirement: "Test",
                    tone,
                };

                const prompt = buildUserPrompt(context);
                expect(prompt).toContain(tone);
            });
        });
    });

    describe("getToneOptions", () => {
        it("should return all available tone options", () => {
            const options = getToneOptions();

            expect(options).toHaveLength(4);
            expect(options.map((o) => o.value)).toContain("professional");
            expect(options.map((o) => o.value)).toContain("casual");
            expect(options.map((o) => o.value)).toContain("friendly");
            expect(options.map((o) => o.value)).toContain("direct");
        });

        it("should include descriptions for each tone", () => {
            const options = getToneOptions();

            options.forEach((option) => {
                expect(option.label).toBeTruthy();
                expect(option.description).toBeTruthy();
                expect(option.value).toBeTruthy();
            });
        });
    });

    describe("getIndustryContext", () => {
        it("should return SaaS industry context", () => {
            const context = getIndustryContext("saas");

            expect(context).toBeDefined();
            expect(context.core_pains).toContain("Bandwidth gaps");
            expect(context.signals_to_watch).toContain("Multiple engineering roles");
        });

        it("should return eCommerce industry context", () => {
            const context = getIndustryContext("ecommerce");

            expect(context).toBeDefined();
            expect(context.core_pains).toContain("Revenue-impacting delays");
            expect(context.signals_to_watch).toContain("Conversion-focused roles");
        });

        it("should return marketing agency industry context", () => {
            const context = getIndustryContext("marketing_agency");

            expect(context).toBeDefined();
            expect(context.core_pains).toContain("Client delivery strain");
            expect(context.signals_to_watch).toContain("Many open delivery roles");
        });
    });

    describe("Token Efficiency", () => {
        it("should generate compact prompts to minimize token usage", () => {
            const context: PromptContext = {
                leadName: "Test Lead",
                leadPosition: "Manager",
                leadRequirement: "Test requirement",
                tone: "professional",
                companyInfo: {
                    companyName: "TestCo",
                    description: "Test description",
                },
            };

            const systemPrompt = buildSystemPrompt(context.companyInfo);
            const userPrompt = buildUserPrompt(context);

            // Rough token estimation (4 chars per token)
            const totalChars = systemPrompt.length + userPrompt.length;
            const estimatedTokens = totalChars / 4;

            // Should be under 1000 tokens for efficient usage
            expect(estimatedTokens).toBeLessThan(1000);
        });
    });
});
