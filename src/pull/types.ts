import {ComponentSpec} from "../types";

export interface Publisher<T> {
  subscribe<S extends T>(s: Subscriber<S>): void;
}

export interface Subscriber<T> {
  onSubscribe(s: Subscription): void;
  onNext(t: T): void;
  onError(e: Error): void;
  onComplete(): void;
}

export interface Subscription {
  request(n: number): void;
  cancel(): void;
}

export interface Component<Ins extends any[], Outs extends any[]> {
  readonly spec: ComponentSpec;

  subscriberFor<K extends number & keyof Ins>(idx: K): Subscriber<Ins[K]>;
  publisherFor<K extends number & keyof Outs>(idx: K): Publisher<Outs[K]>;

  start(): void;
  terminate(): void;
  whenTerminated(): Promise<void>;
}
