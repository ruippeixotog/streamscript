import assert from "assert";
import { spawn } from "child_process";
import fs from "fs";
import Deferred from "../src/util/Deferred";
import { deepLsSync, openReadStream } from "./fs_util";

describe("runtime", function () {
  this.timeout(10000);

  async function execSS(file: string, ssInFile: string): Promise<string> {
    const ssInStream = await openReadStream(ssInFile);

    const proc = spawn(
      "babel-node",
      ["--extensions", ".js,.ts", "src/main.ts", file],
      { stdio: [ssInStream || "ignore", "pipe", "pipe"] }
    );

    let ssOut = "";
    let ssErr = "";
    proc.stdout.on("data", data => ssOut += data.toString());
    proc.stderr.on("data", data => ssErr += data.toString());

    const ssDone = new Deferred<number | null>();
    proc.on("close", code => ssDone.resolve(code));
    const code = await ssDone.promise;

    function assertProc(value: unknown, msg: string): asserts value {
      assert(value, `${msg}.\n\nstdout:\n${ssOut}\n\nstderr:\n${ssErr}`);
    }

    assertProc(code === 0, `${file} exited with code ${code}`);
    assertProc(
      ssErr.trim().endsWith("Finished."),
      `${file} exited successfully but the graph didn't terminate cleanly`
    );
    return ssOut;
  }

  function testRun(folder: string): void {
    deepLsSync(folder).forEach(file => {
      if (!file.endsWith(".ss")) {
        return;
      }
      it(file, async function () {
        const ssInFile = file.replace(".ss", ".in");
        const ssOut = await execSS(file, ssInFile);

        const ssExpectedFile = file.replace(".ss", ".expected");
        const ssExpected = await fs.promises.readFile(ssExpectedFile, "utf-8");
        assert.equal(ssOut, ssExpected);
        // fs.writeFileSync(ssExpectedFile, ssOut, "utf-8");
      });
    });
  }

  describe("should be able to run every script in the runtime test folder", function () {
    testRun("test/runtime/_sstests");
  });
});
