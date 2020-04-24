import { Observable, Subscription, zip } from "rxjs";
import { map } from "rxjs/operators";
import { ComponentSpec } from "../types";

export type Component = {
  spec: ComponentSpec,
  connect: (...args: Observable<any>[]) => {
    outs: Observable<any>[],
    activate: () => Subscription | null
  },
};

export type Source<T> = () => Observable<T>;
export type Flow<T, U> = (arg: Observable<T>) => Observable<T>;
export type FanIn<T, U> = (...args: Observable<T>[]) => Observable<T>;
export type FanIn2<A1, A2, U> = (arg1: Observable<A1>, arg2: Observable<A2>) => Observable<U>;
export type FanIn3<A1, A2, A3, U> = (arg1: Observable<A1>, arg2: Observable<A2>, arg3: Observable<A2>) => Observable<U>;
export type Pipe = (...args: Observable<any>[]) => Observable<any>[];
export type Sink<T> = (arg: Observable<T>) => Subscription;

export function source<T>(source: Source<T>): Component {
  return pipe(0, 1, () => [source()]);
}

export function flow<T, U>(flow: Flow<T, U>): Component {
  return pipe(1, 1, arg => [flow(arg)]);
}

export function fanIn<T, U>(fanIn: FanIn<T, U>, inCount: number = fanIn.length): Component {
  return pipe(inCount, 1, (...args) => [fanIn(...args)]);
}

export function fanIn2<A1, A2, U>(fanIn: FanIn2<A1, A2, U>): Component {
  return pipe(2, 1, (arg1, arg2) => [fanIn(arg1, arg2)]);
}

export function fanIn3<A1, A2, A3, U>(fanIn: FanIn3<A1, A2, A3, U>): Component {
  return pipe(3, 1, (arg1, arg2, arg3) => [fanIn(arg1, arg2, arg3)]);
}

export function pipe(inCount: number, outCount: number, pipe: Pipe): Component {
  return {
    spec: {
      ins: Array(inCount).fill(null).map((_, i) => `in${i}`),
      outs: Array(outCount).fill(null).map((_, i) => `out${i}`),
    },
    connect: (...args) => ({ outs: pipe(...args), activate: () => null })
  };
}

export function sink<T>(sink: Sink<T>): Component {
  return {
    spec: { ins: ["in"], outs: [] },
    connect: arg => ({ outs: [], activate: () => sink(arg) })
  };
}

export function pureFlow<T, U>(f: (arg: T) => U): Component {
  return flow(arg1 => arg1.pipe(map(f)));
}

export function pureFanIn<T, U>(f: (...args: T[]) => U, inCount: number = f.length): Component {
  return fanIn((...args) => zip(...args, f), inCount);
}
