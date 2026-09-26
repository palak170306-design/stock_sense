import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api/http";
import { hashOtp, OTP_TTL_MS } from "@/lib/auth/password";
import { forgotPasswordSchema } from "@/lib/auth/validation";

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Generates a 6-digit OTP valid for 10 minutes. Only its bcrypt hash is
 * stored; requesting a new code replaces the old one and resets the attempt
 * counter.
 *
 * The response is identical whether or not the email exists, so this
 * endpoint can't be used to discover registered accounts.
 */
export async function POST(req: Request) {
  const { data, response } = await parseBody(req, forgotPasswordSchema);
  if (response) return response;

  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (user) {
    // crypto.randomInt is cryptographically secure (Math.random is not).
    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: await hashOtp(otp),
        otpExpiry: new Date(Date.now() + OTP_TTL_MS),
        otpAttempts: 0,
      },
    });

    // TODO: email the OTP to the user instead of logging it.
    console.log(`[auth] Password reset OTP for ${user.email}: ${otp} (valid 10 min)`);
  }

  return NextResponse.json({
    message: "If an account exists for that email, a reset code has been sent.",
  });
}
