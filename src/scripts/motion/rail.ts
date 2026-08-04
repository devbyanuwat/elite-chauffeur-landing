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

  const triggers = stops.map((stop, index) =>
    ScrollTrigger.create({
      trigger: `#${stop.id}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (!self.isActive) return;
        dots.forEach((dot, i) => {
          dot.classList.toggle('on', i === index);
          // Colour alone (the .on class) isn't enough for screen readers —
          // aria-current names the active chapter's link explicitly.
          if (i === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
        if (label) label.textContent = dots[index]?.dataset.railName ?? '';
      },
    })
  );

  rail.classList.add('rail-ready');

  return () => {
    triggers.forEach((trigger) => trigger.kill());
    rail.classList.remove('rail-ready');
  };
}
