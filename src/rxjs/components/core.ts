import { fanIn, fanIn2, fanIn3, flow, pipe } from "../component";
import { zip, of, interval, combineLatest } from "rxjs";
import { delay, withLatestFrom, flatMap, toArray, switchMap, pluck } from "rxjs/operators";

export const Identity = flow<unknown, unknown>(x => x);

export const Kick = fanIn<unknown, unknown>((sig, data) => zip(...[sig, data], (_, d) => d));

export const Delay = fanIn2<unknown, number, unknown>((input, delayIn) =>
  input.pipe(
    withLatestFrom(delayIn),
    flatMap((x, d) => of(x).pipe(delay(d)))
  )
);

export const ToArray = flow<unknown, unknown[]>(toArray());

export const FromArray = flow<unknown[], unknown>(flatMap(arr => of(arr)));

export const Interval = flow<number, number>(period =>
  period.pipe(switchMap(p => interval(p)))
);

export const If = fanIn3<boolean, unknown, unknown, unknown>((cond, then, els) =>
  cond.pipe(switchMap(b => b ? then : els))
);

export const CombineLatest = pipe(2, 2, (arg1, arg2) => {
  const latest = combineLatest([arg1, arg2]);
  return [latest.pipe(pluck(0)), latest.pipe(pluck(1))];
});
