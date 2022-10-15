import Graph, { NodeSpec } from "../graph";
import util from "./util";

type Scope = {
  id: string;
  graph: Graph;
  vars: Set<string>;
}

class GraphX {
  preludeModule: string | null;
  scopes: Scope[];

  constructor(graph: Graph, preludeModule: string | null) {
    this.preludeModule = preludeModule;
    this.scopes = [{ id: "", graph, vars: new Set() }];
  }

  graph(): Graph {
    return this.scopes[this.scopes.length - 1].graph;
  }

  connectNodes(from: NodeSpec, to: NodeSpec, closeIns = true): NodeSpec {
    util.assertConnectArity(from, to);
    for (let i = 0; i < to.ins.length; i++) {
      this.graph().connectPorts(from.outs[i], to.ins[i]);
    }
    return { ins: closeIns ? [] : from.ins, outs: to.outs };
  }

  connectNodesBin(from1: NodeSpec, from2: NodeSpec, to: NodeSpec): NodeSpec {
    return this.connectNodesMulti([from1, from2], to);
  }

  connectNodesMulti(from: NodeSpec[], to: NodeSpec, closeIns = true): NodeSpec {
    for (let k = 0; k < from.length; k++) {
      util.assertOutArity(1, from[k]);
    }
    util.assertInArity(from.length, to);
    for (let k = 0; k < from.length; k++) {
      this.graph().connectPorts(from[k].outs[0], to.ins[k]);
    }
    return { ins: closeIns ? [] : from.map(e => e.ins[0]), outs: to.outs };
  }

  connectNodesMultiFluid(from: NodeSpec[], to: NodeSpec, closeIns = true): NodeSpec {
    util.assertInArity(from.reduce((sum, e) => sum + e.outs.length, 0), to);
    let toIdx = 0;
    for (let k = 0; k < from.length; k++) {
      for (let i = 0; i < from[k].outs.length; i++) {
        this.graph().connectPorts(from[k].outs[i], to.ins[toIdx++]);
      }
    }
    return { ins: closeIns ? [] : from.flatMap(e => e.ins), outs: to.outs };
  }

  addConstNode(value: unknown, uuid: string): NodeSpec {
    const node = this.graph().addNode(
      this.nodeIdForConst(value, uuid),
      this.graph().componentStore.specials.identity
    );
    this.graph().setInitial(node.ins[0], value);
    return { ins: [], outs: node.outs };
  }

  addVarNode(
    moduleName: string | null,
    name: string,
    forceNew = false,
    isFullyQualified: boolean = moduleName !== null): NodeSpec {

    const linkImplicit = (externalName: string): NodeSpec => {
      const nodeIn = this.graph().addNode(
        this.nodeIdForProxyVar(moduleName, name, "in"),
        this.graph().componentStore.specials.identity
      );
      const nodeOut = this.graph().addNode(
        this.nodeIdForProxyVar(moduleName, name, "out"),
        this.graph().componentStore.specials.identity
      );
      this.graph().addExternalIn(externalName, nodeIn.ins[0], true);
      this.graph().addExternalOut(externalName, nodeOut.outs[0], true);
      return { ins: nodeOut.ins, outs: nodeIn.outs };
    };

    if (isFullyQualified) {
      const node = this.scopes[0].graph.addNode(
        this.nodeIdForVar(moduleName, name),
        this.graph().componentStore.specials.identity
      );
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
      return this.graph().addNode(
        this.nodeIdForVar(moduleName, name),
        this.graph().componentStore.specials.identity
      );
    }
  }

  addFunctionNode(moduleName: string | null, name: string, uuid: string): NodeSpec {
    const fullName = this.fullVarName(moduleName, name);
    const nodeId = `Function: ${fullName} #${uuid}`;
    let node: NodeSpec | null = null;
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const subgraphOpt = this.scopes[i].graph.subgraphs.get(fullName);
      if (subgraphOpt) {
        if (i !== this.scopes.length - 1) {
          this.graph().addSubgraph(fullName, subgraphOpt);
        }
        node = this.graph().addSubgraphNode(nodeId, fullName);
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

      this.graph().connectPorts(extNode.outs[0], { nodeId, portName: p.portName });
    });
    subgraph.externalOuts.filter(p => p.implicit).forEach(p => {
      const spl = p.portName.split(".");
      const extNode = spl.length === 2 ?
        this.addVarNode(spl[0], spl[1]) :
        this.addVarNode(null, spl[0]);

      this.graph().connectPorts({ portName: p.portName, nodeId }, extNode.ins[0]);
    });
    return node;
  }

  addExternNode(componentId: string, uuid: string): NodeSpec {
    return this.graph().addNode(`Extern: ${componentId} #${uuid}`, componentId);
  }

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

  openScope(id: string): void {
    this.scopes.push({
      id,
      graph: new Graph(this.graph().componentStore),
      vars: new Set()
    });
  }

  closeScope(): Graph {
    const scope = this.scopes.pop();
    if (!scope) {
      throw new Error("Tried to pop root scope");
    }
    return scope.graph;
  }
}

export default GraphX;
