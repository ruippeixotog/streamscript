import fs from "fs";
import { InPort, OutPort } from "../../graph";
import { Subscriber } from "rxjs";

class Logger {
  filePrefix: string;
  out: fs.WriteStream;

  constructor(filePrefix: string) {
    this.filePrefix = filePrefix;
    this.out = fs.createWriteStream(`${filePrefix}.log`);
  }

  portSubscriber(port: InPort | OutPort, graphName?: string): Subscriber<any> {
    const prefix = `PORT ${graphName ? `<<${graphName}>> ` : ""}${port.nodeId}[${port.portName}]: `;
    return new Subscriber<any>(
      ev => this.out.write(prefix + `DATA ${JSON.stringify(ev)}\n`),
      err => this.out.write(prefix + `ERROR ${err}\n`),
      () => this.out.write(prefix + "COMPLETE\n")
    );
  }

  edgeSubscriber(from: OutPort, to: InPort, graphName?: string): Subscriber<any> {
    const prefix = `EDGE ${graphName ? `<<${graphName}>> ` : ""}${from.nodeId}[${from.portName}] -> ${to.nodeId}[${to.portName}]: `;
    return new Subscriber<any>(
      ev => this.out.write(prefix + `DATA ${JSON.stringify(ev)}\n`),
      err => this.out.write(prefix + `ERROR ${err}\n`),
      () => this.out.write(prefix + "COMPLETE\n")
    );
  }
}

export default Logger;
