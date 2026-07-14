// Ported verbatim (selectors, attribute names, and keying scheme unchanged) from the
// live index.html inline script, "Compact i18n (TH default / EN)" section
// (index.html lines ~2948-3032). Source: TH is captured from the DOM at runtime
// (data-i18n innerHTML at load time); EN comes from src/i18n/en.json.
//
// Selectors/attributes kept identical on purpose so Task 4's Nav toggle buttons
// and Task 6's page markup match without changes:
//   [data-i18n]          - any element whose innerHTML is swapped between TH/EN
//   .lang-toggle button  - the toggle control(s); each button carries data-lang="th"|"en"
//   aria-pressed          - reflects the active language on each toggle button
//
// Addition vs. the live source: the live index.html toggle does NOT persist the
// chosen language (confirmed via grep - no `localStorage` anywhere in index.html).
// This module adds localStorage persistence (key "lang") because the brief's
// Step 2 explicitly specifies it as part of this port's produced interface, and
// the verify step gates on it. It is additive only - it does not rename any key
// or selector, and does not change the TH/EN string content.

export type Dict = Record<string, string>;

const STORAGE_KEY = 'lang';

export function initI18n(EN: Dict): void {
  var TH: Dict = {};
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (key) TH[key] = el.innerHTML;
  });

  function setLang(lang: string) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = lang === 'en' ? EN[key] : TH[key];
      if (val !== undefined) el.innerHTML = val;
    });
    document.querySelectorAll('.lang-toggle button').forEach(function (b) {
      var btn = b as HTMLElement;
      btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
    });
    // recompute open FAQ heights after text swap
    document.querySelectorAll('.faq-item.open .faq-a').forEach(function (a) {
      var faqA = a as HTMLElement;
      faqA.style.maxHeight = faqA.scrollHeight + 'px';
    });
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // localStorage unavailable (private mode / disabled) - in-memory toggle still works
    }
  }

  // Defensive: Task 4 adds the .lang-toggle buttons to the Nav component. Until
  // then, or if the Nav markup is ever missing, querySelectorAll returns an empty
  // NodeList and forEach is a no-op - this never throws.
  document.querySelectorAll('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = (b as HTMLElement).dataset.lang;
      if (lang) setLang(lang);
    });
  });

  // Re-apply persisted lang on load, if any was saved by a previous visit.
  var saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    saved = null;
  }
  if (saved === 'en' || saved === 'th') {
    setLang(saved);
  }
}
