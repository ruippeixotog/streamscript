import fs from "fs";

import parser from "./parser";
import loader from "./component_loader/static";
import runner from "./graph_runner/noflo";
import compiler from "./graph_compiler";
import Graph from "./graph";

// const loader = new noflo.ComponentLoader(".");
// loader.listComponents((err, result) => {
//   console.log(result);
// });
// loader.load("streamscript/And", (err, result) => {
//   console.log(result.description);
//   console.log(result.inPorts);
//   console.log(result.outPorts);
// });

if (process.argv.length > 2) {
  const name = process.argv[2];
  console.log(`parsing ${name}...`);
  const ast = parser.parseFile(`sslib/examples/${name}`);

  console.log(`compiling ${name}...`);
  const graph = new Graph(loader.loadComponents());
  compiler.compileGraph(ast, graph, "main", true);
  graph.print();

  console.log(`running ${name}...`);
  runner.runGraph(graph)
    .then(() => console.log("Finished."))
    .catch(err => console.error("ERROR:", err));

} else {
  fs.readdir("sslib/examples", (_, files) => {
    files.forEach(name => {
      console.log(`parsing ${name}...`);
      parser.parseFile(`sslib/examples/${name}`);
    });
  });
}
