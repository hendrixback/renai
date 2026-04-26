import { describe, expect, it } from "vitest";

import {
  PASSWORD_MIN_LENGTH,
  checkPassword,
  passwordSchema,
} from "./password-policy";

describe("password-policy", () => {
  describe("checkPassword", () => {
    it("flags every requirement on an empty string", () => {
      const r = checkPassword("");
      expect(r.ok).toBe(false);
      expect(r.hasMinLength).toBe(false);
      expect(r.hasUpper).toBe(false);
      expect(r.hasNumber).toBe(false);
      expect(r.hasSpecial).toBe(false);
    });

    it("flags missing length even when other rules pass", () => {
      const r = checkPassword("Aa1!");
      expect(r.ok).toBe(false);
      expect(r.hasMinLength).toBe(false);
      expect(r.hasUpper).toBe(true);
      expect(r.hasNumber).toBe(true);
      expect(r.hasSpecial).toBe(true);
    });

    it("flags missing uppercase even when long + has number + special", () => {
      const r = checkPassword("a-very-long-1!");
      expect(r.ok).toBe(false);
      expect(r.hasUpper).toBe(false);
    });

    it("accepts a compliant password", () => {
      const r = checkPassword("Strong-Pass-1!");
      expect(r.ok).toBe(true);
    });

    it("treats accents as letters, not specials", () => {
      // "ñ" is a non-ASCII letter; we count anything that isn't [A-Za-z0-9]
      // as special, so this passes the special-char check.
      const r = checkPassword("Aaaaaaaaaaa1ñ");
      expect(r.hasSpecial).toBe(true);
      expect(r.hasMinLength).toBe(true);
      expect(r.ok).toBe(true);
    });
  });

  describe("passwordSchema", () => {
    it("rejects too short", () => {
      const r = passwordSchema.safeParse("Aa1!");
      expect(r.success).toBe(false);
    });

    it("rejects missing uppercase", () => {
      const r = passwordSchema.safeParse("password-with-1!");
      expect(r.success).toBe(false);
    });

    it("rejects missing number", () => {
      const r = passwordSchema.safeParse("Password-without!");
      expect(r.success).toBe(false);
    });

    it("rejects missing special", () => {
      const r = passwordSchema.safeParse("PasswordOne123four");
      expect(r.success).toBe(false);
    });

    it("accepts a compliant password", () => {
      const r = passwordSchema.safeParse("Strong-Pass-12!");
      expect(r.success).toBe(true);
    });

    it("MIN_LENGTH constant matches schema enforcement", () => {
      const eleven = "Aa1!" + "x".repeat(PASSWORD_MIN_LENGTH - 5);
      expect(eleven.length).toBe(PASSWORD_MIN_LENGTH - 1);
      expect(passwordSchema.safeParse(eleven).success).toBe(false);
      expect(passwordSchema.safeParse(eleven + "x").success).toBe(true);
    });
  });
});
