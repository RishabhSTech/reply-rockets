import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const logId = url.searchParams.get("id");
        const targetUrl = url.searchParams.get("url");

        if (!targetUrl) {
            return new Response("Missing target URL", { status: 400 });
        }

        // Decode the target URL
        const decodedUrl = decodeURIComponent(targetUrl);

        if (logId) {
            // Initialize Supabase client with Service Role Key to bypass RLS
            const supabase = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            // Record the click event
            const { error } = await supabase
                .from("email_logs")
                .update({
                    clicked_at: new Date().toISOString(),
                    status: "clicked"
                })
                .eq("id", logId)
                .is("clicked_at", null); // Only update if not already clicked

            if (error) {
                console.error("Error updating click:", error);
            } else {
                console.log(`✅ Click tracked for email_log: ${logId}`);
            }

            // Also update lead status if applicable
            const { data: log } = await supabase
                .from("email_logs")
                .select("lead_id")
                .eq("id", logId)
                .single();

            if (log?.lead_id) {
                // Only update if status is not already 'Replied' or 'Meeting'
                const { data: lead } = await supabase
                    .from("leads")
                    .select("status")
                    .eq("id", log.lead_id)
                    .single();

                if (lead && !["Replied", "Meeting", "Won", "Lost"].includes(lead.status)) {
                    await supabase
                        .from("leads")
                        .update({ status: "Clicked" })
                        .eq("id", log.lead_id);
                }
            }
        }

        // Redirect to the target URL
        return new Response(null, {
            status: 302,
            headers: {
                "Location": decodedUrl,
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error("Error in track-click:", error);
        // Still try to redirect even if tracking fails
        const url = new URL(req.url);
        const targetUrl = url.searchParams.get("url");
        if (targetUrl) {
            return new Response(null, {
                status: 302,
                headers: {
                    "Location": decodeURIComponent(targetUrl),
                    ...corsHeaders,
                },
            });
        }
        return new Response("Error processing click", { status: 500 });
    }
});
