import AsyncJobStore from "../../util/AsyncJobStore";
import BaseComponent from "./BaseComponent";
import Deferred from "../../util/Deferred";

abstract class PromiseComponent<Ins extends unknown[], Out> extends BaseComponent<Ins, [Out]> {
  private inPromises: Deferred<IteratorResult<Ins[number]>>[][];
  private inErrors: (Error | undefined)[];
  private jobScheduler: AsyncJobStore = new AsyncJobStore();

  constructor() {
    super();
    this.inPromises = this.spec.ins.map(() => []);
    this.inErrors = this.spec.ins.map(() => undefined);
  }

  abstract genAsync(): Promise<IteratorResult<Out>>;

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
  }

  onComplete(idx: number): void {
    this.inPromises[idx].forEach(p => p.resolve({ value: undefined, done: true }));
    this.inPromises[idx] = [];
  }

  onRequest(_idx: number, n: number): void {
    const outPort = this.outPort(0);
    for (let i = 0; i < n; i++) {
      this.jobScheduler.addAsync(() =>
        this.genAsync()
          .then(v => v.done ? outPort.complete() : outPort.send(v.value))
          .catch(err => outPort.error(err))
      );
    }
  }

  onTerminate(): Promise<unknown> {
    this.jobScheduler.drain();
    return this.jobScheduler.whenDrained();
  }
}

export default PromiseComponent;
