"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_1 = __importDefault(require("case"));
const fs_1 = __importDefault(require("fs"));
const project_const_1 = require("./constants/project.const");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
const path_1 = __importDefault(require("path"));
const pluralize_1 = __importDefault(require("pluralize"));
const verb_body_type_enum_1 = require("./enums/verb-body-type.enum");
const models_utils_1 = __importDefault(require("./utils/models-utils"));
const file_content_1 = require("./models/domain/file-content");
const libraries_const_1 = require("./constants/libraries.const");
const decorators_const_1 = require("./constants/decorators.const");
class ModelsService {
    /**
     * @description Generates model files for a given swagger
     * @param swagger the swagger for which the model files must be generated
     * @returns {void} nothing returned
     */
    static async generateModelFiles(swagger) {
        const components = new Map();
        swagger.components.forEach(element => {
            const arr = element;
            components.set(arr[0], arr[1]);
        });
        if (fs_1.default.existsSync(swagger.targetLocation)) {
            swagger.paths.forEach((path) => {
                path.verbs.forEach((verb) => {
                    let responseBodyName, requestBodyName;
                    // Generate all the models pertaining to the request body if any
                    if (verb.requestBodyRef) {
                        const requestBodyObj = components.get(verb.requestBodyRef);
                        if (requestBodyObj) {
                            requestBodyName = requestBodyObj.name;
                            this.generateAllApplicableModels(requestBodyObj, verb.tag, verb.isPersistedModel, swagger.targetLocation);
                        }
                    }
                    // Generate all the models pertaining to the response body if any
                    if (verb.responseBodyRef) {
                        const responseBodyObj = components.get(verb.responseBodyRef);
                        if (responseBodyObj) {
                            responseBodyName = responseBodyObj.name;
                            this.generateAllApplicableModels(responseBodyObj, verb.tag, verb.isPersistedModel, swagger.targetLocation);
                        }
                    }
                });
            });
        }
        else {
            throw new Error(`Target location specified: ${swagger.targetLocation} does not exist`);
        }
    }
    /**
     * @description Generates all models that are applicable to a request or response object
     * @param verbBody the verb body
     * @param verbTag the verb tag
     * @param isPersistedModel is the model persited
     * @param directory the directory where the request or response model files must be generated
     * @returns {void} nothing returned
     */
    static async generateAllApplicableModels(verbBody, verbTag, isPersistedModel, directory) {
        const modelsDirectory = `${directory}/${project_const_1.API_MODELS_DIR}/${case_1.default.kebab(verbTag)}/`;
        const entityModelsDirectory = `${directory}/${project_const_1.ENTITY_MODELS_DIR}/`;
        const adapterModelsDirectory = `${directory}/${project_const_1.ADAPTER_MODELS_DIR}/`;
        let entityModels = [];
        verbBody.properties.forEach(property => {
            if (common_utils_1.default.isEntityObject(property)) {
                this.generateEntityModel(property, entityModelsDirectory);
                entityModels.push(property.type.replace("[]", ""));
                let fieldProperties = property.properties;
                while (fieldProperties) {
                    fieldProperties.forEach(field => {
                        if (common_utils_1.default.isEntityObject(field)) {
                            this.generateEntityModel(field, entityModelsDirectory);
                        }
                        fieldProperties = field.properties;
                    });
                }
            }
        });
        if (verbBody.type === verb_body_type_enum_1.VerbBodyType.request) {
            this.generateRequestModel(verbBody, modelsDirectory, entityModels);
        }
        else if (verbBody.type === verb_body_type_enum_1.VerbBodyType.response) {
            this.generateResponseModel(verbBody, modelsDirectory, entityModels);
        }
        else if (verbBody.type === verb_body_type_enum_1.VerbBodyType.model) {
            const entityModel = {
                name: verbBody.name,
                properties: verbBody.properties
            };
            this.generateEntityModel(entityModel, entityModelsDirectory);
            if (isPersistedModel) {
                //Generate database adapter models
                this.generateDatabaseAdapterModel(verbBody, adapterModelsDirectory);
            }
        }
    }
    /**
     * @description Generates the request model for a given verbBody
     * @param verbBody the verbBody for which the model must be generated
     * @param directory the directory where the model must be generated
     * @returns {void} nothing returned
     */
    static async generateRequestModel(verbBody, directory, entityModelstoImport) {
        const requestModelFile = `${case_1.default.kebab(verbBody.name)}.ts`;
        const className = `${case_1.default.pascal(verbBody.name)}`;
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(verbBody.name)} class`);
        let classContent = [];
        let classImports = new Set;
        let decoratorImports = new Map();
        let validationConstantImports = [];
        let validationConstantTypes = new Map();
        common_utils_1.default.createDirIfNotExist(directory);
        verbBody.properties.forEach(property => {
            const validationDecorators = models_utils_1.default.determineValidationDecorators(property);
            const transformDecorators = models_utils_1.default.determineTransformerDecorators(property, "request");
            let propertyName = property.name;
            let propertyDecoratorDeclarations = [];
            if (!property.isRequired) {
                propertyName = propertyName + "?";
            }
            validationDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
                if (decorator.validationMessageConst) {
                    validationConstantImports.push(decorator.validationMessageConst);
                    validationConstantTypes.set(decorator.validationMessageConst, property.type);
                }
            });
            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
                if (decorator.validationMessageConst) {
                    validationConstantImports.push(decorator.validationMessageConst);
                    validationConstantTypes.set(decorator.validationMessageConst, property.type);
                }
            });
            const field = models_utils_1.default.createField({
                name: propertyName,
                description: property.description || case_1.default.sentence(`the ${case_1.default.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            });
            classContent.push({ contentIdentifier: `${propertyName}:`, content: field });
        });
        if (entityModelstoImport) {
            entityModelstoImport.forEach(entityModel => {
                const entityModelFile = `${case_1.default.kebab(entityModel)}`;
                const entityModelRelativePath = path_1.default.relative(`${project_const_1.API_MODELS_DIR}/${requestModelFile}`, `${project_const_1.ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");
                classImports.add(`import ${entityModel} from "${entityModelRelativePath}";`);
            });
        }
        if (validationConstantTypes.size > 0) {
            const validationMessageConstantsFileLocation = path_1.default.relative(`${project_const_1.API_MODELS_DIR}/${requestModelFile}`, `${project_const_1.VALIDATION_MESSAGES_FILE_DIR}/${project_const_1.VALIDATION_MESSAGES_FILE}`).replace(/\\/g, "/");
            ;
            const validationMessageConstantsDir = `${directory.substring(0, directory.indexOf(`/${project_const_1.API_MODELS_DIR}`))}/${project_const_1.VALIDATION_MESSAGES_FILE_DIR}/`;
            classImports.add(`import {${validationConstantImports.join()}} from "${validationMessageConstantsFileLocation}";`);
            this.generateValidationMessagesConstants(validationConstantTypes, validationMessageConstantsDir);
        }
        common_utils_1.default.createOrUpdateClassFile({
            folder: directory,
            file: requestModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            imports: classImports,
            className,
            type: "default",
            classDescription
        });
    }
    /**
     * @description Generates the response model for a given verbBody
     * @param verbBody the verbBody for which the model must be generated
     * @param directory the directory where the model must be generated
     * @returns {void} nothing returned
     */
    static async generateResponseModel(verbBody, directory, entityModels) {
        const responseModelFile = `${case_1.default.kebab(verbBody.name)}.ts`;
        const className = `${case_1.default.pascal(verbBody.name)}`;
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(verbBody.name)} class`);
        let classContent = [];
        let classImports = new Set;
        let decoratorImports = new Map();
        common_utils_1.default.createDirIfNotExist(directory);
        decoratorImports.set(libraries_const_1.CLASS_TRANSFORMER_LIB, new Set().add(decorators_const_1.EXCLUDE));
        verbBody.properties.forEach(property => {
            const transformDecorators = models_utils_1.default.determineTransformerDecorators(property, "response");
            let propertyDecoratorDeclarations = [];
            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
            });
            const field = models_utils_1.default.createField({
                name: property.name,
                description: property.description || case_1.default.sentence(`the ${case_1.default.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            });
            classContent.push({ contentIdentifier: `${property.name}:`, content: field });
        });
        if (entityModels) {
            entityModels.forEach(entityModel => {
                const entityModelFile = `${case_1.default.kebab(entityModel)}`;
                const entityModelPath = path_1.default.relative(`${project_const_1.API_MODELS_DIR}/${responseModelFile}`, `${project_const_1.ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");
                classImports.add(`import ${entityModel} from "${entityModelPath}";`);
            });
        }
        common_utils_1.default.createOrUpdateClassFile({
            folder: directory,
            file: responseModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            decorators: [`@${decorators_const_1.EXCLUDE}()`],
            imports: classImports,
            className,
            type: "default",
            classDescription
        });
    }
    /**
     * @description Generates an entity model for a given object
     * @param property the property to convert into an entity model
     * @param directory the directory where the model must be generated
     * @returns {void} nothing returned
     */
    static async generateEntityModel(property, directory) {
        const entityModelFile = `${case_1.default.kebab(property.name)}.ts`;
        const className = `${case_1.default.pascal(property.name)}`;
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(property.name)} class`);
        common_utils_1.default.createDirIfNotExist(directory);
        if (property.properties) {
            let classContent = [];
            let classImports = new Set;
            let decoratorImports = new Map();
            decoratorImports.set(libraries_const_1.CLASS_TRANSFORMER_LIB, new Set().add(decorators_const_1.EXCLUDE));
            property.properties.forEach(property => {
                const transformDecorators = models_utils_1.default.determineTransformerDecorators(property, "entity");
                let propertyName = property.name;
                let propertyDecoratorDeclarations = [];
                if (!property.isRequired) {
                    propertyName = propertyName + "?";
                }
                transformDecorators.forEach(decorator => {
                    propertyDecoratorDeclarations.push(decorator.declaration);
                    decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
                });
                if (common_utils_1.default.isEntityObject(property)) {
                    classImports.add(`import ${case_1.default.pascal(property.name)} from "./${case_1.default.kebab(property.name)}";`);
                }
                const field = models_utils_1.default.createField({
                    name: propertyName,
                    description: property.description || case_1.default.sentence(`the ${case_1.default.sentence(property.name)}`),
                    type: property.type,
                    decorators: propertyDecoratorDeclarations
                });
                classContent.push({ contentIdentifier: `${propertyName}:`, content: field });
            });
            common_utils_1.default.createOrUpdateClassFile({
                folder: directory,
                file: entityModelFile,
                content: classContent,
                decoratorImports: decoratorImports,
                decorators: [`@${decorators_const_1.EXCLUDE}()`],
                imports: classImports,
                className,
                type: "default",
                classDescription
            });
        }
    }
    /**
     * @description Generates an adapter model for a given object
     * @param verbBody the verbBody for which the model must be generated
     * @param directory the directory where the model must be generated
     * @returns {void} nothing returned
     */
    static async generateDatabaseAdapterModel(verbBody, directory) {
        const className = case_1.default.pascal(pluralize_1.default.singular(verbBody.name.replace("-model", "")) + "-database");
        const classDescription = case_1.default.title(`the ${case_1.default.sentence(className)} class`);
        const adapterModelFile = `${case_1.default.kebab(className)}.ts`;
        const entityModel = case_1.default.pascal(verbBody.name);
        common_utils_1.default.createDirIfNotExist(directory);
        let databaseFields = [{
                isRequired: true,
                name: "_id",
                type: "string",
                description: "The field that will be used to create the db _id"
            }, {
                isRequired: true,
                name: "_rev",
                type: "string",
                description: "The document revision"
            }];
        // Determine the primary key of the model
        verbBody.properties.forEach(property => {
            if (property.isPrimary) {
                property.description = "This field is purposely not exposed so that it doesn't show up in the database";
                databaseFields.push(property);
            }
        });
        let classContent = [];
        let classImports = new Set;
        let decoratorImports = new Map();
        decoratorImports.set(libraries_const_1.CLASS_TRANSFORMER_LIB, new Set().add(decorators_const_1.EXCLUDE));
        databaseFields.forEach(property => {
            let propertyDecoratorDeclarations = [];
            const transformDecorators = models_utils_1.default.determineTransformerDecorators(property, "database");
            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib, (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
            });
            const field = models_utils_1.default.createField({
                name: property.name,
                description: property.description || case_1.default.sentence(`the ${case_1.default.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            });
            classContent.push({ contentIdentifier: `${property.name}:`, content: field });
        });
        const entityModelFile = case_1.default.kebab(entityModel);
        const entityModelPath = path_1.default.relative(`${project_const_1.ADAPTER_MODELS_DIR}/`, `${project_const_1.ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");
        classImports.add(`import ${entityModel} from "${entityModelPath}";`);
        common_utils_1.default.createOrUpdateClassFile({
            folder: directory,
            file: adapterModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            decorators: [`@${decorators_const_1.EXCLUDE}()`],
            imports: classImports,
            className: `${className} extends ${entityModel}`,
            classDescription
        });
    }
    /**
     * @description Generates validation messages constants
     * @param constantsTypes a map of constants and their corresponding types
     * @param directory the directory where the constants must be generated
     * @returns {void} nothing returned
     */
    static async generateValidationMessagesConstants(constantsTypes, directory) {
        const validationMessagesFile = `${project_const_1.VALIDATION_MESSAGES_FILE}.ts`;
        let imports = new Set();
        const addExportToClassContent = (constant, type) => {
            let fileContent = new file_content_1.FileContent;
            const contentIdentifier = `export const ${constant}`;
            if (constant.includes("REQUIRED")) {
                const property = constant.substring(0, constant.indexOf("_REQUIRED"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The ${case_1.default.snake(property)} must be provided.";` };
            }
            if (constant.includes("FORMAT_TYPE")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_TYPE"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${case_1.default.snake(property)} must be a ${type}.";` };
            }
            if (constant.includes("FORMAT_ARRAY")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_ARRAY"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${case_1.default.snake(property)} must be an array.";` };
            }
            if (constant.includes("FORMAT_DATE") && !constant.includes("FORMAT_DATE_TIME")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_DATE"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${case_1.default.snake(property)} must be formatted YYYY-MM-DD.";` };
            }
            if (constant.includes("FORMAT_DATE_TIME")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_DATE_TIME"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${case_1.default.snake(property)} must be formatted YYYY-MM-DDTHH:MM:SS.SSSZ.";` };
            }
            return fileContent;
        };
        let classContent = [];
        constantsTypes.forEach((type, constant) => {
            classContent.push(addExportToClassContent(constant, type));
        });
        common_utils_1.default.createOrUpdatePlainFile({
            folder: directory,
            file: validationMessagesFile,
            content: classContent,
            imports
        });
    }
}
exports.default = ModelsService;
//# sourceMappingURL=models.service.js.map