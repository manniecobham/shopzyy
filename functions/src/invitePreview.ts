import type { Lang } from './messages';

interface Copy { household: string; invitedBy: string; invited: string; description: string }

const COPY: Record<Lang, Copy> = {
  en: { household: 'a household', invitedBy: '{inviter} invited you to {household} on Shopzyy', invited: "You're invited to {household} on Shopzyy", description: 'Tap to join the shared shopping list and add items together.' },
  es: { household: 'un hogar', invitedBy: '{inviter} te ha invitado a {household} en Shopzyy', invited: 'Te han invitado a {household} en Shopzyy', description: 'Toca para unirte a la lista de la compra compartida y añadir artículos juntos.' },
  fr: { household: 'un foyer', invitedBy: '{inviter} vous invite dans {household} sur Shopzyy', invited: 'Vous êtes invité(e) dans {household} sur Shopzyy', description: 'Touchez pour rejoindre la liste de courses partagée et ajouter des articles ensemble.' },
  nl: { household: 'een huishouden', invitedBy: '{inviter} heeft je uitgenodigd voor {household} op Shopzyy', invited: 'Je bent uitgenodigd voor {household} op Shopzyy', description: 'Tik om mee te doen met de gedeelde boodschappenlijst en samen artikelen toe te voegen.' },
  de: { household: 'einem Haushalt', invitedBy: '{inviter} hat dich zu {household} auf Shopzyy eingeladen', invited: 'Du wurdest zu {household} auf Shopzyy eingeladen', description: 'Tippe, um der gemeinsamen Einkaufsliste beizutreten und gemeinsam Artikel hinzuzufügen.' },
  it: { household: 'una casa', invitedBy: '{inviter} ti ha invitato in {household} su Shopzyy', invited: 'Sei stato invitato in {household} su Shopzyy', description: 'Tocca per unirti alla lista della spesa condivisa e aggiungere articoli insieme.' },
};

const MAX_NAME = 60;

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

export function invitePreview(lang: Lang, household: string | null | undefined, inviter: string | null | undefined): { title: string; description: string } {
  const c = COPY[lang];
  const name = clean(household) || c.household;
  const first = clean(inviter).split(' ')[0];
  const title = (first ? c.invitedBy : c.invited).replace('{inviter}', first).replace('{household}', name);
  return { title, description: c.description };
}

export function renderInvitePage(template: string, preview: { title: string; description: string }, url: string, image: string): string {
  const title = escapeHtml(preview.title);
  const description = escapeHtml(preview.description);
  const block = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Shopzyy">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="1200">',
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join('\n');
  return template.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => block);
}
