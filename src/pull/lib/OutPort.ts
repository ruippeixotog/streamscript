import { Publisher, Subscriber, Subscription } from "../types";
import AsyncJobStore from "../../util/AsyncJobStore";
import Deferred from "../../util/Deferred";

type PortState = "active" | "draining" | "terminated";

class OutPort<T> implements Publisher<T> {
  private name: string;
  private compSubscription: Subscription;

  private state: PortState = "active";
  private asyncJobs: AsyncJobStore = new AsyncJobStore();
  private whenTerminatedHandler: Deferred<void> = new Deferred();

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
          this._startDrain();
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
    this.subscribers.forEach(s => this.asyncJobs.add(() => s.ref.onNext(t)));
    this.demand--;
  }

  complete(): void {
    // if(!this.active) {
    //   throw new Error("Illegal complete on out port");
    // }
    this._startDrain();
  }

  error(err: Error): void {
    if (this.state !== "active") {
      throw new Error("Illegal error on out port");
    }
    this._startDrain(err);
  }

  sendAsync(promise: Promise<IteratorResult<T>>): void {
    this.asyncJobs.addAsync(() =>
      promise
        .then(v => v.done ? this.complete() : this.send(v.value))
        .catch(err => this.error(err))
    );
  }

  isTerminated(): boolean {
    return this.state === "terminated";
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  private _startDrain(err?: Error): void {
    if (this.state !== "active") {
      return;
    }
    this.state = "draining";
    this.subscribers.forEach(s => this.asyncJobs.add(() =>
      err ? s.ref.onError(err) : s.ref.onComplete())
    );
    this.subscribers = [];

    this.asyncJobs.drain();
    this.asyncJobs.whenDrained()
      .then(() => {
        this.state = "terminated";
        this.compSubscription.cancel();
      })
      .then(() => this.whenTerminatedHandler.resolve());
  }
}

export default OutPort;
