import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateEmailRequest {
  leadName: string;
  leadPosition: string;
  leadCompany?: string;
  leadRequirement: string;
  leadLinkedIn?: string;
  leadWebsite?: string;
  tone: string;
  companyInfo: {
    companyName?: string;
    description?: string;
    valueProposition?: string;
    targetAudience?: string;
    keyBenefits?: string;
  };
  contextJson?: any;
  provider?: 'claude' | 'openai' | 'lovable';
  providerApiKey?: string;
  campaignContext?: any;
  // Lead persona data for personalized icebreakers and pain points
  leadPersona?: {
    title?: string;
    painPoints?: string[];
    priorities?: string[];
    icebreakerHooks?: string[];
    openingLines?: string[];
  };
}

// Import the refined prompt templates
const emailTemplates = {
  cmo_bot_context: {
    forbidden_words: [
      "synergy", "leverage", "innovative", "cutting-edge", "revolutionary",
      "game-changing", "disruptive", "next-generation"
    ],
    writing_principles: {
      tone: "Professional yet conversational, peer-to-peer communication",
      style: "Direct, value-focused, no corporate jargon",
    }
  },
  cold_email_writer: {
    body: { max_words: 90 },
    structure: {
      subject_line: { max_chars: 50 },
      cta: {
        style: "Soft, low-pressure, curiosity-driven",
        examples: [
          "Worth a quick chat?",
          "Curious if this resonates?",
          "Open to exploring this?",
        ]
      }
    }
  },
  tone_variations: {
    professional: { characteristics: "Respectful, data-driven, strategic focus" },
    casual: { characteristics: "Conversational, authentic, peer-to-peer" },
    friendly: { characteristics: "Empathetic, collaborative, solution-oriented" },
    direct: { characteristics: "Concise, clear, efficiency-focused" }
  }
};

/**
 * Build optimized system prompt with research-based personalization
 */
