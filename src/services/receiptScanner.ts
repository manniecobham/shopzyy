import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import { ReceiptOcr } from '../../modules/receipt-ocr';
import { rowsFromFragments } from '../logic/receiptRows';
import { parseReceipt, type ParsedReceipt } from '../logic/receiptParser';

export type ReceiptSource = 'camera' | 'library';
export type ScanResult = { receipt: ParsedReceipt } | { cancelled: true } | { error: 'permission' | 'unsupported' | 'unreadable' | 'failed' };

const MAX_WIDTH = 2000;
const READ_TIMEOUT_MS = 25_000;

const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), READ_TIMEOUT_MS))]);

type DocumentScanner = { scanDocument(o: object): Promise<{ scannedImages?: string[]; status?: string }> };
const documentScanner = (): DocumentScanner | null => {
  try { return require('react-native-document-scanner-plugin').default; } catch { return null; }
};

export const receiptScanningAvailable = (): boolean => ReceiptOcr !== null;

const asFileUri = (p: string) => (p.startsWith('/') ? `file://${p}` : p);

const discard = (uri: string | undefined, always: boolean) => {
  if (!uri || !(always || uri.startsWith(Paths.cache.uri))) return;
  try { new File(uri).delete(); } catch {}
};

async function capture(source: ReceiptSource): Promise<{ uri: string; width?: number; ours: boolean } | 'cancelled' | 'permission'> {
  if (source === 'camera') {
    const scanner = documentScanner();
    if (scanner) {
      try {
        const result = await scanner.scanDocument({ maxNumDocuments: 1, croppedImageQuality: 100 });
        const page = result.scannedImages?.[0];
        if (result.status === 'cancel' || !page) return 'cancelled';
        return { uri: asFileUri(page), ours: true };
      } catch (e) {
        if (__DEV__) console.log('[receipt] document scanner failed, using the plain camera', e);
      }
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'permission';
    const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = shot.canceled ? null : shot.assets[0];
    return asset ? { uri: asset.uri, width: asset.width, ours: true } : 'cancelled';
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? null : picked.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, ours: false } : 'cancelled';
}

export async function scanReceipt(source: ReceiptSource, onReading?: () => void): Promise<ScanResult> {
  if (!ReceiptOcr) return { error: 'unsupported' };

  const shot = await capture(source);
  if (shot === 'cancelled') return { cancelled: true };
  if (shot === 'permission') return { error: 'permission' };

  onReading?.();
  let prepared: string | undefined;
  try {
    let ctx = ImageManipulator.ImageManipulator.manipulate(shot.uri);
    if (shot.width === undefined || shot.width > MAX_WIDTH) ctx = ctx.resize({ width: MAX_WIDTH });
    prepared = (await (await ctx.renderAsync()).saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.92 })).uri;

    const { width, height, fragments } = await withTimeout(ReceiptOcr.recognize(prepared));
    const rows = rowsFromFragments(fragments, width / height);
    if (__DEV__) console.log('[receipt] rows', rows);
    if (rows.length === 0) return { error: 'unreadable' };

    const receipt = parseReceipt(rows);
    return receipt.items.length === 0 && receipt.total === null ? { error: 'unreadable' } : { receipt };
  } catch (e) {
    if (__DEV__) console.log('[receipt] failed', e);
    return { error: 'failed' };
  } finally {
    discard(prepared, true);
    discard(shot.uri, shot.ours);
  }
}
