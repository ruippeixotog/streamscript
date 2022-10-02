import Graph, { InPort, OutPort } from "./graph";
import graphviz from "graphviz";
import DeepMap from "./util/DeepMap";

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

function buildGraphvizGraph(
  graph: Graph,
  vizGraph: graphviz.Graph,
  includeSubgraphs: boolean,
  graphName?: string): graphviz.Graph {

  const sanitize = (nodeId: string): string => nodeId.replace(/"/g, '\\"');

  const fullIdFor = (nodeId: string, graphName?: string): string =>
    `${graphName ? sanitize(graphName) + "_" : ""}${sanitize(nodeId)}`;

  const localIdFor = (nodeId: string): string => fullIdFor(nodeId, graphName);

  const inPortVizNames = new DeepMap<InPort, [string, string]>();
  const outPortVizNames = new DeepMap<InPort, [string, string]>();

  const idForInPort = (port: InPort): [string, string] =>
    inPortVizNames.getOrElse(port, () => [localIdFor(port.nodeId), port.portName]);

  const idForOutPort = (port: OutPort): [string, string] =>
    outPortVizNames.getOrElse(port, () => [localIdFor(port.nodeId), port.portName]);

  const nodeLabel = (label: string, sublabel?: string): string =>
    sublabel ?
      `!${label}<br/><font color="darkgray" point-size="10px">${sublabel}</font>` :
      sanitize(label);

  if (graphName) {
    vizGraph.set("label", graphName);
    vizGraph.set("style", "dotted");
    vizGraph.set("color", "black");
  }

  graph.nodes.forEach((nodeImpl, nodeId) => {
    if (includeSubgraphs && "subgraphId" in nodeImpl) {
      const subgraph = graph.getSubgraph(nodeImpl.subgraphId);
      const vizSubgraphId = `"cluster_${nodeId}"`;

      buildGraphvizGraph(
        subgraph,
        vizGraph.addCluster(vizSubgraphId),
        true,
        (graphName ? `${graphName}_` : "") + nodeId
      );
      subgraph.externalIns.forEach(p => {
        inPortVizNames.set(
          { nodeId, portName: p.portName },
          [fullIdFor(p.innerPort.nodeId, nodeId), p.innerPort.portName]
        );
      });
      subgraph.externalOuts.forEach(p => {
        outPortVizNames.set(
          { nodeId, portName: p.portName },
          [fullIdFor(p.innerPort.nodeId, nodeId), p.innerPort.portName]
        );
      });
    } else {
      vizGraph.addNode(localIdFor(nodeId), {
        label: nodeLabel(nodeId, (nodeImpl as { componentId?: string }).componentId),
        shape: "box"
      });
    }
  });
  graph.edges.forEach(({ from, to }) => {
    const [fromId, fromPortName] = idForOutPort(from);
    const [toId, toPortName] = idForInPort(to);

    vizGraph.addEdge(fromId, toId, {
      taillabel: fromPortName,
      headlabel: toPortName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    });
  });
  let i = 0;
  graph.initials.forEach((data, port) => {
    const [toId, toPortName] = idForInPort(port);
    const n = vizGraph.addNode(localIdFor(`data${i++}`), {
      label: sanitize(JSON.stringify(data)),
      shape: "plaintext"
    });
    vizGraph.addEdge(n, toId, {
      headlabel: toPortName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    });
  });

  return vizGraph;
}

function toGraphvizGraph(graph: Graph, includeSubgraphs: boolean): graphviz.Graph {
  return buildGraphvizGraph(graph, graphviz.digraph("G"), includeSubgraphs);
}

export function toDOT(graph: Graph, includeSubgraphs = false): string {
  return toGraphvizGraph(graph, includeSubgraphs).to_dot();
}

export function toPNG(graph: Graph, filename: string, includeSubgraphs = false): void {
  toGraphvizGraph(graph, includeSubgraphs).output("png", filename);
}

export default { print, toDOT, toPNG };
