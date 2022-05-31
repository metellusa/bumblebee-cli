import { FileContent } from "./file-content";

export class PlainFile {
    public folder: string = "";
    public file: string = "";
    public content: FileContent[] = [];
    public imports: Set<string> = new Set();
}
