export interface Fragment { text: string; x: number; y: number; width: number; height: number }

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const rotate = (f: Fragment, aspect: number, angle: number) => {
  const cx = (f.x + f.width / 2) * aspect;
  const cy = f.y + f.height / 2;
  return { x: cx * Math.cos(angle) + cy * Math.sin(angle), y: cy * Math.cos(angle) - cx * Math.sin(angle) };
};

function bestSkew(frags: Fragment[], aspect: number, binSize: number): number {
  let best = 0;
  let bestScore = -1;
  for (let deg = -12; deg <= 12; deg += 0.5) {
    const angle = (deg * Math.PI) / 180;
    const bins = new Map<number, number>();
    for (const f of frags) {
      const bin = Math.floor(rotate(f, aspect, angle).y / binSize);
      bins.set(bin, (bins.get(bin) ?? 0) + 1);
    }
    let score = 0;
    for (const n of bins.values()) score += n * n;
    if (score > bestScore + 1e-9) { bestScore = score; best = angle; }
  }
  return best;
}

export function rowsFromFragments(all: Fragment[], aspect = 0.75): string[] {
  const frags = all.filter((f) => f.text.trim() && f.height > 0);
  if (frags.length === 0) return [];
  const h = median(frags.map((f) => f.height));
  const angle = frags.length >= 6 ? bestSkew(frags, aspect, h / 2) : 0;

  const placed = frags.map((f) => ({ f, ...rotate(f, aspect, angle) })).sort((a, b) => a.y - b.y);
  const rows: { y: number; count: number; items: typeof placed }[] = [];
  for (const p of placed) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(p.y - row.y) <= 0.55 * Math.max(h, p.f.height)) {
      row.items.push(p);
      row.y = (row.y * row.count + p.y) / (row.count + 1);
      row.count += 1;
    } else {
      rows.push({ y: p.y, count: 1, items: [p] });
    }
  }
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.f.text.trim()).join(' '));
}
