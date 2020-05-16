import { Subscriber, Subscription } from "../types";
import AsyncJobStore from "../../util/AsyncJobStore";
import Deferred from "../../util/Deferred";

type PortState = "active" | "draining" | "terminated";

class InPort<T> implements Subscription {
  private name: string;
  private compSubscriber: Subscriber<T>;

  private state: PortState = "active";
  private asyncJobs: AsyncJobStore = new AsyncJobStore();
  private whenTerminatedHandler: Deferred<void> = new Deferred();

  private queue: T[] = [];
  private demanded = 0;
  private subscriptions: { ref: Subscription; demanded: number }[] = [];

  constructor(name: string, s: Subscriber<T>) {
    this.name = name;
    this.compSubscriber = s;

    s.onSubscribe({
      request: n => this.request(n),
      cancel: () => this.cancel()
    });
  }

  subscriptionCount(): number {
    return this.subscriptions.length;
  }

  newSubscriber(): Subscriber<T> {
    const localSubs: Subscription[] = [];
    return {
      onSubscribe: s => {
        localSubs.push(s);
        this.subscriptions.push({ ref: s, demanded: 0 });
      },

      onNext: value => {
        if (this.state !== "active") {
          return;
        }
        this.subscriptions
          .filter(s => localSubs.indexOf(s.ref) !== -1)
          .forEach(s => {
            if (s.demanded === 0) {
              throw new Error("Assertion error");
            }
            s.demanded--;
          });

        if (this.demanded === 0) {
          this.queue.push(value);
        } else {
          this.demanded--;
          // TODO: this should be able to be setImmedaiate, but it can't!!
          this.compSubscriber.onNext(value);
        }
      },

      onComplete: () => {
        if (this.state !== "active") {
          return;
        }
        this.subscriptions =
          this.subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);
        this._maybeComplete();
      },

      onError: err => {
        if (this.state !== "active") {
          return;
        }
        this.subscriptions =
          this.subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);
        this._startDrain(err);
      }
    };
  }

  request(n: number): void {
    while (n > 0 && this.queue.length > 0) {
      this.compSubscriber.onNext(this.queue.shift() as T);
      n--;
    }
    this.asyncJobs.add(() => {
      if (!this._maybeComplete()) {
        const innerDemanded = this.demanded += n;
        this.subscriptions
          .filter(s => s.demanded < innerDemanded)
          .forEach(s => {
            s.ref.request(innerDemanded - s.demanded);
            s.demanded = innerDemanded;
          });
      }
    });
  }

  requested(): number {
    return this.demanded;
  }

  cancel(): void {
    this.subscriptions.forEach(s => this.asyncJobs.add(() => s.ref.cancel()));
  }

  isTerminated(): boolean {
    return this.state === "terminated";
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  private _maybeComplete(): boolean {
    if (this.state === "active" && this.subscriptions.length === 0 && this.queue.length === 0) {
      this._startDrain();
      return true;
    }
    return false;
  }

  private _startDrain(err?: Error): void {
    if (this.state !== "active") {
      return;
    }
    this.state = "draining";
    this.subscriptions = [];

    this.asyncJobs.drain();
    this.asyncJobs.whenDrained()
      .then(() => {
        this.state = "terminated";
        err ? this.compSubscriber.onError(err) : this.compSubscriber.onComplete();
      })
      .then(() => this.whenTerminatedHandler.resolve());
  }
}

export default InPort;
