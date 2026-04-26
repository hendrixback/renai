"use client";

import { CheckIcon, MinusIcon } from "lucide-react";

import {
  PASSWORD_MIN_LENGTH,
  checkPassword,
} from "@/lib/auth/password-policy";

/**
 * Live checklist of the password policy requirements. Renders a row
 * per rule with a state icon (neutral / met). Pure UI — driven entirely
 * by the controlled value passed in. The server-side `passwordSchema`
 * is the authority; this is just to spare users a round-trip.
 */
export function PasswordRequirements({ value }: { value: string }) {
  const c = checkPassword(value);
  const items = [
    { ok: c.hasMinLength, label: `At least ${PASSWORD_MIN_LENGTH} characters` },
    { ok: c.hasUpper, label: "One uppercase letter (A–Z)" },
    { ok: c.hasNumber, label: "One number (0–9)" },
    { ok: c.hasSpecial, label: "One special character (e.g. ! @ # $ %)" },
  ];

  return (
    <ul className="text-muted-foreground mt-1 space-y-1 text-xs">
      {items.map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-2 ${
            item.ok ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {item.ok ? (
            <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <MinusIcon className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
