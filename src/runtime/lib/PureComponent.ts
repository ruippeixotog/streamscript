import PromiseComponent from "./PromiseComponent";

abstract class PureComponent<Ins extends unknown[], Out> extends PromiseComponent<Ins, Out> {

  abstract gen(...args: Ins): Out;

  async genAsync(): Promise<IteratorResult<Out>> {
    const args = await Promise.all(this.spec.ins.map((_, i) => this.pullAsync(i)));
    if (args.some(res => res.done)) {
      return { done: true, value: undefined };
    }
    return { done: false, value: this.gen(...args.map(res => res.value) as Ins) };
  }
}

export default PureComponent;
