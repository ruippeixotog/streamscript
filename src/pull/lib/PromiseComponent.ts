import BaseComponent from "./BaseComponent";
import Deferred from "../../util/Deferred";

abstract class PromiseComponent<Ins extends any[], Out> extends BaseComponent<Ins, [Out]> {
  private inPromises: Deferred<IteratorResult<Ins[number]>>[][];
  private pendingOutPromises: Set<Promise<void>> = new Set();
  private outCancelled: boolean = false;

  constructor() {
    super();
    this.inPromises = this.spec.ins.map(_ => []);
  }

  abstract processAsync(): Promise<IteratorResult<Out>>;

  pullAsync(idx: number): Promise<IteratorResult<Ins[number]>> {
    const deferred = new Deferred<IteratorResult<Ins[number]>>();
    this.inPort(idx).request(1);
    this.inPromises[idx].push(deferred);
    return deferred.promise;
  }

  onNext(idx: number, value: Ins[number]): void {
    this.inPromises[idx].shift()?.resolve({ value, done: false });
  }

  onError(idx: number, err: Error): void {
    this.inPromises[idx].shift()?.reject(err);
    super.onError(idx, err);
  }

  onComplete(idx: number): void {
    this.inPromises[idx].shift()?.resolve({ value: undefined, done: true });
    super.onComplete(idx);
  }

  onRequest(idx: number, n: number): void {
    for(let i = 0; i < n; i++) {
      const outPromise =
        this.processAsync()
          .then(v => {
            if(!this.outCancelled) {
              v.done ? this.outPort(idx).complete() : this.outPort(idx).send(v.value)
            }
          })
          .catch(err => this.outPort(idx).error(err))
          .finally(() => this.pendingOutPromises.delete(outPromise));

      this.pendingOutPromises.add(outPromise);
    }
  }

  onCancel(idx: number): void {
    super.onCancel(idx);
    this.outCancelled = true;
  }

  terminate(): void {
    // super.terminate();
    Promise.all(Array.from(this.pendingOutPromises))
      .finally(() => super.terminate());
  }
}

export default PromiseComponent;
