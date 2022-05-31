import { VerbElement } from "./verb-element";

/** A verb's parameter */
export class Parameter extends VerbElement {
    public name: string = "";
    public type: string = "";
    public description: string = "";
    public in: string = "";
    public required: string = "";
}
