import { readFileSync } from 'node:fs';
import { escapeHtml, invitePreview, renderInvitePage } from '../functions/src/invitePreview';

const template = readFileSync(`${__dirname}/../hosting/join.html`, 'utf8');
const render = (title: string) => renderInvitePage(template, { title, description: 'd' }, 'https://x.test/join/ABCD2345', 'https://x.test/og.png');

describe('invite link preview', () => {
  test('names the inviter and the household, in the visitor’s language', () => {
    expect(invitePreview('en', 'Home', 'Ada Lovelace').title).toBe('Ada invited you to Home on Shopzyy');
    expect(invitePreview('de', 'Zuhause', 'Ada').title).toBe('Ada hat dich zu Zuhause auf Shopzyy eingeladen');
  });

  test('falls back gracefully when a name is missing', () => {
    expect(invitePreview('en', 'Home', '').title).toBe("You're invited to Home on Shopzyy");
    expect(invitePreview('en', '', '').title).toBe("You're invited to a household on Shopzyy");
    expect(invitePreview('en', null, null).title).toBe("You're invited to a household on Shopzyy");
  });

  test('only the first name of the inviter is shown and long names are cut', () => {
    expect(invitePreview('en', 'x'.repeat(200), 'Ada Lovelace').title).toContain('Ada invited you');
    expect(invitePreview('en', 'x'.repeat(200), 'Ada').title.length).toBeLessThan(120);
  });

  test('user-supplied names cannot inject markup', () => {
    const page = render(invitePreview('en', '"><script>alert(1)</script>', 'Eve').title);
    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('&lt;script&gt;');
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  test('the page carries the preview tags and keeps its own script', () => {
    const page = render('Ada invited you to Home on Shopzyy');
    expect(page).toContain('<meta property="og:title" content="Ada invited you to Home on Shopzyy">');
    expect(page).toContain('<meta property="og:image" content="https://x.test/og.png">');
    expect(page).toContain('<meta property="og:url" content="https://x.test/join/ABCD2345">');
    expect(page.match(/og:title/g)).toHaveLength(1);
    expect(page).toContain("shopzyy://join/");
  });
});
