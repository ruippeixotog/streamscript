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

  addConstNode(value: any): NodeSpec {
    const node = this.graph().addNode(this.nodeIdForConst(value), "core/Repeat");
    this.graph().setInitial(node.ins[0], value);
    return { ins: [], outs: node.outs };
  }

  addLocalVarNode(name: string, forceNew: boolean = false): NodeSpec {
    const currentScope = this.scopes[this.scopes.length - 1];
    currentScope.vars.add(name);
    const node = this.graph().addNode(this.nodeIdForVar(null, name), "core/Repeat");

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

  addLocalFunctionNode(name: string, uuid: string): NodeSpec {
    const nodeId = `Function: ${name} #${uuid}`;
    const node = this.graph().addSubgraphNode(nodeId, name);
    const subgraph = this.graph().getSubgraph(name);
    subgraph.externalIns.filter(p => p.implicit).forEach(p => {
      this.graph().connectPorts(p.innerPort, { portName: p.portName, nodeId });
    });
    subgraph.externalOuts.filter(p => p.implicit).forEach(p => {
      this.graph().connectPorts({ portName: p.portName, nodeId }, p.innerPort);
    });
    return node;
  }

  nodeIdForConst(value: any): string {
    return `Const: ${JSON.stringify(value)}`;
  }

  nodeIdForVar(moduleName: string | null, name: string): string {
    return `Var: ${moduleName ? moduleName + "." : ""}${name}`;
  }

  openScope(id: string): void {
    this.scopes.push({
      id,
      graph: new Graph(this.graph().components),
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
