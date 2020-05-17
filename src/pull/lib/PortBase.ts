import AsyncJobStore from "../../util/AsyncJobStore";
import Deferred from "../../util/Deferred";

type PortState = "active" | "draining_queue" | "draining_jobs" | "terminated";

class PortBase<T> {
  protected state: PortState = "active";

  private queue: T[] = [];
  private whenQueueDrainedHandler: Deferred<void> = new Deferred();

  private asyncJobs: AsyncJobStore = new AsyncJobStore();
  private whenTerminatedHandler: Deferred<void> = new Deferred();

  schedule(f: () => unknown): void {
    this.asyncJobs.add(f);
  }

  scheduleAsync(f: () => Promise<unknown>): void {
    this.asyncJobs.addAsync(f);
  }

  queueSize(): number {
    return this.queue.length;
  }

  enqueue(t: T): void {
    if (this.state !== "active") {
      return;
    }
    this.queue.push(t);
  }

  dequeque(): T | undefined {
    const t = this.queue.shift();
    if (this.queue.length === 0 && this.state === "draining_queue") {
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

  protected _startDrain(
    onElementsDrained: () => void,
    onTerminated: () => void): void {

    if (this.state !== "active") {
      return;
    }
    this.state = "draining_queue";
    if (this.queue.length === 0) {
      this.whenQueueDrainedHandler.resolve();
    }

    this.whenQueueDrainedHandler.promise
      .then(() => {
        onElementsDrained();
        this.state = "draining_jobs";
        this.asyncJobs.drain();
        return this.asyncJobs.whenDrained();
      })
      .then(() => {
        this.state = "terminated";
        onTerminated();
        this.whenTerminatedHandler.resolve();
      });
  }
}

export default PortBase;
