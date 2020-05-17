import { Publisher, Subscriber, Subscription } from "../types";
import PortBase from "./PortBase";

class OutPort<T> extends PortBase<T> implements Publisher<T> {
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
      request: (n: number) => {
        if (!this.subscribers.find(s0 => s0.ref === subscriber)) {
          return;
        }
        this.subscribers
          .filter(s0 => s0.ref === subscriber)
          .forEach(s0 => s0.demand += n);

        const sharedDemand =
            this.subscribers.reduce(
              (acc, s) => Math.min(acc, s.demand),
              Number.MAX_SAFE_INTEGER
            );

        if (sharedDemand > 0) {
          this.subscribers.forEach(s => s.demand -= sharedDemand);
          this.demand += sharedDemand;
          this.compSubscription.request(sharedDemand);
        }
      },
      cancel: () => {
        this.schedule(() => subscriber.onComplete());
        this.subscribers =
            this.subscribers.filter(s0 => s0.ref !== subscriber);

        if (this.subscribers.length === 0) {
          this._startDrainSimple();
        }
      }
    });
  }

  requested(): number {
    return this.demand;
  }

  send(t: T): void {
    if (this.state !== "active" || this.demand <= 0) {
      throw new Error(`${this.name}: Illegal send on out port: ${t}`);
    }
    this.subscribers.forEach(s => this.schedule(() => s.ref.onNext(t)));
    this.demand--;
  }

  complete(): void {
    // if(!this.active) {
    //   throw new Error("Illegal complete on out port");
    // }
    this._startDrainSimple();
  }

  error(err: Error): void {
    if (this.state !== "active") {
      throw new Error("Illegal error on out port");
    }
    this._startDrainSimple(err);
  }

  sendAsync(promise: Promise<IteratorResult<T>>): void {
    this.scheduleAsync(() =>
      promise
        .then(v => v.done ? this.complete() : this.send(v.value))
        .catch(err => this.error(err))
    );
  }

  private _startDrainSimple(err?: Error): void {
    this._startDrain(
      () => {
        this.subscribers.forEach(s =>
          this.schedule(() => err ? s.ref.onError(err) : s.ref.onComplete())
        );
        // TODO: check if this line is needed
        this.subscribers = [];
      },
      () => this.compSubscription.cancel()
    );
  }
}

export default OutPort;
