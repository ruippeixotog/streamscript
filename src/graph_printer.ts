import Graph from "./graph";
import graphviz from "graphviz";

export function print(graph: Graph): void {
  console.log("Nodes:");
  graph.nodes.forEach((v, k) => console.log(k, "->", v));
  console.log("Edges:");
  graph.edges.forEach(v => console.log(v));
  console.log("Initials:");
  graph.initials.forEach((v, k) => console.log(k, "<-", v));
  console.log("Subgraphs:");
  graph.subgraphs.forEach((v, k) => console.log(k));
  console.log("External inputs:");
  graph.externalIns.forEach(v => console.log(v));
  console.log("External outputs:");
  graph.externalOuts.forEach(v => console.log(v));
}

function toGraphvizGraph(graph: Graph): graphviz.Graph {
  const sanitize = (nodeId: string): string => nodeId.replace(/"/g, '\\"');

  const g = graphviz.digraph("G");
  graph.nodes.forEach((_, nodeId) =>
    g.addNode(sanitize(nodeId), { label: sanitize(nodeId), shape: "box" })
  );
  graph.edges.forEach(([from, to]) =>
    g.addEdge(sanitize(from.nodeId), sanitize(to.nodeId), {
      taillabel: from.portName,
      headlabel: to.portName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    })
  );
  let i = 0;
  graph.initials.forEach((data, port) => {
    const n = g.addNode(`data${i++}`, {
      label: sanitize(JSON.stringify(data)),
      shape: "plaintext"
    });
    g.addEdge(n, sanitize(port.nodeId), {
      headlabel: port.portName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    });
  });
  return g;
}

export function toDOT(graph: Graph): string {
  return toGraphvizGraph(graph).to_dot();
}

export function toPNG(graph: Graph, filename: string): void {
  toGraphvizGraph(graph).output("png", filename);
}

export default { print, toDOT, toPNG };
