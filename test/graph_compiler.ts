import { walk } from "./fs_util";
import parser from "../src/parser";
import { importRootDir, loader } from "../src/runtime";
import Graph from "../src/graph";
import compiler from "../src/graph_compiler";

describe("graph_compiler", function () {
  it("should be able to parse every source file in ssexamples (except subfolders)", async function () {
    const componentStore = await loader.loadComponents();
    await walk("ssexamples", async file => {
      const ast = parser.parseFile(file);
      const graph = new Graph(componentStore);
      compiler.compileGraph(ast, graph, importRootDir);
    });
  });
});
