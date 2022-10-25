import assert from "assert";
import { Subscriber, Subscription } from "../types";
import PortBase from "./PortBase";

type Msg<T> =
  { type: "next", sub: Subscription, value: T } |
  { type: "complete", sub: Subscription } |
  { type: "error", sub: Subscription, err: Error };

class InPort<T> extends PortBase<T, Msg<T>> implements Subscription {
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
    let sub: Subscription | undefined;
    return {
      onSubscribe: s => {
        assert(!sub, `${this.name}: onSubscribe was called more than once`);
        sub = s;
        this.subscriptions.push({ ref: s, demanded: 0 });
      },

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      onNext: value => this.enqueueMessage({ type: "next", sub: sub!, value }),
      onComplete: () => this.enqueueMessage({ type: "complete", sub: sub! }),
      onError: err => this.enqueueMessage({ type: "error", sub: sub!, err })
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    };
  }

  async handleMessage(msg: Msg<T>): Promise<void> {
    switch (msg.type) {
      case "next":
        this.subscriptions
          .filter(s => s.ref === msg.sub)
          .forEach(s => {
            assert(
              s.demanded > 0,
              `${this.name}: Illegal onNext on in port (${JSON.stringify(msg.value)}) with no demand`
            );
            s.demanded--;
          });

        if (this.demanded === 0) {
          this.enqueueData(msg.value);
        } else {
          this.demanded--;
          this.compSubscriber.onNext(msg.value);
        }
        break;

      case "complete":
        this.subscriptions =
          this.subscriptions.filter(s => s.ref !== msg.sub);

        if (this.subscriptions.length === 0) {
          this.terminate();
          this.compSubscriber.onComplete();
        }
        break;

      case "error":
        this.subscriptions = [];
        this.terminate();
        this.compSubscriber.onError(msg.err);
    }
  }

  request(n: number): void {
    while (n > 0 && this.queueSize() > 0) {
      this.compSubscriber.onNext(this.dequequeData() as T);
      n--;
    }
    if (!this.isTerminated()) {
      const innerDemanded = this.demanded += n;
      this.subscriptions
        .filter(s => s.demanded < innerDemanded)
        .forEach(s => {
          s.ref.request(innerDemanded - s.demanded);
          s.demanded = innerDemanded;
        });
    }
  }

  requested(): number {
    return this.demanded;
  }

  cancel(): void {
    this.subscriptions.forEach(s => s.ref.cancel());
  }
}

export default InPort;
