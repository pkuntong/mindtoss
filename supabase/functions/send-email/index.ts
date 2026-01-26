import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  type: "text" | "voice" | "photo";
  attachment?: {
    filename: string;
    content: string; // base64
    contentType: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, content, type, attachment }: EmailRequest = await req.json();

    if (!to || !subject) {
      throw new Error("Missing required fields: to, subject");
    }

    // Build email HTML
    let htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); padding: 20px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">MindToss</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your thought has arrived!</p>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px;">
    `;

    if (type === "text") {
      htmlContent += `
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #FF6B35;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">${content.replace(/\n/g, "<br>")}</p>
        </div>
      `;
    } else if (type === "voice") {
      htmlContent += `
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #FF6B35;">
          <p style="margin: 0; font-size: 14px; color: #666;">🎙️ Voice memo attached</p>
          <p style="margin: 8px 0 0 0; font-size: 16px; color: #333;">${content}</p>
        </div>
      `;
    } else if (type === "photo") {
      htmlContent += `
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #FF6B35;">
          <p style="margin: 0; font-size: 14px; color: #666;">📷 Photo attached</p>
          ${attachment ? `<img src="cid:attachment" style="max-width: 100%; border-radius: 8px; margin-top: 12px;" />` : ""}
          ${content ? `<p style="margin: 12px 0 0 0; font-size: 16px; color: #333;">${content}</p>` : ""}
        </div>
      `;
    }

    htmlContent += `
          <p style="margin: 24px 0 0 0; font-size: 12px; color: #999; text-align: center;">
            Sent from MindToss • ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    // Build Resend request
    // Use test email since it doesn't require domain verification
    // For production, set up a verified domain in Resend and change this to your domain
    const emailPayload: any = {
      from: "noreply@resend.dev",
      to: [to],
      subject: subject,
      html: htmlContent,
      reply_to: to, // Let users reply back to themselves
    };

    // Add attachment if present
    if (attachment) {
      emailPayload.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
        },
      ];
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
