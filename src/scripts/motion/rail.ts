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
 *
 * fix round 2: `railStops(root)` (→ `collectChapters`) only ever returns
 * sections carrying `data-chapter` — reviews/faq/booking carry none, so the
 * rail had no trigger for them and `aria-current` simply stuck on `why`
 * (the last chapter) for the rest of the scroll. The rail's own markup
 * (`src/components/ChapterRail.astro`) now lists nine dots, three of which
 * point at non-chapter sections. So stops are driven from the DOM the rail
 * itself renders — each dot's `href` — not from the chapter list; a dot
 * whose target section is absent from the page is skipped (`document
 * .getElementById` returns null) with no trigger created, same quiet-degrade
 * direction as the id-based dot lookup from fix round 1.
 */
export function initRail(root: ParentNode): () => void {
  const rail = document.querySelector<HTMLElement>('#chapter-rail');
  if (rail === null) return () => {};

  if (rail.parentElement !== document.body) document.body.appendChild(rail);

  const dots = Array.from(rail.querySelectorAll<HTMLElement>('[data-rail-dot]'));
  const label = rail.querySelector<HTMLElement>('[data-rail-label]');

  // `root` is kept as a parameter (rather than always querying `document`)
  // so tests can scope lookups the same way `railStops` does; in practice
  // `initRail` is only ever called with `document`.
  const triggers = dots
    .map((dot) => {
      const id = (dot.getAttribute('href') ?? '').replace(/^#/, '');
      if (id === '' || root.querySelector(`#${id}`) === null) return null;

      return ScrollTrigger.create({
        trigger: `#${id}`,
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
