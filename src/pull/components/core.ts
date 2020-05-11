import BaseComponent from "../lib/BaseComponent";
import PureComponent from "../lib/PureComponent";

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
  static spec = { ins: ["in"], outs: ["out"] };

  repValue?: T;

  onNext<K extends number & keyof []>(idx: K, value: never): void {
    this.repValue = value;
    this.onRequest(0, this.outPort(0).requested());
    this.inPort(0).request(1);
  }

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    if (this.repValue !== undefined) {
      for (let i = 0; i < n; i++) {
        this.outPort(idx).send(this.repValue);
      }
    }
  }

  onComplete(idx: number): void {
    if (this.repValue === undefined) {
      super.onComplete(idx);
    }
  }

  start(): void {
    super.start();
    this.inPort(0).request(1);
  }
}

export class Kick<T> extends BaseComponent<[unknown, T], [T]> {
  static spec = { ins: ["sig", "data"], outs: ["out"] };

  private data?: T;

  onNext<K extends number & keyof [unknown, T]>(idx: K, value: T): void {
    if (idx === 1) {
      this.data = value;
      this.inPort(1).request(1);
    } else if (this.data) {
      this.outPort(0).send(this.data);
    }
  }

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    this.inPort(0).request(n);
  }

  start(): void {
    super.start();
    this.inPort(1).request(1);
  }
}

export class Interval extends BaseComponent<[number], [number]> {
  static spec = { ins: ["period"], outs: ["out"] };

  private currPeriod?: number;
  private demand = 0;
  private next = 0;
  private ready = false;

  onNext<K extends number & keyof [number]>(idx: K, value: number): void {
    if (this.currPeriod === undefined) {
      this.schedule(value);
    }
    this.currPeriod = value;
    this.inPort(0).request(1);
  }

  onRequest<K extends number & keyof [number]>(idx: K, n: number): void {
    this.demand += n;
    if (this.ready) {
      this.onReady();
      this.ready = false;
    }
  }

  schedule(period?: number): void {
    if (period === undefined) {
      return;
    }
    setTimeout(() => this.onReady(), period);
  }

  onReady(): void {
    if (this.demand > 0) {
      this.outPort(0).send(this.next++);
      this.demand--;
      this.schedule(this.currPeriod);
    } else {
      this.ready = true;
    }
  }

  onComplete(idx: number): void {
    if (this.currPeriod === undefined) {
      super.onComplete(idx);
    }
  }

  start(): void {
    super.start();
    this.inPort(0).request(1);
  }
}

export class If<T> extends BaseComponent<[boolean, T, T], [T]> {
  static spec = { ins: ["cond", "then", "else"], outs: ["out"] };

  onNext<K extends number & keyof [boolean, T, T]>(idx: K, value: boolean | T): void {
    if (idx === 0) {
      this.inPort(value ? 1 : 2).request(1);
    } else {
      this.outPort(0).send(value as T);
    }
  }

  onRequest<K extends number & keyof [T]>(idx: K, n: number): void {
    this.inPort(0).request(n);
  }
}

export class Buffer<T> extends BaseComponent<[T, number], [T]> {
  static spec = { ins: ["in", "n"], outs: ["out"] };

  private bufSize = 0;
  private buffer: T[] = [];

  onNext<K extends number & keyof [T, number]>(idx: number, value: T | number): void {
    if (idx === 1) {
      this.bufSize = value as number;
      this.inPort(1).request(1);
    } else {
      if (this.outPort(0).requested() === 0) this.buffer.push(value as T);
      else this.outPort(0).send(value as T);
    }
    this.adjustDemanded();
  }

  onRequest<K extends number & keyof [T]>(idx: number, n: number): void {
    while (n > 0 && this.buffer.length > 0) {
      this.outPort(0).send(this.buffer.shift() as T);
      n--;
    }
    this.adjustDemanded();
  }

