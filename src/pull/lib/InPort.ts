import { Subscriber, Subscription } from "../types";
import AsyncJobStore from "../../util/AsyncJobStore";

class InPort<T> implements Subscription {
  private name: string;
  private compSubscriber: Subscriber<T>;
  private active = true;
  private asyncJobs: AsyncJobStore = new AsyncJobStore();

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
        this.subscriptions =
          this.subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);
        this._maybeComplete();
      },

      onError: err => {
        this.subscriptions = this.subscriptions
          .filter(s => localSubs.indexOf(s.ref) === -1);
        this.active = false;
        this.compSubscriber.onError(err);
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
    this.asyncJobs.drain();
  }

  whenTerminated(): Promise<unknown> {
    return this.asyncJobs.whenDrained();
  }

  private _maybeComplete(): boolean {
    if (this.active && this.subscriptions.length === 0 && this.queue.length === 0) {
      this.active = false;
      this.compSubscriber.onComplete();
      return true;
    }
    return false;
  }
}

export default InPort;
