import fs from "fs";
import { Swagger } from "./models/domain/swagger";
import {
    DATABASE_ADAPTERS_DIR, API_MODELS_DIR, APIS_DIR, CONTROLLER_FILE_SUFFIX, DATABASE_ADAPTER_FILE_SUFFIX, SERVICE_FILE_SUFFIX, ENTITY_MODELS_DIR, CORRELATION_ID_PARAM_DESCR, ADAPTER_MODELS_DIR, APP_FILE_PATH, LOGGER_FILE_PATH, ENV_FILE_PATH, REDIS_ADAPTERS_DIR, REDIS_ADAPTER_FILE_SUFFIX, RESORT_AREA_CODE_ENUM_PATH, RESORT_AREA_CODE_MIDDLEWARE_PATH, REQUEST_MODEL_CLASS_SUFFIX, RESPONSE_MODEL_CLASS_SUFFIX, WORDS_TO_EXCLUDE
} from "./constants/project.const";
import Case from "case";
import { Verb } from "./models/domain/verb";
import CommonUtils from "./utils/common-utils";
import { Parameter } from "./models/domain/parameter";
import path from "path";
import pluralize from "pluralize";
import { Decorator } from "./models/domain/decorator";
import { MethodParamDecorator } from "./enums/method-param-decorator.enum";
import SourceCodeUtils from "./utils/source-code-utils";
import { VerbBody } from "./models/domain/verb-body";
import { FileContent } from "./models/domain/file-content";
import { NANO, ROUTING_CONTROLLERS_LIB, UO_COUCHDB_CONNECTOR_LIB, UO_REDIS_CONNECTOR_LIB } from "./constants/libraries.const";
import { JSON_CONTROLLER } from "./constants/decorators.const";
import { COUCHDB_CONNECTOR, DOCUMENT_INSERT_RESPONSE, ENV_VAR_NAME, LOGGER_VAR_NAME, REDIS_CONNECTOR, REDIS_OPTIONS, RESORT_AREA_CODE, RESORT_CODE_MIDDLEWARE } from "./constants/imports.const";

export default class SourceCodeService {

    /**
     * @description Generates all code files for a given swagger
     * @param swagger the swagger for which the files must be generated
     * @returns {void} nothing returned
     */
    public static async generateCodeFiles(swagger: Swagger) {

        if (fs.existsSync(swagger.targetLocation)) {
            const components = new Map<string, Object>();

            swagger.components.forEach(element => {
                const arr: any = element;
                components.set(arr[0], arr[1])
            });

            // Generate the Redis adapters if the swagger has Redis
            if (swagger.hasRedis) {
                this.generateRedisAdapter(swagger.targetLocation);
            }

            swagger.paths.forEach((path) => {
                path.verbs.forEach((verb) => {
                    let responseBodyName: string | undefined, requestBodyName: string | undefined;
                    let parameters: Parameter[] = [];

                    if (verb.requestBodyRef) {
                        const requestBodyObj: VerbBody = components.get(verb.requestBodyRef) as VerbBody;
                        requestBodyName = requestBodyObj ? requestBodyObj.name : undefined;
                    }

                    if (verb.responseBodyRef) {
                        const responseBodyObj: VerbBody = components.get(verb.responseBodyRef) as VerbBody;
                        responseBodyName = responseBodyObj ? responseBodyObj.name : undefined;
                    }

                    if (verb.parameters) {
                        verb.parameters.forEach(parameter => {
                            parameters.push(components.get(parameter) as Parameter);
                        })
                    }
                    // Generate the service files
                    this.generateService(verb, swagger.targetLocation, requestBodyName, responseBodyName, parameters);

                    // Generate the controller file
                    this.generateController(verb, swagger.targetLocation, requestBodyName, responseBodyName, parameters);

                    // Generate the database adapters if any
                    if (verb.isPersistedModel) {
                        this.generateDatabaseAdapter(verb, swagger.targetLocation, swagger.repoName, parameters);
                    }
                });
            });

        } else {
            throw new Error(`Target location specified: ${swagger.targetLocation} does not exist`);
        }
    }

