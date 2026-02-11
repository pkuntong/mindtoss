import { v } from "convex/values";
import { action } from "./_generated/server";

const buildHtmlContent = (
  type: "text" | "voice" | "photo",
  content: string,
  attachment?: { filename: string; content: string; contentType: string },
) => {
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
  } else {
    htmlContent += `
      <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #FF6B35;">
        <p style="margin: 0; font-size: 14px; color: #666;">📷 Photo attached</p>
        ${attachment ? '<img src="cid:photo" style="max-width: 100%; border-radius: 8px; margin-top: 12px;" />' : ""}
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

  return htmlContent;
};

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("voice"), v.literal("photo")),
    attachment: v.optional(
      v.object({
        filename: v.string(),
        content: v.string(),
        contentType: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const smtp2goApiKey = process.env.SMTP2GO_API_KEY;
    if (!smtp2goApiKey) {
      throw new Error("SMTP2GO_API_KEY is not configured.");
    }

    const emailPayload: Record<string, unknown> = {
      api_key: smtp2goApiKey,
      to: [args.to],
      sender: "noreply@mindtoss.space",
      subject: args.subject,
      html_body: buildHtmlContent(args.type, args.content, args.attachment),
    };

    if (args.attachment) {
      emailPayload.attachments = [
        {
          filename: args.attachment.filename,
          fileblob: args.attachment.content,
          mimetype: args.attachment.contentType,
        },
      ];
    }

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok || result.request_id === undefined) {
      throw new Error(result.message || result.errors?.[0] || "Failed to send email via SMTP2GO");
    }

    return {
      success: true,
      request_id: result.request_id,
    };
  },
});
