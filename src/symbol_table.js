/* @flow */

export type Port = { nodeId: string, portName: string };
export type InPort = Port;
export type OutPort = Port;

export type SymbolInfo = {
  ins: InPort[],
  outs: OutPort[],
};

export type ComponentInfo = {
  ins: string[],
  outs: string[],
};

export type SymbolMap = { [string]: SymbolInfo };

class SymbolTable {
  components: { [string]: ComponentInfo };
  namespaces: { [string]: SymbolMap };
  scopedVars: SymbolMap[];

  constructor() {
    this.components = {};
    this.namespaces = {};
    this.scopedVars = [{}];
  }

  getComponent(name: string): ComponentInfo {
    return this.components[name];
  }

  newNodeFromComponent(nodeId: string, componentName: string): SymbolInfo {
    const comp = this.getComponent(componentName);
    return {
      ins: comp.ins.map(p => ({ nodeId, portName: p })),
      outs: comp.outs.map(p => ({ nodeId, portName: p }))
    };
  }

  setComponent(name: string, schema: ComponentInfo): void {
    this.components[name] = schema;
  }

  getSymbol(moduleName: ?string, name: string): ?SymbolInfo {
    if (moduleName) {
      return this.namespaces[moduleName][name];
    }
    for (let i = this.scopedVars.length - 1; i >= 0; i--) {
      if (this.scopedVars[i][name]) {
        return this.scopedVars[i][name];
      }
    }
    return null;
  }

  pushSymbol(name: string, node: SymbolInfo): void {
    this.scopedVars[this.scopedVars.length - 1][name] = node;
  }

  openScope(): void {
    this.scopedVars.push({});
  }

  popScope(): void {
    this.scopedVars.pop();
  }

  pushModule(name: string, nodeMap: SymbolMap): void {
    this.namespaces[name] = nodeMap;
  }
}

export default SymbolTable;
