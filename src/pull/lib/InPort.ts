import {Publisher, Subscriber, Subscription} from "../types";

class InPort<T> implements Subscription {
  private name: string;
  private compSubscriber: Subscriber<T>;
  private active: boolean = true;

  private queue: T[] = [];
  private demanded: number = 0;
  private subscriptions: { ref: Subscription, demanded: number }[] = [];

  constructor(name: string, s: Subscriber<T>) {
    this.name = name;
    this.compSubscriber = s;
  }

  subscriptionCount() {
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
        console.log(`${this.name}: Received ${JSON.stringify(value)}`);
        if (this.demanded === 0) {
          this.queue.push(value);
        } else {
          this.demanded--;
          this.compSubscriber.onNext(value);
        }
        this.subscriptions
          .filter(s => localSubs.indexOf(s.ref) !== -1)
          .forEach(s => {
            if(s.demanded === 0) {
              throw new Error("Assertion error");
            }
            s.demanded--;
          });
      },

      onComplete: () => {
        console.log(`${this.name}: Received <complete>`);
        const newSubscriptions = this.subscriptions =
          this.subscriptions.filter(s => localSubs.indexOf(s.ref) === -1);
        if (newSubscriptions.length === 0) {
          this.active = false;
          this.compSubscriber.onComplete();
        }
      },

      onError: err => {
        console.log(`${this.name}: Received <error>`);
        this.subscriptions = this.subscriptions
          .filter(s => localSubs.indexOf(s.ref) === -1);
        this.active = false;
        this.compSubscriber.onError(err);
      }
    };
  }

  request(n: number): void {
    console.log(`${this.name}: ${n} requested`);

    while(n > 0 && this.queue.length > 0) {
      this.compSubscriber.onNext(<T> this.queue.shift());
      n--;
    }
    const innerDemanded = this.demanded += n;
    this.subscriptions
      .filter(s => s.demanded < innerDemanded)
      .forEach(s =>
        setImmediate(() => {
          s.ref.request(innerDemanded - s.demanded);
          s.demanded = innerDemanded;
        })
      );
  }

  cancel(): void {
    this.subscriptions.forEach(s => setImmediate(() => s.ref.cancel()));
  }
}

export default InPort;
