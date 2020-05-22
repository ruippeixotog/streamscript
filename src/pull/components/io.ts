import BaseComponent from "../lib/BaseComponent";
import readline from "readline";
import GeneratorComponent from "../lib/GeneratorComponent";

export class Output<T> extends BaseComponent<[T], []> {
  static spec = { ins: ["in1"], outs: [] };

  active = false;

  onNext<K>(idx: K, value: T): void {
    console.log(value);
    if (this.active) {
      this.inPort(0).request(1);
    }
  }

  onRequest<K>(idx: K, n: number): void {}

  start(): void {
    super.start();
    this.active = true;
    this.inPort(0).request(1);
  }

  terminate(): void {
    super.terminate();
    this.active = false;
  }
}

export class Input<T> extends GeneratorComponent<[], string> {
  static spec = { ins: [], outs: ["out"] };

  private rt: readline.Interface;

  async* processGenerator(): AsyncGenerator<string> {
    for await (const line of this.rt) {
      yield line;
    }
  }

  start(): void {
    this.rt = readline.createInterface(process.stdin);
    super.start();
  }

  terminate(err?: Error): void {
    this.rt.close();
    super.terminate(err);
  }
}
