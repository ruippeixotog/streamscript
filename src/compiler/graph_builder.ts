import { ComponentStore } from "../types";
import Graph, { InPortRef, OutPortRef } from "./graph";
import util from "./util";

/**
 * A reference to a connected section of this graph, used by `GraphBuilder` to provide node-agnostic
 * connect operations. A graph part can reference multiple nodes and can be seen conceptually as a
 * single node with in and out ports.
 */
export type PartRef = {
  ins: InPortRef[];
  outs: OutPortRef[];
};

type Scope = {
  subgraphId: string;
  graph: Graph;
  vars: Set<string>;
}

class GraphBuilder {
  componentStore: ComponentStore<unknown>;
  private scopes: Scope[];
  private preludeModule: string | null;

  constructor(componentStore: ComponentStore<unknown>, preludeModule: string | null) {
    this.scopes = [{ subgraphId: "", graph: new Graph(), vars: new Set() }];
    this.componentStore = componentStore;
    this.preludeModule = preludeModule;
  }

  // --- Generic graph operations ---

  rootGraph(): Graph {
    return this.scopes[0].graph;
  }

  private graph(): Graph {
    return this.scopes[this.scopes.length - 1].graph;
  }

  addNode(nodeId: string, componentId: string): PartRef {
    const component = this.componentStore.components[componentId];
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    this.graph().addNode(nodeId, componentId);
    return this.getNode(nodeId);
  }

  getNode(nodeId: string): PartRef {
    return this.getNodeInGraph(nodeId, this.graph());
  }

  private getNodeInGraph(nodeId: string, graph: Graph): PartRef {
    if (nodeId === GraphBuilder.VOID_NODE) {
      return GraphBuilder.getVoidNode();
    }
    const nodeImpl = graph.getNode(nodeId);
    if ("componentId" in nodeImpl) {
      const component = this.componentStore.components[nodeImpl.componentId];
      if (!component) {
        throw new Error(`Unknown component: ${nodeImpl.componentId}`);
      }
      return {
        ins: component.spec.ins.map(portName => ({ nodeId, portName })),
        outs: component.spec.outs.map(portName => ({ nodeId, portName }))
      };
    } else {
      const subgraph = graph.getSubgraph(nodeImpl.subgraphId);
      return {
        ins: subgraph.externalIns
          .filter(p => !p.implicit)
          .map(p => ({ nodeId, portName: p.portName })),
        outs: subgraph.externalOuts
          .filter(p => !p.implicit)
          .map(p => ({ nodeId, portName: p.portName }))
      };
    }
  }

  addSubgraphNode(nodeId: string, subgraphId: string): PartRef {
    this.graph().addSubgraphNode(nodeId, subgraphId);
    return this.getNode(nodeId);
  }

  getSubgraph(subgraphId: string): Graph {
    return this.graph().getSubgraph(subgraphId);
  }

  addSubgraph(subgraphId: string, subgraph: Graph): void {
    this.graph().addSubgraph(subgraphId, subgraph);
  }

  connectPorts(from: OutPortRef, to: InPortRef): void {
    if (from.nodeId !== GraphBuilder.VOID_NODE && to.nodeId !== GraphBuilder.VOID_NODE) {
      this.graph().addEdge(from, to);
    }
  }

  connect(from: PartRef, to: PartRef, closeIns = true): PartRef {
    util.assertConnectArity(from, to);
    for (let i = 0; i < to.ins.length; i++) {
      this.graph().addEdge(from.outs[i], to.ins[i]);
    }
    return { ins: closeIns ? [] : from.ins, outs: to.outs };
  }

  connectBin(from1: PartRef, from2: PartRef, to: PartRef): PartRef {
    return this.connectMulti([from1, from2], to);
  }

  connectMulti(from: PartRef[], to: PartRef, closeIns = true): PartRef {
    for (let k = 0; k < from.length; k++) {
      util.assertOutArity(1, from[k]);
    }
    util.assertInArity(from.length, to);
    for (let k = 0; k < from.length; k++) {
      this.graph().addEdge(from[k].outs[0], to.ins[k]);
    }
    return { ins: closeIns ? [] : from.map(e => e.ins[0]), outs: to.outs };
  }

  connectMultiFluid(from: PartRef[], to: PartRef, closeIns = true): PartRef {
    util.assertInArity(from.reduce((sum, e) => sum + e.outs.length, 0), to);
    let toIdx = 0;
    for (let k = 0; k < from.length; k++) {
      for (let i = 0; i < from[k].outs.length; i++) {
        this.graph().addEdge(from[k].outs[i], to.ins[toIdx++]);
      }
    }
    return { ins: closeIns ? [] : from.flatMap(e => e.ins), outs: to.outs };
  }

  addExternalIn(portName: string, innerPort: InPortRef, implicit = false): void {
    this.graph().addExternalIn(portName, innerPort, implicit);
  }

  addExternalOut(portName: string, innerPort: OutPortRef, implicit = false): void {
    this.graph().addExternalOut(portName, innerPort, implicit);
  }

  // --- Specialized node add operations ---

