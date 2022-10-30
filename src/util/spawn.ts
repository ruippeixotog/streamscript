import { spawn as osSpawn, SpawnOptionsWithoutStdio } from "child_process";

function spawn(
  command: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptionsWithoutStdio
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = osSpawn(command, args, options);
    proc.on("close", resolve);
    proc.on("error", reject);
  });
}

export default spawn;
