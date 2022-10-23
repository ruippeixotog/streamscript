import { Publisher, Subscriber, Subscription } from "../types";
import PortBase from "./PortBase";

type Msg<T> =
  { type: "request", sub: Subscriber<T>, n: number } |
  { type: "cancel", sub: Subscriber<T> };

class OutPort<T> extends PortBase<T, Msg<T>> implements Publisher<T> {
  private name: string;
  private compSubscription: Subscription;

  private demand = 0;
  private subscribers: { ref: Subscriber<T>; demand: number }[] = [];

  constructor(name: string, s: Subscription) {
    super();
    this.name = name;
    this.compSubscription = s;
  }

  subscriberCount(): number {
    return this.subscribers.length;
  }

  subscribe<S extends T>(subscriber: Subscriber<S>): void {
    this.subscribers.push({ ref: subscriber, demand: 0 });
    subscriber.onSubscribe({
      request: n => this.enqueueMessage({ type: "request", sub: subscriber, n }),
      cancel: () => this.enqueueMessage({ type: "cancel", sub: subscriber })
    });
  }

  async handleMessage(msg: Msg<T>): Promise<void> {
    switch (msg.type) {
      case "request":
        {
          const subscriberEntries = this.subscribers
            .filter(s0 => s0.ref === msg.sub);

          if (subscriberEntries.length === 0) {
            return;
          }
          subscriberEntries.forEach(s0 => s0.demand += msg.n);
          this._updateSharedDemand();
        }
        break;
      case "cancel":
        msg.sub.onComplete();
        this.subscribers =
            this.subscribers.filter(s0 => s0.ref !== msg.sub);

        if (this.subscribers.length === 0) {
          this.compSubscription.cancel();
          this.terminate();
        } else {
          this._updateSharedDemand();
        }
    }
  }

  requested(): number {
    return this.demand;
  }

  send(t: T): void {
    if (this.isTerminated()) {
      return;
    }
    this.subscribers.forEach(s => s.ref.onNext(t));
    this.demand--;
  }

  complete(): void {
    if (this.isTerminated()) {
      return;
    }
    this.subscribers.forEach(s => s.ref.onComplete());
    // TODO: check if this line is needed
    this.subscribers = [];
    this.terminate();
    this.compSubscription.cancel();
  }

  error(err: Error): void {
    if (this.isTerminated()) {
      return;
    }
    this.subscribers.forEach(s => s.ref.onError(err));
    // TODO: check if this line is needed
    this.subscribers = [];
    this.terminate();
    this.compSubscription.cancel();
  }

  sendOrEnqueue(t: T): void {
    this.demand > 0 ? this.send(t) : this.enqueueData(t);
  }

  private _updateSharedDemand(): void {
    if (this.subscribers.length === 0) return;

    let sharedDemand = this.subscribers.reduce(
      (acc, s) => Math.min(acc, s.demand),
      Number.MAX_SAFE_INTEGER
    );
    this.subscribers.forEach(s => s.demand -= sharedDemand);
    this.demand += sharedDemand;

    while (sharedDemand > 0 && this.queueSize() > 0) {
      this.send(this.dequequeData() as T);
      sharedDemand--;
    }
    if (sharedDemand > 0) {
      this.compSubscription.request(sharedDemand);
    }
  }
}

export default OutPort;
