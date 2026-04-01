import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600_000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1e2d3d;padding:24px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">Taskli</h1>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Password Reset</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 16px;">We received a request to reset the password for your Taskli account associated with <strong>${email}</strong>.</p>
      <p style="color:#374151;margin:0 0 24px;">Click the button below to choose a new password. This link expires in 1 hour.</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${resetUrl}" style="display:inline-block;background:#4caf50;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:500;font-size:15px;">
          Reset Password
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    </div>
  </div>
</body>
</html>`;

    const bodyText = `Reset your Taskli password\n\nWe received a request to reset the password for ${email}.\n\nClick here to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;

    if (process.env.RESEND_API_KEY && process.env.DEV_MAIL !== "true") {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Taskli <hello@daily.taskli.co>",
        to: email,
        subject: "Reset your Taskli password",
        html: bodyHtml,
        text: bodyText,
      });
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("[DEV MAIL] Password reset email");
      console.log(`To: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log("=".repeat(60) + "\n");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
