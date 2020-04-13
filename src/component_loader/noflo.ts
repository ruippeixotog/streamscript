import type { ComponentSpec } from "../graph";
import { ComponentLoader, Component } from "noflo";
import util from "util";

const overrideIns = {
  "core/Output": ["in"]
};

const overrideOuts = {};

async function loadComponents(): Promise<Map<string, ComponentSpec>> {
  const loader = new ComponentLoader(".");

  // promisified NoFlo operations
  const listComponents = util.promisify(loader.listComponents.bind(loader));
  const loadComponent = util.promisify(loader.load.bind(loader));

  const componentIds: string[] = Object.keys(await listComponents());
  const components: [string, Component][] = await Promise.all(
    componentIds.map(id => loadComponent(id).then(comp => [id, comp]))
  );

  const componentSpecs: [string, ComponentSpec][] = components.map(([id, c]) =>
    [id, {
      ins: id in overrideIns ? overrideIns[id] : Object.keys(c.inPorts.ports),
      outs: id in overrideOuts ? overrideOuts[id] : Object.keys(c.outPorts.ports)
    }]
  );

  return new Map(componentSpecs);
}

export default { loadComponents };
