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
    this.inner.add(JSON.stringify(value));
    return this;
  }
  clear(): void {
    this.inner.clear();
  }
  delete(value: T): boolean {
    return this.inner.delete(JSON.stringify(value));
  }
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    return this.inner.forEach((value, value2, _) => callbackfn(JSON.parse(value), JSON.parse(value2), this), thisArg);
  }
  has(key: T): boolean {
    return this.inner.has(JSON.stringify(key));
  }
  [Symbol.iterator](): IterableIterator<T> {
    throw new Error("not implemented");
  }
  entries(): IterableIterator<[T, T]> {
    throw new Error("not implemented");
  }
  keys(): IterableIterator<T> {
    throw new Error("not implemented");
  }
  values(): IterableIterator<T> {
    throw new Error("not implemented");
  }
}

export default DeepSet;
