
class Deferred<T> {
  promise: Promise<T>;
  resolve: (t: T | PromiseLike<T> | undefined) => void;
  reject: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

export default Deferred;
