import PromiseComponent from "./PromiseComponent";

abstract class PureComponent<Ins extends any[], Out> extends PromiseComponent<Ins, Out> {

  abstract process(...args: Ins): Out;

  async processAsync(): Promise<IteratorResult<Out>> {
    const args = await Promise.all(this.spec.ins.map((_, i) => this.pullAsync(i)));
    if(args.some(res => res.done)) {
      return { done: true, value: undefined };
    }
    return { done: false, value: this.process(...args.map(res => res.value) as Ins) };
  }
}

export default PureComponent;
