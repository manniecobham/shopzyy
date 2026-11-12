export class Observable {
  private listeners = new Set<() => void>();
  private _v = 0;
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): number => this._v;
  protected changed(): void {
    this._v++;
    this.listeners.forEach((l) => l());
  }
}
