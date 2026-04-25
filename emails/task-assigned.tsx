import { Section, Text } from "@react-email/components";
import * as React from "react";

import {
  EmailLayout,
  PrimaryButton,
  baseStyles,
  captionStyle,
  headingStyle,
  paragraphStyle,
  tokens,
} from "./_components";

export type TaskAssignedEmailProps = {
  assigneeName: string | null;
  assignerName: string | null;
  taskTitle: string;
  taskDescription: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Date | null;
  taskUrl: string;
  companyName: string;
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const PRIORITY_LABELS: Record<TaskAssignedEmailProps["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const PRIORITY_BADGE: Record<
  TaskAssignedEmailProps["priority"],
  { bg: string; fg: string }
> = {
  LOW: { bg: "#eef0f3", fg: "#475569" },
  MEDIUM: { bg: "#dbeafe", fg: "#1e40af" },
  HIGH: { bg: "#fde68a", fg: "#92400e" },
  CRITICAL: { bg: "#fecaca", fg: "#991b1b" },
};

export default function TaskAssignedEmail({
  assigneeName,
  assignerName,
  taskTitle,
  taskDescription,
  priority,
  dueDate,
  taskUrl,
  companyName,
}: TaskAssignedEmailProps) {
  const assignerLabel = assignerName ?? "An admin";
  const greetingName = assigneeName?.split(" ")[0] ?? "there";
  const badge = PRIORITY_BADGE[priority];

  return (
    <EmailLayout
      preview={`${assignerLabel} assigned you "${taskTitle}" on RenAI`}
    >
      <Section style={baseStyles.contentSection}>
        <Text style={headingStyle}>New task assigned</Text>
        <Text style={paragraphStyle}>
          Hi {greetingName}, {assignerLabel} assigned you a task in{" "}
          <strong>{companyName}</strong>.
        </Text>

        <Section
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: tokens.colors.accentSoft,
            borderRadius: tokens.radius.chip,
            border: `1px solid ${tokens.colors.borderSoft}`,
          }}
        >
          {/* Priority chip */}
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            style={{ borderCollapse: "collapse", marginBottom: "10px" }}
          >
            <tr>
              <td
                style={{
                  backgroundColor: badge.bg,
                  borderRadius: "999px",
                  padding: "3px 10px",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: badge.fg,
                    lineHeight: 1.4,
                  }}
                >
                  {PRIORITY_LABELS[priority]} priority
                </Text>
              </td>
            </tr>
          </table>

          <Text
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 600,
              color: tokens.colors.text,
              lineHeight: 1.35,
            }}
          >
            {taskTitle}
          </Text>

          {taskDescription ? (
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: "14px",
                lineHeight: 1.55,
                color: tokens.colors.textMuted,
              }}
            >
              {taskDescription}
            </Text>
          ) : null}

          {dueDate ? (
            <Text
              style={{
                margin: "14px 0 0",
                fontSize: "12px",
                color: tokens.colors.textSubtle,
              }}
            >
              Due <strong style={{ color: tokens.colors.text }}>
                {dateFmt.format(dueDate)}
              </strong>
            </Text>
          ) : null}
        </Section>
      </Section>

      <Section
        style={{
          padding: "20px 40px 28px",
          textAlign: "center" as const,
        }}
      >
        <PrimaryButton href={taskUrl}>Open task</PrimaryButton>
      </Section>

      <Section style={{ padding: "0 40px 28px" }}>
        <Text style={captionStyle}>
          You can review everything assigned to you anytime at{" "}
          <a
            href={taskUrl}
            style={{
              color: tokens.colors.brand,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            /tasks
          </a>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

TaskAssignedEmail.PreviewProps = {
  assigneeName: "Alice Silva",
  assignerName: "João Carvalhosa",
  taskTitle: "Upload Q1 fuel invoices",
  taskDescription:
    "We need the diesel + LPG invoices for Jan-Mar to reconcile the Scope 1 entries before the audit.",
  priority: "HIGH",
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  taskUrl: "https://app.renai.pt/tasks?scope=mine",
  companyName: "Maxtil",
} satisfies TaskAssignedEmailProps;
