import Graph, { NodeSpec } from "./graph";

class GraphX {
  currentGraph: Graph;
  moduleName: string;
  scopes: { id?: string, vars: Set<string> }[];

  constructor(graph: Graph, moduleName: string) {
    this.currentGraph = graph;
    this.moduleName = moduleName;
    this.scopes = [{ vars: new Set() }];
  }

  addModuleNode(): NodeSpec {
    return this.currentGraph.addNode(this.nodeIdForModule(this.moduleName), "core/Repeat");
  }

  addConstNode(value: any): NodeSpec {
    const node = this.currentGraph.addNode(this.nodeIdForConst(value), "core/Kick");
    this.currentGraph.connectPorts(this.addModuleNode().outs[0], node.ins[0]);
    this.currentGraph.setInitial(node.ins[1], value);
    return { ins: [], outs: node.outs };
  }

  addLocalVarNode(name: string): NodeSpec {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].vars.has(name)) {
        return this.currentGraph.getNode(this.nodeIdForVar(null, name, this.scopes[i].id));
      }
    }
    const currentScope = this.scopes[this.scopes.length - 1];
    currentScope.vars.add(name);
    return this.currentGraph.addNode(
      this.nodeIdForVar(null, name, currentScope.id),
      "core/Repeat"
    );
  }

  nodeIdForConst(value: any): string {
    return `Const: ${JSON.stringify(value)}`;
  }

  nodeIdForVar(moduleName: string | null, name: string, scopeId?: string): string {
    return `Var: ${moduleName ? moduleName + "." : ""}${name}${scopeId ? "_" + scopeId : ""}`;
  }

  nodeIdForModule(name: string): string {
    return `Module: ${name}`;
  }

  openScope(id: string): void {
    this.scopes.push({ id, vars: new Set() });
  }

  closeScope(): void {
    this.scopes.pop();
  }
}

export default GraphX;
