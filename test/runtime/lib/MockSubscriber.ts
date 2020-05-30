import { Subscriber, Subscription } from "../../../src/runtime/types";

export type SubscriberStatus =
  "inactive" | "active" | "completed" | "errored";

class MockSubscriber<T> implements Subscriber<T> {
  subscription?: Subscription;
  elements: T[] = [];
  status: SubscriberStatus = "inactive";

  onSubscribe(s: Subscription): void {
    if (this.status !== "inactive") {
      throw new Error(`onSubscribe was called when MockSubscriber was ${this.status}`);
    }
    this.subscription = s;
    this.status = "active";
  }

  onComplete(): void {
    this.status = "completed";
  }

  onError(_e: Error): void {
    this.status = "errored";
  }

  onNext(t: T): void {
    this.elements.push(t);
  }
}

export default MockSubscriber;
