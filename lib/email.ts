/**
 * Provider-agnostic email helper.
 * Supports Abacus.AI Notification API (default on Abacus hosting)
 * and Resend (for Vercel or self-hosting).
 *
 * Environment variables:
 *   RESEND_API_KEY              – If set, uses Resend
 *   RESEND_FROM_EMAIL           – Sender address for Resend (default: noreply@resend.dev)
 *   ABACUSAI_API_KEY            – Abacus deployment token (fallback)
 *   WEB_APP_ID                  – Abacus app ID (fallback)
 *   NOTIF_ID_PASSWORT_ZURCKSETZEN – Abacus notification ID (fallback)
 */

import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  // If RESEND_API_KEY is set, use Resend
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(options);
  }

  // Fallback to Abacus.AI Notification API
  return sendViaAbacus(options);
}

async function sendViaResend(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Kompetenzeinschätzung <noreply@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Resend send error:', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}

async function sendViaAbacus(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const appUrl = process.env.NEXTAUTH_URL || '';
    let appName = 'Kompetenzeinschätzung';
    let senderEmail = 'noreply@mail.abacusai.app';
    try {
      const hostname = new URL(appUrl).hostname;
      appName = hostname.split('.')[0] || appName;
      senderEmail = `noreply@${hostname}`;
    } catch {}

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_PASSWORT_ZURCKSETZEN,
        subject: options.subject,
        body: options.html,
        is_html: true,
        recipient_email: options.to,
        sender_email: senderEmail,
        sender_alias: appName,
      }),
    });

    const result = await response.json();
    if (!result.success && !result.notification_disabled) {
      console.error('Abacus notification API error:', result);
      return { success: false, error: JSON.stringify(result) };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Abacus email error:', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}
