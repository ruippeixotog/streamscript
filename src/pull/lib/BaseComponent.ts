import {ComponentSpec} from "../../types";
import {Component, Publisher, Subscriber} from "../types";
import Deferred from "../../util/Deferred";
import OutPort from "./OutPort";
import InPort from "./InPort";

abstract class BaseComponent<Ins extends any[], Outs extends any[]> implements Component<Ins, Outs> {
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
    return (<any> this.constructor).spec;
  }

  start(): void {
    this._checkTermination();
    this._checkIfTerminated();
  }

  terminate(): void {
    this.inPorts.forEach(port => port.cancel());
    this.outPorts.forEach(port => port.complete());
  }

  whenTerminated(): Promise<any> {
    return this.whenTerminatedHandler.promise;
  }

  subscriberFor(idx: number): Subscriber<Ins[number]> {
    return this.inPorts[idx].newSubscriber();
  }

  publisherFor(idx: number): Publisher<Outs[number]> {
    return this.outPorts[idx];
  }

  requestIn(idx: number, n: number): void {
    this.inPorts[idx].request(n);
  }

  cancelIn(idx: number): void {
    this.inPorts[idx].cancel();
  }

  sendOut(idx: number, value: Outs[number]): void {
    this.outPorts[idx].push(value);
  }

  completeOut(idx: number): void {
    this.outPorts[idx].complete();
  }

  errorOut(idx: number, err: Error): void {
    this.outPorts[idx].error(err);
  }

  errorAll(err: Error): void {
    this.inPorts.forEach(port => port.cancel());
    this.outPorts.forEach(port => port.error(err));
  }

  _checkTermination() {
    const insDone = this.spec.ins.length > 0 &&
      this.inPorts.every(st => st.subscriptionCount() === 0);
    const outsDone = this.spec.outs.length > 0 &&
      this.outPorts.every(st => st.subscriberCount() === 0);

    if(insDone || outsDone) {
      this.terminate();
    }
  }

  _checkIfTerminated() {
    const insDone = this.spec.ins.length === 0 ||
      this.inPorts.every(st => st.subscriptionCount() === 0);
    const outsDone = this.spec.outs.length === 0 ||
      this.outPorts.every(st => st.subscriberCount() === 0);

    if(insDone && outsDone) {
      console.log(`Complete ${this.constructor.name}`);
      this.whenTerminatedHandler.resolve();
    }
  }
}

export default BaseComponent;
