/**
 * LuxeStay Email Service — powered by Resend
 * Docs: https://resend.com/docs
 *
 * Free plan: 100 emails/day, 3000/month
 * NOTE: On free plan, emails can only be sent to your own verified email address
 *       unless you verify a custom domain in Resend dashboard.
 */

import { Resend } from "resend";

let _resend;
const getResend = () => {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("📧 [Email] RESEND_API_KEY is missing. Email service will be disabled.");
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const FROM = process.env.RESEND_FROM_EMAIL || "LuxeStay <onboarding@resend.dev>";

/**
 * Resend free plan restriction:
 * When using the shared onboarding@resend.dev sender (no custom domain),
 * emails can ONLY be delivered to the account owner's verified email.
 * Set RESEND_TEST_EMAIL in .env to your Resend-verified email to receive all emails in dev.
 * In production with a verified domain, remove RESEND_TEST_EMAIL and emails go to real recipients.
 */
const resolveRecipient = (to) => {
  if (process.env.RESEND_TEST_EMAIL) {
    console.log(`📧 [Email] Redirecting to test email: ${process.env.RESEND_TEST_EMAIL}`);
    return [process.env.RESEND_TEST_EMAIL];
  }
  return [to];
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [Email] RESEND_API_KEY not set — skipping password reset email.");
    return;
  }

  console.log(`📧 [Email] Triggering password reset → ${to}`);

  try {
    const resendClient = getResend();
    if (!resendClient) return;

    const { data, error } = await resendClient.emails.send({
      from:    FROM,
      to:      resolveRecipient(to),
      subject: `Reset your LuxeStay password`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">LuxeStay</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "LuxeStay User"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              We received a request to reset your LuxeStay password. Click the button below to choose a new password.
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
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 LuxeStay Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("📧 [Email] Resend API error:", error);
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
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [Email] RESEND_API_KEY not set — skipping confirmation email.");
    return;
  }

  console.log(`📧 [Email] Triggering booking confirmation → ${to}`);

  const fromDate = new Date(checkIn).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
  const toDate = new Date(checkOut).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });

  try {
    const resendClient = getResend();
    if (!resendClient) return;

    const { data, error } = await resendClient.emails.send({
      from:    FROM,
      to:      resolveRecipient(to),
      subject: `✅ Booking Confirmed — ${hotelName} · ${bookingRef}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">LuxeStay</h1>
              <p style="color:rgba(255,255,255,0.45);margin:6px 0 0;font-size:13px;">Premium Hotel Reservations</p>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:24px 40px;text-align:center;">
              <div style="display:inline-block;background:#22c55e;border-radius:50%;width:52px;height:52px;line-height:52px;text-align:center;font-size:26px;color:#fff;margin-bottom:12px;">✓</div>
              <h2 style="color:#15803d;margin:0;font-size:22px;font-weight:700;">Booking Confirmed!</h2>
              <p style="color:#166534;margin:6px 0 0;font-size:14px;">Your reservation is secured. See you soon!</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hi <strong>${guestName}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Your reservation at <strong style="color:#111827;">${hotelName}</strong> has been confirmed.
                Here's a summary of your booking:
              </p>
            </td>
          </tr>

          <!-- Booking Details Card -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr style="background:#f3f4f6;">
                  <td colspan="2" style="padding:14px 20px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">
                    Booking Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;width:45%;">Booking ID</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;font-weight:700;border-top:1px solid #e5e7eb;">${bookingRef}</td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Hotel</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">${hotelName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Room Type</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;border-top:1px solid #e5e7eb;">${roomType}</td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Check-in</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;border-top:1px solid #e5e7eb;">${fromDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Check-out</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;border-top:1px solid #e5e7eb;">${toDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Duration</td>
                  <td style="padding:12px 20px;color:#111827;font-size:13px;border-top:1px solid #e5e7eb;">${nights} night${nights !== 1 ? "s" : ""}</td>
                </tr>
                <tr style="background:#f0fdf4;">
                  <td style="padding:16px 20px;color:#15803d;font-size:15px;font-weight:700;border-top:2px solid #bbf7d0;">Total Paid</td>
                  <td style="padding:16px 20px;color:#15803d;font-size:20px;font-weight:800;border-top:2px solid #bbf7d0;">$${Number(totalAmount).toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Help note -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
                Questions? Reply to this email or contact our 24/7 concierge team.
                We look forward to welcoming you!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                © 2026 LuxeStay Hospitality. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("📧 [Email] Resend API error:", error);
    } else {
      console.log(`📧 [Email] Confirmation sent successfully → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending confirmation:", err.message);
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
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [Email] RESEND_API_KEY not set — skipping cancellation email.");
    return;
  }

  console.log(`📧 [Email] Triggering cancellation email → ${to}`);

  try {
    const resendClient = getResend();
    if (!resendClient) return;

    const { data, error } = await resendClient.emails.send({
      from:    FROM,
      to:      resolveRecipient(to),
      subject: `Booking Cancelled — ${hotelName} · ${bookingRef}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1f2e;padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">LuxeStay</h1>
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
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 LuxeStay Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("📧 [Email] Resend API error:", error);
    } else {
      console.log(`📧 [Email] Cancellation sent successfully → ${to} | ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("📧 [Email] Exception sending cancellation:", err.message);
  }
};

export const sendOtpEmail = async ({ to, name, otp }) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("📧 [Email] RESEND_API_KEY not set — cannot send OTP email.");
    throw new Error("Email service is not configured (missing API key).");
  }

  console.log("Starting verification email...");
  console.log("Recipient:", to);
  console.log("Generated OTP:", otp);

  try {
    const resendClient = getResend();
    if (!resendClient) {
      throw new Error("Failed to initialize Resend client.");
    }

    const { data, error } = await resendClient.emails.send({
      from:    FROM,
      to:      resolveRecipient(to),
      subject: `LuxeStay Verification Code — ${otp}`,
      html: `
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
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">LuxeStay</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:left;color:#374151;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${name || "Guest"}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
              Thank you for registering with LuxeStay. Please use the verification code below to verify your email address. This code is valid for 5 minutes.
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
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 LuxeStay Hospitality. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("EMAIL SEND ERROR:", error);
      throw new Error(error.message || "Failed to send verification email via Resend.");
    }

    console.log("EMAIL SENT SUCCESS:", data);
    return data;
  } catch (err) {
    console.error("EMAIL SEND ERROR:", err);
    throw err;
  }
};
