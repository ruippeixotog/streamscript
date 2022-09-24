import fs from "fs";

import parser from "./parser";
import { importRootDir, loader, runner } from "./runtime";
import compiler from "./graph_compiler";
import printer from "./graph_printer";
import Graph from "./graph";

async function runFile(filename: string): Promise<void> {
  console.log(`parsing ${filename}...`);
  const ast = parser.parseFile(filename);

  console.log(`compiling ${filename}...`);
  const componentStore = await loader.loadComponents();

  const graph = new Graph(componentStore);
  compiler.compileGraph(ast, graph, importRootDir);

  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/graph.dot", printer.toDOT(graph));
  fs.writeFileSync("out/graph_full.dot", printer.toDOT(graph, true));
  printer.toPNG(graph, "out/graph.png");
  printer.toPNG(graph, "out/graph_full.png", true);

  console.log(`running ${filename}...`);
  await runner.runGraph(graph);
}

if (process.argv.length > 2) {
  const filename = process.argv[2];
  runFile(filename)
    .then(() => console.log("Finished."))
    .catch(err => console.error("ERROR:", err));

} else {
  function parseDir(dir: string) {
    fs.readdir(dir, { withFileTypes: true }, (_, files) => {
      files.forEach(file => {
        if(file.isDirectory()) {
          parseDir(`${dir}/${file.name}`);
        } else {
          console.log(`parsing ${file.name}...`);
          parser.parseFile(`${dir}/${file.name}`);
        }
      });
    });
  }
  parseDir("ssexamples");
}
