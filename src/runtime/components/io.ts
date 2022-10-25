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

export class Input<_T> extends GeneratorComponent<[], string> {
  static spec = { ins: [], outs: ["out"] };

  private rt: readline.Interface;

  async* processGenerator(): AsyncGenerator<string> {
    console.log("start!");
    for await (const line of this.rt) {
      console.log("line");
      yield line;
    }
    console.log("end");
  }

  start(): void {
    process.stdin.pause();
    process.stdin
      .on("data", data => {
        buff += data;
        lines = buff.split(/\r\n|\n/);
        buff = lines.pop();
        lines.forEach(line => stdin.emit("line", line));
      })
      .on("end", () => {
        if (buff.length > 0) stdin.emit("line", buff);
      });

    // this.rt = readline.createInterface({ input: process.stdin, terminal: false });
    super.start();
  }

  terminate(err?: Error): void {
    this.rt.close();
    super.terminate(err);
  }
}
