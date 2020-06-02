import util from "util";
import fs from "fs";

const fsReaddir = util.promisify(fs.readdir);
const fsStat = util.promisify(fs.stat);

export const forEach = async (dir: string, f: (file: string, stat: fs.Stats) => Promise<void>): Promise<void> => {
  const files = await fsReaddir(dir);
  await Promise.all(
    files.map(async file => await f(dir + "/" + file, await fsStat(dir + "/" + file)))
  );
};

export const walk = (dir: string, f: (file: string) => Promise<void>): Promise<void> =>
  forEach(dir, async (file, stat) => {
    if (!stat.isDirectory()) await f(file);
  });

export const deepWalk = async (dir: string, f: (file: string) => Promise<void>): Promise<void> =>
  forEach(dir, (file, stat) => stat.isDirectory() ? walk(file, f) : f(file));
