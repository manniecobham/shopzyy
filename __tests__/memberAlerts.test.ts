import { cleanDisplayName, joinedAlert } from '../functions/src/messages';

describe('join alert text', () => {
  it('names the person, the household and the new size, in the device language', () => {
    expect(joinedAlert('Ama', 'The Mensah home', 3, 'en')).toEqual({ title: 'Ama joined The Mensah home', body: 'Your household now has 3 members.' });
    expect(joinedAlert('Ama', 'Haus', 2, 'de').title).toBe('Ama ist Haus beigetreten');
  });

  it('falls back to "Someone" and a generic household name', () => {
    expect(joinedAlert('', '', 2, 'en').title).toBe('Someone joined Shared household');
    expect(joinedAlert('', 'Home', 2, 'nl').title).toContain('Iemand');
  });

  it('keeps a typed name safe to put in someone else\'s notification', () => {
    expect(cleanDisplayName('  Ama\n\tMensah  ')).toBe('Ama Mensah');
    expect(cleanDisplayName('x'.repeat(100))).toHaveLength(40);
    expect(cleanDisplayName(undefined)).toBe('');
    expect(cleanDisplayName({ evil: true })).toBe('');
  });
});
