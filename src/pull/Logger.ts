import fs from "fs";
import { InPort, OutPort } from "../graph";
import { Subscriber } from "./types";

class Logger {
  filePrefix: string;
  out: fs.WriteStream;

  constructor(filePrefix: string) {
    this.filePrefix = filePrefix;
    this.out = fs.createWriteStream(`${filePrefix}.log`);
  }

  edgeSubscriber(from: OutPort, to: InPort, graphName?: string): [Subscriber<any>, (n: number) => void, () => void] {
    return this._baseEdgeSubscriber(
      `EDGE ${graphName ? `<<${graphName}>> ` : ""}${from.nodeId}[${from.portName}] -> ${to.nodeId}[${to.portName}]: `
    );
  }

  edgeInitialSubscriber(initial: any, port: InPort, graphName?: string): [Subscriber<any>, (n: number) => void, () => void] {
    return this._baseEdgeSubscriber(
      `EDGE ${graphName ? `<<${graphName}>> ` : ""}INITIAL(${JSON.stringify(initial)}) -> ${port.nodeId}[${port.portName}]: `
    );
  }

  nodeSubscriber(nodeId: string, graphName?: string): () => void {
    const prefix = `NODE ${graphName ? `<<${graphName}>> ` : ""}${nodeId}: `;
    return () => this.out.write(prefix + "TERMINATED\n");
  }

  private _baseEdgeSubscriber(prefix: string): [Subscriber<any>, (n: number) => void, () => void] {
    const sub = {
      onSubscribe: () => {},
      onNext: ev => this.out.write(prefix + `DATA ${JSON.stringify(ev)}\n`),
      onError: err => this.out.write(prefix + `ERROR ${err}\n`),
      onComplete: () => this.out.write(prefix + "COMPLETE\n")
    };
    const onRequest = n => this.out.write(prefix + `REQUEST ${n}\n`);
    const onCancel = () => this.out.write(prefix + "CANCEL\n");

    return [sub, onRequest, onCancel];
  }
}

export default Logger;