    /**
     * @description Generates services in a given directory
     * @param verb the verb for which the service must be generated
     * @param directory the directory where the files must be generated
     * @param parameters the list of paramters
     * @returns {void} nothing returned
     */
    private static async generateService(verb: Verb, directory: string, requestBodyName?: string, responseBodyName?: string, parameters?: Parameter[]) {
        const serviceFolder = `${directory}/${APIS_DIR}/${Case.kebab(verb.tag)}/`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        let serviceFile;
        let className;
        let methodName;
        let classImports: Set<string> = new Set();
        let methodParams: string[] = [];
        let methodDescriptionParams: string[] = [];

        if (verb.isPersistedModel) {
            serviceFile = `${verb.signature}-${verb.model}.${SERVICE_FILE_SUFFIX}`;
            className = `${Case.pascal(`${verb.signature}_${verb.model}_service`)}`;
            methodName = `${Case.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize.plural(methodName);
            }
        } else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/") + 1, verb.url.length);
            serviceFile = `${verb.signature}-${Case.kebab(businessFunction)}.${SERVICE_FILE_SUFFIX}`;
            className = `${Case.pascal(`${verb.signature}_${businessFunction}_service`)}`;
            methodName = `${Case.camel(`resolve_${verb.signature}_${businessFunction}`)}`;
        }

        if (requestBodyName) {
            requestBodyName = requestBodyName.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), "");
            const requestTypeModelPath = `${API_MODELS_DIR}/${Case.kebab(verb.tag)}/${Case.kebab(requestBodyName)}.request.model`;
            const modelRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}`, `${requestTypeModelPath}`).replace(/\\/g, "/");

            requestBodyName = `${Case.camel(requestBodyName)}${REQUEST_MODEL_CLASS_SUFFIX}`;
            classImports.add(`import ${Case.pascal(requestBodyName)} from "${modelRelativePath}";`);
            methodParams.push(`${requestBodyName}: ${Case.pascal(requestBodyName)}`);
            methodDescriptionParams.push(`${requestBodyName} the ${Case.sentence(requestBodyName)} body`);
        }

