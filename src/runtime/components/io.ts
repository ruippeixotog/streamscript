import BaseComponent from "../lib/BaseComponent";
import readline from "readline";
import GeneratorComponent from "../lib/GeneratorComponent";

export class Output<T> extends BaseComponent<[T], []> {
  static spec = { ins: ["in1"], outs: [] };

  active = false;

  onNext(idx: number, value: T): void {
    console.log(value);
    if (this.active) {
      this.inPort(0).request(1);
    }
  }

  onRequest(_idx: number, _n: number): void {}

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

export class Input extends GeneratorComponent<[], string> {
  static spec = { ins: [], outs: ["out"] };

  private rt: readline.Interface;

  async* processGenerator(): AsyncGenerator<string> {
    this.rt = readline.createInterface(process.stdin);
    for await (const line of this.rt) {
      yield line;
    }
  }

  terminate(err?: Error): void {
    this.rt?.close();
    super.terminate(err);
  }
}
