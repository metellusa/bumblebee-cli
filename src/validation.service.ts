import Case from "case";
import fs from "fs";
import YAML from "yaml";
import { DELETE_BY_ID, GET_ALL, GET_BY_ID, POST_CREATE, POST_PROCESS, UPDATE } from "./constants/response-status-codes.const";
import { OBJECTS_REFERENCE, PARAMETERS_REFERENCE, PERSISTENT_MODEL_LABEL } from "./constants/swagger.const";
import { PATH_PARAMETER_REQUIRED, REQUEST_BODY_REQUIRED, REQUIRED_ARRAY_REQUIRED, RESPONSE_BODY_REQUIRED } from "./constants/validation-messages.const";
import { SwaggerValidationLevels } from "./enums/swagger-validation-levels.enum";
import { VerbBodyType } from "./enums/verb-body-type.enum";
import { VerbSignatures } from "./enums/verb-signatures.enum";
import CommonUtils from "./utils/common-utils";

export default class ValidationService {
    static inputYaml: any;

    /**
     * @description Validates a swagger
     * @param filePath the file path of the swagger that is to be validated
     * @returns {Map<string, string[]>} a map of paths validation errors
     */
    public static async validateSwagger(filePath: string): Promise<Map<string, string[]>> {

        if (fs.existsSync(filePath)) {
            let pathsValidationErrors: Map<string, string[]> = new Map();

            const validateVerbBody = (reference: string, type: "request" | "response"): string[] => {
                let verbBodyErrors: string[] = [];
                if (reference) {
                    reference = reference.substring(2, reference.length).replace(/\//g, '.');
                    const name = reference.replace(OBJECTS_REFERENCE, "");

                    if (name) {
                        if (type === "request") {
                            verbBodyErrors = verbBodyErrors.concat(this.validateRequestObjectName(name));
                        }
                        if (type === "response") {
                            verbBodyErrors = verbBodyErrors.concat(this.validateResponseObjectName(name));
                        }
                        // validate object if any and append any errors found to the validation errors list
                        verbBodyErrors = verbBodyErrors.concat(this.validateObject(CommonUtils.getField(this.inputYaml, reference), name, type));
                    } else {
                        verbBodyErrors.push(`Request body: "${reference}" must be referenced under #${OBJECTS_REFERENCE.replace(/./g, "/")}`);
                    }
                }
                return verbBodyErrors;
            }
            const validateParameters = (referenceObjs: object[]): string[] => {
                let parametersErrors: string[] = [];
                if (referenceObjs) {
                    referenceObjs.forEach(referenceObj => {
                        let reference: string = CommonUtils.getField(referenceObj, "$ref");
                        if (reference) {
                            reference = reference.substring(2, reference.length).replace(/\//g, '.');
                            const name = reference.replace(PARAMETERS_REFERENCE, "");
                            if (name) {
                                parametersErrors = parametersErrors.concat(this.validateParameterName(name));
                                parametersErrors = parametersErrors.concat(this.validateObject(CommonUtils.getField(this.inputYaml, reference), name, "parameter"));
                            } else {
                                parametersErrors.push(`Parameter ${name} must be referenced under #${PARAMETERS_REFERENCE.replace(/./g, "/")}`);
                            }
                        }
                    });
                }
                return parametersErrors;
            }

            this.inputYaml = YAML.parse(fs.readFileSync(filePath, 'utf8'));
            if (this.inputYaml.paths) {
                for (const [path, pathData] of Object.entries(this.inputYaml.paths)) {
                    for (const [rawVerb, rawVerbData] of Object.entries(pathData as object)) {
                        if (CommonUtils.isValidVerb(rawVerb)) {
                            let verbValidationResults: string[] = [];

                            // Validate the verb's response codes
                            verbValidationResults = verbValidationResults.concat(this.validateVerb(path, rawVerb.toUpperCase(), rawVerbData));

                            // If the verb has requestBody, validate it
                            if (CommonUtils.getField(rawVerbData, "requestBody")) {
                                const requestBodyRef = CommonUtils.searchField(rawVerbData.requestBody, "$ref");
                                verbValidationResults = verbValidationResults.concat(validateVerbBody(requestBodyRef, "request"));
                            }

                            // If the verb has responseBody, validate it
                            if (CommonUtils.getField(rawVerbData, "responses.200")) {
                                const responseBodyRef = CommonUtils.searchField(rawVerbData.responseBody[200], "$ref");
                                verbValidationResults = verbValidationResults.concat(validateVerbBody(responseBodyRef, "response"));
                            }
                            // If the verb has parameters, validate them
                            if (CommonUtils.getField(rawVerbData, "parameters")) {
                                const parameterRefs = CommonUtils.getField(rawVerbData, "parameters");
                                verbValidationResults = verbValidationResults.concat(validateParameters(parameterRefs));
                            }

                            if (verbValidationResults.length > 0) {
                                pathsValidationErrors.set(`${Case.upper(rawVerb)} ${path}`, verbValidationResults);
                            }
                        }
                    }
                }
            }
            return pathsValidationErrors;

        } else {
            throw new Error(`Target location specified: ${filePath} does not exist`);
        }
    }

    private static validateObject(object: any, objectName: string, objectType: "request" | "response" | "parameter"): string[] {
        let objectErrors: string[] = [];

        if (objectType === "request" && !CommonUtils.getField(object, "required")) {
            objectErrors.push(`${SwaggerValidationLevels.Critical} Object: "${objectName}" ${REQUIRED_ARRAY_REQUIRED}`);
        }

        if (CommonUtils.getField(object, "properties")) {
            for (const item in object.properties) {
                if (Case.of(item) !== "snake" && Case.of(item) !== "lower") {
                    objectErrors.push(`${SwaggerValidationLevels.Critical} Field: "${item}" of object: "${objectName}" must be snake cased`);
                }
            }
        }

        return objectErrors;
    }

    private static validateVerb(url: string, signature: string, verbFields: any): string[] {
        let responseCodeErrors: string[] = [];
        const tag = Case.lower(verbFields.tags[0]);
        const statusCodes: string[] = Object.getOwnPropertyNames(verbFields.responses);
        const isGetById = signature === VerbSignatures.GET && url.charAt(url.length - 1) === "}";
        const hasPathParams = CommonUtils.getField(verbFields, "parameters") ? true : false;
        const hasRequestBody = CommonUtils.getField(verbFields, "requestBody") ? true : false;
        const hasResponseBody = CommonUtils.getField(verbFields, "responses.200") ? true : false;
        let difference: string[] = [];

        if (signature === VerbSignatures.POST) {
            difference = POST_PROCESS.filter(x => statusCodes.indexOf(x) === -1);
            // If the path does not have parameters, remove status 404 in the list of missing status codes
            if (!hasPathParams) {
                difference.splice(difference.indexOf("404"), 1);
            }
            if (!hasRequestBody) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${REQUEST_BODY_REQUIRED}`);
            }
        } else if (signature === VerbSignatures.POST && tag.includes(PERSISTENT_MODEL_LABEL)) {
            difference = POST_CREATE.filter(x => statusCodes.indexOf(x) === -1);
            // If the path does not have parameters, remove status 404 in the list of missing status codes
            if (!hasPathParams) {
                difference.splice(difference.indexOf("404"), 1);
            }
        } else if (signature === VerbSignatures.GET && !isGetById && tag.includes(PERSISTENT_MODEL_LABEL)) {
            difference = GET_ALL.filter(x => statusCodes.indexOf(x) === -1);
            if (!hasResponseBody) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${RESPONSE_BODY_REQUIRED}`);
            }
        } else if (signature === VerbSignatures.GET && isGetById && tag.includes(PERSISTENT_MODEL_LABEL)) {
            difference = GET_BY_ID.filter(x => statusCodes.indexOf(x) === -1);
            if (!hasPathParams) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${PATH_PARAMETER_REQUIRED}`);
            }
            if (!hasResponseBody) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${RESPONSE_BODY_REQUIRED}`);
            }
        } else if (signature === VerbSignatures.PUT && tag.includes(PERSISTENT_MODEL_LABEL)) {
            difference = UPDATE.filter(x => statusCodes.indexOf(x) === -1);
            // If the path does not have parameters, remove status 404 in the list of missing status codes
            if (!hasPathParams) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${PATH_PARAMETER_REQUIRED}`);
            }
            if (!hasRequestBody) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${REQUEST_BODY_REQUIRED}`);
            }
        } else if (signature === VerbSignatures.DELETE && tag.includes(PERSISTENT_MODEL_LABEL)) {
            difference = DELETE_BY_ID.filter(x => statusCodes.indexOf(x) === -1);
            if (!hasPathParams) {
                responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb ${signature} ${PATH_PARAMETER_REQUIRED}`);
            }
        }

        if (difference.length > 0) {
            responseCodeErrors.push(`${SwaggerValidationLevels.Critical} Verb: ${signature} is missing the following error codes: ${difference.join(", ")}.`);
        }

        return responseCodeErrors;
    }

    private static validateRequestObjectName(name: string): string[] {
        let requestObjNameErrors: string[] = [];

        if (!name.endsWith(VerbBodyType.request)) {
            requestObjNameErrors.push(`${SwaggerValidationLevels.Suggestion} Request body: "${name}" must end with suffix "-request"`);
        }

        if (name.includes("-model")) {
            requestObjNameErrors.push(`${SwaggerValidationLevels.Suggestion} Request body: "${name}" should not include "-model" in its name`);
        }

        if (Case.of(name) !== "kebab") {
            requestObjNameErrors.push(`${SwaggerValidationLevels.Critical} The casing for request body: "${name}" must be kebab`);
        }

        return requestObjNameErrors;
    }

    private static validateResponseObjectName(name: string): string[] {
        let responseObjNameErrors: string[] = [];

        if (!name.endsWith(VerbBodyType.response) || !name.endsWith(VerbBodyType.model)) {
            responseObjNameErrors.push(`${SwaggerValidationLevels.Suggestion} Response body: "${name}" must end with suffix "-response" or "-model"`);
        }

        if (Case.of(name) !== "kebab") {
            responseObjNameErrors.push(`${SwaggerValidationLevels.Critical} The casing for response body: "${name}" must be kebab`);
        }

        return responseObjNameErrors;
    }

    private static validateParameterName(name: string): string[] {
        let parameterNameErrors: string[] = []

        if (Case.of(name) !== "kebab") {
            parameterNameErrors.push(`${SwaggerValidationLevels.Critical} The casing for parameter: "${name}" must be kebab`);
        }

        return parameterNameErrors;
    }
}
