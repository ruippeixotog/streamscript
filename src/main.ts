import fs from "fs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import parser from "./parser";
import { importRootDir, loader, runner } from "./runtime";
import compiler from "./compiler";
import printer from "./graph_printer";
import Logger from "./runtime/Logger";

type Argv = {
  file: string,
  dot: boolean | undefined
}

async function parseArgs(): Promise<Argv> {
  const argv = yargs(hideBin(process.argv))
    .scriptName("sscript")
    .command("* <file>", "Compile and run a StreamScript file")
    .positional("file", {
      describe: "The script file to run",
      type: "string"
    })
    .option("dot", {
      type: "boolean",
      describe: "Write dot and png files to the output folder"
    })
    .demandOption("file")
    .help()
    .alias("help", "h")
    .strict()
    .argv;

  return argv.then ? await argv : argv;
}

async function main(argv: Argv): Promise<void> {
  console.log(`parsing ${argv.file}...`);
  const ast = parser.parseFile(argv.file);

  console.log(`compiling ${argv.file}...`);
  const componentStore = await loader.loadComponents();
  const graph = compiler.compileGraph(ast, componentStore, importRootDir);

  fs.mkdirSync("out", { recursive: true });
  if (argv.dot) {
    fs.writeFileSync("out/graph.dot", printer.toDOT(graph));
    fs.writeFileSync("out/graph_full.dot", printer.toDOT(graph, true));
    printer.toPNG(graph, "out/graph.png");
    printer.toPNG(graph, "out/graph_full.png", true);
  }

  console.log(`running ${argv.file}...`);
  const logger = new Logger("out/packets.log");
  await runner.runGraph(graph, componentStore, logger).whenTerminated();
}

parseArgs()
  .then(main)
  .then(() => console.log("Finished."))
  .catch(err => console.error("ERROR:", err));
