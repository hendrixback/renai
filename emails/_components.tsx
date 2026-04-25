import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * Shared shell for every transactional email. Keeps the visual
 * identity consistent and lets us update branding (logo, footer,
 * support link) in one place.
 *
 * `preview` controls the gmail/outlook inbox preview snippet.
 */
export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f7f9] py-10 font-sans text-[15px] text-[#0f172a]">
          <Container className="mx-auto max-w-[560px] rounded-2xl bg-white p-10 shadow-sm">
            <Section>
              <Text className="m-0 text-[18px] font-semibold tracking-tight">
                RenAI
              </Text>
              <Text className="m-0 text-xs uppercase tracking-wide text-[#64748b]">
                Sustainability operations platform
              </Text>
            </Section>
            <Hr className="my-6 border-[#e2e8f0]" />
            {children}
            <Hr className="my-6 border-[#e2e8f0]" />
            <Section>
              <Text className="m-0 text-xs text-[#64748b]">
                You&apos;re receiving this because of activity on your RenAI
                account. If this wasn&apos;t you, please ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
