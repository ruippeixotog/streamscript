import fs from "fs";

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
