# Landing media inventory (SABUY-53)

Produced by Task 4 of `2026-07-27-landing-media-pipeline.md`. Covers every real file
under `public/images/parallax/` as of 2026-07-27, the actual fal.ai spend, the
closing balance, and the prompts on record (both the ones that worked and the ones
that didn't, since a reshoot has to start from knowing what each prompt actually
produced).

## Status at a glance

| Scene | Status | Why |
|---|---|---|
| `hero` | **Approved** (Task 3 + fix round) | Plain MPV, no ornament/gold/badge, left 40% clear |
| `service/airport` | **NEEDS RESHOOT** | Rolls-Royce-style grille/gold wheels, taxi roof light, taxi pickup signboard, visible sun |
| `service/business` | **NEEDS RESHOOT** | Grille/headlight design reads as a specific real brand (Mercedes-Benz S-Class); vehicle also larger than our Altis-class fleet |
| `service/rental` | Clean | No violations found |
| `trust` | **NEEDS RESHOOT** | Gold-plated door handle + trim strip on the vehicle; fabricated brand-like text/logo on the water bottle label |
| `close` | Clean | No violations found |
| `scene/airport` (`airport/`) | Soft concern | Van itself clean, but canopy carries a repeated row of ornate gold temple-style finials — more than "a rare accent" |

Three of six newly generated scenes are not usable as-is. Per instruction, none were
regenerated — this document and the accompanying report describe exactly what's
wrong so a human can decide the next prompt rewrite, the same way the hero fix round
worked.

## File table (real dimensions and sizes)

| File | Dimensions | Bytes | KB |
|---|---|---|---|
| `hero/color.webp` | 2560×1104 | 172,432 | 168.4 |
| `hero/depth.webp` | 2560×1104 | 26,318 | 25.7 |
| `hero/flat.webp` | 1280×552 | 36,332 | 35.5 |
| `service/airport/color.webp` | 1920×1080 | 123,312 | 120.4 |
| `service/airport/depth.webp` | 1920×1080 | 24,596 | 24.0 |
| `service/airport/flat.webp` | 1280×720 | 35,328 | 34.5 |
| `service/business/color.webp` | 1920×1080 | 177,156 | 173.0 |
| `service/business/depth.webp` | 1920×1080 | 16,222 | 15.8 |
| `service/business/flat.webp` | 1280×720 | 53,102 | 51.9 |
| `service/rental/color.webp` | 1920×1080 | 165,384 | 161.5 |
| `service/rental/depth.webp` | 1920×1080 | 15,992 | 15.6 |
| `service/rental/flat.webp` | 1280×720 | 44,874 | 43.8 |
| `trust/color.webp` | 1920×1080 | 108,260 | 105.7 |
| `close/color.webp` | 2560×1104 | 164,356 | 160.5 |
| `close/depth.webp` | 2560×1104 | 29,554 | 28.9 |
| `close/flat.webp` | 1280×552 | 35,738 | 34.9 |
| `airport/color.webp` | 1800×1200 | 227,074 | 221.8 |
| `airport/depth.webp` | 1800×1200 | 35,344 | 34.5 |
| `airport/flat.webp` | 1280×853 | 72,912 | 71.2 |

`trust` has no `depth.webp` or `flat.webp` by design — it's `needsDepth: false` in
`scenes.ts` (a single static background layer, no parallax). Confirmed the planner
honours this: `npx tsx scripts/gen-media.ts --run` only ever queued a `color` job for
`trust`, never a `depth` job.

**Note on dimensions:** `hero` and `close` both declare `height: 1097` in `scenes.ts`
(exact 21:9) but came back at 1104. Seedream appears to round the requested height to
the nearest multiple of 8; 1097 isn't one, 1104 is. Every other scene's declared
height (1080, 1080, 1080, 1080, 1200) is already a multiple of 8 and came back exact.
Harmless — color/depth/flat stay pixel-aligned to each other regardless — but worth
knowing before assuming a future scene will land on its exact declared size.

## Directory size

```
$ du -sh public/images/parallax/
1.5M
```

Exact total: **1,564,286 bytes ≈ 1.49 MB** across all 19 files (manifest.json is
negligible text on top of that). Well under the 6 MB ceiling — no webp quality
reduction was needed. `color`/`depth` were encoded at the pipeline's existing quality
90; `flat` composites were encoded fresh at quality 78 per this task's instruction
(1280px wide, from the `color` pass).

