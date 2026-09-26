import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api/http";
import { hashPassword, MAX_OTP_ATTEMPTS, verifyOtp } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/auth/validation";

const INVALID = "Invalid or expired code";

/**
 * POST /api/auth/reset-password  { email, otp, newPassword }
 *
 * Checks the OTP against the stored hash and its expiry, then sets the new
 * password and clears the OTP so it can't be reused.
 *
 * After 5 guesses the code is burned and the user must request a new one;
 * without a cap, all 1,000,000 codes are guessable within the 10-minute window.
 */
export async function POST(req: Request) {
  const { data, response } = await parseBody(req, resetPasswordSchema);
  if (response) return response;

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user?.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    return jsonError(INVALID, 400);
  }

  // Consume an attempt BEFORE checking the code, atomically: the conditional
  // update only succeeds while attempts remain, so firing many requests in
  // parallel can't sneak extra guesses past the limit.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, otpAttempts: { lt: MAX_OTP_ATTEMPTS } },
    data: { otpAttempts: { increment: 1 } },
  });
  if (count === 0) {
    return jsonError("Too many attempts. Request a new code.", 429);
  }

  if (!(await verifyOtp(data.otp, user.otp))) {
    return jsonError(INVALID, 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(data.newPassword),
      otp: null,
      otpExpiry: null,
      otpAttempts: 0,
      // Log out every existing session (e.g. an attacker's) on reset.
      sessionVersion: { increment: 1 },
    },
  });

  return NextResponse.json({ message: "Password updated. You can now log in." });
}
