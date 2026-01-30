import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF
const PIXEL = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
    0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
]);

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const logId = url.searchParams.get("id");

        if (logId) {
            // Initialize Supabase client with Service Role Key to bypass RLS
            // We need this because the email recipient is not authenticated
            const supabase = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            // Record the open event
            const { error } = await supabase
                .from("email_logs")
                .update({
                    opened_at: new Date().toISOString(),
                    status: "opened" // Optional: Update status to 'opened' if your schema uses it
                })
                .eq("id", logId)
                .is("opened_at", null); // Only update if not already opened (exclude duplicate opens)

            if (error) {
                console.error("Error updating log:", error);
            }

            // Also mark Lead as "Seen" if not already met/replied
            // Get the lead_id from the log first
            const { data: log } = await supabase
                .from("email_logs")
                .select("lead_id")
                .eq("id", logId)
                .single();

            if (log?.lead_id) {
                // Only update if status is 'Intro Sent' or 'sent'
                // Don't overwrite 'Replied' or 'Meeting'
                const { data: lead } = await supabase
                    .from("leads")
                    .select("status")
                    .eq("id", log.lead_id)
                    .single();

                if (lead && (lead.status === "Intro Sent" || lead.status === "sent")) {
                    await supabase
                        .from("leads")
                        .update({ status: "Seen/Opened" }) // Using a descriptive status
                        .eq("id", log.lead_id);
                }
            }
        }

        // Return the pixel image
        return new Response(PIXEL, {
            headers: {
                "Content-Type": "image/gif",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error("Error in track-email:", error);
        // Return pixel anyway to avoid broken image icon
        return new Response(PIXEL, {
            headers: {
                "Content-Type": "image/gif",
                ...corsHeaders,
            },
        });
    }
});
