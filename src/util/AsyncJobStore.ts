import Deferred from "./Deferred";

class AsyncJobStore {
  draining = false;
  pendingJobs: Set<Promise<any>> = new Set();

  add(job: () => any) {
    if (this.draining) {
      return;
    }
    const deferred = new Deferred();
    this.pendingJobs.add(deferred.promise);
    setImmediate(() => {
      deferred.resolve(job());
      this.pendingJobs.delete(deferred.promise);
    });
  }

  addAsync(job: () => Promise<any>) {
    if (this.draining) {
      return;
    }
    const promise = job();
    this.pendingJobs.add(promise);
    promise.finally(() => this.pendingJobs.delete(promise));
  }

  drain(): void {
    this.draining = true;
  }

  whenDrained(): Promise<any> {
    if (!this.draining) {
      throw new Error("Job Store not being drained yet");
    }
    return Promise.all(Array.from(this.pendingJobs));
  }
}

export default AsyncJobStore;
