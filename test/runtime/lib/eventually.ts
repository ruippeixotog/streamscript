import util from "util";

async function eventually<T>(f: () => T, numRetries = 10, interval = 2): Promise<T> {
  try { return f(); }
  catch (ex) {
    if (numRetries === 0) throw ex;
    else {
      numRetries--;
      return await util.promisify(cb => setTimeout(cb, interval))()
        .then(() => eventually(f, numRetries - 1, interval));
    }
  }
}

export default eventually;
