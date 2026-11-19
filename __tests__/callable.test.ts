const mockGetIdToken = jest.fn();
const mockCallable = jest.fn();

jest.mock('@react-native-firebase/auth', () => ({ getAuth: () => ({ currentUser: { getIdToken: mockGetIdToken } }) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => mockCallable }));

import { callFunction } from '../src/services/callable';

const fail = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => { mockGetIdToken.mockReset(); mockCallable.mockReset(); });

describe('callFunction', () => {
  it('returns the data on success without refreshing the token', async () => {
    mockCallable.mockResolvedValue({ data: { ok: 1 } });
    await expect(callFunction('x', {})).resolves.toEqual({ ok: 1 });
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });

  it('refreshes the token and retries once after unauthenticated', async () => {
    mockCallable.mockRejectedValueOnce(fail('functions/unauthenticated')).mockResolvedValueOnce({ data: 'joined' });
    mockGetIdToken.mockResolvedValue('fresh');
    await expect(callFunction('join', {})).resolves.toBe('joined');
    expect(mockGetIdToken).toHaveBeenCalledWith(true);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it('gives up with the original error when the token cannot be refreshed', async () => {
    const original = fail('functions/unauthenticated');
    mockCallable.mockRejectedValue(original);
    mockGetIdToken.mockRejectedValue(fail('auth/user-token-expired'));
    await expect(callFunction('join', {})).rejects.toBe(original);
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('does not retry other errors', async () => {
    mockCallable.mockRejectedValue(fail('functions/not-found'));
    await expect(callFunction('join', {})).rejects.toThrow('functions/not-found');
    expect(mockGetIdToken).not.toHaveBeenCalled();
  });
});
