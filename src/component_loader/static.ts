import { Map } from "immutable";
import type { ComponentSpec } from "../graph";

const knownComponents: { [key: string]: ComponentSpec } = {
  "core/Output": { ins: ["in"], outs: [] },
  "core/Repeat": { ins: ["in"], outs: ["out"] },
  "math/Add": { ins: ["augend", "addend"], outs: ["sum"] },
  "math/Subtract": { ins: ["minuend", "subtrahend"], outs: ["difference"] },
  "math/Multiply": { ins: ["multiplier", "multiplicand"], outs: ["product"] },
  "math/Divide": { ins: ["dividend", "divisor"], outs: ["quotient"] },
  "math/Modulo": { ins: ["dividend", "divisor"], outs: ["remainder"] },
  "objects/SetPropertyValue": { ins: ["property", "value", "in"], outs: ["out"] },
  "streamscript/Negate": { ins: ["in"], outs: ["out"] },
  "streamscript/Not": { ins: ["in"], outs: ["out"] },
  "streamscript/And": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Or": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Gte": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Gt": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Eq": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Neq": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Lte": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/Lt": { ins: ["arg1", "arg2"], outs: ["out"] },
  "streamscript/ArrayPush": { ins: ["arr", "elem"], outs: ["out"] },
  "streamscript/Index": { ins: ["coll", "index"], outs: ["out"] },
  "core/Kick": { ins: ["in", "data"], outs: ["out"] }
};

function loadComponents(): Map<string, ComponentSpec> {
  return Map(knownComponents);
}

export default { loadComponents };
