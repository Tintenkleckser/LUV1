import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token und Passwort sind erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Link' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > resetToken.expires) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: 'Der Link ist abgelaufen. Bitte fordern Sie einen neuen an.' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // Delete all tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email: resetToken.email } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
