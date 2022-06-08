import { Path } from "./path";
/** A swagger's elements */
export class Swagger {
    public repoName: string = "";
    public repoDescription: string = "";
    public targetLocation: string = "";
    public paths: Path[] = [];
    public components: Object[] = [];
    public hasRedis?: boolean = false;
}
