import fs from "fs";
import Case from "case";
import { Decorator } from "../models/domain/decorator";
import { Parameter } from "../models/domain/parameter";
import { Verb } from "../models/domain/verb";
import { BODY, CATCH_ALL, DELETE, GET, HEADER_PARAM, HTTP_CODE, ON_UNDEFINED, PARAM, POST, PUT } from "../constants/decorators.const";
import { ROUTING_CONTROLLERS_LIB, UO_STATUS_CODE_LIB } from "../constants/libraries.const";
import { DATABASE_ADAPTER_CONFIG_TEMPLATE, REDIS_OPTIONS_TEMPLATE } from "../constants/templates.const";
import { LOGGER_VAR_NAME } from "../constants/imports.const";

/**
 * @description Utilities used within the source-code.service file
 */
export default class SourceCodeUtils {
    /**
     * @description converts a verb url to a format that is compatible to routing-controllers decorators 
     * @param url the url to convert
     * @param level the url can either be converted for a controller class or conroller method
     * @returns {string} returns the converted url
     */
    public static determineControllerUrl(url: string, level: "class" | "method") {
        if (level === "class") {
            /* If the url contains a parameter, the class-level url should be the part that includes the paramter
             * that all controller methods share
             */
            url = url.indexOf("}") > 0 ? url.substring(0, url.indexOf("}")) : url;
        } else {
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
            urlArr[index] = `${element.includes("{") ? ":" : ""}${Case.camel(element)}`;
        });

        return urlArr.join("/");
    }

    /**
     * @description returns a list of routing-controllers decorators applicable to a given verb
     * @param verb the verb for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    public static determineRoutingControllerDecorators(verb: Verb, requestBodyName?: string, parameters?: Parameter[]): Decorator[] {
        const path = this.determineControllerUrl(verb.url, "method");
        let decorators: Decorator[] = [];
        let statusCode: number = 0;

        // Method decorators
        if (verb.signature === "post") {
            decorators.push({
                name: POST,
                declaration: `@${POST}("${path}")`,
                importLib: ROUTING_CONTROLLERS_LIB
            });
            statusCode = verb.isPersistedModel ? 201 : 200;
        }
        if (verb.signature === "get") {
            decorators.push({
                name: GET,
                declaration: `@${GET}("${path}")`,
                importLib: ROUTING_CONTROLLERS_LIB
            });
            statusCode = 200;
        }
        if (verb.signature === "put") {
            decorators.push({
                name: PUT,
                declaration: `@${PUT}("${path}")`,
                importLib: ROUTING_CONTROLLERS_LIB
            });
            statusCode = 204;
        }
        if (verb.signature === "delete") {
            decorators.push({
                name: DELETE,
                declaration: `@${DELETE}("${path}")`,
                importLib: ROUTING_CONTROLLERS_LIB
            });
            statusCode = 204;
        }
        if ((verb.signature === "post" && verb.isPersistedModel)
            || verb.signature === "put"
            || verb.signature === "delete") {
            decorators.push({
                name: ON_UNDEFINED,
                declaration: `@${ON_UNDEFINED}(${statusCode})`,
                importLib: ROUTING_CONTROLLERS_LIB
            });
        } else {
            decorators.push({
                name: HTTP_CODE,
                declaration: `@${HTTP_CODE}(${statusCode})`,
                importLib: ROUTING_CONTROLLERS_LIB
            })
        }

        // Method parameter decorators
        if (parameters) {
            parameters.forEach(parameter => {
                decorators.push({
                    name: PARAM,
                    declaration: `@${PARAM}("${Case.camel(parameter.name)}") ${Case.camel(parameter.name)}: ${parameter.type}`,
                    importLib: ROUTING_CONTROLLERS_LIB
                })
            })
        }

        if (requestBodyName) {
            decorators.push({
                name: BODY,
                declaration: `@${BODY}({ required: true }) ${Case.camel(requestBodyName)}: ${Case.pascal(requestBodyName)}`,
                importLib: ROUTING_CONTROLLERS_LIB
            })
        }

        decorators.push({
            name: HEADER_PARAM,
            declaration: `@${HEADER_PARAM}("correlation-id") correlationId: string`,
            importLib: ROUTING_CONTROLLERS_LIB
        })

        return decorators;
    }

    /**
     * @description returns a list of uo-status-code decorators applicable to a given verb
     * @param verb the verb for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    public static determineUoStatusCodeDecorators(verb: Verb): Decorator[] {
        let decorators: Decorator[] = [];

        decorators.push({
            name: CATCH_ALL,
            declaration: `@${CATCH_ALL}(${LOGGER_VAR_NAME})`,
            importLib: UO_STATUS_CODE_LIB
        });

        return decorators;
    }

    /**
     * @description creates a database adapter's configuration 
     * @param databaseModelName the new method attributes
     * @returns {string} returns the newly created database adapter configuration as a string
     */
    public static createDatabaseAdapterConfig = (databaseModelName: string): string => {
        let createdDatabaseAdapterConfig = fs.readFileSync(DATABASE_ADAPTER_CONFIG_TEMPLATE, { encoding: "utf-8" });

        createdDatabaseAdapterConfig = createdDatabaseAdapterConfig.replace(/databaseModelName/g, databaseModelName);

        return createdDatabaseAdapterConfig;
    }

    /**
     * @description creates a redis options object 
     * @returns {string} returns the newly created redis options object as a string
     */
    public static createRedisOptions = (): string => {
        let createdRedisOptions = fs.readFileSync(REDIS_OPTIONS_TEMPLATE, { encoding: "utf-8" });

        return createdRedisOptions;
    }
}
