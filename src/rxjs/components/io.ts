import { sink } from "../component";

export const Output = sink<unknown>(input => input.subscribe(ev => console.log(ev)));