function buildSystemPrompt(companyInfo?: GenerateEmailRequest['companyInfo'], contextJson?: any, campaignContext?: any, leadPersona?: GenerateEmailRequest['leadPersona']): string {
  // If rich context_json is provided (from the new settings), use that as the primary source of truth
  /*
   * LOGIC UPDATE:
   * We now ALWAYS include the core "Elite AI SDR" persona to ensure high-quality baseline writing.
   * If `contextJson` is provided, we append it as a strict framework that overrides specific rules where they conflict,
   * but broadly we want the "intelligence" of the Elite SDR combined with the "knowledge" of the contextJson.
   * 
   * NEW: Lead persona data is now integrated to create pain-point-driven icebreakers and opening lines.
   */

  const corePrinciples = `You are an elite AI SDR writing personalized cold emails based on genuine research and deep audience insights.

████████████████████████████████████████████████████████
🚨 CRITICAL REQUIREMENTS 🚨
████████████████████████████████████████████████████████

RESPONSE FORMAT - MUST BE VALID JSON:
{
  "subject": "subject line here",
  "body": "email body text here"
}

EMAIL STRUCTURE:
- SUBJECT: Specific, max 50 chars, references pain point or opportunity
- BODY: 4-5 sentences max, exactly 85-90 words, NO greeting, NO closing

❌ NEVER INCLUDE IN BODY:
  • "Hi {{name}}," or ANY greeting
  • "Hello" "Hey" "Dear" - any salutation
  • "Best," "Thanks," "Regards" - any closing
  • Signature lines
  • "Sincerely" or formal closing

✓ BODY MUST START WITH:
  1. Pain point observation (specific, concrete)
  2. Understanding statement (show you get it)
  3. Solution suggestion (brief)
  4. Soft CTA (assumes relevance)

YOUR CORE APPROACH:
- Write as if you spent 10+ minutes researching
- Reference specific details showing real attention
- Sound like a peer, not a salesperson
- Every detail must be specific and concrete
- Use pain points as foundation for icebreaker

WRITING RULES:
- Max 90 words in body
- Subject max 50 chars
- One specific observation proving research
- Clear pain point → solution connection
- Soft, confident CTA
- Conversational, calm tone

FORBIDDEN - NEVER EVER USE:
- Greetings or salutations (Hi, Hello, etc)
- Closing phrases (Best, Thanks, Regards)
- "I noticed you're hiring" (too generic)
- "We help companies like yours" (vague)
- "Happy to chat" (desperate)
- "Let me know if interested" (weak)
- Exclamation marks
- Hype language: revolutionary, innovative, synergy, cutting-edge, game-changing, disruptive, best-in-class
- "Agency" language (use "I" not "We")
- Question marks in subject line

✓ EXAMPLE GOOD OUTPUT:
{
  "subject": "Scaling your eng team quickly?",
  "body": "I noticed VP roles at growth-stage companies like yours spend 30% of their time on hiring. That's when building strong ops systems becomes critical. We help teams solve this faster. Worth a quick chat?"
}

NOTE: No greeting, no closing, straight to pain point.
`;

  let deepContextInstructions = '';
  if (contextJson) {
    const contextString = typeof contextJson === 'string'
      ? contextJson
      : JSON.stringify(contextJson, null, 2);

    deepContextInstructions = `\n\n=== CONTEXT & KNOWLEDGE BASE (STRICTLY ADHERE TO THIS FRAMEWORK) ===
${contextString}

CRITICAL INSTRUCTION:
Combine the "Elite SDR" writing style with the specific framework defined above.
If the framework above defines specific forbidden words, structure, or tone, PREFER THOSE over the general defaults.
But maintain the "Elite SDR" quality (research-based, non-salesy, peer-to-peer).
`;
  }

  // Add lead persona insights for pain-point-driven personalization
  let personaInsights = '';
  if (leadPersona) {
    personaInsights = `\n\n=== LEAD PERSONA & PAIN POINTS (USE FOR ICEBREAKER & PERSONALIZATION) ===
${leadPersona.title ? `Professional Title: ${leadPersona.title}` : ''}
${leadPersona.painPoints && leadPersona.painPoints.length > 0 ? `\nKnown Pain Points:\n${leadPersona.painPoints.map((p: string) => `• ${p}`).join('\n')}` : ''}
${leadPersona.priorities && leadPersona.priorities.length > 0 ? `\nBusiness Priorities:\n${leadPersona.priorities.map((p: string) => `• ${p}`).join('\n')}` : ''}
${leadPersona.icebreakerHooks && leadPersona.icebreakerHooks.length > 0 ? `\nIcebreaker Hooks (use these to show genuine understanding):\n${leadPersona.icebreakerHooks.map((h: string) => `• ${h}`).join('\n')}` : ''}
${leadPersona.openingLines && leadPersona.openingLines.length > 0 ? `\nSuggested Opening Lines (adapt these naturally):\n${leadPersona.openingLines.map((o: string) => `• ${o}`).join('\n')}` : ''}

PERSONA USAGE INSTRUCTIONS:
1. Base your icebreaker on ONE of their pain points - show you understand their challenge
2. Reference their priorities to demonstrate research depth
3. Use the icebreaker hooks as inspiration but make them natural and conversational
4. Opening lines can be adapted but must be personalized further for authenticity
5. Every sentence should connect their situation → their pain point → your solution
`;
  }

  // Only add legacy company context if NO deep context was provided
  // Reduced to just Company Name as the detailed fields are no longer available/reliable per user request
  const companyContextStr = (!deepContextInstructions && companyInfo?.companyName)
    ? `\n\nYOUR COMPANY:
- Name: ${companyInfo.companyName}`
    : '';

  const customInstructions = campaignContext
    ? `\n\nCAMPAIGN SPECIFIC INSTRUCTIONS (PRIORITIZE THESE):
${typeof campaignContext === 'string' ? campaignContext : JSON.stringify(campaignContext, null, 2)}`
    : '';

  return `${corePrinciples}${personaInsights}${deepContextInstructions}${companyContextStr}${customInstructions}

OUTPUT FORMAT (JSON ONLY):
{
  "subject": "subject line here",
  "body": "email body (no signature, no salutation)"
}`;
}

