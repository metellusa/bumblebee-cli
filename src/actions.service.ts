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
            let repoName: string = CommonUtils.getField(this.inputYaml.info, "title");
            let paths: Path[] = [];
            let components = new Map<string, object>();
            let validationErrors = [];

            // Infer the repo name from the swagger
            repoName = Case.kebab(repoName.replace("API", ""));

            const addVerbBodyToComponents = (reference: string): string | undefined => {
                if (reference) {
                    reference = reference.substring(2, reference.length).replace(/\//g, '.');
                    const body = CommonUtils.getField(this.inputYaml, reference);
                    const name = reference.replace(OBJECTS_REFERENCE, "");

                    if (!components.has(name)) {
                        components.set(name, this.createVerbBody(body, name));
                    }

                    return name;
                }
            }
            const addParametersToComponents = (referenceObjs: object[]): string[] | undefined => {
                if (referenceObjs) {
                    let names: string[] = [];
                    referenceObjs.forEach(referenceObj => {
                        let reference: string = CommonUtils.getField(referenceObj, "$ref");
                        if (reference) {
                            reference = reference.substring(2, reference.length).replace(/\//g, '.');
                            const parameter = CommonUtils.getField(this.inputYaml, reference);
                            const name = reference.replace(PARAMETERS_REFERENCE, "");

                            if (!components.has(name)) {
                                components.set(name, this.createParameter(parameter));
                            }
                            names.push(name);
                        }
                    });

                    return names;
                }
            }

            if (this.inputYaml.paths) {
                for (const [path, pathData] of Object.entries(this.inputYaml.paths)) {
                    let verbs = [];

                    for (const [rawVerb, rawVerbData] of Object.entries(pathData as object)) {
                        if (CommonUtils.isValidVerb(rawVerb)) {
                            const verb = this.createVerb(path, rawVerb, rawVerbData);

                            // If the verb has requestBody, create a domain verbBody object and add it to components map
                            if (CommonUtils.getField(rawVerbData, "requestBody")) {
                                const requestBodyRef = CommonUtils.getField(rawVerbData, 'requestBody.content.application/json.schema.$ref');

                                const bodyName = addVerbBodyToComponents(requestBodyRef);
                                if (bodyName) {
                                    verb.requestBodyRef = bodyName
                                } else {
                                    validationErrors.push(`Request body: "${requestBodyRef}" for path: ${path} must be referenced under #${OBJECTS_REFERENCE.replace(/./g, "/")}`);
                                }
                            }

                            // If the verb has responseBody, create a domain verbBody object and add it to components map
                            if (CommonUtils.getField(rawVerbData, "responses.200")) {
                                const responseBodyRef = CommonUtils.getField(rawVerbData, 'responses.200.content.application/json.schema.$ref')
                                    || CommonUtils.getField(rawVerbData, 'responses.200.content.application/json.schema.items.$ref');
                                const bodyName = addVerbBodyToComponents(responseBodyRef);

                                if (bodyName) {
                                    verb.responseBodyRef = bodyName
                                } else {
                                    validationErrors.push(`Request body: "${responseBodyRef}" for path ${path} must be referenced under #${OBJECTS_REFERENCE.replace(/./g, "/")}`);
                                }
                            }
                            // If the verb has parameters, create a domain parameter object and add it to components map
                            if (CommonUtils.getField(rawVerbData, "parameters")) {
                                const parameterRefs = CommonUtils.getField(rawVerbData, "parameters");
                                const parameterNames = addParametersToComponents(parameterRefs);
                                if (parameterNames) {
                                    verb.parameters = parameterNames;
                                } else {
                                    validationErrors.push(`Parameters for ${path} must be referenced under #${PARAMETERS_REFERENCE.replace(/./g, "/")}`);
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

            verb.signature = signature;
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
    private static createVerbBody(body: any, name: string): VerbBody {
        let properties: Property[] = [];
        let type: VerbBodyType;
        const bodyRequiredFields = CommonUtils.getField(body, 'required') || [];
        const bodyProperties = CommonUtils.getField(body, 'properties') || [];
        const model = Case.snake(pluralize.singular(name.replace(`-${VerbBodyType.model}`, "")));

        if (name.endsWith(VerbBodyType.request)) {
            type = VerbBodyType.request;
        } else if (name.endsWith(VerbBodyType.response)) {
            type = VerbBodyType.response;
        } else {
            type = VerbBodyType.model;
        }

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
        const childPropertyFields = CommonUtils.getField(propertyFields, "properties") || CommonUtils.getField(propertyFields, "items.properties");

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

                const isChildPropertyRequired = childPropertyRequiredFields.includes(childProperty) || true;

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
