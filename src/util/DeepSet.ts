import stableStringify from "json-stable-stringify";

class DeepSet<T> implements Set<T> {
  inner: Set<string>;

  constructor() {
    this.inner = new Set();
  }

  get size(): number {
    return this.inner.size;
  }
  get [Symbol.toStringTag](): string {
    return "";
  }

  add(value: T): this {
    this.inner.add(stableStringify(value));
    return this;
  }
  clear(): void {
    this.inner.clear();
  }
  delete(value: T): boolean {
    return this.inner.delete(stableStringify(value));
  }
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: unknown): void {
    return this.inner.forEach((value, value2) => callbackfn(JSON.parse(value), JSON.parse(value2), this), thisArg);
  }
  has(key: T): boolean {
    return this.inner.has(stableStringify(key));
  }
  [Symbol.iterator](): IterableIterator<T> {
    return this.keys();
  }
  *entries(): IterableIterator<[T, T]> {
    for (const [k1, k2] of this.inner.entries()) {
      yield [JSON.parse(k1), JSON.parse(k2)];
    }
  }
  *keys(): IterableIterator<T> {
    for (const k of this.inner.keys()) {
      yield JSON.parse(k);
    }
  }
  values(): IterableIterator<T> {
    return this.keys();
  }
}

export default DeepSet;
