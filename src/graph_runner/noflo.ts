import Graph from "../graph";
import noflo from "noflo";
import fs from "fs";

function runGraph(graph: Graph): void {
  const nofloGraph = new noflo.Graph();

  graph.nodes.forEach((componentId, nodeId) =>
    nofloGraph.addNode(nodeId, componentId)
  );
  graph.edges.forEach(([from, to]) =>
    nofloGraph.addEdge(from.nodeId, from.portName, to.nodeId, to.portName)
  );
  graph.initials.forEach((value, port) =>
    nofloGraph.addInitial(value, port.nodeId, port.portName)
  );
  graph.externalIns.forEach(inPort =>
    nofloGraph.addInport(inPort.portName, inPort.nodeId, inPort.portName)
  );
  graph.externalOuts.forEach(outPort =>
    nofloGraph.addOutport(outPort.portName, outPort.nodeId, outPort.portName)
  );

  nofloGraph.save("graph", () => {});
  fs.writeFile("graph.dot", nofloGraph.toDOT(), () => {});

  const wrappedGraph = noflo.asCallback(nofloGraph);
  wrappedGraph({}, (err, result) => {
    // Do something with the results
    if (err) {
      console.error("ERROR", err);
    } else {
      console.log(result);
    }
  });
}

export default { runGraph };
