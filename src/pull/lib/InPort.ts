import { Subscriber, Subscription } from "../types";
import PortBase from "./PortBase";

class InPort<T> extends PortBase implements Subscription {
  private name: string;
  private compSubscriber: Subscriber<T>;

  private queue: T[] = [];
  private demanded = 0;
  private subscriptions: { ref: Subscription; demanded: number }[] = [];

  constructor(name: string, s: Subscriber<T>) {
    super();
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
        this._startDrain(() => this.compSubscriber.onError(err));
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

  private _maybeComplete(): boolean {
    if (this.state === "active" && this.subscriptions.length === 0 && this.queue.length === 0) {
      this._startDrain(() => this.compSubscriber.onComplete());
      return true;
    }
    return false;
  }
}

export default InPort;
