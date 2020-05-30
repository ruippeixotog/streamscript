import BaseComponent from "../lib/BaseComponent";
import PureComponent from "../lib/PureComponent";
import GeneratorComponent from "../lib/GeneratorComponent";

export class Identity<T> extends BaseComponent<[T], [T]> {
  static spec = { ins: ["in"], outs: ["out"] };

  onNext(idx: number, value: T): void {
    this.outPort(idx).send(value);
  }

  onRequest(idx: number, n: number): void {
    this.inPort(idx).request(n);
  }
}

export class Repeat<T> extends BaseComponent<[T], [T]> {
  static spec = { ins: ["in"], outs: ["out"] };

  repValue?: T;

  onNext(idx: number, value: T): void {
    this.repValue = value;
    this.onRequest(0, this.outPort(0).requested());
    this.inPort(0).request(1);
  }

  onRequest(idx: number, n: number): void {
    if (this.repValue !== undefined) {
      for (let i = 0; i < n; i++) {
        this.outPort(idx).send(this.repValue);
      }
    }
  }

  start(): void {
    super.start();
    this.inPort(0).request(1);
  }

  protected shouldTerminate(): boolean {
    return this.repValue === undefined && this.inPort(0).isTerminated() ||
      this.outPort(0).isTerminated();
  }
}

export class Kick<T> extends GeneratorComponent<[T, unknown], T> {
  static spec = { ins: ["in", "sig"], outs: ["out"] };

  async* processGenerator(input: AsyncGenerator<T>, sigInput: AsyncGenerator): AsyncGenerator<T> {
    for await (const _ of sigInput) {
      const { done, value } = await input.next();
      if (done) return;
      yield value;
    }
  }
}

export class Interval extends BaseComponent<[number], [boolean]> {
  static spec = { ins: ["period"], outs: ["out"] };

  private currPeriod?: number;
  private demand = 0;
  private ready = false;

  onNext(idx: number, value: number): void {
    if (this.currPeriod === undefined) {
      this.schedule(value);
    }
    this.currPeriod = value;
    this.inPort(0).request(1);
  }

  onRequest(idx: number, n: number): void {
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
      this.outPort(0).send(true);
      this.demand--;
      this.schedule(this.currPeriod);
    } else {
      this.ready = true;
    }
  }

  start(): void {
    super.start();
    this.inPort(0).request(1);
  }

  protected shouldTerminate(): boolean {
    return this.currPeriod === undefined && this.inPort(0).isTerminated() ||
      this.outPort(0).isTerminated();
  }
}

export class Nats extends BaseComponent<[], [number]> {
  static spec = { ins: [], outs: ["out"] };

  private next = 1;

  onNext(idx: number, value: never): void {}

  onRequest(idx: number, n: number): void {
    this.outPort(idx).send(this.next++);
  }
}

export class If<T> extends BaseComponent<[boolean, T, T], [T]> {
  static spec = { ins: ["cond", "then", "else"], outs: ["out"] };

  onNext(idx: number, value: boolean | T): void {
    if (idx === 0) {
      this.inPort(value ? 1 : 2).request(1);
    } else {
      this.outPort(0).send(value as T);
    }
  }

  onRequest(idx: number, n: number): void {
    this.inPort(0).request(n);
  }
}

export class Buffer<T> extends BaseComponent<[T, number], [T]> {
  static spec = { ins: ["in", "n"], outs: ["out"] };

  private bufSize = 0;

  onNext(idx: number, value: T | number): void {
    if (idx === 1) {
      this.bufSize = value as number;
      this.inPort(1).request(1);
    } else {
      this.outPort(0).sendOrEnqueue(value as T);
    }
    this.adjustDemanded();
  }

  onRequest(idx: number, n: number): void {
    this.adjustDemanded();
  }

  adjustDemanded(): void {
    const demandDiff = this.outPort(0).requested() + this.bufSize - this.inPort(0).requested();
    if (demandDiff > 0) {
      this.inPort(0).request(demandDiff);
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

  private n?: number;
  private requested = false;

  onNext(idx: number, value: T | number): void {
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

  onRequest(idx: number, n: number): void {
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

export class ToArray<T> extends GeneratorComponent<[T], T[]> {
  static spec = { ins: ["in"], outs: ["out"] };

  async* processGenerator(input: AsyncGenerator<T>): AsyncGenerator<T[]> {
    const arr: T[] = [];
    for await (const e of input) {
      arr.push(e);
    }
    yield arr;
  }
}

export class FromArray<T> extends GeneratorComponent<[T[]], T> {
  static spec = { ins: ["in"], outs: ["out"] };

  async* processGenerator(input: AsyncGenerator<T[]>): AsyncGenerator<T> {
    for await (const arr of input) {
      for (const e of arr) {
        yield e;
      }
    }
  }
}

export class CombineLatest<T, U> extends BaseComponent<[T, U], [[T, U]]> {
  static spec = { ins: ["in1", "in2"], outs: ["out"] };

  latest1?: T;
  latest2?: U;

  onNext(idx: number, value: T | U): void {
    if (idx === 0) this.latest1 = value as T;
    else this.latest2 = value as U;

    if (this.latest1 !== undefined && this.latest2 !== undefined) {
      this.outPort(0).sendOrEnqueue([this.latest1, this.latest2]);
    }
  }

  onRequest(idx: number, n: number): void {
    this.inPort(0).request(n);
    this.inPort(1).request(n);
  }

  protected shouldTerminate(): boolean {
    const insTerminated =
      this.latest1 === undefined && this.inPort(0).isTerminated() ||
      this.latest2 === undefined && this.inPort(1).isTerminated() ||
      this.inPort(0).isTerminated() && this.inPort(1).isTerminated();

    return insTerminated || this.outPort(0).isTerminated();
  }
}
