import stableStringify from "json-stable-stringify";

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
    return this.inner.delete(stableStringify(key));
  }
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    return this.inner.forEach((value, key, _) => callbackfn(value, JSON.parse(key), this), thisArg);
  }
  get(key: K): V | undefined {
    return this.inner.get(stableStringify(key));
  }
  has(key: K): boolean {
    return this.inner.has(stableStringify(key));
  }
  set(key: K, value: V): this {
    this.inner.set(stableStringify(key), value);
    return this;
  }
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
  *entries(): IterableIterator<[K, V]> {
    for (const [k, v] of this.inner.entries()) {
      yield [JSON.parse(k), v];
    }
  }
  *keys(): IterableIterator<K> {
    for (const k of this.inner.keys()) {
      yield JSON.parse(k);
    }
  }
  values(): IterableIterator<V> {
    return this.inner.values();
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