  addConstNode(value: unknown, uuid: string): PartRef {
    const node = this.addNode(
      this.nodeIdForConst(value, uuid),
      this.componentStore.specials.identity
    );
    this.graph().setInitial(node.ins[0], value);
    return { ins: [], outs: node.outs };
  }

  addVarNode(
    moduleName: string | null,
    name: string,
    forceNew = false,
    isFullyQualified: boolean = moduleName !== null): PartRef {

    const linkImplicit = (externalName: string): PartRef => {
      const nodeIn = this.addNode(
        this.nodeIdForProxyVar(moduleName, name, "in"),
        this.componentStore.specials.identity
      );
      const nodeOut = this.addNode(
        this.nodeIdForProxyVar(moduleName, name, "out"),
        this.componentStore.specials.identity
      );
      this.graph().addExternalIn(externalName, nodeIn.ins[0], true);
      this.graph().addExternalOut(externalName, nodeOut.outs[0], true);
      return { ins: nodeOut.ins, outs: nodeIn.outs };
    };

    if (isFullyQualified) {
      const nodeId = this.nodeIdForVar(moduleName, name);
      this.scopes[0].graph.addNode(
        nodeId,
        this.componentStore.specials.identity
      );
      const node = this.getNodeInGraph(nodeId, this.scopes[0].graph);
      return this.scopes.length === 1 ?
        node :
        linkImplicit(`${moduleName}.${name}`);

    } else {
      const currentScope = this.scopes[this.scopes.length - 1];
      if (!currentScope.vars.has(name)) {
        currentScope.vars.add(name);
        if (!forceNew) {
          for (let i = this.scopes.length - 2; i >= 0; i--) {
            if (this.scopes[i].vars.has(name)) {
              return linkImplicit(name);
            }
          }
        }
      }
      return this.addNode(
        this.nodeIdForVar(moduleName, name),
        this.componentStore.specials.identity
      );
    }
  }

  addFunctionNode(moduleName: string | null, name: string, uuid: string): PartRef {
    const fullName = this.fullVarName(moduleName, name);
    const nodeId = `Function: ${fullName} #${uuid}`;
    let node: PartRef | null = null;
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const subgraphOpt = this.scopes[i].graph.subgraphs.get(fullName);
      if (subgraphOpt) {
        if (i !== this.scopes.length - 1) {
          this.graph().addSubgraph(fullName, subgraphOpt);
        }
        node = this.addSubgraphNode(nodeId, fullName);
      }
    }
    if (node === null) {
      if (moduleName !== this.preludeModule) {
        try {
          return this.addFunctionNode(this.preludeModule, name, uuid);
        } catch (_) { /* do nothing */ }
      }
      throw new Error(`Unknown subgraph: ${fullName}`);
    }
    const subgraph = this.graph().getSubgraph(fullName);
    subgraph.externalIns.filter(p => p.implicit).forEach(p => {
      const spl = p.portName.split(".");
      const extNode = spl.length === 2 ?
        this.addVarNode(spl[0], spl[1]) :
        this.addVarNode(null, spl[0]);

      this.graph().addEdge(extNode.outs[0], { nodeId, portName: p.portName });
    });
    subgraph.externalOuts.filter(p => p.implicit).forEach(p => {
      const spl = p.portName.split(".");
      const extNode = spl.length === 2 ?
        this.addVarNode(spl[0], spl[1]) :
        this.addVarNode(null, spl[0]);

      this.graph().addEdge({ portName: p.portName, nodeId }, extNode.ins[0]);
    });
    return node;
  }

  addExternNode(componentId: string, uuid: string): PartRef {
    return this.addNode(`Extern: ${componentId} #${uuid}`, componentId);
  }

  // --- Naming utilities ---

  fullVarName(moduleName: string | null, name: string): string {
    return (moduleName ? moduleName + "." : "") + name;
  }

  nodeIdForConst(value: unknown, uuid: string): string {
    return `Const: ${JSON.stringify(value)} #${uuid}`;
  }

  nodeIdForVar(moduleName: string | null, name: string): string {
    return `Var: ${this.fullVarName(moduleName, name)}`;
  }

  nodeIdForProxyVar(moduleName: string | null, name: string, direction: "in" | "out"): string {
    return `Proxy Var: ${this.fullVarName(moduleName, name)} (${direction})`;
  }

  // --- Graph scoping ---

  openScope(subgraphId: string): void {
    this.scopes.push({
      subgraphId,
      graph: new Graph(),
      vars: new Set()
    });
  }

  closeScope(): void {
    const scope = this.scopes.pop();
    if (!scope) {
      throw new Error("Tried to pop root scope");
    }
    this.graph().addSubgraph(scope.subgraphId, scope.graph);
  }

  // --- Void node ---

  static VOID_NODE = "void";

  static getVoidNode(): PartRef {
    return {
      ins: [{ nodeId: GraphBuilder.VOID_NODE, portName: "in" }],
      outs: [{ nodeId: GraphBuilder.VOID_NODE, portName: "out" }]
    };
  }
}

export default GraphBuilder;
