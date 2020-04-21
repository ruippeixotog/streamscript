class DeepMap<K, V> implements Map<K, V> {
  inner: Map<string, V>;

  constructor() {
    this.inner = new Map();
  }

  get size(): number {
    return this.inner.size;
  }
  get [Symbol.toStringTag](): string {
    return "";
  }

  clear(): void {
    this.inner.clear();
  }
  delete(key: K): boolean {
    return this.inner.delete(JSON.stringify(key));
  }
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    return this.inner.forEach((value, key, _) => callbackfn(value, JSON.parse(key), this), thisArg);
  }
  get(key: K): V | undefined {
    return this.inner.get(JSON.stringify(key));
  }
  has(key: K): boolean {
    return this.inner.has(JSON.stringify(key));
  }
  set(key: K, value: V): this {
    this.inner.set(JSON.stringify(key), value);
    return this;
  }
  [Symbol.iterator](): IterableIterator<[K, V]> {
    throw new Error("not implemented");
  }
  entries(): IterableIterator<[K, V]> {
    throw new Error("not implemented");
  }
  keys(): IterableIterator<K> {
    throw new Error("not implemented");
  }
  values(): IterableIterator<V> {
    throw new Error("not implemented");
  }

  getOrElse(key: K, defaultFunc: () => V): V {
    const v = this.get(key);
    return v !== undefined ? v : defaultFunc();
  }
  getOrElseSet(key: K, defaultFunc: () => V): V {
    let v = this.get(key);
    if (v === undefined) {
      v = defaultFunc();
      this.set(key, v);
    }
    return v;
  }
}

export default DeepMap;
