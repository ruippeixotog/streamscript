import util from "util";
import fs from "fs";
import path from "path";
import { Component } from "./component";
import { ComponentDef, ComponentStore } from "../types";

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

function getComponentSpec(name: string, c: Component): ComponentDef<Component> {
  // TODO: read from metadata
  return {
    spec: c.spec,
    impl: c
  };
}

async function loadComponents(): Promise<ComponentStore<Component>> {
  const packageModules = await util.promisify(fs.readdir)("src/rxjs/components");

  const components = packageModules.flatMap(f => {
    const packageName = path.parse(f).name;
    const packageComponents: { [name: string]: Component } =
      require.main?.require(`./rxjs/components/${packageName}`);

    return Object.entries(packageComponents)
      .map<[string, ComponentDef<Component>]>(([name, comp]) => {
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
