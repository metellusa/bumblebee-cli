import { Path } from "../domain/path";

export class SubmitSwaggerResponse {
    public repoName: string = "";
    public paths: Path[] = [];
    public components: Object[] = [];
    public hasRedis?: boolean = false;
}
