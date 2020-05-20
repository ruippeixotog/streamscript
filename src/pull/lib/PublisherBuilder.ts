import { Publisher, Subscriber } from "../types";

export class Single<T> implements Publisher<T> {
  private singleValue: T;

  constructor(singleValue: T) {
    this.singleValue = singleValue;
  }

  subscribe(s: Subscriber<T>): void {
    let cancelled = false;
    s.onSubscribe({
      request: () => {
        s.onNext(this.singleValue);
        s.onComplete();
      },
      cancel: () => {
        cancelled = true;
        s.onComplete();
      }
    });
  }
}

class Map<T, U> implements Publisher<U> {
  private inner: Publisher<T>;
  private func: (t: T) => U;

  constructor(inner: Publisher<T>, f: (t: T) => U) {
    this.inner = inner;
    this.func = f;
  }

  subscribe(s: Subscriber<U>): void {
    this.inner.subscribe({
      onSubscribe: s0 => s.onSubscribe(s0),
      onNext: t => s.onNext(this.func(t)),
      onError: err => s.onError(err),
      onComplete: () => s.onComplete()
    });
  }
}

class Tap<T> implements Publisher<T> {
  private inner: Publisher<T>;
  private sub: Subscriber<T>;
  private onRequest: (n: number) => void;
  private onCancel: () => void;

  constructor(inner: Publisher<T>, sub: Subscriber<T>, onRequest?: (n: number) => void, onCancel?: () => void) {
    this.inner = inner;
    this.sub = sub;
    this.onRequest = onRequest || (() => {});
    this.onCancel = onCancel || (() => {});
  }

  subscribe(s: Subscriber<T>): void {
    this.inner.subscribe({
      onSubscribe: s0 => s.onSubscribe({
        request: n => { this.onRequest(n); s0.request(n); },
        cancel: () => { this.onCancel(); s0.cancel(); }
      }),
      onNext: t => { this.sub.onNext(t); s.onNext(t); },
      onError: err => { this.sub.onError(err); s.onError(err); },
      onComplete: () => { this.sub.onComplete(); s.onComplete(); }
    });
  }
}

class Async<T> implements Publisher<T> {
  private inner: Publisher<T>;

  constructor(inner: Publisher<T>) {
    this.inner = inner;
  }

  subscribe(s: Subscriber<T>): void {
    this.inner.subscribe({
      onSubscribe: s0 => s.onSubscribe(s0),
      onNext: t => setImmediate(() => s.onNext(t)),
      onError: err => setImmediate(() => s.onError(err)),
      onComplete: () => setImmediate(() => s.onComplete())
    });
  }
}

class Builder<T> {
  publisher: Publisher<T>;

  constructor(pub: Publisher<T>) {
    this.publisher = pub;
  }

  map<U>(f: (t: T) => U): Builder<U> {
    return new Builder(new Map(this.publisher, f));
  }

  tap(sub: Subscriber<T>, onRequest?: (n: number) => void, onCancel?: () => void): Builder<T> {
    return new Builder(new Tap(this.publisher, sub, onRequest, onCancel));
  }

  async(): Builder<T> {
    return new Builder(new Async(this.publisher));
  }

  build(): Publisher<T> {
    return this.publisher;
  }

  to(sub: Subscriber<T>): void {
    this.publisher.subscribe(sub);
  }
}

export function from<T>(publisher: Publisher<T>): Builder<T> {
  return new Builder(publisher);
}

export function fromSingle<T>(singleValue: T): Builder<T> {
  return new Builder(new Single(singleValue));
}

export default { from, fromSingle };
