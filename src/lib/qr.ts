import qrcode from 'qrcode-generator';

export interface QrRun { start: number; length: number }

// Rows of dark runs, so a code of about 1,000 squares is drawn with a few hundred views instead.
// Highest error correction, so the logo can cover the middle and the code still scans.
export function qrRuns(text: string): { size: number; rows: QrRun[][] } {
  const qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const rows: QrRun[][] = [];
  for (let r = 0; r < size; r++) {
    const runs: QrRun[] = [];
    let start = -1;
    for (let c = 0; c <= size; c++) {
      const dark = c < size && qr.isDark(r, c);
      if (dark && start < 0) start = c;
      if (!dark && start >= 0) { runs.push({ start, length: c - start }); start = -1; }
    }
    rows.push(runs);
  }
  return { size, rows };
}
