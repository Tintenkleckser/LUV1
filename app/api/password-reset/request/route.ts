import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save the token
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires,
      },
    });

    // Build the reset link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email via provider-agnostic helper (Resend on Vercel, Abacus.AI on Abacus hosting)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0;">
          <h2 style="color: #333;">Passwort zurücksetzen</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 16px 0; color: #333;">Hallo,</p>
          <p style="margin: 0 0 16px 0; color: #333;">Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Neues Passwort festlegen</a>
          </div>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Oder kopieren Sie diesen Link in Ihren Browser:</p>
          <p style="margin: 0 0 16px 0; color: #2563eb; font-size: 14px; word-break: break-all;">${resetLink}</p>
          <p style="margin: 0; color: #999; font-size: 13px;">Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
        </div>
      </div>
    `;

    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail({
      to: user.email,
      subject: 'Passwort zurücksetzen – Kompetenzeinschätzung nach LuV',
      html: htmlBody,
    });

    if (!result.success) {
      console.error('Failed to send password reset email:', result.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
