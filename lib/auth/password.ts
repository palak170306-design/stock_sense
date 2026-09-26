import bcrypt from "bcryptjs";

// Cost factor: ~250ms per hash on typical hardware — slow enough to make
// offline guessing expensive, fast enough for a login request.
const BCRYPT_ROUNDS = 12;

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compare a password against a stored hash. When the user doesn't exist
 * (`hash` is undefined) we still run a full bcrypt comparison against a
 * throwaway hash, so "unknown email" and "wrong password" take the same time
 * and response timing can't reveal which emails are registered.
 */
export async function verifyPassword(
  plain: string,
  hash: string | undefined
): Promise<boolean> {
  if (hash) return bcrypt.compare(plain, hash);
  dummyHash ??= bcrypt.hash("timing-equaliser", BCRYPT_ROUNDS);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}

// OTPs are short-lived and rate-limited, so a lower cost is fine.
export function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
