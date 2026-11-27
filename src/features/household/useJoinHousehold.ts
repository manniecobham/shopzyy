import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { extractInviteCode } from '../../lib/inviteCode';
import { useAppState, useStoreVersion } from '../../runtime/RuntimeProvider';
import { t as tr } from '../../i18n';

const SLOW_MS = 4000;
const GIVE_UP_MS = 15_000;

// Shared by the setup screen and the Join sheet, so both behave the same.
export function useJoinHousehold(onArrived?: () => void) {
  const runtime = useAppState();
  useStoreVersion();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a successful join the household still has to arrive from the server.
  const [arriving, setArriving] = useState(false);
  const [slow, setSlow] = useState(false);
  const [before, setBefore] = useState(0);
  const [canPaste, setCanPaste] = useState(false);
  const count = runtime.store.allHouseholds().length;

  useEffect(() => { void Clipboard.hasStringAsync().then(setCanPaste).catch(() => {}); }, []);

  useEffect(() => {
    if (!arriving) { setSlow(false); return; }
    const slowId = setTimeout(() => setSlow(true), SLOW_MS);
    const endId = setTimeout(() => {
      setArriving(false);
      setError(tr("You've joined, but your household hasn't arrived yet. Check your connection; it will appear here by itself."));
    }, GIVE_UP_MS);
    return () => { clearTimeout(slowId); clearTimeout(endId); };
  }, [arriving]);

  useEffect(() => {
    if (arriving && count > before) { setArriving(false); onArrived?.(); }
  }, [arriving, count, before, onArrived]);

  const setText = (value: string) => setCode(extractInviteCode(value) ?? value.toUpperCase());

  const paste = async () => {
    const found = extractInviteCode(await Clipboard.getStringAsync().catch(() => ''));
    if (found) setCode(found); else setError(tr("There's no invite code on your clipboard."));
  };

  const join = async () => {
    const value = code.trim();
    if (!value) return;
    setJoining(true);
    setBefore(count);
    const failure = await runtime.joinHousehold(value);
    setError(failure);
    setJoining(false);
    if (!failure) setArriving(true);
  };

  const message = slow ? tr('Still syncing your household…') : tr('Joining household…');
  return { code, setText, joining, arriving, error, canPaste, paste, join, message };
}
