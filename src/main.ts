import fs from "fs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import parser from "./parser";
import { importRootDir, loader, runner } from "./runtime";
import compiler from "./compiler";
import PacketListener from "./runtime/listener/PacketListener";
import FilePacketListener from "./runtime/listener/FilePacketListener";
import dot from "./viz/dot";
import spawn from "./util/spawn";
import server from "./webui/server";
import open from "open";

type Argv = {
  file: string,
  dot: boolean,
  packets: boolean,
  webui: boolean,
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
    .option("webui", {
      type: "boolean",
      describe: "Open a web server for visualizing graph execution",
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
    fs.writeFileSync("out/graph.dot", dot.toDOT(graph));
    fs.writeFileSync("out/graph_full.dot", dot.toDOT(graph, { includeSubgraphs: true }));
    await spawn("dot", ["-Tpng", "out/graph.dot", "-o", "out/graph.png"]);
    await spawn("dot", ["-Tpng", "out/graph_full.dot", "-o", "out/graph_full.png"]);
  }
  if (argv.verbose) {
    console.error(`running ${argv.file}...`);
  }
  let listener: PacketListener | undefined;
  if (argv.webui) {
    listener = await server.serveWs(graph, 6765);
    open("http://localhost:6765");
  } else if (argv.packets) {
    listener = new FilePacketListener("out/packets.log");
  }
  await runner.runGraph(graph, componentStore, listener).whenTerminated();
}

parseArgs()
  .then(main)
  .then(() => console.error("Finished."))
  .catch(err => console.error("ERROR:", err));
