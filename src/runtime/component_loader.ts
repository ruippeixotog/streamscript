import util from "util";
import fs from "fs";
import path from "path";
import { Component } from "./types";
import { ComponentDef, ComponentSpec, ComponentStore } from "../types";

const identity = "core/Identity";

const binOps = {
  "||": "operators/Or",
  "&&": "operators/And",
  "<=": "operators/Lte",
  "<": "operators/Lt",
  "==": "operators/Eq",
  "!=": "operators/Neq",
  ">=": "operators/Gte",
  ">": "operators/Gt",
  "+": "operators/Add",
  "-": "operators/Subtract",
  "*": "operators/Multiply",
  "/": "operators/Divide",
  "%": "operators/Modulo"
};

const unOps = {
  "-": "operators/Negate",
  "!": "operators/Not",
  "@": "core/Repeat"
};

const arrayPush = "operators/ArrayPush";
const objectSet = "operators/SetPropertyValue";
const index = "operators/Index";

export interface ComponentClass {
  readonly spec: ComponentSpec;
  new(): Component<unknown[], unknown[]>;
}

function getComponentSpec(name: string, c: ComponentClass): ComponentDef<ComponentClass> {
  return { spec: c.spec, impl: c };
}

async function loadComponents(): Promise<ComponentStore<ComponentClass>> {
  const packageModules = await util.promisify(fs.readdir)("src/runtime/components");

  const components = packageModules.flatMap(f => {
    const packageName = path.parse(f).name;
    const packageComponents: { [name: string]: ComponentClass } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require(`../runtime/components/${packageName}`);

    return Object.entries(packageComponents)
      .map<[string, ComponentDef<ComponentClass>]>(([name, comp]) => {
        const componentName = `${packageName}/${name}`;
        return [componentName, getComponentSpec(componentName, comp)];
      });
  });

  // console.log(util.inspect(components, { showHidden: false, depth: null }));
  return {
    components: Object.fromEntries(components),
    specials: { identity, binOps, unOps, arrayPush, objectSet, index }
  };
}

export default { loadComponents };
