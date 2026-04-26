import { getRequestConfig } from "next-intl/server";

/**
 * next-intl request config. Single-locale (`en`) for MVP — see
 * Spec_Amendments.md §B3 and ADR-009. We scaffold the provider now so
 * every component that wraps a string in `t('key')` works immediately
 * once additional locales (`pt-PT`, `es-ES`, …) get added.
 *
 * No locale routing yet: paths stay flat (`/dashboard`, not
 * `/en/dashboard`). When a second locale ships, switch to the
 * routing-aware setup and move this file to `i18n/routing.ts`.
 */
export default getRequestConfig(async () => {
  const locale = "en";
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
