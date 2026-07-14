/// <reference types="astro/client" />

// Cloudflare Turnstile — loaded async via the <script> tag in Base.astro
// (challenges.cloudflare.com/turnstile/v0/api.js). It attaches a global
// `turnstile` object; this ambient declaration only exists to satisfy
// strict `astro check` for the verbatim-ported booking submit script
// (src/components/BookingForm.astro), which calls `turnstile.reset(...)`.
declare var turnstile:
  | {
      render: (container: string | HTMLElement, options?: Record<string, unknown>) => string;
      reset: (widgetIdOrContainer?: string | HTMLElement) => void;
      remove: (widgetIdOrContainer?: string | HTMLElement) => void;
      getResponse: (widgetIdOrContainer?: string | HTMLElement) => string | undefined;
    }
  | undefined;
