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

  private whenTerminatedHandler: Deferred<void>;

  abstract onNext(idx: number, value: Ins[number]): void;
  abstract onRequest(idx: number, n: number): void;

  onError(idx: number, err: Error): void {
    this.errorAll(err);
  }

  onComplete(idx: number): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  onCancel(idx: number): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  constructor() {
    this.inPorts = this.spec.ins.map((name, i) => new InPort(`${this.constructor.name}[${name}]`, {
      onSubscribe: _ => {},
      onNext: value => this.onNext(i, value),
      onError: err => this.onError(i, err),
      onComplete: () => this.onComplete(i)
    }));

    this.outPorts = this.spec.outs.map((name, i) => new OutPort(`${this.constructor.name}[${name}]`, {
      request: n => this.onRequest(i, n),
      cancel: () => this.onCancel(i)
    }));

    this.whenTerminatedHandler = new Deferred();
  }

  get spec(): ComponentSpec {
    return (this.constructor as ComponentClass).spec;
  }

  start(): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  terminate(): void {
    this.inPorts.forEach(port => port.cancel());
    this.outPorts.forEach(port => port.complete());
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

  errorAll(err: Error): void {
    this.inPorts.forEach(port => port.cancel());
    this.outPorts.forEach(port => port.error(err));
  }

  _checkTermination(): void {
    const insDone = this.spec.ins.length > 0 &&
      this.inPorts.every(st => st.subscriptionCount() === 0);
    const outsDone = this.spec.outs.length > 0 &&
      this.outPorts.every(st => st.subscriberCount() === 0);

    if (insDone || outsDone) {
      this.terminate();
    }
  }

  _checkIfTerminated(): void {
    const insDone = this.spec.ins.length === 0 ||
      this.inPorts.every(st => st.subscriptionCount() === 0);
    const outsDone = this.spec.outs.length === 0 ||
      this.outPorts.every(st => st.subscriberCount() === 0);

    if (insDone && outsDone) {
      Promise.all(this.inPorts.map(st => st.whenTerminated()))
        .then(() => Promise.all(this.outPorts.map(st => st.whenTerminated())))
        .then(() => this.whenTerminatedHandler.resolve());
    }
  }
}

export default BaseComponent;
