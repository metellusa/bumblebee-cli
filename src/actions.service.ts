import Case from "case";
import fs from "fs";
import pluralize from "pluralize";
import YAML from "yaml";
import { Path } from "./models/domain/path";
import { Property } from "./models/domain/property";
import { Verb } from "./models/domain/verb";
import { VerbBody } from "./models/domain/verb-body";
import CommonUtils from "./utils/common-utils";
import { SubmitSwaggerResponse } from "./models/api/submit-swagger-response";
import { VerbBodyType } from "./enums/verb-body-type.enum";
import { Parameter } from "./models/domain/parameter";
import { OBJECTS_REFERENCE, PARAMETERS_REFERENCE, PERSISTENT_MODEL_LABEL } from "./constants/swagger.const";

export default class ActionsService {

    private static inputYaml: any;

    /**
     * @description Parses a given swagger and converts its elements into domain data models
     * @param filePath the file path of the swagger to be parsed
     * @returns {SubmitSwaggerResponse} returns the parsed swagger
     */
    public static async submitSwagger(filePath: string): Promise<SubmitSwaggerResponse> {

        if (fs.existsSync(filePath)) {
            try {
                this.inputYaml = YAML.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (err) {
                throw new Error(`The swagger file specified could not be parsed. Please check it for any errors`);
            }
            // Infer the repo name from the swagger
            const repoName: string = Case.kebab(CommonUtils.getField(this.inputYaml.info, "title").replace("API", ""));
            // Infer the repo description from the swagger
            const repoDescription: string = CommonUtils.getField(this.inputYaml.info, "description");

            let paths: Path[] = [];
            let components = new Map<string, object>();

            const addVerbBodyToComponents = (verbBody: object, type: VerbBodyType, operationId: string): string => {
                // The verb body object is ideally referenced in the swagger. If it is not, use available object
                let bodyRef: string | undefined = CommonUtils.searchField(verbBody, "$ref");
                let body: string | undefined = CommonUtils.searchField(verbBody, "schema");
                // If the body name is not available, it must be inferred
                const inferredName: string = `${Case.snake(operationId)}_${type}`;
                let bodyName: string = bodyRef ? bodyRef.substring(2, bodyRef.length).replace(/\//g, '.') : inferredName;

                if (bodyRef) {
                    bodyRef = bodyRef.substring(2, bodyRef.length).replace(/\//g, '.');
                    bodyName = bodyRef.replace(OBJECTS_REFERENCE, "");

                    if (!components.has(bodyName)) {
                        components.set(bodyName, this.createVerbBody(CommonUtils.getField(this.inputYaml, bodyRef), bodyName, type));
                    }
                } else if (body) {
                    if (!components.has(bodyName)) {
                        components.set(bodyName, this.createVerbBody(body, bodyName, type));
                    }
                }

                return bodyName;
            }

            const addParametersToComponents = (paramObjs: object[]): string[] => {
                let names: string[] = [];
                paramObjs.forEach(paramObj => {
                    // The parameter object is ideally referenced in the swagger. If it is not, use available object
                    let reference: string = CommonUtils.getField(paramObj, "$ref");
                    let paramName: string = CommonUtils.getField(paramObj, "name");

                    if (reference) {
                        reference = reference.substring(2, reference.length).replace(/\//g, '.');
                        const parameter = CommonUtils.getField(this.inputYaml, reference);
                        const name = reference.replace(PARAMETERS_REFERENCE, "");

                        if (!components.has(name)) {
                            components.set(name, this.createParameter(parameter));
                        }
                        names.push(name);
                    } else if (paramName) {
                        if (!components.has(paramName)) {
                            components.set(paramName, this.createParameter(paramObj));
                        }
                        names.push(paramName);
                    }
                });

                return names;
            }

            if (this.inputYaml.paths) {
                for (const [path, pathData] of Object.entries(this.inputYaml.paths)) {
                    let verbs = [];

                    for (const [rawVerb, rawVerbData] of Object.entries(pathData as object)) {
                        if (CommonUtils.isValidVerb(rawVerb)) {
                            const verb = this.createVerb(path, rawVerb, rawVerbData);
                            const requestBody = CommonUtils.getField(rawVerbData, "requestBody");
                            const responseBody = CommonUtils.getField(rawVerbData, "responses.200");
                            const parameters = CommonUtils.getField(rawVerbData, "parameters");

                            // If the verb has a requestBody, create a domain verbBody object and add it to components map
                            if (requestBody) {
                                const bodyName = addVerbBodyToComponents(requestBody, VerbBodyType.request, verb.operationId);

                                if (bodyName) {
                                    verb.requestBodyRef = bodyName;
                                }
                            }

                            // If the verb has a responseBody, create a domain verbBody object and add it to components map
                            if (responseBody) {
                                const bodyName = addVerbBodyToComponents(responseBody, VerbBodyType.response, verb.operationId);

                                if (bodyName) {
                                    verb.responseBodyRef = bodyName;
                                }
                            }

                            // If the verb has parameters, create domain parameter objects and add them to components map
                            if (parameters) {
                                const parameterNames = addParametersToComponents(parameters);
                                if (parameterNames) {
                                    verb.parameters = parameterNames;
                                }
                            }

                            verbs.push(verb);
                        }
                    }
                    paths.push({
                        path,
                        verbs
                    });
                }
            }
            return {
                repoName,
                repoDescription,
                paths,
                components: Array.from(components)
            };
        }
        throw new Error(`File ${filePath} not found`);
    }

    /**
     * @description Convert the verb of given path to a domain Verb object
     * @param url the verb's url
     * @param signature the verb's signature
     * @param verbFields the verb's fields
     * @returns {Verb} returns a domain Verb object
     */
    private static createVerb(url: string, signature: string, verbFields: any): Verb {
        let verb = new Verb();

        if (verbFields.tags) {
            const tag = Case.lower(verbFields.tags[0]);
            const model = pluralize.singular(tag.substring(0, tag.indexOf(" ("))) || tag;

            verb.signature = Case.kebab(signature);
            verb.tag = tag;
            verb.url = url;
            verb.operationId = verbFields.operationId;
            verb.summary = Case.lower(verbFields.summary);
            verb.model = Case.kebab(model);
            verb.responseCodes = Object.getOwnPropertyNames(verbFields.responses);
            verb.isPersistedModel = tag.includes(PERSISTENT_MODEL_LABEL);
        }

        return verb;
    }

    /**
     * @description Convert a verb's body (request or response) to a domain VerbBody object
     * @param body the verb's body
     * @param name the body name
     * @returns {VerbBody} returns a domain VerbBody object
     */
    private static createVerbBody(body: any, name: string, type: VerbBodyType): VerbBody {
        let properties: Property[] = [];
        const bodyRequiredFields = CommonUtils.searchField(body, 'required') || [];
        const bodyProperties = CommonUtils.getField(body, 'properties') || [];
        const model = Case.snake(pluralize.singular(name.replace(`-${VerbBodyType.model}`, "")));

        for (const propertyName in bodyProperties) {
            const isRequired = bodyRequiredFields.includes(propertyName);
            const propertyFields = bodyProperties[propertyName];
            let property: Property = this.createProperty(propertyName, propertyFields, isRequired);

            // If object is a model, infer the model id based on the model name
            if (type === VerbBodyType.model) {
                if (propertyName === `${model}_id`) {
                    property.isPrimary = true;
                }
            }
            properties.push(property);
        }

        return {
            type,
            name,
            properties
        };
    }

    /**
     * @description Convert a request body's property to a domain Property object
     * @param propertyName the property name
     * @param propertyFields the property's fields
     * @param isRequired is the property required?
     * @returns {Property} returns a domain Property object
     */
    private static createProperty(propertyName: string, propertyFields: any, isRequired: boolean): Property {
        let propertyRef: string = CommonUtils.getField(propertyFields, '$ref');

        // if propertyFields has a reference, replace the reference string with its actual object
        if (propertyRef) {
            propertyRef = propertyRef.substring(2, propertyRef.length).replace(/\//g, '.');
            propertyFields = CommonUtils.getField(this.inputYaml, propertyRef);
        }

        let domainPropertyObj: Property = {
            isRequired: isRequired,
            name: propertyName,
            type: this.determineTsDataType(propertyName, propertyFields),
            description: CommonUtils.getField(propertyFields, "description"),
            example: CommonUtils.getField(propertyFields, "example")
        };

        // Check if there are any children property fields
        const childPropertyFields = CommonUtils.searchField(propertyFields, "properties");

        if (childPropertyFields) {
            let properties = [];
            const childPropertyRequiredFields = childPropertyFields.required || [];

            for (const childProperty in childPropertyFields) {
                let childPropertyObj = childPropertyFields[childProperty];
                let childPropertyFieldRef = CommonUtils.getField(childPropertyFields[childProperty], "$ref");

                if (childPropertyFieldRef) {
                    childPropertyFieldRef = childPropertyFieldRef.substring(2, childPropertyFieldRef.length).replace(/\//g, '.');
                    childPropertyObj = CommonUtils.getField(this.inputYaml, childPropertyFieldRef);
                }

                const isChildPropertyRequired = childPropertyRequiredFields.includes(childProperty);

                properties.push(this.createProperty(childProperty, childPropertyObj, isChildPropertyRequired));
            }
            domainPropertyObj.properties = properties;
        }

        return domainPropertyObj;
    }

    /**
     * @description Convert a verb's parameter to a domain Parameter object
     * @param parameter the verb's parameter
     * @returns {Parameter} returns a domain Parameter object
     */
    static createParameter(parameter: any): Parameter {

        return {
            name: CommonUtils.getField(parameter, "name"),
            description: CommonUtils.getField(parameter, "description"),
            in: CommonUtils.getField(parameter, "in"),
            required: CommonUtils.getField(parameter, "required"),
            type: CommonUtils.getField(parameter, "schema.type")
        };
    }

    /**
     * @description Determines the valid Typescript type for a given swagger type
     * @param property the property for which the type must be determined
     * @param propertyFields the property's fields
     * @returns {string} returns the string label of a valid TypeScript datatype
     */
    private static determineTsDataType(property: string, propertyFields: any): string {
        const type: string = CommonUtils.getField(propertyFields, "type");
        const typeScriptDataTypes = new Map([
            ["string", "string"],
            ["integer", "number"],
            ["number", "number"],
            ["boolean", "boolean"],
            ["object", Case.pascal(property)]
        ]);

        if (type === 'array') {
            const arrayType = CommonUtils.getField(propertyFields, 'items.type');
            if (typeScriptDataTypes.has(arrayType)) {
                return `${typeScriptDataTypes.get(arrayType)}[]`;
            }
        }

        return typeScriptDataTypes.get(type) || "undefined";
    }
}
