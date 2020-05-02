import {ComponentSpec} from "../../types";
import {Component, Publisher, Subscriber, Subscription} from "../types";
import Deferred from "../../util/Deferred";

abstract class BaseComponent<Ins extends any[], Outs extends any[]> implements Component<Ins, Outs> {
  static readonly spec: ComponentSpec;

  inState: {
    queue: Ins[number][],
    demanded: number,
    subscriptions: { ref: Subscription, demanded: number }[]
  }[];

  outState: {
    demand: number,
    subscribers: { ref: Subscriber<Outs[number]>, demand: number }[],
  }[];

  whenTerminatedHandler: Deferred<void>;

  abstract onNext(idx: number, value: Ins[number]): void;
  abstract onRequest(idx: number, n: number): void;

  onError(idx: number, err: Error): void {
    this.errorAll(err);
  }

  onComplete(idx: number): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  onCancel(idx: number): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  constructor() {
    this.inState = this.spec.ins.map(_ => ({
      queue: [],
      demanded: 0,
      subscriptions: []
    }));
    this.outState = this.spec.outs.map(_ => ({
      subscribers: [],
      demand: 0
    }));
    this.whenTerminatedHandler = new Deferred();
  }

  get spec(): ComponentSpec {
    return (<any> this.constructor).spec;
  }

  start(): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  terminate(): void {
    this.inState.forEach((_, i) => this.cancelIn(i));
    this.outState.forEach((_, i) => this.completeOut(i));
  }

  whenTerminated(): Promise<any> {
    return this.whenTerminatedHandler.promise;
  }

  subscriberFor(idx: number): Subscriber<Ins[number]> {
    const localSubs: Subscription[] = [];
    return {
      onSubscribe: s => {
        localSubs.push(s);
        this.inState[idx].subscriptions.push({ ref: s, demanded: 0 });
      },
      onNext: value => {
        console.log(`${this.constructor.name}[${idx}] Received ${JSON.stringify(value)}`);
        const st = this.inState[idx];
        if(st.demanded === 0) {
          st.queue.push(value);
        } else {
          st.demanded--;
          this.onNext(idx, value);
        }
        st.subscriptions
          .filter(s => localSubs.indexOf(s.ref) === -1)
          .forEach(s => s.demanded--);
      },
      onError: err => {
        console.log(`${this.constructor.name}[${idx}] Received <error>`);
        this.inState[idx].subscriptions = this.inState[idx].subscriptions
          .filter(s => localSubs.indexOf(s.ref) === -1);
        this.onError(idx, err);
      },
      onComplete: () => {
        console.log(`${this.constructor.name}[${idx}] Received <complete>`);
        const newSubscriptions = this.inState[idx].subscriptions =
          this.inState[idx].subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);
        if(newSubscriptions.length == 0) {
          this.onComplete(idx);
        }
      }
    }
  }

  publisherFor(idx: number): Publisher<Outs[number]> {
    const st = this.outState[idx];
    return {
      subscribe: s => {
        this.outState[idx].subscribers.push({ ref: s, demand: 0 });
        s.onSubscribe({
          request: (n: number) => {
            if(!st.subscribers.find(s0 => s0.ref === s)) {
              return;
            }
            console.log(`${this.constructor.name}[${idx}] received request of ${n}`);
            st.subscribers
              .filter(s0 => s0.ref === s)
              .forEach(s0 => s0.demand += n);

            const sharedDemand =
              st.subscribers.reduce((acc, s) => Math.min(acc, s.demand), Number.MAX_SAFE_INTEGER);

            if(sharedDemand > 0) {
              st.subscribers.forEach(s => s.demand -= sharedDemand);
              st.demand += sharedDemand;
              this.onRequest(idx, sharedDemand);
            }
          },
          cancel: () => {
            setImmediate(() => s.onComplete());
            const newSubscribers = this.outState[idx].subscribers =
              this.outState[idx].subscribers.filter(s0 => s0.ref !== s);

            if(newSubscribers.length === 0) {
              this.onCancel(idx);
              this.completeOut(idx);
            }
          }
        });
      }
    }
  }

  requestIn(idx: number, n: number): void {
    console.log(`${this.constructor.name} requested ${n} on port ${idx}`);

    const st = this.inState[idx];
    while(n > 0 && st.queue.length > 0) {
      this.onNext(idx, st.queue.shift());
      n--;
    }
    st.demanded += n;
    st.subscriptions
      .filter(s => s.demanded < st.demanded)
      .forEach(s => setImmediate(() => s.ref.request(st.demanded - s.demanded)));
  }

  cancelIn(idx: number): void {
    this.inState[idx].subscriptions.forEach(s => setImmediate(() => s.ref.cancel()));
  }

  sendOut(idx: number, value: Outs[number]): void {
    const st = this.outState[idx];
    if(st.demand <= 0) {
      throw new Error(`${this.constructor.name}: Unexpected sendOut on ${idx}`);
    }
    st.subscribers.forEach(sub => setImmediate(() => sub.ref.onNext(value)));
    st.demand--;
  }

  completeOut(idx: number): void {
    this.outState[idx].subscribers.forEach(sub => setImmediate(() => sub.ref.onComplete()));
    this.outState[idx].subscribers = [];
  }

  errorOut(idx: number, err: Error): void {
    this.outState[idx].subscribers.forEach(sub => sub.ref.onError(err));
    this.outState[idx].subscribers = [];
  }

  errorAll(err: Error): void {
    this.inState.forEach((_, i) => this.cancelIn(i));
    this.outState.forEach((_, i) => this.errorOut(i, err));
  }

  _checkTermination() {
    const insDone = this.spec.ins.length > 0 &&
      this.inState.every(st => st.subscriptions.length === 0);
    const outsDone = this.spec.outs.length > 0 &&
      this.outState.every(st => st.subscribers.length === 0);

    if(insDone || outsDone) {
      this.terminate();
    }
  }

  _checkIfTerminated() {
    const insDone = this.spec.ins.length === 0 ||
      this.inState.every(st => st.subscriptions.length === 0);
    const outsDone = this.spec.outs.length === 0 ||
      this.outState.every(st => st.subscribers.length === 0);

    if(insDone && outsDone) {
      console.log(`Complete ${this.constructor.name}`);
      this.whenTerminatedHandler.resolve();
    }
  }
}

// export type Source<T> = Component<[], [T]>;
// export type Flow<T, U> = Component<[T], [U]>;
// export type FanIn<T, U> = Component<T[], [U]>;
// export type FanIn2<A1, A2, U> = Component<[A1, A2], [U]>;
// export type FanIn3<A1, A2, A3, U> = Component<[A1, A2, A3], [U]>;
// export type Sink<T> = Component<[T], []>;

export default BaseComponent;
