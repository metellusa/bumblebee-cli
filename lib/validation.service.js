"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_1 = __importDefault(require("case"));
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const swagger_const_1 = require("./constants/swagger.const");
const swagger_validation_levels_enum_1 = require("./enums/swagger-validation-levels.enum");
const verb_body_type_enum_1 = require("./enums/verb-body-type.enum");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
class ValidationService {
    /**
     * @description Validates a swagger
     * @param filePath the file path of the swagger that is to be validated
     * @returns {Map<string, string[]>} a map of paths validation errors
     */
    static async validateSwagger(filePath) {
        if (fs_1.default.existsSync(filePath)) {
            let pathsValidationErrors = new Map();
            const validateVerbBody = (reference, type) => {
                let verbBodyErrors = [];
                if (reference) {
                    reference = reference.substring(2, reference.length).replace(/\//g, '.');
                    const name = reference.replace(swagger_const_1.OBJECTS_REFERENCE, "");
                    if (name) {
                        if (type === "request") {
                            verbBodyErrors = verbBodyErrors.concat(this.validateRequestObjectName(name));
                        }
                        if (type === "response") {
                            verbBodyErrors = verbBodyErrors.concat(this.validateResponseObjectName(name));
                        }
                        // validate object if any and append any errors found to the validation errors list
                        verbBodyErrors = verbBodyErrors.concat(this.validateObject(common_utils_1.default.getField(this.inputYaml, reference), name, type));
                    }
                    else {
                        verbBodyErrors.push(`Request body: "${reference}" must be referenced under #${swagger_const_1.OBJECTS_REFERENCE.replace(/./g, "/")}`);
                    }
                }
                return verbBodyErrors;
            };
            const validateParameters = (referenceObjs) => {
                let parametersErrors = [];
                if (referenceObjs) {
                    let names = [];
                    referenceObjs.forEach(referenceObj => {
                        let reference = common_utils_1.default.getField(referenceObj, "$ref");
                        if (reference) {
                            reference = reference.substring(2, reference.length).replace(/\//g, '.');
                            const name = reference.replace(swagger_const_1.PARAMETERS_REFERENCE, "");
                            if (name) {
                                parametersErrors = parametersErrors.concat(this.validateParameterName(name));
                                parametersErrors = parametersErrors.concat(this.validateObject(common_utils_1.default.getField(this.inputYaml, reference), name, "parameter"));
                            }
                            else {
                                parametersErrors.push(`Parameter ${name} must be referenced under #${swagger_const_1.PARAMETERS_REFERENCE.replace(/./g, "/")}`);
                            }
                        }
                    });
                }
                return parametersErrors;
            };
            this.inputYaml = yaml_1.default.parse(fs_1.default.readFileSync(filePath, 'utf8'));
            if (this.inputYaml.paths) {
                for (const [path, pathData] of Object.entries(this.inputYaml.paths)) {
                    for (const [rawVerb, rawVerbData] of Object.entries(pathData)) {
                        if (common_utils_1.default.isValidVerb(rawVerb)) {
                            let verbValidationResults = [];
                            // If the verb has requestBody, validate it
                            if (common_utils_1.default.getField(rawVerbData, "requestBody")) {
                                const requestBodyRef = common_utils_1.default.getField(rawVerbData, 'requestBody.content.application/json.schema.$ref');
                                verbValidationResults = verbValidationResults.concat(validateVerbBody(requestBodyRef, "request"));
                            }
                            // If the verb has responseBody, validate it
                            if (common_utils_1.default.getField(rawVerbData, "responses.200")) {
                                const responseBodyRef = common_utils_1.default.getField(rawVerbData, 'responses.200.content.application/json.schema.$ref')
                                    || common_utils_1.default.getField(rawVerbData, 'responses.200.content.application/json.schema.items.$ref');
                                verbValidationResults = verbValidationResults.concat(validateVerbBody(responseBodyRef, "response"));
                            }
                            // If the verb has parameters, validate them
                            if (common_utils_1.default.getField(rawVerbData, "parameters")) {
                                const parameterRefs = common_utils_1.default.getField(rawVerbData, "parameters");
                                verbValidationResults = verbValidationResults.concat(validateParameters(parameterRefs));
                            }
                            if (verbValidationResults.length > 0) {
                                pathsValidationErrors.set(`${case_1.default.upper(rawVerb)} ${path}`, verbValidationResults);
                            }
                        }
                    }
                }
            }
            return pathsValidationErrors;
        }
        else {
            throw new Error(`Target location specified: ${filePath} does not exist`);
        }
    }
    static validateObject(object, objectName, objectType) {
        let objectErrors = [];
        if (objectType === "request" && !common_utils_1.default.getField(object, "required")) {
            objectErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical} Object: "${objectName}" is missing a required array`);
        }
        if (common_utils_1.default.getField(object, "properties")) {
            for (const item in object.properties) {
                if (case_1.default.of(item) !== "snake" && case_1.default.of(item) !== "lower") {
                    objectErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical} Field: "${item}" of object: "${objectName}" must be snake cased`);
                }
            }
        }
        return objectErrors;
    }
    static validateRequestObjectName(name) {
        let requestObjNameErrors = [];
        if (!name.endsWith(verb_body_type_enum_1.VerbBodyType.request)) {
            requestObjNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Suggestion} Request body: "${name}" must end with suffix "-request"`);
        }
        if (name.includes("-model")) {
            requestObjNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Suggestion} Request body: "${name}" should not include "-model" in its name`);
        }
        if (case_1.default.of(name) !== "kebab") {
            requestObjNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical} The casing for request body: "${name}" must be kebab`);
        }
        return requestObjNameErrors;
    }
    static validateResponseObjectName(name) {
        let responseObjNameErrors = [];
        if (!name.endsWith(verb_body_type_enum_1.VerbBodyType.response) || !name.endsWith(verb_body_type_enum_1.VerbBodyType.model)) {
            responseObjNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Suggestion} Response body: "${name}" must end with suffix "-response" or "-model"`);
        }
        if (case_1.default.of(name) !== "kebab") {
            responseObjNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical} The casing for response body: "${name}" must be kebab`);
        }
        return responseObjNameErrors;
    }
    static validateParameterName(name) {
        let parameterNameErrors = [];
        if (case_1.default.of(name) !== "kebab") {
            parameterNameErrors.push(`${swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical} The casing for parameter: "${name}" must be kebab`);
        }
        return parameterNameErrors;
    }
}
exports.default = ValidationService;
//# sourceMappingURL=validation.service.js.map