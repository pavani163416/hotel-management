/**
 * AthithiGriha Email Service — powered by Resend or SMTP (Nodemailer)
 * Docs: https://resend.com/docs
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";

// Resend client initialization
let _resend;
const getResend = () => {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("📧 [Email] RESEND_API_KEY is missing. Resend fallback is disabled.");
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

// SMTP Transporter initialization
let _transporter;
const getTransporter = () => {
  if (!_transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return null;
    }
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE !== "false", // true for 465, false for 587/other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
};

const FROM = process.env.RESEND_FROM_EMAIL || "AthithiGriha <onboarding@resend.dev>";

/**
 * Resend free plan restriction helper:
 * When using the shared onboarding@resend.dev sender (no custom domain),
 * emails can ONLY be delivered to the account owner's verified email.
 * Set RESEND_TEST_EMAIL in .env to your Resend-verified email to receive all emails in dev.
 * In production with a verified domain, remove RESEND_TEST_EMAIL and emails go to real recipients.
 */
const resolveRecipient = (to) => {
  return [to];
};

/**
 * Internal sender logic helper that handles SMTP routing or Resend fallback.
 */
const sendMailInternal = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  
  if (transporter) {
    console.log(`📧 [Email] Sending email via SMTP (Nodemailer) to: ${to}`);
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || `"AthithiGriha" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 [Email] SMTP Message Sent successfully:", info.messageId);
    return { data: { id: info.messageId }, error: null };
  }

  // Fallback to Resend
  const resendClient = getResend();
  if (!resendClient) {
    throw new Error("No email service configured (missing SMTP or Resend credentials).");
  }
  
  console.log(`📧 [Email] Sending email via Resend to: ${to}`);
  const { data, error } = await resendClient.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject,
    html,
  });
  return { data, error };
};

// ─────────────────────────────────────────────────────────
// sendPasswordResetEmail
// Called when user requests a password reset link
// ─────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  console.log("EMAIL TYPE: Forgot Password");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping password reset email.");
    return;
  }

  console.log(`📧 [Email] Triggering password reset → ${to}`);

  const subject = `Reset your AthithiGriha password`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "AthithiGriha User"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              We received a request to reset your AthithiGriha password. Click the button below to choose a new password.
            </p>
            <p style="text-align:center;margin:0 0 24px;">
              <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;padding:14px 28px;background:#c0392b;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
                Reset Password
              </a>
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.7;">
              If the button does not work, copy and paste this link into your browser:
            </p>
            <p style="margin:0;font-size:12px;color:#4b5563;word-break:break-all;">${resetUrl}</p>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] Password reset send error:", error);
    } else {
      console.log(`📧 [Email] Password reset sent → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending password reset email:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// sendBookingConfirmation
// Called after a successful booking/payment
// ─────────────────────────────────────────────────────────
export const sendBookingConfirmation = async ({
  to,
  guestName,
  hotelName,
  bookingRef,
  checkIn,
  checkOut,
  nights,
  roomType,
  totalAmount,
}) => {
  console.log("EMAIL TYPE: Booking Confirmation");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping confirmation email.");
    return;
  }

  console.log(`📧 [Email] Triggering booking confirmation → ${to}`);

  const fromDate = new Date(checkIn).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
  const toDate = new Date(checkOut).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });

  const subject = `✅ Booking Confirmed — ${hotelName} · ${bookingRef}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#27ae60;padding:20px 40px;text-align:center;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Booking Confirmed</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:left;color:#374151;">
            <p style="margin:0 0 24px;font-size:16px;">Hi <strong>${guestName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
              Your reservation at <strong>${hotelName}</strong> is confirmed. Below are your booking details.
            </p>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr style="background:#f9fafb;">
                <td style="padding:16px;font-size:12px;font-weight:bold;color:#9ca3af;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Booking Reference</td>
                <td style="padding:16px;font-size:14px;font-weight:bold;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${bookingRef}</td>
              </tr>
              <tr>
                <td style="padding:16px;font-size:14px;color:#4b5563;border-bottom:1px solid #e5e7eb;">Check-in</td>
                <td style="padding:16px;font-size:14px;color:#111827;text-align:right;font-weight:500;border-bottom:1px solid #e5e7eb;">${fromDate}</td>
              </tr>
              <tr>
                <td style="padding:16px;font-size:14px;color:#4b5563;border-bottom:1px solid #e5e7eb;">Check-out</td>
                <td style="padding:16px;font-size:14px;color:#111827;text-align:right;font-weight:500;border-bottom:1px solid #e5e7eb;">${toDate}</td>
              </tr>
              <tr>
                <td style="padding:16px;font-size:14px;color:#4b5563;border-bottom:1px solid #e5e7eb;">Nights</td>
                <td style="padding:16px;font-size:14px;color:#111827;text-align:right;font-weight:500;border-bottom:1px solid #e5e7eb;">${nights}</td>
              </tr>
              <tr>
                <td style="padding:16px;font-size:14px;color:#4b5563;border-bottom:1px solid #e5e7eb;">Room Type</td>
                <td style="padding:16px;font-size:14px;color:#111827;text-align:right;font-weight:500;border-bottom:1px solid #e5e7eb;">${roomType}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:16px;font-size:14px;font-weight:bold;color:#111827;">Total Paid</td>
                <td style="padding:16px;font-size:18px;font-weight:bold;color:#27ae60;text-align:right;">$${totalAmount}</td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">Important Information</p>
            <ul style="margin:0;padding-left:20px;font-size:13px;color:#6b7280;line-height:1.7;">
              <li>Please carry a valid government-issued photo ID at check-in.</li>
              <li>Standard check-in time is 2:00 PM, and check-out time is 12:00 PM.</li>
              <li>To manage or cancel your booking, visit your profile in the AthithiGriha app.</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] Booking confirmation send error:", error);
    } else {
      console.log(`📧 [Email] Booking confirmation sent → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending booking confirmation:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// sendCancellationEmail