/**
 * Build user prompt with research signals and context
 */
function buildUserPrompt(request: GenerateEmailRequest): string {
  const toneDesc = emailTemplates.tone_variations[request.tone as keyof typeof emailTemplates.tone_variations]?.characteristics || 'professional';

  // Build research context - this is what signals "I did my homework"
  let researchContext = '';

  if (request.leadWebsite) {
    researchContext += `\nVISITED THEIR WEBSITE: ${request.leadWebsite}`;
  }

  if (request.leadLinkedIn) {
    researchContext += `\nVISITED THEIR LINKEDIN: ${request.leadLinkedIn}`;
  }

  // Build persona-based context if available
  let personaContext = '';
  if (request.leadPersona) {
    personaContext = `\nPERSONA INSIGHTS FOR PERSONALIZATION:`;
    
    if (request.leadPersona.painPoints && request.leadPersona.painPoints.length > 0) {
      personaContext += `\n- Key Pain Points: ${request.leadPersona.painPoints.slice(0, 2).join(', ')}`;
    }
    
    if (request.leadPersona.priorities && request.leadPersona.priorities.length > 0) {
      personaContext += `\n- Business Priorities: ${request.leadPersona.priorities.slice(0, 2).join(', ')}`;
    }
  }

  const prompt = `🚨 CRITICAL RULES - FOLLOW EXACTLY 🚨

OUTPUT: Valid JSON with subject and body (NO greeting, NO closing in body)

{
  "subject": "Subject referencing pain point (max 50 chars)",
  "body": "Email text - starts with observation, ends with CTA (85-90 words)"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECIPIENT PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Name: {{name}} (use as placeholder)
- Role: ${request.leadPosition}
${request.leadCompany ? `- Company: ${request.leadCompany}` : ''}
- Situation: ${request.leadRequirement}
${researchContext}
${personaContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT LINE RULES (50 chars max):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Specific to their situation
✓ References pain point or opportunity
✓ No question marks or hype
Examples: "Scaling your eng team quickly?", "That tech debt catching up?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL BODY RULES (85-90 words, 4-5 sentences):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NO GREETING - Do NOT start with "Hi {{name}},", "Hello,", "Hey,"
✓ START WITH: Specific pain point observation

1. ICEBREAKER (2 sentences): 
   "I noticed [specific fact about their situation]. That usually means [pain point]."

2. INSIGHT (1 sentence):
   Show you understand their operational reality.

3. SOLUTION (1-2 sentences):
   How your approach helps with that pain point.

4. CTA (1 sentence):
   Soft but confident: "Worth exploring?", "Open to a quick chat?"

❌ NO CLOSING - Do NOT end with "Best,", "Thanks,", "Regards,", signature

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORBIDDEN WORDS/PHRASES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Greetings: Hi, Hello, Hey, Dear
❌ Closings: Best, Thanks, Regards, Sincerely
❌ Hype: revolutionary, innovative, cutting-edge, synergy, game-changing, disruptive
❌ Vague: "Let me know if interested", "Happy to chat", "We help companies like yours"
❌ Generic: "I noticed you're hiring"
❌ Any exclamation marks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFECT EXAMPLE (study this carefully):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "subject": "Scaling your eng team quickly?",
  "body": "I noticed VP roles at growth-stage companies like yours spend 30% of their time on hiring right now. That's when building strong ops systems becomes critical. We help teams solve this. Worth a quick chat?"
}

NOTICE: 
- Subject specific to their pain point
- Body starts immediately (no "Hi name,")
- Pain point → insight → solution → CTA
- Exactly 85-90 words
- Peer tone, no hype
- Ends with CTA (no closing like "Best,")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOW GENERATE THE EMAIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return prompt;
}

/**
 * Call AI provider
 */
async function callAIProvider(
  provider: string,
  systemPrompt: string,
  userPrompt: string,
  providerApiKey?: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  switch (provider) {
    case 'claude':
      return callClaude(messages, systemPrompt, providerApiKey);
    case 'openai':
      return callOpenAI(messages, providerApiKey);
    case 'lovable':
      return callLovable(messages);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function callClaude(messages: any[], systemPrompt: string, providerApiKey?: string): Promise<string> {
  const apiKey = providerApiKey || Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) throw new Error("CLAUDE_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.filter((m: any) => m.role !== 'system'),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(messages: any[], providerApiKey?: string): Promise<string> {
  const apiKey = providerApiKey || Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callLovable(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits depleted. Please add funds to continue.");
    }
    throw new Error(`Lovable API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Parse AI response - STRICT VALIDATION FOR SUBJECT & BODY
 */
function parseEmailResponse(content: string): { subject: string; body: string } {
  try {
    // Try to find JSON object in response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // STRICT VALIDATION
      const subject = parsed.subject?.trim();
      const body = parsed.body?.trim();

      console.log("✅ Successfully parsed JSON response:");
      console.log("   - Subject:", subject?.substring(0, 60) || "[EMPTY - CRITICAL ERROR]");
      console.log("   - Subject length:", subject?.length);
      console.log("   - Body length:", body?.length);

      // If subject is missing or empty, log critical error
      if (!subject) {
        console.error("❌ CRITICAL: Subject is empty or missing from AI response");
        console.error("Full parsed response:", JSON.stringify(parsed, null, 2));
        console.error("Raw content:", content.substring(0, 1000));
      }

      // Validate subject not too long
      if (subject && subject.length > 60) {
        console.warn("⚠️ Subject exceeds 60 chars:", subject.length);
      }

      // Validate body structure (should NOT start with greeting)
      if (body && (body.toLowerCase().startsWith('hi ') || body.toLowerCase().startsWith('hello '))) {
        console.warn("⚠️ Body starts with greeting - violation of CMO rules");
      }

      return {
        subject: subject || "[ERROR: Subject not generated]",
        body: body || content,
      };
    } else {
      console.error("❌ No JSON found in response. AI did not return valid JSON.");
      console.error("Raw response:", content.substring(0, 800));
    }
  } catch (error) {
    console.error("❌ Failed to parse JSON:", error);
    console.error("Raw content:", content.substring(0, 800));
  }

  return {
    subject: "[ERROR: Generation failed]",
    body: content,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: GenerateEmailRequest = await req.json();
    const provider = request.provider || 'openai'; // Default to OpenAI
    const providerApiKey = request.providerApiKey;

    // Log request details
    console.log("📧 Email Generation Request:");
    console.log("  - Lead:", request.leadName, `(${request.leadPosition})`);
    console.log("  - Provider:", provider);

    // Build prompts using refined templates
    const systemPrompt = buildSystemPrompt(request.companyInfo, request.contextJson, request.campaignContext, request.leadPersona);
    const userPrompt = buildUserPrompt(request);

    // DEBUG: Log exact system prompt being sent
    console.log("\n🔍 SYSTEM PROMPT BEING SENT:");
    console.log("=====================================");
    console.log(systemPrompt);
    console.log("=====================================\n");

    // DEBUG: Log user prompt
    console.log("🔍 USER PROMPT BEING SENT:");
    console.log("=====================================");
    console.log(userPrompt);
    console.log("=====================================\n");

    // Call AI provider
    const content = await callAIProvider(provider, systemPrompt, userPrompt, providerApiKey);

    // Parse response
    const emailData = parseEmailResponse(content);

    console.log("✅ Email generated successfully");

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ generate-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
