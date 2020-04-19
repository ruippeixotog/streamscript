import { fanIn, fanIn2, fanIn3, flow, pipe } from "../component";
import { zip, of, interval, combineLatest } from "rxjs";
import { delay, withLatestFrom, flatMap, toArray, switchMap, pluck } from "rxjs/operators";

export const Identity = flow<any, any>(x => x);

export const Kick = fanIn<any, any>((sig, data) => zip(...[sig, data], (_, d) => d));

export const Delay = fanIn2<any, number, any>((input, delayIn) =>
  input.pipe(
    withLatestFrom(delayIn),
    flatMap((x, d) => of(x).pipe(delay(d)))
  )
);

export const ToArray = flow<any, any[]>(toArray());

export const FromArray = flow<any[], any>(flatMap(arr => of(arr)));

export const Interval = flow<number, number>(period =>
  period.pipe(switchMap(p => interval(p)))
);

export const If = fanIn3<boolean, any, any, any>((cond, then, els) =>
  cond.pipe(switchMap(b => b ? then : els))
);

export const CombineLatest = pipe(2, 2, (arg1, arg2) => {
  const latest = combineLatest([arg1, arg2]);
  return [latest.pipe(pluck(0)), latest.pipe(pluck(1))];
});
