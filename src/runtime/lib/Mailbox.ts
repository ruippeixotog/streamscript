class Mailbox<T> {
  private queue: T[] = [];
  private handler: (msg: T) => Promise<void>;

  constructor(handler: (msg: T) => Promise<void>) {
    this.handler = handler;
  }

  queueSize(): number {
    return this.queue.length;
  }

  enqueue(t: T): void {
    this.queue.push(t);
    if (this.queue.length === 1) {
      setImmediate(() => this.processQueue());
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      await this.handler(this.queue[0]);
      this.queue.shift();
    }
  }
}

export default Mailbox;
