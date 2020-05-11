import { ComponentLoader, Component } from "noflo";
import util from "util";
import { ComponentDef, ComponentStore } from "../types";

const identity = "core/Repeat";

const binOps = {
  "||": "streamscript/Or",
  "&&": "streamscript/And",
  "<=": "streamscript/Lte",
  "<": "streamscript/Lt",
  "==": "streamscript/Eq",
  "!=": "streamscript/Neq",
  ">=": "streamscript/Gte",
  ">": "streamscript/Gt",
  "+": "math/Add",
  "-": "math/Subtract",
  "*": "math/Multiply",
  "/": "math/Divide",
  "%": "math/Modulo"
};

const unOps = {
  "-": "streamscript/Negate",
  "!": "streamscript/Not"
};

const arrayPush = "streamscript/ArrayPush";
const objectSet = "objects/SetPropertyValue";
const index = "streamscript/Index";

const overrideIns = {
  "core/Output": ["in"]
};

const overrideOuts = {};

async function loadComponents(): Promise<ComponentStore<Component>> {
  const loader = new ComponentLoader(".");

  // promisified NoFlo operations
  const listComponents = util.promisify(loader.listComponents.bind(loader));
  const loadComponent = util.promisify(loader.load.bind(loader));

  const componentIds: string[] = Object.keys(await listComponents());
  const components: [string, Component][] = await Promise.all(
    componentIds.map(id => loadComponent(id).then(comp => [id, comp]))
  );

  const componentSpecs: [string, ComponentDef<Component>][] = components.map(([id, c]) =>
    [id, {
      spec: {
        ins: id in overrideIns ? overrideIns[id] : Object.keys(c.inPorts.ports),
        outs: id in overrideOuts ? overrideOuts[id] : Object.keys(c.outPorts.ports)
      },
      impl: c
    }]
  );

  return {
    components: Object.fromEntries(componentSpecs),
    specials: { identity, binOps, unOps, arrayPush, objectSet, index }
  };
}

export default { loadComponents };
