import fs from "fs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import parser from "./parser";
import { importRootDir, loader, runner } from "./runtime";
import compiler from "./compiler";
import printer from "./graph_printer";
import FilePacketListener from "./runtime/listener/FilePacketListener";

type Argv = {
  file: string,
  dot: boolean,
  packets: boolean,
  verbose: boolean
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
      describe: "Write dot and png files to the output folder",
      default: false
    })
    .option("packets", {
      type: "boolean",
      describe: "Listens to all graph activity and logs it to packets.log",
      default: false
    })
    .option("verbose", {
      alias: "v",
      type: "boolean",
      describe: "Print compiler and runner progress messages",
      default: false
    })
    .demandOption("file")
    .help()
    .alias("help", "h")
    .strict()
    .argv;

  return argv.then ? await argv : argv;
}

async function main(argv: Argv): Promise<void> {
  if (argv.verbose) {
    console.error(`parsing ${argv.file}...`);
  }
  const ast = parser.parseFile(argv.file);

  if (argv.verbose) {
    console.error(`compiling ${argv.file}...`);
  }
  const componentStore = await loader.loadComponents();
  const graph = compiler.compileGraph(ast, componentStore, importRootDir);

  fs.mkdirSync("out", { recursive: true });
  if (argv.dot) {
    fs.writeFileSync("out/graph.dot", printer.toDOT(graph));
    fs.writeFileSync("out/graph_full.dot", printer.toDOT(graph, true));
    printer.toPNG(graph, "out/graph.png");
    printer.toPNG(graph, "out/graph_full.png", true);
  }

  if (argv.verbose) {
    console.error(`running ${argv.file}...`);
  }
  const listener = argv.packets ? new FilePacketListener("out/packets.log") : undefined;
  await runner.runGraph(graph, componentStore, listener).whenTerminated();
}

parseArgs()
  .then(main)
  .then(() => console.error("Finished."))
  .catch(err => console.error("ERROR:", err));
