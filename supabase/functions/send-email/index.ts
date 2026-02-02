import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  leadId: string;
  toEmail: string;
  subject?: string;
  body?: string;
  campaignId?: string;
}

interface Lead {
  name: string;
  position: string;
  requirement?: string;
}

// Cache SMTP settings for 5 minutes to reduce database queries
const settingsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSettings(userId: string) {
  const cached = settingsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedSettings(userId: string, data: any) {
  settingsCache.set(userId, { data, timestamp: Date.now() });
}

/**
 * Converts Markdown-style formatting to HTML
 * Supports: **bold**, *italic*, bullets (•), and numbered lists
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert **bold** to <strong> (handle multiple words properly)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* to <em> (handle single words)
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Convert bullet points • to list items with styling
  html = html.replace(/^•\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: disc; margin-bottom: 8px;\">$1</li>");

  // Convert numbered lists (1. 2. etc) to list items with styling
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li style=\"margin-left: 20px; list-style: decimal; margin-bottom: 8px;\">$1</li>");

  return html;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    let { leadId, toEmail, subject, body, campaignId }: SendEmailRequest = await req.json();
    
    console.log("📥 send-email received request with campaignId:", campaignId, "leadId:", leadId);
    console.log("🔍 campaignId is:", campaignId ? `"${campaignId}"` : "UNDEFINED/NULL");

    // Get SMTP settings (with cache)
    let smtpSettings = getCachedSettings(`smtp_${userId}`);
    if (!smtpSettings) {
      const { data, error: smtpError } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (smtpError || !data) {
        return new Response(
          JSON.stringify({ error: "SMTP settings not configured. Please set up your SMTP in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      smtpSettings = data;
      setCachedSettings(`smtp_${userId}`, smtpSettings);
    }

    // Get warmup settings (with cache)
    let warmupSettings = getCachedSettings(`warmup_${userId}`);
    if (!warmupSettings) {
      const { data } = await supabase
        .from("warmup_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setCachedSettings(`warmup_${userId}`, data);
        warmupSettings = data;
      }
    }

    // Check daily limit and send window (if warmup enabled)
    if (warmupSettings?.enabled) {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "sent")
        .gte("sent_at", `${today}T00:00:00Z`);

      if ((count || 0) >= warmupSettings.current_daily_limit) {
        return new Response(
          JSON.stringify({ error: `Daily limit of ${warmupSettings.current_daily_limit} emails reached.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check send window
      const now = new Date();
      const hour = now.getUTCHours();
      if (hour < warmupSettings.send_window_start || hour >= warmupSettings.send_window_end) {
        return new Response(
          JSON.stringify({ error: `Emails can only be sent between ${warmupSettings.send_window_start}:00 and ${warmupSettings.send_window_end}:00 ${warmupSettings.timezone}` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    // Generate email content if not provided
    const emailSubject = subject || `Quick question for ${lead?.name || "you"}`;
    let emailBody = body || generateEmailBody(lead, smtpSettings.from_name);

    // ✅ Ensure proper signature handling - NO DUPLICATES
    // Check for any salutation (Best, Thanks, Regards, Looking forward, etc)
    const trimmedBody = emailBody.trim();
    const hasSalutation = /\n(Best|Thanks|Regards|Sincerely|Kind regards|Cheers|Looking forward)[,.\s]/i.test(trimmedBody);
    const hasSenderName = trimmedBody.includes(smtpSettings.from_name);
    
    // Only add signature if neither salutation nor sender name present
    if (body && !hasSalutation && !hasSenderName) {
      emailBody = trimmedBody + `\n\nBest,\n${smtpSettings.from_name}`;
    }
    
    console.log(`✅ Email body prepared for ${lead?.name || "lead"}:`);
    console.log(`   - Has salutation: ${hasSalutation}`);
    console.log(`   - Has sender name: ${hasSenderName}`);
    console.log(`   - Body length: ${emailBody.length} chars`);

    // 1. Insert log first with 'pending' status to get the ID
    console.log("📝 About to insert email_log with campaign_id:", campaignId);
    const { data: logEntry, error: logError } = await supabase.from("email_logs").insert({
      user_id: userId,
      lead_id: leadId,
      campaign_id: campaignId || null, // Capture campaignId
      to_email: toEmail,
      subject: emailSubject,
      body: emailBody, // We store original body without pixel
      status: "pending",
      sent_at: new Date().toISOString(),
    }).select().single();

    if (logError || !logEntry) {
      console.error("❌ Failed to create log entry:", logError);
      throw new Error("Failed to initialize email tracking");
    }
    
    console.log("✅ Email log created with id:", logEntry.id, "and campaign_id:", logEntry.campaign_id);
    
    // VERIFY: Make sure campaign_id was actually saved
    if (campaignId && !logEntry.campaign_id) {
      console.error("❌ WARNING: campaignId was passed as", campaignId, "but email_log has campaign_id as", logEntry.campaign_id);
    }

    // 2. Append tracking pixel and wrap links for click tracking
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    // Build tracking pixel URL
    const trackingUrlObj = new URL(`${supabaseUrl}/functions/v1/track-email`);
    trackingUrlObj.searchParams.set("id", logEntry.id);
    const trackingUrl = trackingUrlObj.toString();

    // Ensure tracking pixel is properly formed and will be loaded
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block;border:0;" />`;

    // Wrap all links in the email body with click tracking
    const wrapLinksWithTracking = (text: string, emailLogId: string): string => {
      // Match URLs in the text (http/https)
      const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
      return text.replace(urlRegex, (url) => {
        const clickTrackUrl = new URL(`${supabaseUrl}/functions/v1/track-click`);
        clickTrackUrl.searchParams.set("id", emailLogId);
        clickTrackUrl.searchParams.set("url", encodeURIComponent(url));
        return clickTrackUrl.toString();
      });
    };

    // Apply click tracking to the email body
    const bodyWithTrackedLinks = wrapLinksWithTracking(emailBody, logEntry.id);

    // Convert Markdown formatting to HTML (bold, italic, bullets, lists)
    const formattedBody = markdownToHtml(bodyWithTrackedLinks);

    // Convert newlines to BR and wrap in proper HTML structure
    // Separate pixel in its own div to ensure it loads
    const bodyWithBreaks = formattedBody.replace(/\n/g, "<br />");
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div>${bodyWithBreaks}</div>
<div style="height:1px;overflow:hidden;">${trackingPixel}</div>
</body>
</html>`;
    
    console.log(`✅ Tracking pixel appended for email_log: ${logEntry.id}`);
    console.log(`📍 Tracking URL: ${trackingUrl}`);
    console.log(`🔗 Links wrapped for click tracking`);
    console.log(`📧 HTML Body includes tracking:`, htmlBody.includes('track-email'));
    console.log(`📧 HTML Body includes click tracking:`, htmlBody.includes('track-click'));

    // Send email via SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.port === 465,
        auth: {
          username: smtpSettings.username,
          password: smtpSettings.password,
        },
      },
    });

    console.log(`📨 About to send email with HTML body length: ${htmlBody.length}`);

    try {
      await client.send({
        from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
        to: toEmail,
        subject: emailSubject,
        content: emailBody, // Plain text version
        html: htmlBody, // HTML version with pixel
      });

      console.log(`✅ Email sent successfully to ${toEmail}`);

      await client.close();

      // 3. Update log to 'sent'
      await supabase.from("email_logs").update({
        status: "sent"
      }).eq("id", logEntry.id);

      // Update lead status
      if (lead) {
        await supabase
          .from("leads")
          .update({ status: "Intro Sent" })
          .eq("id", leadId);
      }
    } catch (sendError) {
      // Update log to 'failed'
      await supabase.from("email_logs").update({
        status: "failed",
        error_message: (sendError as Error).message
      }).eq("id", logEntry.id);

      throw sendError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateEmailBody(lead: Lead | null, senderName: string): string {
  if (!lead) {
    return `Hi,

I came across your profile and thought you might be interested in what we're building.

Worth a quick chat?

Best,
${senderName}`;
  }

  return `Hi ${lead.name.split(" ")[0]},

Noticed you're ${lead.position}${lead.requirement ? ` and ${lead.requirement.toLowerCase()}` : ""}.

We help teams like yours scale their outreach without adding headcount. Curious if that resonates?

Worth a 15-min chat this week?

Best,
${senderName}`;
}
