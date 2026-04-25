import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// Inline-style email design tokens. Email clients are unreliable with
// utility classes / arbitrary values — explicit styles are the only
// way to guarantee consistent rendering across Gmail, Apple Mail,
// Outlook, etc.
//
// Palette derived from the app's brand-green primary (#388317) and the
// neutral surface used in the dashboard cards.
export const tokens = {
  colors: {
    canvas: "#f4f5f7",
    surface: "#ffffff",
    border: "#e5e7eb",
    borderSoft: "#eef0f3",
    text: "#0f172a",
    textMuted: "#475569",
    textSubtle: "#64748b",
    brand: "#388317",
    brandHover: "#2d6a13",
    brandSoft: "#ecf3e7",
    accentSoft: "#f8fafc",
  },
  radius: {
    card: "16px",
    button: "10px",
    chip: "6px",
  },
  font: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
  },
} as const;

const baseStyles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: tokens.colors.canvas,
    fontFamily: tokens.font.sans,
    color: tokens.colors.text,
    WebkitFontSmoothing: "antialiased" as const,
  },
  outerWrap: {
    width: "100%",
    backgroundColor: tokens.colors.canvas,
    padding: "40px 16px",
  },
  container: {
    margin: "0 auto",
    width: "100%",
    maxWidth: "560px",
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    boxShadow:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
    overflow: "hidden" as const,
  },
  header: {
    padding: "28px 40px 0",
  },
  brandRow: {
    display: "table" as const,
    width: "100%",
  },
  brandText: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
    color: tokens.colors.text,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  brandSubtitle: {
    margin: "2px 0 0",
    fontSize: "11px",
    fontWeight: 500,
    color: tokens.colors.textSubtle,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  contentSection: {
    padding: "28px 40px 8px",
  },
  divider: {
    margin: "0 40px",
    borderColor: tokens.colors.borderSoft,
    borderTopWidth: "1px",
    borderTopStyle: "solid" as const,
    width: "auto",
  },
  footerSection: {
    padding: "20px 40px 32px",
  },
  footerText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.5,
    color: tokens.colors.textSubtle,
  },
  footerLink: {
    color: tokens.colors.textMuted,
    textDecoration: "underline",
  },
};

/** Reusable shell — keeps every transactional email visually identical. */
export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={baseStyles.body}>
        <div style={baseStyles.outerWrap}>
          <Container style={baseStyles.container}>
            <Section style={baseStyles.header}>
              <BrandHeader />
            </Section>
            <Hr style={{ ...baseStyles.divider, margin: "24px 40px 0" }} />
            {children}
            <Hr style={baseStyles.divider} />
            <Section style={baseStyles.footerSection}>
              <Text style={baseStyles.footerText}>
                You&apos;re receiving this because of activity on your RenAI
                account. If this wasn&apos;t you, please ignore this email.
              </Text>
              <Text
                style={{
                  ...baseStyles.footerText,
                  marginTop: "8px",
                }}
              >
                <Link href="https://app.renai.pt" style={baseStyles.footerLink}>
                  RenAI
                </Link>
                {" · Sustainability operations platform"}
              </Text>
            </Section>
          </Container>
        </div>
      </Body>
    </Html>
  );
}

/** Brand mark — leaf SVG inline + wordmark + tagline.
 *  Outlook strips inline SVG; the wordmark still reads correctly. */
function BrandHeader() {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ borderCollapse: "collapse" }}
    >
      <tr>
        <td
          style={{
            verticalAlign: "middle",
            paddingRight: "12px",
            width: "44px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: tokens.colors.brandSoft,
              display: "table-cell",
              verticalAlign: "middle",
              textAlign: "center",
            }}
          >
            {/* Inline leaf — same path as <BrandMark/> */}
            <Img
              src="https://api.iconify.design/lucide/leaf.svg?color=%23388317"
              alt=""
              width="22"
              height="22"
              style={{
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
          </div>
        </td>
        <td style={{ verticalAlign: "middle" }}>
          <Text style={baseStyles.brandText}>RenAI</Text>
          <Text style={baseStyles.brandSubtitle}>
            Sustainability operations
          </Text>
        </td>
      </tr>
    </table>
  );
}

/** Solid CTA button styled to match the app's primary action. */
export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: "collapse", margin: "0 auto" }}
    >
      <tr>
        <td
          style={{
            backgroundColor: tokens.colors.brand,
            borderRadius: tokens.radius.button,
            textAlign: "center",
          }}
        >
          <Link
            href={href}
            style={{
              display: "inline-block",
              padding: "12px 28px",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: tokens.font.sans,
            }}
          >
            {children}
          </Link>
        </td>
      </tr>
    </table>
  );
}

/** Section heading + supporting paragraph. */
export const headingStyle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "-0.015em",
  lineHeight: 1.25,
  color: tokens.colors.text,
};

export const paragraphStyle = {
  margin: "12px 0 0",
  fontSize: "15px",
  lineHeight: 1.6,
  color: tokens.colors.textMuted,
};

export const captionStyle = {
  margin: 0,
  fontSize: "12px",
  color: tokens.colors.textSubtle,
  lineHeight: 1.5,
};

export const monoCaptionStyle = {
  ...captionStyle,
  fontFamily: tokens.font.mono,
  color: tokens.colors.text,
  wordBreak: "break-all" as const,
  margin: "6px 0 0",
};

export { baseStyles };
