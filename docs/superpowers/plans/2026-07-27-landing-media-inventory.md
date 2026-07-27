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
| `service/airport` | **STILL NEEDS RESHOOT** (S2 attempt #2 failed, new problems) | Vehicle now correctly Alphard-class, but gold-plated Toyota badge + gold lower-bumper trim on the vehicle, visible sun, teal terminal signage |
| `service/business` | **STILL NEEDS RESHOOT** (S2 attempt #2 failed, new problems) | Vehicle now correctly Corolla Altis-class, but a taxi-style roof light box, a Toyota badge on the grille, visible sun, small teal accent |
| `service/rental` | Clean | No violations found |
| `trust` | **Improved, minor residual issues** (S2 attempt #2) | No more giant gold handle/fake bottle label, but a small gold-toned door latch and a chrome sill-trim strip remain |
| `close` | Clean | No violations found |
| `scene/airport` (`airport/`) | **Kept as-is (S2 decision)** | Canopy gold finials read as generic Thai architectural ornament, not vehicle/brand trade dress — see S2 section below |

Three of six newly generated scenes were not usable as-is (first pass, S1). Per
instruction, none were regenerated at the time — that first report described exactly
what was wrong so a human could decide the next prompt rewrite. See the **"S2
reshoot"** section near the end of this document for the second-pass results: one
prompt rewrite round (naming the actual fleet vehicle explicitly, following the hero
pattern) fixed the original problems on all three scenes but `service/airport` and
`service/business` each surfaced a *new* set of violations instead of a clean pass;
`trust` improved substantially but still has two minor residual issues. Per the "no
retry-chasing" rule, none of the three were regenerated a third time — reported
plainly, stopped, human decision needed again.

## File table (real dimensions and sizes)

| File | Dimensions | Bytes | KB |
|---|---|---|---|
| `hero/color.webp` | 2560×1104 | 172,432 | 168.4 |
| `hero/depth.webp` | 2560×1104 | 26,318 | 25.7 |
| `hero/flat.webp` | 1280×552 | 36,332 | 35.5 |
| `service/airport/color.webp` | 1920×1080 | 169,180 | 165.2 |
| `service/airport/depth.webp` | 1920×1080 | 19,452 | 19.0 |
| `service/airport/flat.webp` | 1280×720 | 43,584 | 42.6 |
| `service/business/color.webp` | 1920×1080 | 152,594 | 149.0 |
| `service/business/depth.webp` | 1920×1080 | 21,972 | 21.5 |
| `service/business/flat.webp` | 1280×720 | 46,080 | 45.0 |
| `service/rental/color.webp` | 1920×1080 | 165,384 | 161.5 |
| `service/rental/depth.webp` | 1920×1080 | 15,992 | 15.6 |
| `service/rental/flat.webp` | 1280×720 | 44,874 | 43.8 |
| `trust/color.webp` | 1920×1080 | 109,778 | 107.2 |
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
1.6M
```

Exact total (measured after the S2 reshoot, summing every real `.webp` file on disk):
**1,588,950 bytes ≈ 1.52 MB** across the same 19 files (`service/airport`,
`service/business`, `trust` color/depth/flat were overwritten in place by
`--force`; file count unchanged). manifest.json is negligible text on top of this
and not included. Well under the 6 MB ceiling — no webp quality reduction was needed.
`color`/`depth` are encoded at the pipeline's existing quality 90; `flat` composites
at quality 78, 1280px wide, built fresh from each scene's `color` pass with
`sharp(colorPath).resize({ width: 1280 }).webp({ quality: 78 })`.

## Spend and balance — full ledger across the whole media pipeline effort

| Event | Balance after | Spend |
|---|---|---|
| Starting balance (2026-07-27, before any generation) | $9.93641 | — |
| Task 3: original hero (color + depth, since-discarded prompt) | $9.88865 | $0.04776 |
| Fix round: hero regenerated with corrected prompt (kept, approved) | $9.847725 | $0.040925 |
| Task 4: remaining 6 scenes, 11 jobs (6 color + 5 depth; `trust` has no depth) | $9.567825 | $0.2799 |
| S2 reshoot: `service/airport` (color+depth) + `service/business` (color+depth) + `trust` (color only) | $9.435645 | $0.13218 |
| **Total spent so far** | | **$0.500765** |
| **Closing balance** | **$9.435645** | |

Task 4's own estimate (`npx tsx scripts/gen-media.ts`, dry run before spending) was
**$0.27** (6 × $0.03 color + 5 × $0.01776 depth = $0.2688, printed rounded). Actual
came in at $0.2799 — about 4% over, consistent with the fix round's finding that
`marigold-depth` bills variable compute-seconds rather than a flat per-image price.

Balance was checked immediately after the run ($9.567825) and again after a 15s wait
to let any lagged depth-compute billing settle — no further movement, so this figure
is final, not a snapshot mid-settle (the fix round found marigold's charge can post
several seconds after the job reports done; this run's number had already settled by
the time of the second check).

**S2 reshoot spend** (2026-07-27, second pass): dry-run estimates were $0.05 +
$0.05 + $0.03 = $0.13 for the three scenes (`service/airport` 2 jobs, `service/business`
2 jobs, `trust` 1 job — `needsDepth: false`). Balance before: $9.567825. Balance
immediately after all three `--run --force --only <id>` invocations: $9.435645;
rechecked 15s later: unchanged at $9.435645 (settled). Actual spend: **$0.13218**,
about 1.7% over the $0.13 estimate — consistent with `marigold-depth`'s variable
compute-time billing.

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

## S2 reshoot (2026-07-27, second pass) — three prompts rewritten, three results

Coordinator's instruction: the three failing S1 scenes all failed for the same root
cause diagnosed above — the prompt never named the actual vehicle, so the model
reached for its default "luxury car" association (gold Rolls-Royce grille, Mercedes
S-Class front end, gold-plated interior trim + a fabricated bottle label). The fix,
following the pattern that already worked for `hero`, was to name the real fleet
vehicle explicitly in each of the three prompts. `scripts/media/scenes.ts` was edited
so only these three prompts changed; the shared `PALETTE` suffix and every other
scene's prompt were left untouched (confirmed by reading the full file after editing).

### `service/airport` — new prompt, STILL FAILS (different problems)

```
A plain black Toyota Alphard class three-row MPV van waiting at an airport arrivals
kerb, no roof sign, no taxi markings, no signboard, plain unadorned grille with no
ornament and no badge, a chauffeur in a dark suit standing at the open sliding door,
glass terminal facade and a concrete canopy behind, travellers blurred in the far
background, flat overcast daylight with no visible sun, calm wide composition with
open space on the left.
```

Result: the vehicle class is now correct (reads convincingly as an Alphard/Vellfire),
and the taxi roof-light box and taxi signboard from S1 are both gone. But the front
end now carries a **gold-plated Toyota badge** on the grille and **gold-plated lower
bumper/skid-plate trim** running the width of the front — the prompt explicitly said
"no ornament and no badge" and got a prominent gold one anyway. There is also a
**visible sun** low on the horizon with an orange glow, and **turquoise/teal
illuminated signage** visible in the terminal glass on both sides of the frame — both
explicitly banned by `PALETTE`. Net: two of three original problems fixed, but two
banned elements (sun, teal) recurred and a new one (gold badge/trim on the vehicle)
appeared. **Not regenerated a second time** — reported and stopped per instruction.

### `service/business` — new prompt, STILL FAILS (different, arguably worse problems)

```
A plain black mid-size sedan of Toyota Corolla Altis class, simple horizontal grille
with no ornament and no badge, stopped at the kerb outside a glass office tower in
Bangkok, a doorman stepping toward the rear door, wet pavement reflecting the grey
sky, flat overcast morning light with no visible sun, calm wide composition with open
space on the left.
```

Result: the vehicle class is now correctly Corolla-Altis-sized (the Mercedes S-Class
trade dress and oversized silhouette from S1 are gone) — but a **yellow/amber
roof-mounted light box** on the car's roof reads unmistakably as a Bangkok taxi
meter light, a **Toyota badge** is visible on the grille despite the prompt saying
"no badge," a **visible sun** sits low on the horizon with a warm glow, and a small
**teal-lit accent** is visible near the building's revolving door. The gold-framed
revolving door from S1 is gone, but a taxi-signage violation that wasn't present
before has taken its place. **Not regenerated a second time** — reported and
stopped per instruction.

### `trust` — new prompt, substantially improved, two minor residual issues

```
Close detail of a clean vehicle interior in matte black plastic and grey fabric, a
folded grey cold towel and a plain unlabelled water bottle resting in a door pocket,
shallow focus, nobody in frame, no gold, no chrome, no logos, no lettering of any
kind, soft even indoor light.
```

Result: the large gold-plated door handle recess and gold trim strip from S1 are
gone (the door trim is now genuinely matte black plastic), and the water bottle is
now genuinely blank — no fabricated logo or text found on inspection. Two smaller
issues remain: a small brass/gold-toned door latch or lock mechanism is visible on
the door jamb at the left edge of the frame, and a bright chrome-look strip runs
along the window-sill trim at the top of the door panel — both are letter-of-the-rule
violations of "no gold, no chrome" even though neither dominates the frame the way
the S1 version's gold trim did. **Not regenerated a second time** — reported as an
improved-but-imperfect result, human call needed on whether this clears the bar.

### `scene/airport` canopy gold finials — decision: leave as-is

Looked directly at `public/images/parallax/airport/color.webp` again (full image, not
a crop) to make this specific call. What's actually there: a row of roughly 8–9
ornate gold spire/finial ornaments mounted atop the white support pillars of the
terminal canopy, plus small gold accent rings at a few pillar capitals lower in the
frame — repeated enough that, read strictly against `PALETTE`'s "gold allowed only
as a rare accent," it's more than "rare" by simple count.

**Decision: leave it, do not reshoot.** Reasoning:

1. It sits entirely on background architecture (the terminal canopy), not on the
   vehicle, the chauffeur, or anything that represents the service itself — the van
   in this shot is a plain cream/white HiAce-style van with no badge, no gold, no
   logo anywhere on it (checked again on this pass, unchanged from the S1 finding).
2. It reads as a generic, recognizable Thai/regional civic-architecture motif (a
   lotus-bud/chofa-style finial, the kind seen on real government and transit
   buildings across Thailand) rather than an invented luxury flourish tied to a
   specific real brand. This is categorically different from the three problems that
   triggered this reshoot round — a Rolls-Royce grille, a Mercedes S-Class front end,
   and a gold-plated interior detail are all *product* trade dress; a temple-style
   finial on a terminal canopy is *place*-signalling (it says "this is Thailand"),
   which is closer to what an establishing shot is supposed to do.
3. This same session just demonstrated, twice, that reshooting a scene whose prompt
   already gets most of the brief right can trade one violation for a different
   (sometimes worse) one. `scene/airport`'s prompt was never rewritten to name a
   specific vehicle the way the three reshot scenes were, so a reshoot here carries
   the same risk with no corrective prompt change lined up and reviewed first. Given
   this task's explicit authorization covered exactly three scenes, spending further
   on a fourth without a prompt fix ready and separately approved isn't warranted.
4. If this needs tightening later, the fix is narrow and known: add "plain modern
   canopy structure, no ornamental finials" to this one prompt — same pattern as the
   other fixes in this document — but that's a decision for a future round, not this
   one.

This is a judgment call, not a clean pass — flagging the tension plainly rather than
calling it "clean" the way `service/rental` and `close` are.

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

**Note:** the `service/business` row above was sampled from the **S1** depth file,
which the S2 reshoot has since overwritten on disk (`--force`) — it no longer
describes what's actually in `service/business/depth.webp` today. The `airport` row
refers to `scene/airport`, which was **not** regenerated in S2 and is still accurate.

### Depth convention — re-verified after the S2 reshoot, on the actual current files

Sampled the two depth maps the S2 reshoot overwrote (`service/airport`,
`service/business`). First rendered each depth map full-frame to confirm by eye
*where* near and far actually are in each composition — in both shots a nearby
canopy/glass-tower structure occupies much of the upper frame, so "top of frame" is
not a reliable proxy for "far" here; the genuinely distant element in both shots is a
hazy background zone toward the upper-left, not the sky directly overhead. Sampled
raw pixel values from the correctly-identified regions:

```
service/airport   van body/bumper/chauffeur/road (near): 211–239
                  distant hazy zone under canopy (far):   35–43

service/business  car body/roof/doorman/pavement (near): 208–239
                  distant hazy skyline (far):              6–24
```

Near consistently brighter than far on both files — confirms `depthConvention:
"near-bright"` holds on the regenerated depth maps, verified by pixel sampling against
visually-confirmed regions, not assumed from the manifest flag.

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
