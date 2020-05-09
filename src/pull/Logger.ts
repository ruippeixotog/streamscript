import fs from "fs";
import { InPort, OutPort } from "../graph";
import { Subscriber } from "./types";

class Logger {
  filePrefix: string;
  out: fs.WriteStream;

  constructor(filePrefix: string) {
    this.filePrefix = filePrefix;
    this.out = fs.createWriteStream(filePrefix);
  }

  edgeSubscriber(from: OutPort, to: InPort, graphName?: string): [Subscriber<unknown>, (n: number) => void, () => void] {
    return this._baseEdgeSubscriber(
      `${from.nodeId}[${from.portName}]`,
      `${to.nodeId}[${to.portName}]`,
      graphName
    );
  }

  edgeInitialSubscriber(initial: unknown, port: InPort, graphName?: string): [Subscriber<unknown>, (n: number) => void, () => void] {
    return this._baseEdgeSubscriber(
      `INITIAL(${JSON.stringify(initial)})`,
      `${port.nodeId}[${port.portName}]`,
      graphName
    );
  }

  nodeSubscriber(nodeId: string, graphName?: string): () => void {
    const prefix = `NODE ${graphName ? `<<${graphName}>> ` : ""}${nodeId}: `;
    return () => this.out.write(prefix + "TERMINATED\n");
  }

  private _baseEdgeSubscriber(from: string, to: string, graphName?: string): [Subscriber<unknown>, (n: number) => void, () => void] {
    const prefix = `EDGE ${graphName ? `<<${graphName}>> ` : ""}${from} -> ${to}: `;
    const revPrefix = `EDGE ${graphName ? `<<${graphName}>> ` : ""}${to} -> ${from}: `;

    const sub = {
      onSubscribe: () => {},
      onNext: ev => this.out.write(prefix + `DATA ${JSON.stringify(ev)}\n`),
      onError: err => this.out.write(prefix + `ERROR ${err}\n`),
      onComplete: () => this.out.write(prefix + "COMPLETE\n")
    };
    const onRequest = (n): void => { this.out.write(revPrefix + `REQUEST ${n}\n`); };
    const onCancel = (): void => { this.out.write(revPrefix + "CANCEL\n"); };

    return [sub, onRequest, onCancel];
  }
}

export default Logger;
