const CODE = /(?:^|[^A-Za-z0-9])([A-HJKMNP-Za-hjkmnp-z2-9]{8})(?![A-Za-z0-9])/;

// Finds an invite code in pasted text, a /join/CODE link, or a Play install referrer such as "join=CODE".
export function extractInviteCode(text: string | null | undefined): string | null {
  const match = CODE.exec(text ?? '');
  return match ? match[1].toUpperCase() : null;
}
