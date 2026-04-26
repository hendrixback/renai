import { z } from "zod";

/**
 * Password policy for new accounts and password changes.
 *
 * Per Spec_Amendments §B6: 12 chars + at least one uppercase letter,
 * one number, and one special character. Existing pre-policy accounts
 * keep their old passwords (login enforces no policy beyond non-empty),
 * so this only applies to new credentials.
 *
 * The description is kept in sync with the rules so signup / change-
 * password forms can render the requirements without restating them.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

export const PASSWORD_REQUIREMENTS = [
  `At least ${PASSWORD_MIN_LENGTH} characters`,
  "At least one uppercase letter (A–Z)",
  "At least one number (0–9)",
  "At least one special character (e.g. ! @ # $ %)",
] as const;

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .max(PASSWORD_MAX_LENGTH)
  .refine((v) => /[A-Z]/.test(v), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((v) => /[0-9]/.test(v), {
    message: "Password must contain at least one number",
  })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: "Password must contain at least one special character",
  });

/**
 * Returns the list of requirements that the candidate password
 * currently fails. Intended for client-side live feedback — the
 * authoritative validation is the Zod schema above, run server-side.
 */
export type PasswordCheck = {
  ok: boolean;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export function checkPassword(value: string): PasswordCheck {
  const hasMinLength = value.length >= PASSWORD_MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  return {
    ok: hasMinLength && hasUpper && hasNumber && hasSpecial,
    hasMinLength,
    hasUpper,
    hasNumber,
    hasSpecial,
  };
}
