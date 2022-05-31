"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const case_1 = __importDefault(require("case"));
const decorators_const_1 = require("../constants/decorators.const");
const libraries_const_1 = require("../constants/libraries.const");
const templates_const_1 = require("../constants/templates.const");
const imports_const_1 = require("../constants/imports.const");
/**
 * @description Utilities used within the source-code.service file
 */
class SourceCodeUtils {
    /**
     * @description converts a verb url to a format that is compatible to routing-controllers decorators
     * @param url the url to convert
     * @param level the url can either be converted for a controller class or conroller method
     * @returns {string} returns the converted url
     */
    static determineControllerUrl(url, level) {
        if (level === "class") {
            /* If the url contains a parameter, the class-level url should be the part that includes the paramter
             * that all controller methods share
             */
            url = url.indexOf("}") > 0 ? url.substring(0, url.indexOf("}")) : url;
        }
        else {
            /* If the url contains a parameter, the method-level url should be the part after the parameter that
             * all controller methods share
             */
            if (url.indexOf("}") > 0) {
                url = url.substring(url.indexOf("}"), url.length);
            }
            // If the url only contains 1 foward slash, the method url should be empty
            if (!url.includes("}") && (url.match(/\//g) || []).length === 1) {
                url = "";
            }
        }
        // If the url does not have a shared parameter and has more than 1 foward slashes
        if (!url.includes("{") && (url.match(/\//g) || []).length > 1) {
            // The class url should be the part before the last slash. The method url should be the part after the last slash
            url = level === "class" ? url.substring(0, url.lastIndexOf("/")) : url.substring(url.lastIndexOf("/"), url.length);
        }
        let urlArr = url.split("/");
        urlArr.forEach((element, index) => {
            urlArr[index] = `${element.includes("{") ? ":" : ""}${case_1.default.camel(element)}`;
        });
        return urlArr.join("/");
    }
    /**
     * @description returns a list of routing-controllers decorators applicable to a given verb
     * @param verb the verb for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    static determineRoutingControllerDecorators(verb, requestBodyName, parameters) {
        const path = this.determineControllerUrl(verb.url, "method");
        let decorators = [];
        let statusCode = 0;
        // Method decorators
        if (verb.signature === "post") {
            decorators.push({
                name: decorators_const_1.POST,
                declaration: `@${decorators_const_1.POST}("${path}")`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
            statusCode = verb.isPersistedModel ? 201 : 200;
        }
        if (verb.signature === "get") {
            decorators.push({
                name: decorators_const_1.GET,
                declaration: `@${decorators_const_1.GET}("${path}")`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
            statusCode = 200;
        }
        if (verb.signature === "put") {
            decorators.push({
                name: decorators_const_1.PUT,
                declaration: `@${decorators_const_1.PUT}("${path}")`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
            statusCode = 204;
        }
        if (verb.signature === "delete") {
            decorators.push({
                name: decorators_const_1.DELETE,
                declaration: `@${decorators_const_1.DELETE}("${path}")`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
            statusCode = 204;
        }
        if ((verb.signature === "post" && verb.isPersistedModel)
            || verb.signature === "put"
            || verb.signature === "delete") {
            decorators.push({
                name: decorators_const_1.ON_UNDEFINED,
                declaration: `@${decorators_const_1.ON_UNDEFINED}(${statusCode})`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
        }
        else {
            decorators.push({
                name: decorators_const_1.HTTP_CODE,
                declaration: `@${decorators_const_1.HTTP_CODE}(${statusCode})`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
        }
        // Method parameter decorators
        if (parameters) {
            parameters.forEach(parameter => {
                decorators.push({
                    name: decorators_const_1.PARAM,
                    declaration: `@${decorators_const_1.PARAM}("${case_1.default.camel(parameter.name)}") ${case_1.default.camel(parameter.name)}: ${parameter.type}`,
                    importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
                });
            });
        }
        if (requestBodyName) {
            decorators.push({
                name: decorators_const_1.BODY,
                declaration: `@${decorators_const_1.BODY}({ required: true }) ${case_1.default.camel(requestBodyName)}: ${case_1.default.pascal(requestBodyName)}`,
                importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
            });
        }
        decorators.push({
            name: decorators_const_1.HEADER_PARAM,
            declaration: `@${decorators_const_1.HEADER_PARAM}("correlation-id") correlationId: string`,
            importLib: libraries_const_1.ROUTING_CONTROLLERS_LIB
        });
        return decorators;
    }
    /**
     * @description returns a list of uo-status-code decorators applicable to a given verb
     * @param verb the verb for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    static determineUoStatusCodeDecorators(verb) {
        let decorators = [];
        decorators.push({
            name: decorators_const_1.CATCH_ALL,
            declaration: `@${decorators_const_1.CATCH_ALL}(${imports_const_1.LOGGER_VAR_NAME})`,
            importLib: libraries_const_1.UO_STATUS_CODE_LIB
        });
        return decorators;
    }
}
exports.default = SourceCodeUtils;
/**
 * @description creates a database adapter's configuration
 * @param databaseModelName the new method attributes
 * @returns {string} returns the newly created database adapter configuration as a string
 */
SourceCodeUtils.createDatabaseAdapterConfig = (databaseModelName) => {
    let createdDatabaseAdapterConfig = fs_1.default.readFileSync(templates_const_1.DATABASE_ADAPTER_CONFIG_TEMPLATE, { encoding: "utf-8" });
    createdDatabaseAdapterConfig = createdDatabaseAdapterConfig.replace(/databaseModelName/g, databaseModelName);
    return createdDatabaseAdapterConfig;
};
/**
 * @description creates a redis options object
 * @returns {string} returns the newly created redis options object as a string
 */
SourceCodeUtils.createRedisOptions = () => {
    let createdRedisOptions = fs_1.default.readFileSync(templates_const_1.REDIS_OPTIONS_TEMPLATE, { encoding: "utf-8" });
    return createdRedisOptions;
};
//# sourceMappingURL=source-code-utils.js.map