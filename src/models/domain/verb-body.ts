import { VerbBodyType } from "../../enums/verb-body-type.enum";
import { Property } from "./property";
import { VerbElement } from "./verb-element";

/** A verb's object. Could be a request, response, or model */
export class VerbBody extends VerbElement {
    public type: VerbBodyType = {} as VerbBodyType;
    public properties: Property[] = [];
}
