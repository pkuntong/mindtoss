"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validateRecipientEmail = (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error("Invalid recipient email address.");
  }
  if (normalizedEmail.endsWith("@mindtoss.local")) {
    throw new Error("Please set a real inbox email in Settings.");
  }
  if (normalizedEmail.endsWith("@privaterelay.appleid.com")) {
    throw new Error("Please use a non-Apple relay inbox email for reliable delivery.");
  }
  return normalizedEmail;
};

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
    const recipientEmail = validateRecipientEmail(args.to);
    const smtp2goApiKey = process.env.SMTP2GO_API_KEY;
    if (!smtp2goApiKey) {
      throw new Error("SMTP2GO_API_KEY is not configured.");
    }

    const emailPayload: Record<string, unknown> = {
      api_key: smtp2goApiKey,
      to: [recipientEmail],
      sender: "noreply@mindtoss.space",
      subject: args.subject,
      html_body: buildHtmlContent(args.type, args.content, args.attachment),
      text_body: args.content,
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

    const result = await response.json().catch(() => null);
    const requestId = result?.request_id;
    const deliveryData =
      (typeof result?.data === "object" && result?.data !== null
        ? (result.data as Record<string, any>)
        : null);
    const failedCount = Number(deliveryData?.failed ?? 0);
    const succeededCount = Number(deliveryData?.succeeded ?? 0);
    const hasDeliveryStats = deliveryData !== null && ("failed" in deliveryData || "succeeded" in deliveryData);

    if (!response.ok || requestId === undefined) {
      throw new Error(result?.message || result?.errors?.[0] || "Failed to send email via SMTP2GO");
    }

    if (hasDeliveryStats && (failedCount > 0 || succeededCount < 1)) {
      const failureMessage =
        result?.message ||
        deliveryData?.failures?.[0]?.reason ||
        deliveryData?.failures?.[0]?.error ||
        result?.errors?.[0];
      throw new Error(failureMessage || "Recipient rejected by email provider.");
    }

    return {
      success: true,
      request_id: requestId,
    };
  },
});
