/** An object's property */
export class Property {
    public isRequired: boolean = false;
    public name: string = "";
    public type: string = "";
    public example?: object;
    public description?: string;
    public isPrimary?: boolean;
    public properties?: Property[];
}
