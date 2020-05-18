import BaseComponent from "./BaseComponent";
import Deferred from "../../util/Deferred";

abstract class PromiseComponent<Ins extends unknown[], Out> extends BaseComponent<Ins, [Out]> {
  private inPromises: Deferred<IteratorResult<Ins[number]>>[][];
  private inErrors: (Error | undefined)[];

  constructor() {
    super();
    this.inPromises = this.spec.ins.map(() => []);
    this.inErrors = this.spec.ins.map(() => undefined);
  }

  abstract processAsync(): Promise<IteratorResult<Out>>;

  pullAsync(idx: number): Promise<IteratorResult<Ins[number]>> {
    const deferred = new Deferred<IteratorResult<Ins[number]>>();

    if (!this.inPort(idx).isTerminated()) {
      this.inPort(idx).request(1);
      this.inPromises[idx].push(deferred);
    } else if (this.inErrors[idx]) {
      deferred.reject(this.inErrors[idx]);
    } else {
      deferred.resolve({ value: undefined, done: true });
    }
    return deferred.promise;
  }

  onNext(idx: number, value: Ins[number]): void {
    this.inPromises[idx].shift()?.resolve({ value, done: false });
  }

  onError(idx: number, err: Error): void {
    this.inErrors[idx] = err;
    this.inPromises[idx].forEach(p => p.reject(err));
    this.inPromises[idx] = [];
    super.onError(idx, err);
  }

  onComplete(idx: number): void {
    this.inPromises[idx].forEach(p => p.resolve({ value: undefined, done: true }));
    this.inPromises[idx] = [];
    super.onComplete(idx);
  }

  onRequest(idx: number, n: number): void {
    const outPort = this.outPort(0);
    for (let i = 0; i < n; i++) {
      outPort.scheduleJobAsync(() =>
        this.processAsync()
          .then(v => v.done ? outPort.complete() : outPort.send(v.value))
          .catch(err => outPort.error(err))
      );
    }
  }
}

export default PromiseComponent;
