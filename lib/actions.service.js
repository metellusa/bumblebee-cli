"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_1 = __importDefault(require("case"));
const fs_1 = __importDefault(require("fs"));
const pluralize_1 = __importDefault(require("pluralize"));
const yaml_1 = __importDefault(require("yaml"));
const verb_1 = require("./models/domain/verb");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
const verb_body_type_enum_1 = require("./enums/verb-body-type.enum");
const swagger_const_1 = require("./constants/swagger.const");
class ActionsService {
    /**
     * @description Parses a given swagger and converts its elements into domain data models
     * @param filePath the file path of the swagger to be parsed
     * @returns {SubmitSwaggerResponse} returns the parsed swagger
     */
    static async submitSwagger(filePath) {
        if (fs_1.default.existsSync(filePath)) {
            try {
                this.inputYaml = yaml_1.default.parse(fs_1.default.readFileSync(filePath, 'utf8'));
            }
            catch (err) {
                throw new Error(`The swagger file specified could not be parsed. Please check it for any errors`);
            }
            let repoName = common_utils_1.default.getField(this.inputYaml.info, "title");
            let paths = [];
            let components = new Map();
            let validationErrors = [];
            // Infer the repo name from the swagger
            repoName = case_1.default.kebab(repoName.replace("API", ""));
            const addVerbBodyToComponents = (reference) => {
                if (reference) {
                    reference = reference.substring(2, reference.length).replace(/\//g, '.');
                    const body = common_utils_1.default.getField(this.inputYaml, reference);
                    const name = reference.replace(swagger_const_1.OBJECTS_REFERENCE, "");
                    if (!components.has(name)) {
                        components.set(name, this.createVerbBody(body, name));
                    }
                    return name;
                }
            };
            const addParametersToComponents = (referenceObjs) => {
                if (referenceObjs) {
                    let names = [];
                    referenceObjs.forEach(referenceObj => {
                        let reference = common_utils_1.default.getField(referenceObj, "$ref");
                        if (reference) {
                            reference = reference.substring(2, reference.length).replace(/\//g, '.');
                            const parameter = common_utils_1.default.getField(this.inputYaml, reference);
                            const name = reference.replace(swagger_const_1.PARAMETERS_REFERENCE, "");
                            if (!components.has(name)) {
                                components.set(name, this.createParameter(parameter));
                            }
                            names.push(name);
                        }
                    });
                    return names;
                }
            };
            if (this.inputYaml.paths) {
                for (const [path, pathData] of Object.entries(this.inputYaml.paths)) {
                    let verbs = [];
                    for (const [rawVerb, rawVerbData] of Object.entries(pathData)) {
                        if (common_utils_1.default.isValidVerb(rawVerb)) {
                            const verb = this.createVerb(path, rawVerb, rawVerbData);
                            // If the verb has requestBody, create a domain verbBody object and add it to components map
                            if (common_utils_1.default.getField(rawVerbData, "requestBody")) {
                                const requestBodyRef = common_utils_1.default.getField(rawVerbData, 'requestBody.content.application/json.schema.$ref');
                                const bodyName = addVerbBodyToComponents(requestBodyRef);
                                if (bodyName) {
                                    verb.requestBodyRef = bodyName;
                                }
                                else {
                                    validationErrors.push(`Request body: "${requestBodyRef}" for path: ${path} must be referenced under #${swagger_const_1.OBJECTS_REFERENCE.replace(/./g, "/")}`);
                                }
                            }
                            // If the verb has responseBody, create a domain verbBody object and add it to components map
                            if (common_utils_1.default.getField(rawVerbData, "responses.200")) {
                                const responseBodyRef = common_utils_1.default.getField(rawVerbData, 'responses.200.content.application/json.schema.$ref')
                                    || common_utils_1.default.getField(rawVerbData, 'responses.200.content.application/json.schema.items.$ref');
                                const bodyName = addVerbBodyToComponents(responseBodyRef);
                                if (bodyName) {
                                    verb.responseBodyRef = bodyName;
                                }
                                else {
                                    validationErrors.push(`Request body: "${responseBodyRef}" for path ${path} must be referenced under #${swagger_const_1.OBJECTS_REFERENCE.replace(/./g, "/")}`);
                                }
                            }
                            // If the verb has parameters, create a domain parameter object and add it to components map
                            if (common_utils_1.default.getField(rawVerbData, "parameters")) {
                                const parameterRefs = common_utils_1.default.getField(rawVerbData, "parameters");
                                const parameterNames = addParametersToComponents(parameterRefs);
                                if (parameterNames) {
                                    verb.parameters = parameterNames;
                                }
                                else {
                                    validationErrors.push(`Parameters for ${path} must be referenced under #${swagger_const_1.PARAMETERS_REFERENCE.replace(/./g, "/")}`);
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
    static createVerb(url, signature, verbFields) {
        let verb = new verb_1.Verb();
        if (verbFields.tags) {
            const tag = case_1.default.lower(verbFields.tags[0]);
            const model = pluralize_1.default.singular(tag.substring(0, tag.indexOf(" ("))) || tag;
            verb.signature = signature;
            verb.tag = tag;
            verb.url = url;
            verb.operationId = verbFields.operationId;
            verb.summary = case_1.default.lower(verbFields.summary);
            verb.model = case_1.default.kebab(model);
            verb.responseCodes = Object.getOwnPropertyNames(verbFields.responses);
            verb.isPersistedModel = tag.includes(swagger_const_1.PERSISTENT_MODEL_LABEL);
        }
        return verb;
    }
    /**
     * @description Convert a verb's body (request or response) to a domain VerbBody object
     * @param body the verb's body
     * @param name the body name
     * @returns {VerbBody} returns a domain VerbBody object
     */
    static createVerbBody(body, name) {
        let properties = [];
        let type;
        const bodyRequiredFields = common_utils_1.default.getField(body, 'required') || [];
        const bodyProperties = common_utils_1.default.getField(body, 'properties') || [];
        const model = case_1.default.snake(pluralize_1.default.singular(name.replace(`-${verb_body_type_enum_1.VerbBodyType.model}`, "")));
        if (name.endsWith(verb_body_type_enum_1.VerbBodyType.request)) {
            type = verb_body_type_enum_1.VerbBodyType.request;
        }
        else if (name.endsWith(verb_body_type_enum_1.VerbBodyType.response)) {
            type = verb_body_type_enum_1.VerbBodyType.response;
        }
        else {
            type = verb_body_type_enum_1.VerbBodyType.model;
        }
        for (const propertyName in bodyProperties) {
            const isRequired = bodyRequiredFields.includes(propertyName);
            const propertyFields = bodyProperties[propertyName];
            let property = this.createProperty(propertyName, propertyFields, isRequired);
            // If object is a model, infer the model id based on the model name
            if (type === verb_body_type_enum_1.VerbBodyType.model) {
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
    static createProperty(propertyName, propertyFields, isRequired) {
        let propertyRef = common_utils_1.default.getField(propertyFields, '$ref');
        // if propertyFields has a reference, replace the reference string with its actual object
        if (propertyRef) {
            propertyRef = propertyRef.substring(2, propertyRef.length).replace(/\//g, '.');
            propertyFields = common_utils_1.default.getField(this.inputYaml, propertyRef);
        }
        let domainPropertyObj = {
            isRequired: isRequired,
            name: propertyName,
            type: this.determineTsDataType(propertyName, propertyFields),
            description: common_utils_1.default.getField(propertyFields, "description"),
            example: common_utils_1.default.getField(propertyFields, "example")
        };
        // Check if there are any children property fields
        const childPropertyFields = common_utils_1.default.getField(propertyFields, "properties") || common_utils_1.default.getField(propertyFields, "items.properties");
        if (childPropertyFields) {
            let properties = [];
            const childPropertyRequiredFields = childPropertyFields.required || [];
            for (const childProperty in childPropertyFields) {
                let childPropertyObj = childPropertyFields[childProperty];
                let childPropertyFieldRef = common_utils_1.default.getField(childPropertyFields[childProperty], "$ref");
                if (childPropertyFieldRef) {
                    childPropertyFieldRef = childPropertyFieldRef.substring(2, childPropertyFieldRef.length).replace(/\//g, '.');
                    childPropertyObj = common_utils_1.default.getField(this.inputYaml, childPropertyFieldRef);
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
    static createParameter(parameter) {
        return {
            name: common_utils_1.default.getField(parameter, "name"),
            description: common_utils_1.default.getField(parameter, "description"),
            in: common_utils_1.default.getField(parameter, "in"),
            required: common_utils_1.default.getField(parameter, "required"),
            type: common_utils_1.default.getField(parameter, "schema.type")
        };
    }
    /**
     * @description Determines the valid Typescript type for a given swagger type
     * @param property the property for which the type must be determined
     * @param propertyFields the property's fields
     * @returns {string} returns the string label of a valid TypeScript datatype
     */
    static determineTsDataType(property, propertyFields) {
        const type = common_utils_1.default.getField(propertyFields, "type");
        const typeScriptDataTypes = new Map([
            ["string", "string"],
            ["integer", "number"],
            ["number", "number"],
            ["boolean", "boolean"],
            ["object", case_1.default.pascal(property)]
        ]);
        if (type === 'array') {
            const arrayType = common_utils_1.default.getField(propertyFields, 'items.type');
            if (typeScriptDataTypes.has(arrayType)) {
                return `${typeScriptDataTypes.get(arrayType)}[]`;
            }
        }
        return typeScriptDataTypes.get(type) || "undefined";
    }
}
exports.default = ActionsService;
//# sourceMappingURL=actions.service.js.map