## Spend and balance — full ledger across the whole media pipeline effort

| Event | Balance after | Spend |
|---|---|---|
| Starting balance (2026-07-27, before any generation) | $9.93641 | — |
| Task 3: original hero (color + depth, since-discarded prompt) | $9.88865 | $0.04776 |
| Fix round: hero regenerated with corrected prompt (kept, approved) | $9.847725 | $0.040925 |
| Task 4: remaining 6 scenes, 11 jobs (6 color + 5 depth; `trust` has no depth) | $9.567825 | $0.2799 |
| **Total spent so far** | | **$0.368585** |
| **Closing balance** | **$9.567825** | |

Task 4's own estimate (`npx tsx scripts/gen-media.ts`, dry run before spending) was
**$0.27** (6 × $0.03 color + 5 × $0.01776 depth = $0.2688, printed rounded). Actual
came in at $0.2799 — about 4% over, consistent with the fix round's finding that
`marigold-depth` bills variable compute-seconds rather than a flat per-image price.

Balance was checked immediately after the run ($9.567825) and again after a 15s wait
to let any lagged depth-compute billing settle — no further movement, so this figure
is final, not a snapshot mid-settle (the fix round found marigold's charge can post
several seconds after the job reports done; this run's number had already settled by
the time of the second check).

## Prompts on record

All seven scenes share the same `PALETTE` negative-list suffix (defined once in
`scripts/media/scenes.ts`, interpolated into every prompt):

```
muted off-white and warm charcoal palette, soft overcast daylight,
gold allowed only as a rare accent in the scene and never on the vehicle,
no gold trim on the car, no chrome ornaments, no brand logos or badges,
no taxi signage, no neon signs, no sunset or orange sky, no teal, no lens flare,
no text, no watermark, photographic, medium format look
```

### `hero` — APPROVED, worked

```
A modern black three-row luxury MPV van with a plain unadorned front, no hood
ornament, no badges and no logos, parked at the kerb on a wet Bangkok street on an
overcast early morning, seen three-quarters from the front right, a chauffeur in a
plain dark suit standing beside the closed rear door on the right side of the frame,
plain concrete overpass and low grey buildings receding into haze behind, flat even
daylight with no visible sun, wide empty road and pale sky filling the left forty
percent of the frame.
```

Result: reads as an Alphard/Vellfire-class MPV, plain chrome slat grille, no
ornament, no badge, no gold on the vehicle. Two small residual misses (a soft sun
disc low in the sky; a small teal-lit sign in the distant background) were reviewed
and accepted by the coordinator as falling where the booking-form card will sit.

### `service/airport` — NEEDS RESHOOT, prompt as generated (do not reuse as-is)

```
Arrival hall of a modern Asian airport seen from a distance, a chauffeur waiting
with a name board, travellers blurred in motion, wide calm composition with space
on the left.
```

