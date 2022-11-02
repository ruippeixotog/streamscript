import DeepMap from "../util/DeepMap";

/**
 * A node in the graph, containing information about how it should be instantiated.
 */
export type Node =
  { componentId: string } |
  { subgraphId: string };

/**
 * An object that uniquely identifies an in port in the graph.
 */
export type InPortRef = { nodeId: string; portName: string };

/**
 * An object that uniquely identifies an out port in the graph.
 */
export type OutPortRef = { nodeId: string; portName: string };

/**
 * A specification of an edge in the graph.
 */
export type Edge = {
  from: OutPortRef;
  to: InPortRef;
};

/**
 * A reference to an in port of the graph that is to be exposed externally.
 */
export type ExtInPortRef = {
  portName: string;
  innerPort: InPortRef;
  implicit: boolean;
};

/**
 * A reference to an out port of the graph that is to be exposed externally.
 */
export type ExtOutPortRef = {
  portName: string;
  innerPort: OutPortRef;
  implicit: boolean;
};

export type GraphJSON = {
  nodes: [string, Node][],
  edges: Edge[],
  initials: [InPortRef, unknown][],
  subgraphs: [string, GraphJSON][],
  externalIns: ExtInPortRef[],
  externalOuts: ExtOutPortRef[]
};

class Graph {
  nodes: DeepMap<string, Node> = new DeepMap();
  edges: Edge[] = [];
  initials: DeepMap<InPortRef, unknown> = new DeepMap();
  subgraphs: DeepMap<string, Graph> = new DeepMap();
  externalIns: ExtInPortRef[] = [];
  externalOuts: ExtOutPortRef[] = [];

  addNode(nodeId: string, componentId: string): void {
    this.nodes.set(nodeId, { componentId });
  }

  addSubgraphNode(nodeId: string, subgraphId: string): void {
    this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
    this.nodes.set(nodeId, { subgraphId });
  }

  getNode(nodeId: string): Node {
    return this.nodes.getOrElse(nodeId, () => {
      throw new Error(`Unknown node: ${nodeId}`);
    });
  }

  setInitial(port: InPortRef, value: unknown): void {
    this.initials.set(port, value);
  }

  addEdge(from: OutPortRef, to: InPortRef): void {
    this.edges.push({ from, to });
  }

  getSubgraph(subgraphId: string): Graph {
    return this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
  }

  addSubgraph(subgraphId: string, subgraph: Graph): void {
    this.subgraphs.set(subgraphId, subgraph);
  }

  addExternalIn(portName: string, innerPort: InPortRef, implicit = false): void {
    this.externalIns.push({ portName, innerPort, implicit });
  }

  addExternalOut(portName: string, innerPort: OutPortRef, implicit = false): void {
    this.externalOuts.push({ portName, innerPort, implicit });
  }

  static fromJSON(graphJSON: GraphJSON): Graph {
    const graph = new Graph();
    graph.nodes = new DeepMap(graphJSON.nodes);
    graph.edges = graphJSON.edges;
    graph.initials = new DeepMap(graphJSON.initials);
    graph.subgraphs = new DeepMap(graphJSON.subgraphs.map(([k, v]) => [k, Graph.fromJSON(v)]));
    graph.externalIns = graphJSON.externalIns;
    graph.externalOuts = graphJSON.externalOuts;
    return graph;
  }

  toJSON(): GraphJSON {
    return {
      nodes: [...this.nodes],
      edges: this.edges,
      initials: [...this.initials],
      subgraphs: [...this.subgraphs].map(([k, v]) => [k, v.toJSON()]),
      externalIns: this.externalIns,
      externalOuts: this.externalOuts
    };
  }
}

export default Graph;
