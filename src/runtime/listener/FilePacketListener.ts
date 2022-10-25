import fs from "fs";
import { OutPortRef, InPortRef } from "../../compiler/graph";
import { Subscriber, Subscription } from "../types";
import PacketListener, { EdgeListener, NodeListener } from "./PacketListener";

class FilePacketListener implements PacketListener {
  filePrefix: string;
  out: fs.WriteStream;

  constructor(filePrefix: string) {
    this.filePrefix = filePrefix;
    this.out = fs.createWriteStream(filePrefix);
  }

  nodeListenerFor(nodeId: string, graphName?: string | undefined): NodeListener {
    const prefix = `NODE ${graphName ? `<<${graphName}>> ` : ""}${nodeId}: `;
    return {
      onTerminate: () => this.out.write(prefix + "TERMINATED\n")
    };
  }

  edgeListenerFor(from: OutPortRef, to: InPortRef, graphName?: string | undefined): EdgeListener {
    const prefix = `EDGE ${graphName ? `<<${graphName}>> ` : ""}${from} -> ${to}: `;
    const revPrefix = `EDGE ${graphName ? `<<${graphName}>> ` : ""}${to} -> ${from}: `;

    const downstream: Subscriber<unknown> = {
      onSubscribe: () => {},
      onNext: ev => this.out.write(prefix + `DATA ${JSON.stringify(ev)}\n`),
      onError: err => this.out.write(prefix + `ERROR ${err}\n`),
      onComplete: () => this.out.write(prefix + "COMPLETE\n")
    };
    const upstream: Subscription = {
      request: n => { this.out.write(revPrefix + `REQUEST ${n}\n`); },
      cancel: () => { this.out.write(revPrefix + "CANCEL\n"); }
    };
    return { downstream, upstream };
  }
}

export default FilePacketListener;
