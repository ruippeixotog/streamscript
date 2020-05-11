import { Publisher, Subscriber, Subscription } from "../types";
import AsyncJobStore from "../../util/AsyncJobStore";

class OutPort<T> implements Publisher<T> {
  private name: string;
  private compSubscription: Subscription;
  private active = true;
  private asyncJobs: AsyncJobStore = new AsyncJobStore();

  private demand = 0;
  private subscribers: { ref: Subscriber<T>; demand: number }[] = [];

  constructor(name: string, s: Subscription) {
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
        this.asyncJobs.add(() => subscriber.onComplete());
        const newSubscribers = this.subscribers =
            this.subscribers.filter(s0 => s0.ref !== subscriber);

        if (newSubscribers.length === 0) {
          this.compSubscription.cancel();
        }
      }
    });
  }

  requested(): number {
    return this.demand;
  }

  send(t: T): void {
    if (!this.active || this.demand <= 0) {
      throw new Error(`${this.name}: Illegal send on out port: ${t}`);
    }
    this.subscribers.forEach(s => this.asyncJobs.add(() => s.ref.onNext(t)));
    this.demand--;
  }

  complete(): void {
    // if(!this.active) {
    //   throw new Error("Illegal complete on out port");
    // }
    this.subscribers.forEach(s => this.asyncJobs.add(() => s.ref.onComplete()));
    this.asyncJobs.drain();
    this.subscribers = [];
    this.active = false;
  }

  error(e: Error): void {
    if (!this.active) {
      throw new Error("Illegal error on out port");
    }
    this.subscribers.forEach(s => s.ref.onError(e));
    this.asyncJobs.drain();
    this.subscribers = [];
    this.active = false;
  }

  sendAsync(promise: Promise<IteratorResult<T>>): void {
    this.asyncJobs.addAsync(() =>
      promise
        .then(v => v.done ? this.complete() : this.send(v.value))
        .catch(err => this.error(err))
    );
  }

  whenTerminated(): Promise<unknown> {
    return this.asyncJobs.whenDrained();
  }
}

export default OutPort;
