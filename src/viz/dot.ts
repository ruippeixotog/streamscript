import Graph, { InPortRef, OutPortRef } from "../compiler/graph";
import graphviz from "graphviz-builder";
import DeepMap from "../util/DeepMap";
import repr from "./repr";

export type DotOpts = {
  includeSubgraphs?: boolean | string[],
  renderEmptyEdgeLabels?: boolean
};

function buildVizGraph(
  graph: Graph,
  vizGraph: graphviz.Graph,
  graphName?: string,
  opts?: DotOpts): graphviz.Graph {

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
    typeof opts?.includeSubgraphs === "object" ?
      opts?.includeSubgraphs.includes(nodeId) :
      opts?.includeSubgraphs || false;

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
        (graphName ? `${graphName}_` : "") + nodeId,
        opts
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
        id: repr.formatNode(nodeId, graphName),
        label: nodeLabel(nodeId, (nodeImpl as { componentId?: string }).componentId),
        shape: "box"
      });
    }
  });

  graph.edges.forEach(({ from, to }) => {
    const [fromId, fromPortName] = idForOutPort(from);
    const [toId, toPortName] = idForInPort(to);

    vizGraph.addEdge(fromId, toId, {
      id: repr.formatEdge(from, to, graphName),
      label: opts?.renderEmptyEdgeLabels ? " " : undefined,
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
      id: repr.formatInitialEdge(data, port),
      headlabel: toPortName,
      labelfontcolor: "blue",
      labelfontsize: 8.0
    });
  });

  return vizGraph;
}

function toVizGraph(graph: Graph, opts?: DotOpts): graphviz.Graph {
  return buildVizGraph(graph, graphviz.digraph("G"), undefined, opts);
}

function toDOT(graph: Graph, opts?: DotOpts): string {
  return toVizGraph(graph, opts).to_dot();
}

export default { toVizGraph, toDOT };
