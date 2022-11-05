import Graph, { InPortRef, OutPortRef } from "../compiler/graph";
import graphviz from "graphviz-builder";
import DeepMap from "../util/DeepMap";
import edgeRepr from "./edge_repr";

function buildVizGraph(
  graph: Graph,
  vizGraph: graphviz.Graph,
  includeSubgraphs: boolean | string[],
  graphName?: string): graphviz.Graph {

  const sanitize = (nodeId: string): string => nodeId.replace(/"/g, '\\"');

  const fullIdFor = (nodeId: string, graphName?: string): string =>
    `${graphName ? sanitize(graphName) + "_" : ""}${sanitize(nodeId)}`;

  const localIdFor = (nodeId: string): string => fullIdFor(nodeId, graphName);

  const inPortVizNames = new DeepMap<InPortRef, [string, string]>();
  const outPortVizNames = new DeepMap<InPortRef, [string, string]>();

  const idForInPort = (port: InPortRef): [string, string] =>
    inPortVizNames.getOrElse(port, () => [localIdFor(port.nodeId), port.portName]);

  const idForOutPort = (port: OutPortRef): [string, string] =>
    outPortVizNames.getOrElse(port, () => [localIdFor(port.nodeId), port.portName]);

  const nodeLabel = (label: string, sublabel?: string): string =>
    sublabel ?
      `!${label}<br/><font color="darkgray" point-size="10px">${sublabel}</font>` :
      sanitize(label);

  const shouldRender = (nodeId: string): boolean =>
    typeof includeSubgraphs === "object" ? includeSubgraphs.includes(nodeId) : includeSubgraphs;

  if (graphName) {
    vizGraph.set("label", graphName);
    vizGraph.set("style", "dotted");
    vizGraph.set("color", "black");
  }

  graph.nodes.forEach((nodeImpl, nodeId) => {
    if ("subgraphId" in nodeImpl && shouldRender(nodeId)) {
      const subgraph = graph.getSubgraph(nodeImpl.subgraphId);
      const vizSubgraphId = `cluster_${nodeId}`;

      buildVizGraph(
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
        id: nodeId,
        label: nodeLabel(nodeId, (nodeImpl as { componentId?: string }).componentId),
        shape: "box"
      });
    }
  });

  graph.edges.forEach(({ from, to }) => {
    const [fromId, fromPortName] = idForOutPort(from);
    const [toId, toPortName] = idForInPort(to);

    vizGraph.addEdge(fromId, toId, {
      id: edgeRepr.formatEdge(from, to),
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
      id: edgeRepr.formatInitialEdge(data, port),
      headlabel: toPortName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    });
  });

  return vizGraph;
}

function toVizGraph(
  graph: Graph,
  includeSubgraphs: boolean | string[] = false
): graphviz.Graph {
  return buildVizGraph(graph, graphviz.digraph("G"), includeSubgraphs);
}

function toDOT(graph: Graph, includeSubgraphs: boolean | string[] = false): string {
  return toVizGraph(graph, includeSubgraphs).to_dot();
}

export default { toVizGraph, toDOT };
