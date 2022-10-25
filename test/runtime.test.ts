import assert from "assert";
import { spawn } from "child_process";
import fs, { ReadStream } from "fs";
import Deferred from "../src/util/Deferred";
import { deepLsSync } from "./fs_util";

describe("runtime", function () {

  async function execSS(file: string): Promise<string> {
    let ssOut = "";
    let ssErr = "";

    const proc = spawn("babel-node", ["--extensions", ".js,.ts", "src/main.ts", file]);
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", data => ssOut += data.toString());
    proc.stderr.on("data", data => ssErr += data.toString());

    const ssDone = new Deferred<number | null>();
    proc.on("close", code => ssDone.resolve(code));
    const code = await ssDone.promise;

    assert(code === 0, `${file} existed with code ${code}.\nstderr:\n${ssErr}`);
    assert(
      ssErr.trim().endsWith("Finished."),
      `${file} exited successfully but the graph didn't terminate cleanly.\nstdout:\n${ssOut}\nstderr:\n${ssErr}`
    );
    return ssOut;
  }

  function testRun(folder: string): void {
    deepLsSync(folder).forEach(file => {
      if (!file.endsWith(".ss")) {
        return;
      }
      it(file, async function () {
        const ssOut = await execSS(file);
        const ssExpectedFile = file.replace(".ss", ".expected");
        const ssExpected = await fs.promises.readFile(ssExpectedFile, "utf-8");
        // fs.writeFileSync(ssExpectedFile, ssOut, "utf-8");
        assert.equal(ssOut, ssExpected);
      });
    });
  }

  describe("should be able to run every script in the runtime test folder", function () {
    testRun("test/runtime/_sstests");
  });
});
