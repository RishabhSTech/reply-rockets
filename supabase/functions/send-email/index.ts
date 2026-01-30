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
    const { leadId, toEmail, subject, body }: SendEmailRequest = await req.json();

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (smtpError || !smtpSettings) {
      return new Response(
        JSON.stringify({ error: "SMTP settings not configured. Please set up your SMTP in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get warmup settings
    const { data: warmupSettings } = await supabase
      .from("warmup_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Check daily limit if warmup is enabled
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
          JSON.stringify({ error: `Daily limit of ${warmupSettings.current_daily_limit} emails reached. Limit will increase tomorrow.` }),
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
    const emailBody = body || generateEmailBody(lead, smtpSettings.from_name);

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

    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: toEmail,
      subject: emailSubject,
      content: emailBody,
      html: emailBody.replace(/\n/g, "<br>"),
    });

    await client.close();

    // Log the email
    await supabase.from("email_logs").insert({
      user_id: userId,
      lead_id: leadId,
      to_email: toEmail,
      subject: emailSubject,
      body: emailBody,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Update lead status
    if (lead) {
      await supabase
        .from("leads")
        .update({ status: "sent" })
        .eq("id", leadId);
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

function generateEmailBody(lead: any, senderName: string): string {
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
