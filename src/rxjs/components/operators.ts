import { pureFanIn, pureFlow } from "../component";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Or = pureFanIn<any, any>((a1, a2) => a1 || a2);
export const And = pureFanIn<any, any>((a1, a2) => a1 && a2);
export const Lte = pureFanIn<any, any>((a1, a2) => a1 <= a2);
export const Lt = pureFanIn<any, any>((a1, a2) => a1 < a2);
export const Eq = pureFanIn<any, any>((a1, a2) => a1 === a2);
export const Neq = pureFanIn<any, any>((a1, a2) => a1 !== a2);
export const Gte = pureFanIn<any, any>((a1, a2) => a1 >= a2);
export const Gt = pureFanIn<any, any>((a1, a2) => a1 > a2);
export const Add = pureFanIn<any, any>((a1, a2) => a1 + a2);
export const Subtract = pureFanIn<any, any>((a1, a2) => a1 - a2);
export const Multiply = pureFanIn<any, any>((a1, a2) => a1 * a2);
export const Divide = pureFanIn<any, any>((a1, a2) => a1 / a2);
export const Modulo = pureFanIn<any, any>((a1, a2) => a1 % a2);

export const Negate = pureFlow<any, any>(a1 => -a1);
export const Not = pureFlow<any, any>(a1 => !a1);

export const ArrayPush = pureFanIn<any, any>((arr, elem) => [...arr, elem]);
export const SetPropertyValue = pureFanIn<any, any>((k, v, obj) => ({ ...obj, [k]: v }));
/* eslint-enable @typescript-eslint/no-explicit-any */
