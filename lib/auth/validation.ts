import { z } from "zod";

// Shared input schemas for the auth route handlers. Emails are normalised to
// lowercase so "Bob@X.com" and "bob@x.com" are the same account.

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt only hashes the first 72 bytes; reject longer input rather than
  // silently ignoring the tail.
  .max(72, "Password must be at most 72 characters");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: password,
});


export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: password,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });
