import type { Scene } from './plan';

const PALETTE =
  'muted off-white and warm charcoal palette, soft overcast daylight, ' +
  'gold allowed only as a rare accent in the scene and never on the vehicle, ' +
  'no gold trim on the car, no chrome ornaments, no brand logos or badges, ' +
  'no taxi signage, no neon signs, no sunset or orange sky, no teal, no lens flare, ' +
  'no text, no watermark, photographic, medium format look';

export const SCENES: Scene[] = [
  {
    id: 'hero', dir: 'parallax/hero', width: 2560, height: 1097, needsDepth: true,
    prompt: `A modern black three-row luxury MPV van with a plain unadorned front, no hood ornament, no badges and no logos, parked at the kerb on a wet Bangkok street on an overcast early morning, seen three-quarters from the front right, a chauffeur in a plain dark suit standing beside the closed rear door on the right side of the frame, plain concrete overpass and low grey buildings receding into haze behind, flat even daylight with no visible sun, wide empty road and pale sky filling the left forty percent of the frame. ${PALETTE}`,
  },
  {
    id: 'service/airport', dir: 'parallax/service/airport', width: 1920, height: 1080, needsDepth: true,
    prompt: `Arrival hall of a modern Asian airport seen from a distance, a chauffeur waiting with a name board, travellers blurred in motion, wide calm composition with space on the left. ${PALETTE}`,
  },
  {
    id: 'service/business', dir: 'parallax/service/business', width: 1920, height: 1080, needsDepth: true,
    prompt: `Executive sedan pulling up to a glass office tower entrance in Bangkok, morning, doorman stepping forward, reflections on the car body, wide calm composition. ${PALETTE}`,
  },
  {
    id: 'service/rental', dir: 'parallax/service/rental', width: 1920, height: 1080, needsDepth: true,
    prompt: `Seven seat van on a coastal Thai highway seen from a low roadside angle, palm shadows across the road, hills in the far distance, unhurried holiday mood. ${PALETTE}`,
  },
  {
    id: 'trust', dir: 'parallax/trust', width: 1920, height: 1080, needsDepth: false,
    prompt: `Close detail of a clean vehicle interior, folded cold towel and bottled water in a door pocket, shallow focus, nobody in frame, quiet hotel dossier mood. ${PALETTE}`,
  },
  {
    id: 'close', dir: 'parallax/close', width: 2560, height: 1097, needsDepth: true,
    prompt: `Empty Bangkok expressway curve at dusk seen from above, a single dark vehicle mid-frame, city lights just beginning, generous negative space in the upper third. ${PALETTE}`,
  },
  {
    id: 'scene/airport', dir: 'parallax/airport', width: 1800, height: 1200, needsDepth: true,
    prompt: `Curbside pickup lane at Suvarnabhumi style airport terminal, luggage trolley beside a waiting van, canopy overhead, soft even light. ${PALETTE}`,
  },
];
