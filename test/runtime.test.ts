import { deepLsSync } from "./fs_util";
import parser from "../src/parser";
import { importRootDir, loader, runner } from "../src/runtime";
import compiler from "../src/compiler";
import { Component } from "../src/runtime/types";
import Logger from "../src/runtime/Logger";

describe("runtime", function () {

  function testRun(folder: string): void {
    const realStdout = process.stdout.write;
    const componentStore = loader.loadComponents();
    const logger = new Logger("/dev/null");

    let comp: Component<unknown[], unknown[]> | undefined = undefined;

    deepLsSync(folder).forEach(file => {
      it(file, async function () {
        let ast;
        try {
          // we don't want to test parsing here
          ast = parser.parseFile(file);
        } catch (ex) {
          this.skip();
        }
        let graph;
        try {
          // we don't want to test compiling here
          graph = compiler.compileGraph(ast, await componentStore, importRootDir);
        } catch (ex) {
          this.skip();
        }
        process.stdout.write = () => true;
        comp = runner.runGraph(graph, await componentStore, logger);
        await comp.whenTerminated();
      });
    });

    afterEach(function () {
      process.stdout.write = realStdout;
      if (comp !== undefined) {
        comp.terminate();
        comp = undefined;
      }
    });
  }

  describe("should be able to run every script in the runtime test folder", function () {
    testRun("test/runtime/_sstests");
  });
});
