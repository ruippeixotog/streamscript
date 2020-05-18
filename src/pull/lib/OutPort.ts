import assert from "assert";
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

        let sharedDemand = this.subscribers.reduce(
          (acc, s) => Math.min(acc, s.demand),
          Number.MAX_SAFE_INTEGER
        );

        this.subscribers.forEach(s => s.demand -= sharedDemand);
        this.demand += sharedDemand;

        while (sharedDemand > 0 && this.queueSize() > 0) {
          this._sendInternal(this.dequeque() as T);
          sharedDemand--;
        }
        if (sharedDemand > 0) {
          this.compSubscription.request(sharedDemand);
        }
      },
      cancel: () => {
        this.scheduleMessage(() => subscriber.onComplete());
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
    assert(
      this.state === "active" || this.state === "draining_jobs" && this.demand > 0,
      `${this.name}: Illegal send on out port (${JSON.stringify(t)})`
    );
    this._sendInternal(t);
  }

  complete(): void {
    assert(
      this.state === "active" || this.state === "draining_jobs",
      `${this.name}: Illegal complete on inactive out port`
    );
    this._startDrainSimple();
  }

  error(err: Error): void {
    assert(
      this.state === "active" || this.state === "draining_jobs",
      `${this.name}: Illegal error on inactive out port`
    );
    this._startDrainSimple(err);
  }

  sendOrEnqueue(t: T): void {
    this.demand > 0 ? this.send(t) : this.enqueue(t);
  }

  private _sendInternal(t: T): void {
    this.subscribers.forEach(s => this.scheduleMessage(() => s.ref.onNext(t)));
    this.demand--;
  }

  private _startDrainSimple(err?: Error): void {
    this._startDrain(
      () => {
        this.subscribers.forEach(s =>
          this.scheduleMessage(() => err ? s.ref.onError(err) : s.ref.onComplete())
        );
        // TODO: check if this line is needed
        this.subscribers = [];
      },
      () => this.compSubscription.cancel()
    );
  }
}

export default OutPort;
