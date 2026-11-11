import { keys } from '../scripts/i18n-keys';
import de from '../src/i18n/locales/de';
import es from '../src/i18n/locales/es';
import fr from '../src/i18n/locales/fr';
import it from '../src/i18n/locales/it';
import nl from '../src/i18n/locales/nl';
import { __setLanguageForTests, t, tn } from '../src/i18n';

const catalogs = { es, fr, nl, de, it };
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translations', () => {
  const all = keys();
  for (const [lang, catalog] of Object.entries(catalogs)) {
    test(`${lang} covers every string`, () => {
      expect(all.filter((k) => !(k in catalog))).toEqual([]);
    });
    test(`${lang} keeps placeholders and has no stale keys`, () => {
      expect(all.filter((k) => k in catalog && placeholders(catalog[k]) !== placeholders(k))).toEqual([]);
      expect(Object.keys(catalog).filter((k) => !all.includes(k))).toEqual([]);
    });
  }

  test('falls back to English and fills params', () => {
    __setLanguageForTests('fr');
    expect(t('Definitely not a key {x}', { x: 1 })).toBe('Definitely not a key 1');
    expect(tn('{n} item', '{n} items', 2)).not.toContain('{n}');
    __setLanguageForTests('en');
  });
});
