
class Deferred<T> {
  private resolved = false;

  promise: Promise<T>;
  resolve: (t: T | PromiseLike<T> | undefined) => void;
  reject: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    })
      .then(val => { this.resolved = true; return val; });
  }

  isResolved(): boolean {
    return this.resolved;
  }
}

export default Deferred;
