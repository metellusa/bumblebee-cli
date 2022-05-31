import { PlainFile } from "./plain file";

export class ClassFile extends PlainFile {
    public className: string = "";
    public classDescription: string = "";
    public type?: string = "";
    public decoratorImports?: Map<string, Set<string>>;
    public decorators?: string[];
}
