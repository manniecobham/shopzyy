export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
}

export function charCount(text: string): number {
  return Array.from(text).length;
}

export function sameName(a: string, b: string): boolean {
  return fold(a) === fold(b);
}