Result: the model invented a vehicle since none was specified, and it invented a
Rolls-Royce Phantom-style sedan — vertical-slat gold grille, gold wheels, and a
taxi-style yellow roof-light box on the roof. The chauffeur holds a sign that reads
like an airport taxi-pickup placard (dark blue board, yellow lettering). There's also
a visible sun low on the horizon with a warm orange glow. This is the same class of
problem the hero prompt had before its fix — **the fix here is likely the same kind
of change: explicitly name the vehicle** (e.g. "a black Alphard-style VIP van", the
way hero's prompt now does), not just rely on the shared negative list, which this
prompt inherited but which wasn't enough on its own.

### `service/business` — NEEDS RESHOOT, prompt as generated (do not reuse as-is)

```
Executive sedan pulling up to a glass office tower entrance in Bangkok, morning,
doorman stepping forward, reflections on the car body, wide calm composition.
```

Result: "Executive sedan" with no further specificity produced a car whose grille
(twin vertical chrome slats) and headlight shape (teardrop) read unmistakably as a
Mercedes-Benz S-Class — a specific real brand's design language, not a generic
sedan. It's also a larger flagship-sedan silhouette than the Toyota Corolla
Altis-class car we actually operate. Same likely fix as `service/airport`: name the
actual vehicle (e.g. "a black Toyota Corolla Altis-class sedan") instead of a generic
class name that invites the model's default association.

### `service/rental` — clean, prompt worked as written

```
Seven seat van on a coastal Thai highway seen from a low roadside angle, palm
shadows across the road, hills in the far distance, unhurried holiday mood.
```

Result: a champagne/silver Toyota HiAce-style commuter van on a coastal highway,
palm-frond shadows crossing the road, sea and hills in the background. No gold, no
badges/logos found on inspection, no visible sun disc, no neon or taxi signage. This
prompt already names a body type ("seven seat van") which likely helped — consistent
with the diagnosis above for the two failing scenes.

### `trust` — NEEDS RESHOOT, prompt as generated (do not reuse as-is)

```
Close detail of a clean vehicle interior, folded cold towel and bottled water in a
door pocket, shallow focus, nobody in frame, quiet hotel dossier mood.
```

Result: the door panel trim rendered with a full gold-plated door handle recess and
a gold trim strip — a direct, prominent violation of "no gold trim on the car,"
occupying a large fraction of the frame (this is an interior-detail shot, so "the
car" is essentially the entire visible surface). The water bottle in the door pocket
also carries a fabricated label with a logo mark and readable (fictional) text,
violating "no text, no watermark." Likely fix: add an explicit "no gold anywhere in
the interior trim, plain black or dark wood trim only" clause and "plain unlabelled
bottle" to this specific prompt — the shared negative list's "no gold trim on the
car" clearly wasn't specific enough for a shot where the trim fills the frame.

### `close` — clean, prompt worked as written

```
Empty Bangkok expressway curve at dusk seen from above, a single dark vehicle
mid-frame, city lights just beginning, generous negative space in the upper third.
```

Result: elevated expressway at dusk, a dark van receding down the curve, city lights
beginning along the roadside, pale grey sky filling the upper third as asked. A
blank/illegible white billboard shape in the far background (checked closely — no
readable text). Ambient warm sodium streetlights are present but read as ordinary
city lighting, not a stylized sunset/teal-orange grade.

### `scene/airport` (`airport/`) — soft concern, prompt mostly worked

```
Curbside pickup lane at Suvarnabhumi style airport terminal, luggage trolley beside
a waiting van, canopy overhead, soft even light.
```

Result: a plain cream/off-white HiAce-style van at a luggage curb — no badge, no
gold, no visible logo found on inspection. However the canopy overhead is decorated
with a repeating row of ornate gold temple-style (chofa-like) finials running its
full length — technically not "on the vehicle," so it doesn't break the literal
wording of the negative list, but it's a lot more than "a rare accent" and pushes the
scene toward an ornate/gilded look rather than the intended restrained one. Likely
fix if this needs tightening: add "plain modern canopy structure, no ornamental
finials" to this prompt specifically.

## Depth convention — verified on the new scenes too, not assumed from the fix round

Spot-checked three of the five new depth maps (not just trusting that the hero fix
generalizes) by sampling a near point (bottom-center, typically road/ground close to
camera) against a far point (top-center, typically sky) on the raw pixel buffer:

```
service/business   near≈250   far≈217
close               near≈242   far≈98
airport             near≈246   far≈85
```

All three: near brighter than far, consistent with the `negate()` fix applied
uniformly to every `kind: 'depth'` job in `gen-media.ts`. Every depth entry written
in this run also carries `depthConvention: "near-bright"` in `manifest.json`.

## Known bookkeeping note (fixed going forward, not rewritten in history)

`gen-media.ts` used to keep its own separate copy of the `COST_USD` price table
instead of importing it from `scripts/media/plan.ts` — a duplication left over from
Task 2. The fix round updated `plan.ts`'s copy to the measured $0.01776 depth price
but missed `gen-media.ts`'s copy, so every depth entry manifest wrote during this
Task 4 run recorded `costUsd: 0.01` (the old guess), not the measured $0.01776. Fixed
during this task by exporting `COST_USD` from `plan.ts` and having `gen-media.ts`
import it instead of duplicating it — single source of truth, can't drift apart
again. Historical `manifest.json` entries were **not** hand-edited to correct this;
they're left as an accurate record of what the tool actually computed at the time.
This inventory's own spend figures come from real fal balance deltas, not from
summing `manifest.json`'s `costUsd` fields, so they aren't affected by this quirk.
