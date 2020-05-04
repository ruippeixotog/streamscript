import BaseComponent from "../lib/BaseComponent";

export class Identity<T> extends BaseComponent<[T], [T]> {
  static spec = { ins: ["in"], outs: ["out"] };

  onNext<K extends number & keyof [T]>(idx: K, value: T): void {
    this.outPort(idx).send(value);
  }

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    this.inPort(idx).request(n);
  }
}

export class Single<T> extends BaseComponent<[], [T]> {
  static spec = { ins: [], outs: ["out"] };

  singleValue: T;

  constructor(singleValue: T) {
    super();
    this.singleValue = singleValue;
  }

  onNext<K extends number & keyof []>(idx: K, value: never): void {}

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    this.outPort(idx).send(this.singleValue);
    this.terminate();
  }
}

export class Repeat<T> extends BaseComponent<[], [T]> {
  static spec = { ins: [], outs: ["out"] };

  repValue: T;

  constructor(repValue: T) {
    super();
    this.repValue = repValue;
  }

  onNext<K extends number & keyof []>(idx: K, value: never): void {}

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    this.outPort(idx).send(this.repValue);
  }
}

// // export const Kick = fanIn<any, any>((sig, data) => zip(...[sig, data], (_, d) => d));
//
// // export const Delay = fanIn2<any, number, any>((input, delayIn) =>
// //   input.pipe(
// //     withLatestFrom(delayIn),
// //     flatMap((x, d) => of(x).pipe(delay(d)))
// //   )
// // );
//
// // export const Delay = fanIn2<any, number, any>(async function*(input, delayIn) {
// //   let { done: delayDone, value: p } = await delayIn.next();
// //   if (delayDone) return;
// //
// //   let nextDelay = delayIn.next();
// //   let nextInput = input.next();
// //   let nextSend = input
// //
// //   let scheduleSend = e => new Promise(cb => setTimeout(_ => cb(e), p));
// //
// //   let count = 0;
// //   while (true) {
// //     const [idx, ev] = await Promise.race([
// //       nextDelay.then(e => [0, e]),
// //       nextInput.then(e => [1, e])
// //     ]);
// //
// //     if (idx === 0) {
// //       if (ev.done) {
// //         nextDelay = new Promise(() => {});
// //       } else {
// //         p = ev.value;
// //         nextDelay = period.next();
// //       }
// //     } else {
// //       yield count++;
// //     }
// //   }
// // });
//
// export const ToArray = flow<any, any[]>(async function*(input) {
//   const arr: any[] = [];
//   for await (const e of input) {
//     arr.push(e);
//   }
//   yield arr;
// });
//
// export const FromArray = flow<any[], any>(async function*(input) {
//   for await (const arr of input) {
//     for (const e of arr) {
//       yield e;
//     }
//   }
// });
//
// // export const Interval = flow<number, number>(async function*(period) {
// //   let { done: periodDone, value: p } = await period.next();
// //   if (periodDone) return;
// //
// //   let nextPeriod = period.next();
// //   const schedulePing = () => new Promise(cb => setTimeout(cb, p));
// //
// //   let count = 0;
// //   while (true) {
// //     const [idx, ev] = await Promise.race([
// //       nextPeriod.then<[number, IteratorResult<number>]>(e => [0, e]),
// //       schedulePing().then<[number, IteratorResult<any>]>(e => [1, e])
// //     ]);
// //
// //     if (idx === 0) {
// //       if (ev.done) {
// //         nextPeriod = new Promise(() => {});
// //       } else {
// //         p = ev.value;
// //         nextPeriod = period.next();
// //       }
// //     } else {
// //       yield count++;
// //     }
// //   }
// // });
//
// export const If = fanIn3<boolean, any, any, any>(async function*(cond, then, els) {
//   let { done: flipDone, value: flip } = await cond.next();
//   if (flipDone) return;
//
//   let nextCond = cond.next();
//   let nextThen = then.next();
//   let nextElse = els.next();
//   let condDone = false;
//   let thenDone = false;
//   let elseDone = false;
//
//   while (!condDone || !(flip ? thenDone : elseDone)) {
//     const [idx, ev] = await Promise.race([
//       nextCond.then<[number, IteratorResult<boolean>]>(e => [0, e]),
//       (flip ? nextThen : nextElse).then<[number, IteratorResult<any>]>(e => [1, e]),
//     ]);
//
//     if (idx === 0) {
//       if (ev.done) {
//         condDone = true;
//         nextCond = new Promise(() => {});
//       } else {
//         flip = ev.value;
//         nextCond = cond.next();
//       }
//     } else if (flip) {
//       if (ev.done) {
//         thenDone = true;
//         nextThen = new Promise(() => {});
//       } else {
//         yield ev.value;
//         nextThen = then.next();
//       }
//     } else {
//       if (ev.done) {
//         elseDone = true;
//         nextElse = new Promise(() => {});
//       } else {
//         yield ev.value;
//         nextElse = els.next();
//       }
//     }
//   }
// });
//
// // export const CombineLatest = pipe(2, 2, (arg1, arg2) => {
// //   const latest = combineLatest([arg1, arg2]);
// //   return [latest.pipe(pluck(0)), latest.pipe(pluck(1))];
// // });
