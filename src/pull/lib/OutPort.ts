import {Publisher, Subscriber, Subscription} from "../types";
import Deferred from "../../util/Deferred";

class OutPort<T> implements Publisher<T> {
  private name: string;
  private compSubscription: Subscription;
  private active: boolean = true;

  private demand: number = 0;
  private subscribers: { ref: Subscriber<T>, demand: number }[] = [];

  constructor(name: string, s: Subscription) {
    this.name = name;
    this.compSubscription = s;
  }

  subscriberCount() {
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
          setImmediate(() => subscriber.onComplete());
          const newSubscribers = this.subscribers =
            this.subscribers.filter(s0 => s0.ref !== subscriber);

          if (newSubscribers.length === 0) {
            this.compSubscription.cancel();
          }
        }
      });
  }

  send(t: T): void {
    if(!this.active || this.demand <= 0) {
      throw new Error("Illegal send on out port");
    }
    this.subscribers.forEach(s => setImmediate(() => s.ref.onNext(t)));
    this.demand--;
  }

  complete(): void {
    // if(!this.active) {
    //   throw new Error("Illegal complete on out port");
    // }
    this.subscribers.forEach(s => setImmediate(() => s.ref.onComplete()));
    this.subscribers = [];
    this.active = false;
  }

  error(e: Error): void {
    if(!this.active) {
      throw new Error("Illegal error on out port");
    }
    this.subscribers.forEach(s => s.ref.onError(e));
    this.subscribers = [];
    this.active = false;
  }
}

export default OutPort;
