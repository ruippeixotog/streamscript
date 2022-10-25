import PureComponent from "../lib/PureComponent";
import { ComponentClass } from "../component_loader";

const UnOp = <A, T>(f: (a1: A) => T): ComponentClass =>
  class extends PureComponent<[A], T> {
    static spec = { ins: ["in"], outs: ["out"] };
    gen = f;
  };

const BinOp = <A1, A2, T>(f: (a1: A1, a2: A2) => T): ComponentClass =>
  class extends PureComponent<[A1, A2], T> {
    static spec = { ins: ["in1", "in2"], outs: ["out"] };
    gen = f;
  };

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Or = BinOp((a1: any, a2: any) => a1 || a2);
export const And = BinOp((a1: any, a2: any) => a1 && a2);
export const Lte = BinOp((a1: any, a2: any) => a1 <= a2);
export const Lt = BinOp((a1: any, a2: any) => a1 < a2);
export const Eq = BinOp((a1: any, a2: any) => a1 === a2);
export const Neq = BinOp((a1: any, a2: any) => a1 !== a2);
export const Gte = BinOp((a1: any, a2: any) => a1 >= a2);
export const Gt = BinOp((a1: any, a2: any) => a1 > a2);
export const Add = BinOp((a1: any, a2: any) => a1 + a2);
export const Subtract = BinOp((a1: any, a2: any) => a1 - a2);
export const Multiply = BinOp((a1: any, a2: any) => a1 * a2);
export const Divide = BinOp((a1: any, a2: any) => a1 / a2);
export const Modulo = BinOp((a1: any, a2: any) => a1 % a2);

export const Negate = UnOp((a1: any) => -a1);
export const Not = UnOp((a1: any) => !a1);

export const ArrayPush = BinOp((arr: unknown[], elem: unknown) => [...arr, elem]);

type AnyObject = Record<string, unknown>;

export class SetPropertyValue extends PureComponent<[string, unknown, AnyObject], AnyObject> {
  static spec = { ins: ["key", "value", "obj"], outs: ["out"] };
  gen = (k: string, v: unknown, obj: AnyObject): AnyObject => ({ ...obj, [k]: v });
}

export const Index = BinOp((coll: any, index: any) => coll[index]);
/* eslint-enable @typescript-eslint/no-explicit-any */
