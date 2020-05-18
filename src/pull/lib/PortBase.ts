import AsyncJobStore from "../../util/AsyncJobStore";
import Deferred from "../../util/Deferred";

type PortState = "active" | "draining_jobs" | "draining_messages" | "terminated";

class PortBase<T> {
  protected state: PortState = "active";

  private queue: T[] = [];
  private whenQueueDrainedHandler: Deferred<void> = new Deferred();

  private jobScheduler: AsyncJobStore = new AsyncJobStore();
  private messageScheduler: AsyncJobStore = new AsyncJobStore();
  private whenTerminatedHandler: Deferred<void> = new Deferred();

  scheduleJob(f: () => unknown): void {
    if (this.state !== "active") {
      return;
    }
    this.jobScheduler.add(f);
  }

  scheduleJobAsync(f: () => Promise<unknown>): void {
    if (this.state !== "active") {
      return;
    }
    this.jobScheduler.addAsync(f);
  }

  protected scheduleMessage(f: () => unknown): void {
    if (this.state === "terminated") {
      return;
    }
    this.messageScheduler.add(f);
  }

  protected queueSize(): number {
    return this.queue.length;
  }

  protected enqueue(t: T): void {
    if (this.state === "draining_messages" || this.state === "terminated") {
      return;
    }
    this.queue.push(t);
  }

  protected dequeque(): T | undefined {
    const t = this.queue.shift();
    if (this.queue.length === 0 && this.state === "draining_messages") {
      this.whenQueueDrainedHandler.resolve();
    }
    return t;
  }

  isTerminated(): boolean {
    return this.state === "terminated";
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  protected async _startDrain(
    onElementsDrained: () => void,
    onTerminated: () => void): Promise<void> {

    if (this.state !== "active") {
      return;
    }
    this.state = "draining_jobs";
    this.jobScheduler.drain();
    await this.jobScheduler.whenDrained();

    this.state = "draining_messages";
    if (this.queue.length === 0) {
      this.whenQueueDrainedHandler.resolve();
    }
    await this.whenQueueDrainedHandler.promise;
    onElementsDrained();
    this.messageScheduler.drain();
    await this.messageScheduler.whenDrained();

    this.state = "terminated";
    onTerminated();
    this.whenTerminatedHandler.resolve();
  }
}

export default PortBase;
