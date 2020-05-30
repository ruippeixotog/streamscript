import assert from "assert";

import InPort from "../../../src/runtime/lib/InPort";
import MockSubscriber from "./MockSubscriber";
import MockPublisher from "./MockPublisher";
import eventually from "./eventually";

function multiPubSetup<T>(n: number): [MockSubscriber<T>, InPort<T>, MockPublisher<T>[]] {
  const compSub = new MockSubscriber<T>();
  const port = new InPort<T>("test", compSub);
  const pubs = Array(n).fill(null).map(() => new MockPublisher<T>());
  pubs.forEach(pub => pub.subscribe(port.newSubscriber()));

  assert.equal(compSub.status, "active");
  assert.equal(port.subscriptionCount(), n);

  return [compSub, port, pubs];
}

describe("InPort", function () {

  it("should handle simple communication with a single publisher", async function () {
    const compSub = new MockSubscriber<number>();
    const port = new InPort<number>("test", compSub);

    assert.equal(compSub.status, "active");
    assert.equal(port.subscriptionCount(), 0);

    const pub = new MockPublisher<number>();
    pub.subscribe(port.newSubscriber());

    assert.equal(port.subscriptionCount(), 1);
    assert.notStrictEqual(pub.subscriber, undefined);

    assert.equal(pub.requested, 0);
    compSub.subscription?.request(2);
    await eventually(() => assert.equal(pub.requested, 2));
    assert.equal(port.requested(), 2);

    assert.deepEqual(compSub.elements, []);
    pub.next(1);
    pub.next(7);
    assert.deepEqual(compSub.elements, [1, 7]);
    assert.equal(port.requested(), 0);

    assert.equal(compSub.status, "active");

    pub.complete();
    await eventually(() => assert.equal(compSub.status, "completed"));
  });

  it("should ensure all communication to publishers is asynchronous", async function () {
    const compSub = new MockSubscriber<number>();
    const port = new InPort<number>("test", compSub);
    const pub = new MockPublisher<number>();
    pub.subscribe(port.newSubscriber());

    assert.equal(pub.requested, 0);
    compSub.subscription?.request(3);
    assert.equal(pub.requested, 0);
    await eventually(() => assert.equal(pub.requested, 3));
    compSub.subscription?.request(4);
    assert.equal(pub.requested, 3);
    await eventually(() => assert.equal(pub.requested, 7));

    assert.equal(pub.cancelled, false);
    compSub.subscription?.cancel();
    assert.equal(pub.cancelled, false);
    await eventually(() => assert.equal(pub.cancelled, true));
  });

  it("should handle demand correctly with multiple publishers", async function () {

    // case 1: multiple publishers reply to sub request
    let [compSub, _, pubs] = multiPubSetup<number>(3);
    compSub.subscription?.request(2);
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.requested, 2))
    );
    pubs[0].next(16);
    pubs[1].next(32);
    assert.deepEqual(compSub.elements, [16, 32]);

    compSub.subscription?.request(1);
    await eventually(() =>
      assert.deepEqual(pubs.map(pub => pub.requested), [1, 1, 2])
    );

    // case 2: only one publisher reply to sub request
    [compSub, _, pubs] = multiPubSetup<number>(3);
    compSub.subscription?.request(2);
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.requested, 2))
    );
    pubs[0].next(16);
    pubs[0].next(32);
    assert.deepEqual(compSub.elements, [16, 32]);

    compSub.subscription?.request(1);
    await eventually(() =>
      assert.deepEqual(pubs.map(pub => pub.requested), [1, 2, 2])
    );

    // case 3: multiple publishers reply to sub request in excess
    [compSub, _, pubs] = multiPubSetup<number>(2);
    compSub.subscription?.request(1);
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.requested, 1))
    );
    pubs[0].next(16);
    pubs[1].next(32);
    assert.deepEqual(compSub.elements, [16]);

    compSub.subscription?.request(1);
    assert.deepEqual(compSub.elements, [16, 32]);
    pubs.forEach(pub => assert.equal(pub.requested, 0));
  });

  it("should handle completions correctly with multiple publishers", async function () {
    const [compSub, port, pubs] = multiPubSetup<number>(3);

    compSub.subscription?.request(2);
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.requested, 2))
    );

    pubs[1].complete();
    assert.equal(port.subscriptionCount(), 2);
    assert.equal(compSub.status, "active");

    pubs[0].next(16);
    assert.deepEqual(compSub.elements, [16]);

    pubs[2].complete();
    assert.equal(port.subscriptionCount(), 1);
    assert.equal(compSub.status, "active");

    pubs[0].complete();
    assert.equal(port.subscriptionCount(), 0);
    await eventually(() => assert.equal(compSub.status, "completed"));
  });

  it("should handle cancellations correctly with multiple publishers", async function () {
    const [compSub, _, pubs] = multiPubSetup<number>(3);

    compSub.subscription?.request(2);
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.requested, 2))
    );

    compSub.subscription?.cancel();
    await eventually(() =>
      pubs.forEach(pub => assert.equal(pub.cancelled, true))
    );

    pubs[0].next(16);
    assert.deepEqual(compSub.elements, [16]);
  });
});
