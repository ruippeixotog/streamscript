import AsyncJobStore from "../../util/AsyncJobStore";
import Deferred from "../../util/Deferred";

type PortState = "active" | "draining" | "terminated";

class PortBase {
  protected state: PortState = "active";
  protected asyncJobs: AsyncJobStore = new AsyncJobStore();
  protected whenTerminatedHandler: Deferred<void> = new Deferred();

  isTerminated(): boolean {
    return this.state === "terminated";
  }

  whenTerminated(): Promise<unknown> {
    return this.whenTerminatedHandler.promise;
  }

  protected _startDrain(notifyComponent: () => void): void {
    if (this.state !== "active") {
      return;
    }
    this.state = "draining";

    this.asyncJobs.drain();
    this.asyncJobs.whenDrained()
      .then(() => {
        this.state = "terminated";
        notifyComponent();
      })
      .then(() => this.whenTerminatedHandler.resolve());
  }
}

export default PortBase;
