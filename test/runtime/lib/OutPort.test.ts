import assert from "assert";

import MockSubscriber from "./MockSubscriber";
import eventually from "./eventually";
import OutPort from "../../../src/runtime/lib/OutPort";
import MockSubscription from "./MockSubscription";

function multiSubSetup<T>(n: number): [MockSubscription, OutPort<T>, MockSubscriber<T>[]] {
  const compSub = new MockSubscription();
  const port = new OutPort<T>("test", compSub);
  const subs = Array(n).fill(null).map(() => new MockSubscriber<T>());
  subs.forEach(sub => port.subscribe(sub));

  subs.forEach(sub => assert.equal(sub.status, "active"));
  assert.equal(port.subscriberCount(), n);

  return [compSub, port, subs];
}

describe("OutPort", function () {

  it("should handle simple communication with a single subscriber", async function () {
    const compSub = new MockSubscription();
    const port = new OutPort<number>("test", compSub);

    assert.equal(port.subscriberCount(), 0);

    const sub = new MockSubscriber<number>();
    port.subscribe(sub);

    assert.equal(port.subscriberCount(), 1);
    assert.equal(sub.status, "active");

    assert.equal(compSub.requested, 0);
    sub.subscription?.request(2);
    assert.equal(compSub.requested, 2);
    assert.equal(port.requested(), 2);

    assert.deepEqual(sub.elements, []);
    port.send(1);
    port.send(7);
    await eventually(() =>
      assert.deepEqual(sub.elements, [1, 7])
    );
    assert.equal(port.requested(), 0);

    assert.equal(sub.status, "active");

    port.complete();
    await eventually(() =>
      assert.equal(sub.status, "completed")
    );
  });

  it("should ensure all communication to subscribers is asynchronous", async function () {
    const compSub = new MockSubscription();
    const port = new OutPort<number>("test", compSub);
    const sub = new MockSubscriber<number>();
    port.subscribe(sub);

    sub.subscription?.request(3);
    assert.equal(compSub.requested, 3);

    port.send(4);
    assert.deepEqual(sub.elements, []);
    await eventually(() => assert.deepEqual(sub.elements, [4]));

    port.complete();
    assert.equal(sub.status, "active");
    await eventually(() => assert.equal(sub.status, "completed"));
  });

  it("should handle demand correctly with multiple subscribers", async function () {

    // case 1: multiple subscribers request different amounts of data
    let [compSub, port, subs] = multiSubSetup<number>(3);
    subs[0].subscription?.request(3);
    subs[1].subscription?.request(2);
    subs[2].subscription?.request(5);

    assert.equal(compSub.requested, 2);
    port.send(16);
    port.send(32);

    await eventually(() =>
      subs.forEach(sub => assert.deepEqual(sub.elements, [16, 32]))
    );

    compSub.requested = 0;
    subs[2].subscription?.request(1);
    assert.equal(compSub.requested, 0);
    subs[1].subscription?.request(2);
    assert.equal(compSub.requested, 1);

    // case 2: only one subscriber requests data
    [compSub, port, subs] = multiSubSetup<number>(3);
    subs[0].subscription?.request(3);

    assert.equal(compSub.requested, 0);

    // case 3: only one subscriber requests data, but others leave
    [compSub, port, subs] = multiSubSetup<number>(2);
    subs[0].subscription?.request(3);
    assert.equal(compSub.requested, 0);

    subs[1].subscription?.cancel();
    await eventually(() => assert.equal(subs[1].status, "completed"));
    assert.equal(compSub.requested, 3);
  });

  it("should handle completions correctly with multiple subscribers", async function () {
    const [compSub, port, subs] = multiSubSetup<number>(3);

    subs.forEach(sub => sub.subscription?.request(1));
    assert.equal(compSub.requested, 1);

    port.complete();
    await eventually(() =>
      subs.forEach(sub => assert.equal(sub.status, "completed"))
    );
    assert.equal(port.subscriberCount(), 0);
  });

  it("should handle cancellations correctly with multiple subscribers", async function () {
    const [compSub, port, subs] = multiSubSetup<number>(3);

    subs.forEach(sub => sub.subscription?.request(1));

    subs[1].subscription?.cancel();
    assert.equal(port.subscriberCount(), 2);
    assert.equal(compSub.cancelled, false);
    await eventually(() =>
      assert.equal(subs[1].status, "completed")
    );

    port.send(16);
    await eventually(() =>
      assert.deepEqual(subs.map(pub => pub.elements), [[16], [], [16]])
    );

    subs[2].subscription?.cancel();
    assert.equal(port.subscriberCount(), 1);
    assert.equal(compSub.cancelled, false);

    subs[0].subscription?.cancel();
    assert.equal(port.subscriberCount(), 0);
    await eventually(() => assert.equal(compSub.cancelled, true));
  });
});
