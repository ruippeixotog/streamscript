import assert from "assert";
import { Subscriber, Subscription } from "../types";
import PortBase from "./PortBase";

class InPort<T> extends PortBase<T> implements Subscription {
  private name: string;
  private compSubscriber: Subscriber<T>;

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
            assert(
              s.demanded > 0,
              `${this.name}: Illegal onNext on in port (${JSON.stringify(value)})`
            );
            s.demanded--;
          });

        if (this.demanded === 0) {
          this.enqueue(value);
        } else {
          this.demanded--;
          this.compSubscriber.onNext(value);
        }
      },

      onComplete: () => {
        if (this.state !== "active") {
          return;
        }
        this.subscriptions =
          this.subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);

        if (this.subscriptions.length === 0) {
          this._startDrainSimple();
        }
      },

      onError: err => {
        if (this.state !== "active") {
          return;
        }
        this.subscriptions = [];
        this._startDrainSimple(err);
      }
    };
  }

  request(n: number): void {
    while (n > 0 && this.queueSize() > 0) {
      this.compSubscriber.onNext(this.dequeque() as T);
      n--;
    }
    this.schedule(() => {
      if (this.state === "active") {
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
    this.subscriptions.forEach(s => this.schedule(() => s.ref.cancel()));
  }

  private _startDrainSimple(err?: Error): void {
    this.cancel();
    this._startDrain(
      () => {},
      () => err ? this.compSubscriber.onError(err) : this.compSubscriber.onComplete()
    );
  }
}

export default InPort;
