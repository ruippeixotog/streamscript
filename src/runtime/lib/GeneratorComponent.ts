import PromiseComponent from "./PromiseComponent";

abstract class GeneratorComponent<Ins extends unknown[], Out> extends PromiseComponent<Ins, Out> {
  private generator: AsyncGenerator<Out>;

  constructor(name: string) {
    super(name);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const inGenerators = this.spec.ins.map((name, i) =>
      async function*() {
        while (true) {
          const { value, done } = await self.pullAsync(i);
          if (done) return;
          yield value;
        }
      }()
    );
    this.generator = this.processGenerator(...inGenerators);
  }

  abstract processGenerator(...inputs: AsyncGenerator<Ins[number]>[]): AsyncGenerator<Out>;

  genAsync(): Promise<IteratorResult<Out>> {
    return this.generator.next();
  }

  protected shouldTerminate(): boolean {
    return this.outPort(0).isTerminated();
  }
}

export default GeneratorComponent;
