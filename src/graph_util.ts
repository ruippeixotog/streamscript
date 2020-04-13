import assert from "assert";
import type { NodeSpec } from "./graph";

function assertConnectArity(from: NodeSpec, to: NodeSpec): void {
  assert.equal(to.ins.length, from.outs.length,
    `Mismatch between in-arity of ${JSON.stringify(to.ins)} (${to.ins.length})
      and out-arity of ${JSON.stringify(from.outs)} (${from.outs.length})`);
}

function assertInArity(arity: number, sym: NodeSpec): void {
  assert.equal(arity, sym.ins.length,
    `Expected in-arity of ${JSON.stringify(sym.ins)} to be ${arity},
      was ${sym.ins.length} instead`);
}

function assertOutArity(arity: number, sym: NodeSpec): void {
  assert.equal(arity, sym.outs.length,
    `Expected out-arity of ${JSON.stringify(sym.outs)} to be ${arity},
      was ${sym.outs.length} instead`);
}

export default { assertConnectArity, assertInArity, assertOutArity };
