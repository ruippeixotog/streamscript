import { sink } from "../component";

export const Output = sink<any>(input => input.subscribe(ev => console.log(ev)));
