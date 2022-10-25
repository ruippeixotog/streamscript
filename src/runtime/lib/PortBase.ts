import Deferred from "../../util/Deferred";
import Mailbox from "./Mailbox";

type PortState = "active" | "terminated";

abstract class PortBase<T, Msg> {
  private state: PortState = "active";
  private inbox: Mailbox<Msg> = new Mailbox(this.handleMessageInternal.bind(this));
  private dataQueue: T[] = [];
  private whenTerminatedHandler: Deferred<void> = new Deferred();

  abstract handleMessage(msg: Msg): Promise<void>;

  private handleMessageInternal(msg: Msg): Promise<void> {
    return this.isTerminated() ? Promise.resolve() : this.handleMessage(msg);
  }

  protected queueSize(): number {
    return this.dataQueue.length;
  }

  protected enqueueData(t: T): void {
    if (!this.isTerminated()) {
      this.dataQueue.push(t);
    }
  }

  protected dequequeData(): T | undefined {
    return this.dataQueue.shift();
  }

  protected enqueueMessage(msg: Msg): void {
    if (!this.isTerminated()) {
      this.inbox.enqueue(msg);
    }
  }

  isTerminated(): boolean {
    return this.state === "terminated";
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  terminate(): void {
    this.state = "terminated";
    this.whenTerminatedHandler.resolve();
  }
}

export default PortBase;
