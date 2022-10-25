import fs, { ReadStream } from "fs";
import Deferred from "../src/util/Deferred";

export const deepLsSync = (dir: string): string[] =>
  fs.readdirSync(dir)
    .map(f => dir + "/" + f)
    .flatMap(f => fs.statSync(f).isDirectory() ? deepLsSync(f) : [f]);

export const forEach = async (dir: string, f: (file: string, stat: fs.Stats) => Promise<void>): Promise<void> => {
  const files = await fs.promises.readdir(dir);
  await Promise.all(
    files.map(async file => await f(dir + "/" + file, await fs.promises.stat(dir + "/" + file)))
  );
};

export const walk = (dir: string, f: (file: string) => Promise<void>): Promise<void> =>
  forEach(dir, async (file, stat) => {
    if (!stat.isDirectory()) await f(file);
  });

export const deepWalk = async (dir: string, f: (file: string) => Promise<void>): Promise<void> =>
  forEach(dir, (file, stat) => stat.isDirectory() ? walk(file, f) : f(file));

export async function openReadStream(file: string): Promise<ReadStream | null> {
  try {
    await fs.promises.access(file, fs.constants.R_OK);
  } catch (_err) {
    return null;
  }
  const stream = fs.createReadStream(file, "utf-8");
  const streamOpened = new Deferred();
  stream.on("open", () => streamOpened.resolve(null));
  await streamOpened.promise;

  return stream;
}
