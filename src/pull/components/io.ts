import BaseComponent from "../lib/BaseComponent";

export class Output<T> extends BaseComponent<[T], []> {
  static spec = { ins: ["in1"], outs: [] };

  active: boolean = false;

  onNext<K>(idx: K, value: T): void {
    console.log(value);
    if (this.active) {
      this.requestIn(0, 1);
    }
  }

  onRequest<K>(idx: K, n: number): void {}

  start(): void {
    super.start();
    this.active = true;
    this.requestIn(0, 1);
  }

  terminate(): void {
    super.terminate();
    this.active = false;
  }
}
