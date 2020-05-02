import BaseComponent from "./BaseComponent";
import Deferred from "../../util/Deferred";

abstract class PromiseComponent<Ins extends any[], Out> extends BaseComponent<Ins, [Out]> {
  inPromises: Deferred<IteratorResult<Ins[number]>>[][];
  outCancelled: boolean;

  constructor() {
    super();
    this.inPromises = this.spec.ins.map(_ => []);
    this.outCancelled = false;
  }

  abstract processAsync(): Promise<IteratorResult<Out>>;

  pullAsync(idx: number): Promise<IteratorResult<Ins[number]>> {
    const deferred = new Deferred<IteratorResult<Ins[number]>>();
    this.requestIn(idx, 1);
    this.inPromises[idx].push(deferred);
    return deferred.promise;
  }

  onNext(idx: number, value: Ins[number]): void {
    this.inPromises[idx].shift()?.resolve({ value, done: false });
  }

  onError(idx: number, err: Error): void {
    super.onError(idx, err);
    this.inPromises[idx].shift()?.reject(err);
  }

  onComplete(idx: number): void {
    super.onComplete(idx);
    this.inPromises[idx].shift()?.resolve({ value: undefined, done: true });
  }

  onRequest(idx: number, n: number): void {
    for(let i = 0; i < n; i++) {
      this.processAsync()
        .then(v => {
          if(!this.outCancelled) {
            v.done ? this.completeOut(idx) : this.sendOut(idx, v.value)
          }
        })
        .catch(err => this.errorOut(idx, err));
    }
  }

  onCancel(idx: number): void {
    super.onCancel(idx);
    this.outCancelled = true;
    this.completeOut(idx);
  }
}

export default PromiseComponent;
