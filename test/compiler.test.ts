import { deepLsSync } from "./fs_util";
import parser from "../src/parser";
import { importRootDir, loader } from "../src/runtime";
import compiler from "../src/compiler";

describe("compiler", function () {

  function testCompile(folder: string): void {
    const componentStore = loader.loadComponents();

    deepLsSync(folder).forEach(file => {
      if (!file.endsWith(".ss")) {
        return;
      }
      it(file, async function () {
        let ast;
        try {
          // we don't want to test parsing here
          ast = parser.parseFile(file);
        } catch (ex) {
          this.skip();
        }
        compiler.compileGraph(ast, await componentStore, importRootDir);
      });
    });
  }

  describe("should be able to compile every script in the compiler test folder", function () {
    testCompile("test/compiler/_sstests");
  });

  describe("should be able to compile every script in the runtime test folder", function () {
    testCompile("test/runtime/_sstests");
  });
});
