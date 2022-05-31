"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const project_const_1 = require("./constants/project.const");
const case_1 = __importDefault(require("case"));
const common_utils_1 = __importDefault(require("./utils/common-utils"));
const path_1 = __importDefault(require("path"));
const pluralize_1 = __importDefault(require("pluralize"));
const method_param_decorator_enum_1 = require("./enums/method-param-decorator.enum");
const source_code_utils_1 = __importDefault(require("./utils/source-code-utils"));
const verb_body_type_enum_1 = require("./enums/verb-body-type.enum");
const configuration_service_1 = __importDefault(require("./configuration.service"));
const libraries_const_1 = require("./constants/libraries.const");
const decorators_const_1 = require("./constants/decorators.const");
const imports_const_1 = require("./constants/imports.const");
class SourceCodeService {
    /**
     * @description Generates all code files for a given swagger
     * @param swagger the swagger for which the files must be generated
     * @returns {void} nothing returned
     */
    static async generateCodeFiles(swagger) {
        if (fs_1.default.existsSync(swagger.targetLocation)) {
            configuration_service_1.default.generateConfigFiles(swagger.targetLocation, swagger.repoName);
            const components = new Map();
            swagger.components.forEach(element => {
                const arr = element;
                components.set(arr[0], arr[1]);
            });
            // Generate the Redis adapters if the swagger has Redis
            if (swagger.hasRedis) {
                this.generateRedisAdapter(swagger.targetLocation);
            }
            swagger.paths.forEach((path) => {
                path.verbs.forEach((verb) => {
                    let responseBodyName, requestBodyName;
                    let parameters = [];
                    if (verb.requestBodyRef) {
                        const requestBodyObj = components.get(verb.requestBodyRef);
                        requestBodyName = requestBodyObj ? requestBodyObj.name : undefined;
                    }
                    if (verb.responseBodyRef) {
                        const responseBodyObj = components.get(verb.responseBodyRef);
                        responseBodyName = responseBodyObj ? responseBodyObj.name : undefined;
                    }
                    if (verb.parameters) {
                        verb.parameters.forEach(parameter => {
                            parameters.push(components.get(parameter));
                        });
                    }
                    // Generate the service files
                    this.generateService(verb, swagger.targetLocation, requestBodyName, responseBodyName, parameters);
                    // Generate the controller file
                    this.generateController(verb, swagger.targetLocation, requestBodyName, responseBodyName, parameters);
                    // Generate the database adapters if any
                    if (verb.isPersistedModel) {
                        this.generateDatabaseAdapter(verb, swagger.targetLocation, parameters);
                    }
                });
            });
        }
        else {
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
    static async generateService(verb, directory, requestBodyName, responseBodyName, parameters) {
        const serviceFolder = `${directory}/${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}/`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        let serviceFile;
        let className;
        let methodName;
        let classImports = new Set();
        let methodParams = [];
        let methodDescriptionParams = [];
        if (verb.isPersistedModel) {
            serviceFile = `${verb.signature}-${verb.model}.${project_const_1.SERVICE_FILE_SUFFIX}`;
            className = `${case_1.default.pascal(`${verb.signature}_${verb.model}_service`)}`;
            methodName = `${case_1.default.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize_1.default.plural(methodName);
            }
        }
        else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/") + 1, verb.url.length);
            serviceFile = `${verb.signature}-${businessFunction}.${project_const_1.SERVICE_FILE_SUFFIX}`;
            className = `${case_1.default.pascal(`${verb.signature}_${businessFunction}_service`)}`;
            methodName = `${case_1.default.camel(`resolve_${verb.signature}_${businessFunction}`)}`;
        }
        if (requestBodyName) {
            const requestTypeModelPath = !requestBodyName.endsWith(verb_body_type_enum_1.VerbBodyType.request) ? `${project_const_1.ENTITY_MODELS_DIR}/${case_1.default.kebab(requestBodyName)}`
                : `${project_const_1.API_MODELS_DIR}/${case_1.default.kebab(verb.tag)}/${case_1.default.kebab(requestBodyName)}`;
            const modelRelativePath = path_1.default.relative(`${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}`, `${requestTypeModelPath}`).replace(/\\/g, "/");
            requestBodyName = case_1.default.pascal(requestBodyName);
            classImports.add(`import ${requestBodyName} from "${modelRelativePath}";`);
            methodParams.push(`${case_1.default.camel(requestBodyName)}: ${requestBodyName}`);
            methodDescriptionParams.push(`${case_1.default.camel(requestBodyName)} the ${case_1.default.sentence(requestBodyName)} body`);
        }
        if (responseBodyName) {
            const returnTypeModelPath = !responseBodyName.endsWith(verb_body_type_enum_1.VerbBodyType.response) ? `${project_const_1.ENTITY_MODELS_DIR}/${case_1.default.kebab(responseBodyName)}`
                : `${project_const_1.API_MODELS_DIR}/${case_1.default.kebab(verb.tag)}/${case_1.default.kebab(responseBodyName || "")}`;
            const modelRelativePath = path_1.default.relative(`${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}/`, `${returnTypeModelPath}`).replace(/\\/g, "/");
            responseBodyName = case_1.default.pascal(responseBodyName);
            classImports.add(`import ${responseBodyName} from "${modelRelativePath}";`);
        }
        if (parameters) {
            parameters.forEach(parameter => {
                methodParams.push(`${case_1.default.camel(parameter.name)}: ${parameter.type}`);
                methodDescriptionParams.push(`${case_1.default.camel(parameter.name)} ${parameter.description}`);
            });
        }
        methodParams.push("correlationId: string");
        methodDescriptionParams.push(project_const_1.CORRELATION_ID_PARAM_DESCR);
        const method = common_utils_1.default.createMethod({
            name: methodName,
            description: verb.summary || case_1.default.title(`the ${case_1.default.sentence(methodName).toLocaleLowerCase()} method`),
            paramsDescriptions: common_utils_1.default.formatMethodDescrParams(methodDescriptionParams),
            returnType: responseBodyName,
            params: methodParams.join(",\n "),
            operationId: `"${verb.operationId}"`
        });
        common_utils_1.default.createOrUpdateClassFile({
            folder: serviceFolder,
            file: serviceFile,
            content: [{ contentIdentifier: methodName, content: method }],
            imports: classImports,
            className,
            type: "default",
            classDescription: case_1.default.sentence(`${className}`)
        });
    }
    /**
     * @description Generates the controller in a given directory
     * @param verb the verb for which the service must be generated
     * @param directory the directory where the files must be generated
     * @param parameters the list of parameters
     * @returns {void} nothing returned
     */
    static async generateController(verb, directory, requestBodyName, responseBodyName, parameters) {
        const controllerFolder = `${directory}/${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}/`;
        const controllerFile = `${case_1.default.kebab(verb.tag)}.${project_const_1.CONTROLLER_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        const className = `${case_1.default.pascal(verb.tag + "-controller")}`;
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(verb.tag)} controller`);
        const routingControllerDecorators = source_code_utils_1.default.determineRoutingControllerDecorators(verb, requestBodyName, parameters);
        const uoStatusCodeDecorators = source_code_utils_1.default.determineUoStatusCodeDecorators(verb);
        const methodDecorators = routingControllerDecorators.concat(uoStatusCodeDecorators);
        let decoratorImports = new Map();
        let methodDecoratorDeclarations = [];
        let methodParamDecoratorDeclarations = [];
        let methodDescriptionParams = [];
        let classImports = new Set;
        let methodName;
        // Importing the class decorator: JsonController from the routing-controllers library
        decoratorImports.set(libraries_const_1.ROUTING_CONTROLLERS_LIB, new Set([decorators_const_1.JSON_CONTROLLER]));
        if (verb.isPersistedModel) {
            methodName = `${case_1.default.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize_1.default.plural(methodName);
            }
        }
        else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/"), verb.url.length);
            methodName = `${case_1.default.camel(`${verb.signature}_${businessFunction}_${pluralize_1.default.singular(verb.model)}`)}`;
        }
        methodDecorators.forEach(decorator => {
            if (Object.values(method_param_decorator_enum_1.MethodParamDecorator).includes(decorator.name)) {
                methodParamDecoratorDeclarations.push(`${decorator.declaration}`);
            }
            else {
                methodDecoratorDeclarations.push(`${decorator.declaration}`);
            }
            decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
        });
        if (parameters) {
            parameters.forEach(parameter => {
                methodDescriptionParams.push(`${case_1.default.camel(parameter.name)} ${parameter.description}`);
            });
        }
        if (requestBodyName) {
            const requestTypeModelPath = !requestBodyName.endsWith(verb_body_type_enum_1.VerbBodyType.request) ? `${project_const_1.ENTITY_MODELS_DIR}/${case_1.default.kebab(requestBodyName)}`
                : `${project_const_1.API_MODELS_DIR}/${case_1.default.kebab(verb.tag)}/${case_1.default.kebab(requestBodyName)}`;
            const modelRelativePath = path_1.default.relative(`${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}`, `${requestTypeModelPath}`).replace(/\\/g, "/");
            classImports.add(`import ${case_1.default.pascal(requestBodyName)} from "${modelRelativePath}";`);
            methodDescriptionParams.push(`${case_1.default.camel(requestBodyName)} the ${case_1.default.sentence(requestBodyName)} body`);
        }
        if (responseBodyName) {
            const returnTypeModelPath = !responseBodyName.endsWith(verb_body_type_enum_1.VerbBodyType.response) ? `${project_const_1.ENTITY_MODELS_DIR}/${case_1.default.kebab(responseBodyName)}`
                : `${project_const_1.API_MODELS_DIR}/${case_1.default.kebab(verb.tag)}/${case_1.default.kebab(responseBodyName)}`;
            const modelRelativePath = path_1.default.relative(`${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}`, `${returnTypeModelPath}`).replace(/\\/g, "/");
            responseBodyName = case_1.default.pascal(responseBodyName);
            classImports.add(`import ${responseBodyName} from "${modelRelativePath}";`);
            if (verb.signature === "get" && !isGetById) {
                responseBodyName = `${responseBodyName}[]`;
            }
        }
        const method = common_utils_1.default.createMethod({
            name: methodName,
            description: verb.summary || case_1.default.title(`the ${case_1.default.sentence(methodName)} method`),
            returnType: responseBodyName,
            params: methodParamDecoratorDeclarations.join(",\n "),
            paramsDescriptions: common_utils_1.default.formatMethodDescrParams(methodDescriptionParams),
            decorators: methodDecoratorDeclarations,
            operationId: `"${verb.operationId}"`
        });
        const appFileRelativePath = path_1.default.relative(`${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}`, `${project_const_1.APP_FILE_PATH}`.replace(".ts", "")).replace(/\\/g, "/");
        classImports.add(`import { ${imports_const_1.LOGGER_VAR_NAME} } from "${appFileRelativePath}";`);
        common_utils_1.default.createOrUpdateClassFile({
            folder: controllerFolder,
            file: controllerFile,
            content: [{ contentIdentifier: methodName, content: method }],
            decoratorImports,
            imports: classImports,
            className,
            type: "default",
            classDescription,
            decorators: [`@${decorators_const_1.JSON_CONTROLLER}("${source_code_utils_1.default.determineControllerUrl(verb.url, "class")}")`]
        });
    }
    /**
     * @description Generates database adapters in a given directory
     * @param verb the verb for which the database adapter must be generated
     * @param directory the directory where the files must be generated
     * @param parameters the list of parameters
     * @returns {void} nothing returned
     */
    static async generateDatabaseAdapter(verb, directory, parameters) {
        const databaseAdapterFolder = `${directory}/${project_const_1.DATABASE_ADAPTERS_DIR}/`;
        const databaseAdapterFile = `${case_1.default.kebab(verb.model)}-${project_const_1.DATABASE_ADAPTER_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        const className = case_1.default.pascal(`${verb.model}-database-adapter`);
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(verb.tag)} database adapter`);
        const uoStatusCodeDecorators = source_code_utils_1.default.determineUoStatusCodeDecorators(verb);
        let decoratorImports = new Map();
        let classImports = new Set;
        let methodDecoratorDeclarations = [];
        let methodParams = [];
        let methodDescriptionParams = [];
        let methodName = `${case_1.default.camel(`${verb.signature}_${verb.model}`)}${isGetById ? "ById" : ""}`;
        let methodReturnType;
        classImports.add(`import { ${imports_const_1.COUCHDB_CONNECTOR} } from "${libraries_const_1.UO_COUCHDB_CONNECTOR_LIB}";`);
        classImports.add(`import ${imports_const_1.ENV_VAR_NAME} from "${path_1.default.relative(project_const_1.DATABASE_ADAPTERS_DIR, project_const_1.ENV_FILE_PATH.replace(".ts", "")).replace(/[\\]/g, "/")}";`);
        classImports.add(`import { ${imports_const_1.LOGGER_VAR_NAME} } from "${path_1.default.relative(project_const_1.DATABASE_ADAPTERS_DIR, project_const_1.LOGGER_FILE_PATH.replace(".ts", "")).replace(/\\/g, "/")}";`);
        if (verb.signature === "get") {
            methodReturnType = case_1.default.pascal(`${verb.model}-database`);
            const returnModelRelativePath = path_1.default.relative(`${project_const_1.DATABASE_ADAPTERS_DIR}`, `${project_const_1.ADAPTER_MODELS_DIR}/${case_1.default.kebab(methodReturnType)}`).replace(/\\/g, "/");
            classImports.add(`import { ${methodReturnType} } from "${returnModelRelativePath}";`);
            if (!isGetById) {
                methodName = pluralize_1.default.plural(methodName);
                methodReturnType = `${methodReturnType}[]`;
            }
        }
        else {
            methodReturnType = imports_const_1.DOCUMENT_INSERT_RESPONSE;
            classImports.add(`import { ${imports_const_1.DOCUMENT_INSERT_RESPONSE} } from "${libraries_const_1.NANO}";`);
        }
        uoStatusCodeDecorators.forEach(decorator => {
            methodDecoratorDeclarations.push(`${decorator.declaration}`);
            decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
        });
        if (parameters) {
            parameters.forEach(parameter => {
                methodParams.push(`${case_1.default.camel(parameter.name)}: ${parameter.type}`);
                methodDescriptionParams.push(`${case_1.default.camel(parameter.name)} ${parameter.description}`);
            });
        }
        const databaseAdapterConfig = source_code_utils_1.default.createDatabaseAdapterConfig(case_1.default.pascal(`${verb.model}-database`));
        const method = common_utils_1.default.createMethod({
            name: methodName,
            description: verb.summary || case_1.default.title(`the ${case_1.default.sentence(methodName)} method`),
            params: methodParams.join(",\n "),
            paramsDescriptions: common_utils_1.default.formatMethodDescrParams(methodDescriptionParams),
            decorators: methodDecoratorDeclarations,
            returnType: methodReturnType,
            operationId: `"${verb.operationId}"`
        });
        common_utils_1.default.createOrUpdateClassFile({
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
    static async generateRedisAdapter(directory) {
        const redisAdapterFolder = `${directory}/${project_const_1.REDIS_ADAPTERS_DIR}/`;
        const redisAdapterFile = `${project_const_1.REDIS_ADAPTER_FILE_SUFFIX}`;
        let imports = new Set;
        imports.add(`import { ${imports_const_1.REDIS_CONNECTOR}, ${imports_const_1.REDIS_OPTIONS} } from "${libraries_const_1.UO_REDIS_CONNECTOR_LIB}";`);
        imports.add(`import ${imports_const_1.ENV_VAR_NAME} from "${path_1.default.relative(project_const_1.REDIS_ADAPTERS_DIR, project_const_1.ENV_FILE_PATH.replace(".ts", "")).replace(/[\\]/g, "/")}";`);
        imports.add(`import { ${imports_const_1.LOGGER_VAR_NAME} } from "${path_1.default.relative(project_const_1.REDIS_ADAPTERS_DIR, project_const_1.LOGGER_FILE_PATH.replace(".ts", "")).replace(/\\/g, "/")}";`);
        const redisOptions = source_code_utils_1.default.createRedisOptions();
        common_utils_1.default.createOrUpdatePlainFile({
            folder: redisAdapterFolder,
            file: redisAdapterFile,
            content: [
                { contentIdentifier: `const options: ${imports_const_1.REDIS_OPTIONS}`, content: redisOptions }
            ],
            imports
        });
    }
}
exports.default = SourceCodeService;
//# sourceMappingURL=source-code.service.js.map