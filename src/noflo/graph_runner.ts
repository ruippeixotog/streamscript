import Graph from "../graph";
import noflo from "noflo";
import { ComponentLoader, Network } from "noflo";
import fs from "fs";
import util from "util";

function asCallback(component, loader) {

  component.componentLoader = loader;
  const network = new Network(component);

  // const connect = util.promisify(network.connect);
  // const start = util.promisify(network.start);
  // const once = util.promisify(network.once);

  // const portDef = network.graph.inports["in"];
  // const process = network.getNode(portDef.process);
  // const socket = noflo.internalSocket.createSocket();
  // process.component.inPorts["in"].attach(socket);
  // socket.post(new noflo.IP("data"), inputs);

  return (callback) => {
    network.connect(err => {
      if (err) { return callback(err); }

      network.start((err) => {
        if (err) { return callback(err); }
      });

      network.once("end", () => callback(null));
    });
  };
}

function toNofloGraph(graph: Graph, loader: ComponentLoader): noflo.Graph {
  const nofloGraph = new noflo.Graph();

  graph.subgraphs.forEach((subgraph, subgraphId) => {
    const nofloSubgraph = toNofloGraph(subgraph, loader);
    loader.registerGraph("Graph", subgraphId, nofloSubgraph);
  });
  graph.nodes.forEach((nodeImpl, nodeId) => {
    nofloGraph.addNode(
      nodeId,
      "componentId" in nodeImpl ? nodeImpl.componentId : `Graph/${nodeImpl.subgraphId}`
    );
  });
  graph.edges.forEach(([from, to]) =>
    nofloGraph.addEdge(from.nodeId, from.portName, to.nodeId, to.portName)
  );
  graph.initials.forEach((value, port) =>
    nofloGraph.addInitial(value, port.nodeId, port.portName)
  );
  graph.externalIns.forEach(p =>
    nofloGraph.addInport(p.portName, p.innerPort.nodeId, p.innerPort.portName)
  );
  graph.externalOuts.forEach(p =>
    nofloGraph.addOutport(p.portName, p.innerPort.nodeId, p.innerPort.portName)
  );
  return nofloGraph;
}

async function runGraph(graph: Graph): Promise<any> {
  const loader = new ComponentLoader(".");
  await util.promisify(loader.listComponents.bind(loader))();

  const nofloGraph = toNofloGraph(graph, loader);
  nofloGraph.save("out/graph", () => {});

  await util.promisify(asCallback(nofloGraph, loader))();
}

export default { runGraph };