  adjustDemanded(): void {
    if (this.inPort(0).requested() < this.outPort(0).requested() + this.bufSize) {
      this.inPort(0).request(this.outPort(0).requested() - this.inPort(0).requested() + this.bufSize);
    }
  }

  start(): void {
    super.start();
    this.inPort(1).request(1);
  }
}

export class Zip<T, U> extends PureComponent<[T, U], [T, U]> {
  static spec = { ins: ["in1", "in2"], outs: ["out"] };
  process = (a1: T, a2: U): [T, U] => [a1, a2];
}

export class Nth<T> extends BaseComponent<[T, number], [T]> {
  static spec = { ins: ["in", "n"], outs: ["out"] };

  private n?: number = undefined;
  private requested = false;

  onNext<K extends number & keyof [T, number]>(idx: number, value: T | number): void {
    if (idx === 1) {
      this.n = value as number;
      this.inPort(1).cancel();
      if (this.requested) {
        this.inPort(0).request(this.n + 1);
      }
    } else {
      if (this.n === 0) {
        this.outPort(idx).send(value as T);
        this.terminate();
      } else {
        (this.n as number)--;
      }
    }
  }

  onRequest<K extends number & keyof [T]>(idx: number, n: number): void {
    if (!this.requested && this.n !== undefined) {
      this.inPort(0).request(this.n + 1);
    }
    this.requested = true;
  }

  start(): void {
    super.start();
    this.inPort(1).request(1);
  }
}

export class ToArray<T> extends BaseComponent<[T], [T[]]> {
  static spec = { ins: ["in"], outs: ["out"] };

  arr: T[] = [];

  onNext(idx: number, value: T): void {
    this.arr.push(value);
    this.inPort(idx).request(1);
  }

  onComplete(idx: number): void {
    this.outPort(0).send(this.arr);
    super.onComplete(idx);
  }

  onRequest(idx: number, n: number): void {
    this.inPort(idx).request(1);
  }
}

export class FromArray<T> extends BaseComponent<[T[]], [T]> {
  static spec = { ins: ["in"], outs: ["out"] };

  buffer: T[] = [];

  onNext(idx: number, value: T[]): void {
    while (this.outPort(0).requested() > 0 && value.length > 0) {
      this.outPort(idx).send(value.shift() as T);
    }
    this.buffer = this.buffer.concat(value);
  }

  onComplete(idx: number) {
    if (this.buffer.length === 0) {
      super.onComplete(idx);
    }
  }

  onRequest(idx: number, n: number): void {
    while (n > 0 && this.buffer.length > 0) {
      this.outPort(idx).send(this.buffer?.shift() as T);
      n--;
    }
    if (this.buffer.length === 0 && this.inPort(idx).subscriptionCount() === 0) {
      super.onComplete(idx);
      return;
    }
    if (n > 0) {
      this.inPort(0).request(1);
    }
  }
}

// export class ToArray<T> extends GeneratorComponent<[T], T[]> {
//   static spec = { ins: ["in"], outs: ["out"] };
//
//   async* processGenerator(input: AsyncGenerator<T>): AsyncGenerator<T[]> {
//     const arr: T[] = [];
//     for await (const e of input) {
//       arr.push(e);
//     }
//     yield arr;
//   }
// }
//
// export class FromArray<T> extends GeneratorComponent<[T[]], T> {
//   static spec = { ins: ["in"], outs: ["out"] };
//
//   async* processGenerator(input: AsyncGenerator<T[]>): AsyncGenerator<T> {
//     for await (const arr of input) {
//       console.log(arr);
//       for (const e of arr) {
//         yield e;
//       }
//     }
//   }
// }

//
// // export const CombineLatest = pipe(2, 2, (arg1, arg2) => {
// //   const latest = combineLatest([arg1, arg2]);
// //   return [latest.pipe(pluck(0)), latest.pipe(pluck(1))];
// // });
