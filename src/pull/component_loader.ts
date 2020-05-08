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
  "!": "operators/Not"
};

const arrayPush = "operators/ArrayPush";
const objectSet = "operators/SetPropertyValue";

export interface ComponentClass {
  readonly spec: ComponentSpec;
  new(): Component<any, any>;
}

function getComponentSpec(name: string, c: ComponentClass): ComponentDef<ComponentClass> {
  return { spec: c.spec, impl: c };
}

async function loadComponents(): Promise<ComponentStore<ComponentClass>> {
  const packageModules = await util.promisify(fs.readdir)("src/pull/components");

  const components = packageModules.flatMap(f => {
    const packageName = path.parse(f).name;
    const packageComponents: { [name: string]: ComponentClass } =
      require.main?.require(`./pull/components/${packageName}`);

    return Object.entries(packageComponents)
      .map<[string, ComponentDef<ComponentClass>]>(([name, comp]) => {
        const componentName = `${packageName}/${name}`;
        return [componentName, getComponentSpec(componentName, comp)];
      });
  });

  // console.log(util.inspect(components, { showHidden: false, depth: null }));
  return {
    components: Object.fromEntries(components),
    specials: { identity, binOps, unOps, arrayPush, objectSet }
  };
}

export default { loadComponents };
