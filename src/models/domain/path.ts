import { Verb } from "./verb";

/** A swagger's path */
export class Path {
    public path: string = "";
    public verbs: Verb[] = []
}
