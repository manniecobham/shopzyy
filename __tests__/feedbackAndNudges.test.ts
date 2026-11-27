jest.mock('@react-native-firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), getFirestore: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

import { cleanFeedback } from '../functions/src/feedback';
import { ALL_EMOJI, EMOJI_CATEGORIES } from '../src/lib/emojiData';
import { shouldAskForReview } from '../src/lib/reviewPrompt';
import { AppConfigService } from '../src/services/AppConfig';

const store = (initial: Record<string, unknown>) => {
  const data = new Map<string, unknown>(Object.entries(initial));
  return { getJSON: (k: string) => data.get(k) ?? null, setJSON: (k: string, v: unknown) => { data.set(k, v); } } as never;
};

describe('feedback cleaning', () => {
  test('keeps a trimmed, capped message and known fields', () => {
    const c = cleanFeedback({ kind: 'idea', message: `  ${'a'.repeat(1200)}  `, contactMe: true, platform: 'ios', appVersion: '1.3.0' });
    expect(c?.message).toHaveLength(1000);
    expect(c).toMatchObject({ kind: 'idea', contactMe: true, platform: 'ios', appVersion: '1.3.0' });
  });
  test('rejects empty messages and falls back on unknown values', () => {
    expect(cleanFeedback({ message: ' hi ' })).toBeNull();
    expect(cleanFeedback(undefined)).toBeNull();
    expect(cleanFeedback({ message: 'it crashes', kind: 'weird', platform: 'tizen', contactMe: 'yes' })).toMatchObject({ kind: 'other', platform: 'unknown', contactMe: false });
  });
});

describe('review prompt', () => {
  const day = (n: number) => new Date(2026, 10, 1 + n, 12);
  const uses = (days: number, perDay: number) => Array.from({ length: days * perDay }, (_, i) => day(Math.floor(i / perDay)));
  const now = new Date(2026, 11, 1).getTime();
  test('needs enough purchases across enough days', () => {
    expect(shouldAskForReview(uses(1, 20), null, now)).toBe(false);
    expect(shouldAskForReview(uses(3, 2), null, now)).toBe(false);
    expect(shouldAskForReview(uses(3, 6), null, now)).toBe(true);
  });
  test('does not ask again for a long while', () => {
    expect(shouldAskForReview(uses(3, 6), now - 10 * 86400000, now)).toBe(false);
    expect(shouldAskForReview(uses(3, 6), now - 200 * 86400000, now)).toBe(true);
  });
});

describe('update nudge', () => {
  test('shows only when a newer version exists, and pauses after Later', () => {
    const svc = new AppConfigService(store({ 'shopzy.remoteConfig': { latestVersionIos: '1.3.0', latestVersionAndroid: '1.0.0' } }), '1.2.0');
    expect(svc.updateOffered).toBe(true);
    expect(svc.updateNudgeVisible(1000)).toBe(true);
    svc.dismissUpdateNudge(1000);
    expect(svc.updateNudgeVisible(1000 + 86400000)).toBe(false);
    expect(svc.updateNudgeVisible(1000 + 4 * 86400000)).toBe(true);
  });
  test('stays quiet on the latest version and when an update is already required', () => {
    expect(new AppConfigService(store({ 'shopzy.remoteConfig': { latestVersionIos: '1.2.0' } }), '1.2.0').updateOffered).toBe(false);
    expect(new AppConfigService(store({ 'shopzy.remoteConfig': { latestVersionIos: '1.3.0', minimumVersion: '1.3.0' } }), '1.2.0').updateOffered).toBe(false);
  });
  test('falls back to the store page when none is configured', () => {
    expect(new AppConfigService(store({}), '1.0.0').storeUrl).toContain('apps.apple.com');
  });
});

describe('emoji keypad data', () => {
  test('has no duplicates and no empty entries', () => {
    expect(ALL_EMOJI.every((e) => e.length > 0)).toBe(true);
    expect(new Set(ALL_EMOJI).size).toBe(ALL_EMOJI.length);
    expect(EMOJI_CATEGORIES.every((c) => c.emoji.length >= 25)).toBe(true);
  });
});

describe('skin tones', () => {
  const { withTone, toneOf, supportsTone } = jest.requireActual('../src/lib/emojiData');
  test('adds a tone to people and hands, and leaves the rest alone', () => {
    expect(withTone('👍', 3)).toBe('👍\u{1F3FD}');
    expect(withTone('✌️', 5)).toBe('✌\u{1F3FF}');
    expect(withTone('🐶', 4)).toBe('🐶');
    expect(withTone('👩', 0)).toBe('👩');
  });
  test('keeps joined emoji intact', () => {
    expect(withTone('👩‍🦱', 2)).toBe('👩\u{1F3FC}‍🦱');
    expect(supportsTone('👩‍⚕️')).toBe(true);
    expect(toneOf('👩\u{1F3FE}‍🦱')).toBe(4);
  });
});
