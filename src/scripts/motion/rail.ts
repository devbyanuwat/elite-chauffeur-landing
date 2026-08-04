import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { collectChapters } from './editions';

export interface RailStop {
  name: string;
  id: string;
}

export function railStops(root: ParentNode): RailStop[] {
  return collectChapters(root)
    .filter((chapter) => chapter.el.id !== '')
    .map((chapter) => ({ name: chapter.name, id: chapter.el.id }));
}

/**
 * rail ต้องเป็นลูกของ <body> เท่านั้น — element position: fixed ที่อยู่ใน
 * subtree ของ section ที่ถูก pin จะโดน transform ของ pin ลากไปด้วย ซึ่งเป็น
 * บั๊กเดียวกับที่ commit fc0720d แก้ให้ nav และปุ่มลอย
 */
export function initRail(root: ParentNode): () => void {
  const rail = document.querySelector<HTMLElement>('#chapter-rail');
  if (rail === null) return () => {};

  if (rail.parentElement !== document.body) document.body.appendChild(rail);

  const stops = railStops(root);
  const dots = Array.from(rail.querySelectorAll<HTMLElement>('[data-rail-dot]'));
  const label = rail.querySelector<HTMLElement>('[data-rail-label]');

  // fix round 1: `stops` is document order (from collectChapters), `dots` is
  // the component's own markup order (src/components/ChapterRail.astro) —
  // these are NOT the same order (the page renders Stats before Fleet/How/
  // Routes, the rail lists Fleet/How/Routes/Stats). Indexing `dots[index]`
  // with `stops`' index silently mismatched 5 of 6 chapters to the wrong dot.
  // Match by id instead so reordering sections in index.astro can never
  // desync the rail again; a stop with no matching dot degrades quietly (no
  // ScrollTrigger created for it) rather than mis-highlighting.
  const triggers = stops
    .map((stop) => {
      const dot = dots.find((candidate) => candidate.getAttribute('href') === `#${stop.id}`);
      if (!dot) return null;

      return ScrollTrigger.create({
        trigger: `#${stop.id}`,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (!self.isActive) return;
          dots.forEach((candidate) => {
            const isActive = candidate === dot;
            candidate.classList.toggle('on', isActive);
            // Colour alone (the .on class) isn't enough for screen readers —
            // aria-current names the active chapter's link explicitly.
            if (isActive) candidate.setAttribute('aria-current', 'true');
            else candidate.removeAttribute('aria-current');
          });
          if (label) label.textContent = dot.dataset.railName ?? '';
        },
      });
    })
    .filter((trigger): trigger is ScrollTrigger => trigger !== null);

  rail.classList.add('rail-ready');

  return () => {
    triggers.forEach((trigger) => trigger.kill());
    rail.classList.remove('rail-ready');
  };
}
