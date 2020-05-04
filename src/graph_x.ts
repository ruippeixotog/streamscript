import Graph, { NodeSpec } from "./graph";

type Scope = {
  id: string,
  graph: Graph,
  vars: Set<string>
}

class GraphX {
  scopes: Scope[];

  constructor(graph: Graph) {
    this.scopes = [{ id: "", graph, vars: new Set() }];
  }

  graph(): Graph {
    return this.scopes[this.scopes.length - 1].graph;
  }

  addConstNode(value: any, uuid: string): NodeSpec {
    const node = this.graph().addNode(
      this.nodeIdForConst(value, uuid),
      this.graph().componentStore.specials.identity
    );
    this.graph().setInitial(node.ins[0], value);
    return { ins: [], outs: node.outs };
  }

  addVarNode(moduleName: string | null, name: string, forceNew: boolean = false): NodeSpec {
    const currentScope = this.scopes[this.scopes.length - 1];
    currentScope.vars.add(name);
    const node = this.graph().addNode(
      this.nodeIdForVar(moduleName, name),
      this.graph().componentStore.specials.identity
    );

    if (!forceNew) {
      for (let i = this.scopes.length - 2; i >= 0; i--) {
        if (this.scopes[i].vars.has(name)) {
          node.ins.forEach(p => this.graph().addExternalIn(name, p, true));
          node.outs.forEach(p => this.graph().addExternalOut(name, p, true));
          break;
        }
      }
    }
    return node;
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
      throw new Error(`Unknown subgraph: ${fullName}`);
    }
    const subgraph = this.graph().getSubgraph(fullName);
    subgraph.externalIns.filter(p => p.implicit).forEach(p => {
      this.graph().connectPorts(p.innerPort, { portName: p.portName, nodeId });
    });
    subgraph.externalOuts.filter(p => p.implicit).forEach(p => {
      this.graph().connectPorts({ portName: p.portName, nodeId }, p.innerPort);
    });
    return node;
  }

  addExternNode(componentId: string, uuid: string): NodeSpec {
    return this.graph().addNode(`Extern: ${componentId} #${uuid}`, componentId);
  }

  fullVarName(moduleName: string | null, name: string): string {
    return (moduleName ? moduleName + "." : "") + name;
  }

  nodeIdForConst(value: any, uuid: string): string {
    return `Const: ${JSON.stringify(value)} #${uuid}`;
  }

  nodeIdForVar(moduleName: string | null, name: string): string {
    return `Var: ${this.fullVarName(moduleName, name)}`;
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
