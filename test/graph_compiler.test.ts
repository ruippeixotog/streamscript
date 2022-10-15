import { walk } from "./fs_util";
import parser from "../src/parser";
import { importRootDir, loader } from "../src/runtime";
import compiler from "../src/compiler";

describe("graph_compiler", function () {
  it("should be able to compile every source file in ssexamples (except subfolders)", async function () {
    const componentStore = await loader.loadComponents();
    await walk("ssexamples", async file => {
      let ast;
      try {
        // we don't want to test parsing here
        ast = parser.parseFile(file);
      } catch (ex) {
        this.skip();
      }
      compiler.compileGraph(ast, componentStore, importRootDir);
    });
  });
});
