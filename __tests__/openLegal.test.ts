const mockOpenBrowser = jest.fn();
const mockOpenURL = jest.fn();

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowser(...args),
  WebBrowserPresentationStyle: { PAGE_SHEET: 'pageSheet' },
}));
jest.mock('react-native', () => ({ Linking: { openURL: (u: string) => mockOpenURL(u) }, Platform: { OS: 'ios', Version: '18' }, useColorScheme: () => 'light' }));

import { openLegal } from '../src/lib/openLegal';

beforeEach(() => { mockOpenBrowser.mockReset(); mockOpenURL.mockReset(); });

describe('openLegal', () => {
  it('opens the page inside the app', async () => {
    mockOpenBrowser.mockResolvedValue({ type: 'dismiss' });
    await openLegal('https://shopzyy.manniedev.com/privacy');
    expect(mockOpenBrowser).toHaveBeenCalledWith('https://shopzyy.manniedev.com/privacy', expect.objectContaining({ presentationStyle: 'pageSheet' }));
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('falls back to the phone browser if the in-app one fails', async () => {
    mockOpenBrowser.mockRejectedValue(new Error('unavailable'));
    await openLegal('https://shopzyy.manniedev.com/terms');
    expect(mockOpenURL).toHaveBeenCalledWith('https://shopzyy.manniedev.com/terms');
  });
});
