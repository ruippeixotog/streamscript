import { Publisher, Subscriber, Subscription } from "../types";

export class Single<T> implements Publisher<T> {
  private singleValue: T;

  constructor(singleValue: T) {
    this.singleValue = singleValue;
  }

  subscribe(s: Subscriber<T>): void {
    let cancelled = false;
    s.onSubscribe({
      request: () => {
        if (cancelled) return;
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
  private subscriber: Subscriber<T>;
  private subscription?: Subscription;

  constructor(inner: Publisher<T>, subscriber: Subscriber<T>, subscription?: Subscription) {
    this.inner = inner;
    this.subscriber = subscriber;
    this.subscription = subscription;
  }

  subscribe(s: Subscriber<T>): void {
    this.inner.subscribe({
      onSubscribe: s0 => s.onSubscribe({
        request: n => { this.subscription?.request(n); s0.request(n); },
        cancel: () => { this.subscription?.cancel(); s0.cancel(); }
      }),
      onNext: t => { this.subscriber.onNext(t); s.onNext(t); },
      onError: err => { this.subscriber.onError(err); s.onError(err); },
      onComplete: () => { this.subscriber.onComplete(); s.onComplete(); }
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

  tap(sub: Subscriber<T>, subscription?: Subscription): Builder<T> {
    return new Builder(new Tap(this.publisher, sub, subscription));
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
