# Elite Chauffeur — Landing Page

Static marketing landing page for **sabuygo.com** (Elite Chauffeur — premium chauffeur service in Bangkok, operated by Sabaigo / OOM).

Parent workspace: `../AGENTS.md` — see for Supabase backoffice, dashboard, and software-house context.

## Stack

- **Static HTML + inline CSS** — no build step, no framework
- **Deploy**: Docker + nginx (`Dockerfile`, `docker-compose.yml`, `nginx.conf`)
- **Fonts**: currently Inter + Noto Sans Thai via Google Fonts (to be replaced — see Design Context below)
- **Language**: Thai primary (`lang="th"`), English as secondary locale

## Structure

```
elite-chauffeur/
├── index.html          # Main landing (single file, ~130KB, inline <style>)
├── privacy.html        # Privacy policy (inherits same design system)
├── robots.txt
├── sitemap.xml
├── images/             # logo.webp, car1-4.webp, service1-3.webp
├── internal/           # internal-only assets
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## Conventions

- **SEO is load-bearing** — main branch scores 93/100. Any redesign must preserve all JSON-LD structured data, Open Graph tags, and meta descriptions.
- **No build step** — edits go straight into `index.html`. Keep CSS inline or in a single `<style>` block.
- **Thai-first content** — every headline, label, and microcopy must read naturally in Thai; English is a parallel version, not a translation.
- **Do not commit/push to main** — redesign work lives on `redesign/impeccable-v1`. Wait for explicit instruction before merge.

## Commands

```bash
# Local preview — serve static files
docker compose up

# Or open index.html directly in browser
open index.html
```

---

## Design Context

This section defines the design direction for `/impeccable` skills and any UI work on this landing page. The full brief lives in `.impeccable.md` — this is a summary for quick session bootstrap.

### Users

Two audiences on the same visit: **Thai executives and corporate assistants** booking chauffeur service for meetings, airport pickup, and VIP client hosting; and **international business travelers** evaluating a Bangkok chauffeur partner against Blacklane / Wheely / hotel concierges. The job-to-be-done is **trust transfer** — converting a cold visitor into someone who feels safe handing over their or their client's trip. Contexts range from mid-morning on mobile in a taxi to late-night desktop when an urgent airport pickup is being arranged.

### Brand Personality

**Composed, discreet, deliberate.** Voice is the quiet side of luxury — the concierge who already knows your reservation, not the valet who shouts your name. Earns attention through precision instead of volume. Emotional goal: the visitor exhales and thinks *"these people have done this before."* No hype, no urgency banners, no promo language.

### Aesthetic Direction

**Light mode, refined restraint.** Off-white background (not pure white), deep charcoal text (not pure black), muted olive-gold as a rare accent — refined from the current `#B8943F` toward something more gilded than metallic. Typography carries hierarchy through weight and scale; color does not.

- **References**: Aman Resorts, Alila, Rosewood, Apple product pages — silent confidence, sparse typography, generous white space.
- **Anti-references**: generic SaaS / Vercel templates, Thai real-estate flyers, awwwards agency portfolios, corporate-stiff consulting.
- **Theme**: light (off-white + charcoal + muted gold).
- **Typography**: humanist Thai face (explore Anuphan, Bai Jamjuree, or other Cadson Demak faces — **not** Noto Sans Thai, Kanit, Prompt, or Sarabun) paired with a refined Latin sans **outside the impeccable reflex list** (no Inter, DM Sans, Plus Jakarta, Space Grotesk, IBM Plex, Outfit, or Instrument Sans).
- **Motion**: quiet — staggered fade on entrance, small hover lift, respect `prefers-reduced-motion`. No parallax, no scroll-jacking.

### Design Principles

1. **Restraint over emphasis.** Every element must earn its place. If a section can be removed without losing meaning, remove it.
2. **Typography carries hierarchy, not color.** Use weight, size, and spacing to rank importance.
3. **Muted gold is a guest, not a resident.** Accent appears 2–3 times per viewport at most, only where a decision is asked of the user.
4. **Thai and English share one voice.** Both languages get the same hierarchy and weight treatment. Thai must never look bolted onto a Latin-first design.
5. **Fast, quiet, accessible by default.** Lighthouse 95+ on performance and accessibility. Motion has reduced-motion fallbacks. Color has verified contrast.

For the full version including user contexts, anti-references, and implementation notes, see `.impeccable.md` in this directory.
