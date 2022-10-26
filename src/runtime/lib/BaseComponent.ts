import { ComponentSpec } from "../../types";
import { Component, Publisher, Subscriber } from "../types";
import Deferred from "../../util/Deferred";
import OutPort from "./OutPort";
import InPort from "./InPort";
import { ComponentClass } from "../component_loader";

abstract class BaseComponent<Ins extends unknown[], Outs extends unknown[]> implements Component<Ins, Outs> {
  static readonly spec: ComponentSpec;

  private inPorts: InPort<Outs[number]>[];
  private outPorts: OutPort<Outs[number]>[];

  private whenTerminatedHandler: Deferred<void> = new Deferred();

  abstract onNext(idx: number, value: Ins[number]): void;
  abstract onRequest(idx: number, n: number): void;

  onError(_idx: number, _err: Error): void {}
  onComplete(_idx: number): void {}
  onCancel(_idx: number): void {}

  onTerminate(): Promise<unknown> {
    return Promise.resolve();
  }

  constructor() {
    this.inPorts = this.spec.ins.map((name, i) => new InPort(`${this.constructor.name}[${name}]`, {
      onSubscribe: _ => {},
      onNext: value => this.onNext(i, value),
      onError: err => {
        this.terminate(err);
        this.onError(i, err);
      },
      onComplete: () => {
        if (this.shouldTerminate()) {
          this.terminate();
        }
        this.onComplete(i);
      }
    }));

    this.outPorts = this.spec.outs.map((name, i) => new OutPort(`${this.constructor.name}[${name}]`, {
      request: n => this.onRequest(i, n),
      cancel: () => {
        if (this.shouldTerminate()) {
          this.terminate();
        }
        this.onCancel(i);
      }
    }));

    Promise.all(this.inPorts.map(st => st.whenTerminated()))
      .then(() => Promise.all(this.outPorts.map(st => st.whenTerminated())))
      .then(() => this.whenTerminatedHandler.resolve());
  }

  get spec(): ComponentSpec {
    return (this.constructor as ComponentClass).spec;
  }

  start(): void {
    if (this.shouldTerminate()) {
      this.terminate();
    }
  }

  terminate(err?: Error): void {
    this.onTerminate().then(() => {
      this.inPorts.filter(p => !p.isTerminated()).forEach(p => p.cancel());
      this.outPorts.filter(p => !p.isTerminated()).forEach(p => err ? p.error(err) : p.complete());
    });
  }

  isTerminated(): boolean {
    return this.whenTerminatedHandler.isResolved();
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  subscriberFor(idx: number): Subscriber<Ins[number]> {
    return this.inPorts[idx].newSubscriber();
  }

  publisherFor(idx: number): Publisher<Outs[number]> {
    return this.outPorts[idx];
  }

  inPort(idx: number): InPort<Ins[number]> {
    return this.inPorts[idx];
  }

  outPort(idx: number): OutPort<Outs[number]> {
    return this.outPorts[idx];
  }

  protected shouldTerminate(): boolean {
    const insDone = this.spec.ins.length > 0 &&
      this.inPorts.every(st => st.subscriptionCount() === 0);
    const outsDone = this.spec.outs.length > 0 &&
      this.outPorts.every(st => st.subscriberCount() === 0);

    return insDone || outsDone;
  }
}

export default BaseComponent;
