import { Publisher, Subscriber } from "../../../src/runtime/types";

class MockPublisher<T> implements Publisher<T> {
  subscriber?: Subscriber<T>;
  requested = 0;
  cancelled = false;

  subscribe(s: Subscriber<T>): void {
    if (this.subscriber !== undefined) {
      throw new Error("MockPublisher only supports one subscriber");
    }
    this.subscriber = s;

    s.onSubscribe({
      request: n => this.cancelled ? {} : this.requested += n,
      cancel: () => this.cancelled = true
    });
  }

  next(t: T): void {
    if (this.subscriber === undefined) {
      throw new Error("Tried to send value without a subscriber");
    }
    this.requested--;
    this.subscriber.onNext(t);
  }

  error(e: Error): void {
    if (this.subscriber === undefined) {
      throw new Error("Tried to send error without a subscriber");
    }
    this.subscriber.onError(e);
  }

  complete(): void {
    if (this.subscriber === undefined) {
      throw new Error("Tried to send complete without a subscriber");
    }
    this.subscriber.onComplete();
  }
}

export default MockPublisher;