        if (responseBodyName) {
            responseBodyName = responseBodyName.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), "");
            const returnTypeModelPath = `${API_MODELS_DIR}/${Case.kebab(verb.tag)}/${Case.kebab(responseBodyName)}.response.model`;
            const modelRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}/`, `${returnTypeModelPath}`).replace(/\\/g, "/");

            responseBodyName = `${Case.pascal(responseBodyName)}${RESPONSE_MODEL_CLASS_SUFFIX}`;
            classImports.add(`import ${responseBodyName} from "${modelRelativePath}";`);
        }

        if (parameters) {
            parameters.forEach(parameter => {
                methodParams.push(`${Case.camel(parameter.name)}: ${parameter.type}`);
                methodDescriptionParams.push(`${Case.camel(parameter.name)} ${parameter.description}`);
            })
        }

        methodParams.push("correlationId: string");
        methodDescriptionParams.push(CORRELATION_ID_PARAM_DESCR);

        const method = CommonUtils.createMethod({
            name: methodName,
            description: verb.summary || Case.title(`the ${Case.sentence(methodName).toLocaleLowerCase()} method`),
            paramsDescriptions: CommonUtils.formatMethodDescrParams(methodDescriptionParams),
            requestBody: requestBodyName,
            returnType: responseBodyName,
            params: methodParams.join(",\n "),
            operationId: `"${verb.operationId}"`
        });

        CommonUtils.createOrUpdateClassFile({
            folder: serviceFolder,
            file: serviceFile,
            content: [{ contentIdentifier: methodName, content: method } as FileContent],
            imports: classImports,
            className,
            type: "default",
            classDescription: Case.sentence(`${className}`)
        });
    }

    /**
     * @description Generates the controller in a given directory
     * @param verb the verb for which the service must be generated
     * @param directory the directory where the files must be generated
     * @param parameters the list of parameters
     * @returns {void} nothing returned
     */
    private static async generateController(verb: Verb, directory: string, requestBodyName?: string, responseBodyName?: string, parameters?: Parameter[]) {
        const controllerFolder = `${directory}/${APIS_DIR}/${Case.kebab(verb.tag)}/`;
        const controllerFile = `${Case.kebab(verb.tag)}.${CONTROLLER_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        const className = `${Case.pascal(verb.tag + "-controller")}`;
        const classDescription = Case.title(`the ${Case.sentence(verb.tag)} controller`);
        const routingControllerDecorators: Decorator[] = SourceCodeUtils.determineRoutingControllerDecorators(verb, requestBodyName, parameters);
        const uoStatusCodeDecorators: Decorator[] = SourceCodeUtils.determineUoStatusCodeDecorators(verb);
        const methodDecorators = routingControllerDecorators.concat(uoStatusCodeDecorators);
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();
        let methodDecoratorDeclarations: string[] = [];
        let methodParamDecoratorDeclarations: string[] = [];
        let methodDescriptionParams: string[] = [];
        let classImports: Set<string> = new Set;
        let methodName: string;

        // Importing the class decorator: JsonController from the routing-controllers library
        decoratorImports.set(ROUTING_CONTROLLERS_LIB, new Set<string>([JSON_CONTROLLER]));

        if (verb.isPersistedModel) {
            methodName = `${Case.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize.plural(methodName);
            }
        } else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/"), verb.url.length);
            methodName = `${Case.camel(`${verb.signature}_${businessFunction}_${pluralize.singular(verb.model)}`)}`;
        }

        methodDecorators.forEach(decorator => {
            if (Object.values(MethodParamDecorator).includes(decorator.name as MethodParamDecorator)) {
                methodParamDecoratorDeclarations.push(`${decorator.declaration}`);
            } else {
                methodDecoratorDeclarations.push(`${decorator.declaration}`);
            }
            decoratorImports.set(decorator.importLib,
                (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
        });

        if (parameters) {
            parameters.forEach(parameter => {
                methodDescriptionParams.push(`${Case.camel(parameter.name)} ${parameter.description}`);
            })
        }

        if (requestBodyName) {
            requestBodyName = requestBodyName.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), "");
            const requestTypeModelPath = `${API_MODELS_DIR}/${Case.kebab(verb.tag)}/${Case.kebab(requestBodyName)}.request.model`;
            const modelRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}`, `${requestTypeModelPath}`).replace(/\\/g, "/");

            requestBodyName = `${Case.camel(requestBodyName)}${REQUEST_MODEL_CLASS_SUFFIX}`;
            classImports.add(`import ${Case.pascal(requestBodyName)} from "${modelRelativePath}";`);
            methodDescriptionParams.push(`${requestBodyName} the ${Case.sentence(requestBodyName)} body`);
        }

        if (responseBodyName) {
            responseBodyName = responseBodyName.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), "");
            const returnTypeModelPath = `${API_MODELS_DIR}/${Case.kebab(verb.tag)}/${Case.kebab(responseBodyName)}.response.model`;
            const modelRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}`, `${returnTypeModelPath}`).replace(/\\/g, "/");

            responseBodyName = `${Case.pascal(responseBodyName)}${RESPONSE_MODEL_CLASS_SUFFIX}`;
            classImports.add(`import ${responseBodyName} from "${modelRelativePath}";`);
            if (verb.signature === "get" && !isGetById) {
                responseBodyName = `${responseBodyName}[]`;
            }
        }

        const method = CommonUtils.createMethod({
            name: methodName,
            description: verb.summary || Case.title(`the ${Case.sentence(methodName)} method`),
            requestBody: requestBodyName,
            returnType: responseBodyName,
            params: methodParamDecoratorDeclarations.join(",\n "),
            paramsDescriptions: CommonUtils.formatMethodDescrParams(methodDescriptionParams),
            decorators: methodDecoratorDeclarations,
            operationId: `"${verb.operationId}"`
        });

        const appFileRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}`, `${APP_FILE_PATH}`.replace(".ts", "")).replace(/\\/g, "/");
        classImports.add(`import { ${LOGGER_VAR_NAME} } from "${appFileRelativePath}";`);

        const resortAreaCodeMiddlewareRelativePath = path.relative(`${APIS_DIR}/${Case.kebab(verb.tag)}`, `${RESORT_AREA_CODE_MIDDLEWARE_PATH}`.replace(".ts", "")).replace(/\\/g, "/");
        classImports.add(`import ${RESORT_CODE_MIDDLEWARE} from "${resortAreaCodeMiddlewareRelativePath}";`);

        CommonUtils.createOrUpdateClassFile({
            folder: controllerFolder,
            file: controllerFile,
            content: [{ contentIdentifier: methodName, content: method } as FileContent],
            decoratorImports,
            imports: classImports,
            className,
            type: "default",
            classDescription,
            decorators: [`@${JSON_CONTROLLER}("${SourceCodeUtils.determineControllerUrl(verb.url, "class")}")`]
        });
    }

    /**
     * @description Generates database adapters in a given directory
     * @param verb the verb for which the database adapter must be generated
     * @param directory the directory where the files must be generated
     * @param parameters the list of parameters
     * @returns {void} nothing returned
     */
    private static async generateDatabaseAdapter(verb: Verb, directory: string, repoName: string, parameters?: Parameter[]) {
        const databaseAdapterFolder = `${directory}/${DATABASE_ADAPTERS_DIR}/`;
        const databaseAdapterFile = `${Case.kebab(verb.model)}-${DATABASE_ADAPTER_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        const className = Case.pascal(`${verb.model}-database-adapter`);
        const classDescription = Case.title(`the ${Case.sentence(verb.tag)} database adapter`);
        const uoStatusCodeDecorators = SourceCodeUtils.determineUoStatusCodeDecorators(verb);
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();
        let classImports: Set<string> = new Set;
        let methodDecoratorDeclarations: string[] = [];
        let methodParams: string[] = [];
        let methodDescriptionParams: string[] = [];
        let methodName: string = `${Case.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
        let methodReturnType: string;

        classImports.add(`import { ${COUCHDB_CONNECTOR} } from "${UO_COUCHDB_CONNECTOR_LIB}";`);
        classImports.add(`import { ${LOGGER_VAR_NAME} } from "${path.relative(DATABASE_ADAPTERS_DIR, LOGGER_FILE_PATH.replace(".ts", "")).replace(/\\/g, "/")}";`);
        classImports.add(`import ${ENV_VAR_NAME} from "${path.relative(DATABASE_ADAPTERS_DIR, ENV_FILE_PATH.replace(".ts", "")).replace(/[\\]/g, "/")}";`);
        classImports.add(`import { ${RESORT_AREA_CODE} } from "${path.relative(DATABASE_ADAPTERS_DIR, RESORT_AREA_CODE_ENUM_PATH.replace(".ts", "")).replace(/\\/g, "/")}";`);

        if (verb.signature === "get") {
            methodReturnType = Case.pascal(`${verb.model}-database`);

            const returnModelRelativePath = path.relative(`${DATABASE_ADAPTERS_DIR}`, `${ADAPTER_MODELS_DIR}/${Case.kebab(methodReturnType)}`).replace(/\\/g, "/");
            classImports.add(`import { ${methodReturnType} } from "${returnModelRelativePath}";`);

            if (!isGetById) {
                methodName = pluralize.plural(methodName);
                methodReturnType = `${methodReturnType}[]`;
            }
        } else {
            methodReturnType = DOCUMENT_INSERT_RESPONSE;
            classImports.add(`import { ${DOCUMENT_INSERT_RESPONSE} } from "${NANO}";`);
        }

        uoStatusCodeDecorators.forEach(decorator => {
            methodDecoratorDeclarations.push(`${decorator.declaration}`);
            decoratorImports.set(decorator.importLib,
                (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
        });

        if (parameters) {
            parameters.forEach(parameter => {
                methodParams.push(`${Case.camel(parameter.name)}: ${parameter.type}`);
                methodDescriptionParams.push(`${Case.camel(parameter.name)} ${parameter.description}`);
            })
        }

        const databaseAdapterConfig = SourceCodeUtils.createDatabaseAdapterConfig(Case.pascal(`${verb.model}-database`), Case.camel(repoName));

        methodParams.push("correlationId: string");
        methodDescriptionParams.push(CORRELATION_ID_PARAM_DESCR);

        const method = CommonUtils.createMethod({
            name: methodName,
            description: verb.summary || Case.title(`the ${Case.sentence(methodName)} method`),
            params: methodParams.join(",\n "),
            paramsDescriptions: CommonUtils.formatMethodDescrParams(methodDescriptionParams),
            decorators: methodDecoratorDeclarations,
            returnType: methodReturnType,
            operationId: `"${verb.operationId}"`
        });

        CommonUtils.createOrUpdateClassFile({
            folder: databaseAdapterFolder,
            file: databaseAdapterFile,
            content: [
                { contentIdentifier: "Database configuration", content: databaseAdapterConfig },
                { contentIdentifier: methodName, content: method }
            ],
            decoratorImports,
            imports: classImports,
            className: `${className}`,
            type: "default",
            classDescription
        });
    }

    /**
     * @description Generates Redis adapters in a given directory
     * @param directory the directory where the files must be generated
     * @returns {void} nothing returned
     */
    private static async generateRedisAdapter(directory: string) {
        const redisAdapterFolder = `${directory}/${REDIS_ADAPTERS_DIR}/`;
        const redisAdapterFile = `${REDIS_ADAPTER_FILE_SUFFIX}`;
        let imports: Set<string> = new Set;

        imports.add(`import { ${REDIS_CONNECTOR}, ${REDIS_OPTIONS} } from "${UO_REDIS_CONNECTOR_LIB}";`);
        imports.add(`import ${ENV_VAR_NAME} from "${path.relative(REDIS_ADAPTERS_DIR, ENV_FILE_PATH.replace(".ts", "")).replace(/[\\]/g, "/")}";`);
        imports.add(`import { ${LOGGER_VAR_NAME} } from "${path.relative(REDIS_ADAPTERS_DIR, LOGGER_FILE_PATH.replace(".ts", "")).replace(/\\/g, "/")}";`);

        const redisOptions = SourceCodeUtils.createRedisOptions();

        CommonUtils.createOrUpdatePlainFile({
            folder: redisAdapterFolder,
            file: redisAdapterFile,
            content: [
                { contentIdentifier: `const options: ${REDIS_OPTIONS}`, content: redisOptions }
            ],
            imports
        });
    }
}
