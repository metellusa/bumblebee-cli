/** A path's verb */
export class Verb {
    public signature: string = "";
    public tag: string = "";
    public summary: string = "";
    public url: string = "";
    public model: string = "";
    public operationId: string = "";
    public responseCodes: string[] = [];
    public isPersistedModel: boolean = false;
    public parameters?: string[];
    public requestBodyRef?: string;
    public responseBodyRef?:  string;
}