// Called after a booking is cancelled
// ─────────────────────────────────────────────────────────
export const sendCancellationEmail = async ({
  to,
  guestName,
  hotelName,
  bookingRef,
  reason,
}) => {
  console.log("EMAIL TYPE: Booking Cancellation");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping cancellation email.");
    return;
  }

  console.log(`📧 [Email] Triggering cancellation email → ${to}`);

  const subject = `Booking Cancelled — ${hotelName} · ${bookingRef}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fef2f2;border-bottom:1px solid #fecaca;padding:24px 40px;text-align:center;">
            <h2 style="color:#dc2626;margin:0;font-size:20px;">Booking Cancelled</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${guestName}</strong>,</p>
            <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
              Your booking <strong style="color:#111827;">${bookingRef}</strong> at
              <strong style="color:#111827;">${hotelName}</strong> has been cancelled.
            </p>
            ${reason ? `<p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Reason: <em>${reason}</em></p>` : ""}
            <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6;">
              Your refund will be processed to your original payment method within 5–7 business days.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] Resend API error:", error);
    } else {
      console.log(`📧 [Email] Cancellation sent successfully → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending cancellation:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// sendOtpEmail
// Called when registering or sending verification codes
// ─────────────────────────────────────────────────────────
export const sendOtpEmail = async ({ to, name, otp }) => {
  console.log("EMAIL TYPE: Registration OTP");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.error("📧 [Email] Email service not configured — cannot send OTP email.");
    throw new Error("Email service is not configured (missing SMTP or Resend credentials).");
  }

  console.log("Starting verification email...");
  console.log("Recipient:", to);
  console.log("Generated OTP:", otp);

  const subject = `AthithiGriha Verification Code — ${otp}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "Guest"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              Thank you for registering with AthithiGriha. Please use the verification code below to verify your email address. This code is valid for 5 minutes.
            </p>
            <div style="text-align:center;margin:30px 0;">
              <span style="display:inline-block;padding:12px 30px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:6px;color:#111827;">${otp}</span>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you did not request this verification code, please ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      throw new Error(error.message || "Email delivery failed.");
    }

    console.log("EMAIL SENT SUCCESS:", data);
    return data;
  } catch (err) {
    console.error("EMAIL SEND EXCEPTION:", err);
    throw new Error("Failed to send verification email. Please ensure your email address is correct.");
  }
};

// ─────────────────────────────────────────────────────────
// sendOwnerApprovalEmail
// Called when admin approves an owner application
// ─────────────────────────────────────────────────────────
export const sendOwnerApprovalEmail = async ({ to, name }) => {
  console.log("EMAIL TYPE: Owner Application Approval");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping owner approval email.");
    return;
  }

  console.log(`📧 [Email] Triggering owner approval email → ${to}`);

  const subject = `🎉 Your AthithiGriha Owner Application has been Approved!`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#27ae60;padding:20px 40px;text-align:center;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Application Approved</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "AthithiGriha Partner"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              Congratulations! Your application to become a verified AthithiGriha property partner has been reviewed and **approved** by our administrator.
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              You can now access your **Owner Dashboard** at AthithiGriha and list/manage your hotels and resorts.
            </p>
            <p style="text-align:center;margin:30px 0 24px;">
              <a href="https://hotel-management-frontend-puce.vercel.app/owner-portal" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;padding:14px 28px;background:#1a1f2e;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
                Go to Owner Portal
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] Owner approval send error:", error);
    } else {
      console.log(`📧 [Email] Owner approval email sent → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending owner approval email:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// sendOwnerRejectionEmail
// Called when admin rejects an owner application
// ─────────────────────────────────────────────────────────
export const sendOwnerRejectionEmail = async ({ to, name, reason }) => {
  console.log("EMAIL TYPE: Owner Application Rejection");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping owner rejection email.");
    return;
  }

  console.log(`📧 [Email] Triggering owner rejection email → ${to}`);

  const subject = `Update on your AthithiGriha Owner Application`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#dc2626;padding:20px 40px;text-align:center;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Application Status Update</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "AthithiGriha Partner"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              Thank you for applying to become a verified AthithiGriha property partner. After reviewing your application details and KYC documents, our administrator was **unable to approve** your application at this time.
            </p>
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#b91c1c;">
              <strong>Reason for Rejection:</strong><br/>
              ${reason || "Please verify your uploaded business license or identity proof documents and try again."}
            </div>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              You can re-apply by logging into the **Owner Portal** and submitting updated documents.
            </p>
            <p style="text-align:center;margin:30px 0 24px;">
              <a href="https://hotel-management-frontend-puce.vercel.app/owner-portal" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;padding:14px 28px;background:#1a1f2e;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
                Go to Owner Portal
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] Owner rejection send error:", error);
    } else {
      console.log(`📧 [Email] Owner rejection email sent → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending owner rejection email:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// sendGeneralEmail
// Called when admin broadcasts a general message/newsletter
// ─────────────────────────────────────────────────────────
export const sendGeneralEmail = async ({ to, subject, bodyHtml }) => {
  console.log("EMAIL TYPE: General Broadcast");
  console.log("RECIPIENT:", to);

  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log("📧 [Email] No email service configured — skipping general email.");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">AthithiGriha</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;text-align:left;color:#374151;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
              ${bodyHtml}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AthithiGriha Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    const { data, error } = await sendMailInternal({ to, subject, html });
    if (error) {
      console.error("📧 [Email] General email send error:", error);
    } else {
      console.log(`📧 [Email] General email sent → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending general email:", err.message);
  }
};
