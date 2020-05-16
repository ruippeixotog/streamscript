import { Subscription } from "../../../src/pull/types";

class MockSubscription implements Subscription {
  requested = 0;
  cancelled = false;

  request(n: number): void {
    this.requested += n;
  }

  cancel(): void {
    this.cancelled = true;
  }
}

export default MockSubscription;
