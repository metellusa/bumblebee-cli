import Case from "case";
import fs from "fs";
import {
    API_MODELS_DIR, ENTITY_MODELS_DIR, VALIDATION_MESSAGES_FILE_DIR, VALIDATION_MESSAGES_FILE, ADAPTER_MODELS_DIR
} from "./constants/project.const";
import { Property } from "./models/domain/property";
import CommonUtils from "./utils/common-utils";
import path from "path";
import { VerbBody } from "./models/domain/verb-body";
import pluralize from "pluralize";
import { VerbBodyType } from "./enums/verb-body-type.enum";
import { Decorator } from "./models/domain/decorator";
import ModelsUtils from "./utils/models-utils";
import { Swagger } from "./models/domain/swagger";
import { FileContent } from "./models/domain/file-content";
import { CLASS_TRANSFORMER_LIB } from "./constants/libraries.const";
import { EXCLUDE } from "./constants/decorators.const";

export default class ModelsService {

    /**
     * @description Generates model files for a given swagger
     * @param swagger the swagger for which the model files must be generated
     * @returns {void} nothing returned
     */
    public static async generateModelFiles(swagger: Swagger) {

        const components = new Map<string, Object>();

        swagger.components.forEach(element => {
            const arr: any = element;
            components.set(arr[0], arr[1])
        });

        if (fs.existsSync(swagger.targetLocation)) {
            swagger.paths.forEach((path) => {
                path.verbs.forEach((verb) => {

                    let responseBodyName: string | undefined, requestBodyName: string | undefined;

                    // Generate all the models pertaining to the request body if any
                    if (verb.requestBodyRef) {
                        const requestBodyObj: VerbBody = components.get(verb.requestBodyRef) as VerbBody;
                        if (requestBodyObj) {
                            requestBodyName = requestBodyObj.name;
                            this.generateAllApplicableModels(requestBodyObj, verb.tag, verb.isPersistedModel, swagger.targetLocation);
                        }
                    }
                    // Generate all the models pertaining to the response body if any
                    if (verb.responseBodyRef) {
                        const responseBodyObj: VerbBody = components.get(verb.responseBodyRef) as VerbBody;
                        if (responseBodyObj) {
                            responseBodyName = responseBodyObj.name;
                            this.generateAllApplicableModels(responseBodyObj, verb.tag, verb.isPersistedModel, swagger.targetLocation);
                        }
                    }

                });
            });
        } else {
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
    private static async generateAllApplicableModels(verbBody: VerbBody, verbTag: string, isPersistedModel: boolean, directory: string) {
        const modelsDirectory = `${directory}/${API_MODELS_DIR}/${Case.kebab(verbTag)}/`;
        const entityModelsDirectory = `${directory}/${ENTITY_MODELS_DIR}/`;
        const adapterModelsDirectory = `${directory}/${ADAPTER_MODELS_DIR}/`;
        let entityModels: string[] = [];

        verbBody.properties.forEach(property => {
            if (CommonUtils.isEntityObject(property)) {
                this.generateEntityModel(property, entityModelsDirectory);
                entityModels.push(property.type.replace("[]", ""));

                let fieldProperties: Property[] | undefined = property.properties;
                while (fieldProperties) {
                    fieldProperties.forEach(field => {
                        if (CommonUtils.isEntityObject(field)) {
                            this.generateEntityModel(field, entityModelsDirectory);
                        }
                        fieldProperties = field.properties;
                    });
                }
            }
        });

        if (verbBody.type === VerbBodyType.request) {
            this.generateRequestModel(verbBody, modelsDirectory, entityModels);
        } else if (verbBody.type === VerbBodyType.response) {
            this.generateResponseModel(verbBody, modelsDirectory, entityModels);
        } else if (verbBody.type === VerbBodyType.model) {
            const entityModel = {
                name: verbBody.name,
                properties: verbBody.properties
            } as Property;

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
    private static async generateRequestModel(verbBody: VerbBody, directory: string, entityModelstoImport?: string[]) {
        const requestModelFile = `${Case.kebab(verbBody.name)}.ts`;
        const className = `${Case.pascal(verbBody.name)}`;
        const classDescription = Case.title(`the ${Case.sentence(verbBody.name)} class`);
        let classContent: FileContent[] = [];
        let classImports: Set<string> = new Set;
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();
        let validationConstantImports: string[] = [];
        let validationConstantTypes: Map<string, string> = new Map<string, string>();

        CommonUtils.createDirIfNotExist(directory);

        verbBody.properties.forEach(property => {
            const validationDecorators: Decorator[] = ModelsUtils.determineValidationDecorators(property);
            const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, "request");

            let propertyName = property.name;
            let propertyDecoratorDeclarations: string[] = [];

            if (!property.isRequired) {
                propertyName = propertyName + "?";
            }

            validationDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib,
                    (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));

                if (decorator.validationMessageConst) {
                    validationConstantImports.push(decorator.validationMessageConst);
                    validationConstantTypes.set(decorator.validationMessageConst, property.type);
                }
            });

            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib,
                    (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));

                if (decorator.validationMessageConst) {
                    validationConstantImports.push(decorator.validationMessageConst);
                    validationConstantTypes.set(decorator.validationMessageConst, property.type);
                }
            });

            const field = ModelsUtils.createField({
                name: propertyName,
                description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            })

            classContent.push({ contentIdentifier: `${propertyName}:`, content: field });

        });

        if (entityModelstoImport) {
            entityModelstoImport.forEach(entityModel => {
                const entityModelFile = `${Case.kebab(entityModel)}`;
                const entityModelRelativePath = path.relative(`${API_MODELS_DIR}/${requestModelFile}`, `${ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");

                classImports.add(`import ${entityModel} from "${entityModelRelativePath}";`);
            });
        }
        if (validationConstantTypes.size > 0) {
            const validationMessageConstantsFileLocation = path.relative(`${API_MODELS_DIR}/${requestModelFile}`, `${VALIDATION_MESSAGES_FILE_DIR}/${VALIDATION_MESSAGES_FILE}`).replace(/\\/g, "/");;
            const validationMessageConstantsDir = `${directory.substring(0, directory.indexOf(`/${API_MODELS_DIR}`))}/${VALIDATION_MESSAGES_FILE_DIR}/`;

            classImports.add(`import {${validationConstantImports.join()}} from "${validationMessageConstantsFileLocation}";`);
            this.generateValidationMessagesConstants(validationConstantTypes, validationMessageConstantsDir);
        }

        CommonUtils.createOrUpdateClassFile({
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
    private static async generateResponseModel(verbBody: VerbBody, directory: string, entityModels?: string[]) {
        const responseModelFile = `${Case.kebab(verbBody.name)}.ts`;
        const className = `${Case.pascal(verbBody.name)}`;
        const classDescription = Case.title(`the ${Case.sentence(verbBody.name)} class`);
        let classContent: FileContent[] = [];
        let classImports: Set<string> = new Set;
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();

        CommonUtils.createDirIfNotExist(directory);

        decoratorImports.set(CLASS_TRANSFORMER_LIB, new Set<string>().add(EXCLUDE));

        verbBody.properties.forEach(property => {
            const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, "response");
            let propertyDecoratorDeclarations: string[] = [];

            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib,
                    (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
            });

            const field = ModelsUtils.createField({
                name: property.name,
                description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            })

            classContent.push({ contentIdentifier: `${property.name}:`, content: field });
        });

        if (entityModels) {
            entityModels.forEach(entityModel => {
                const entityModelFile = `${Case.kebab(entityModel)}`;
                const entityModelPath = path.relative(`${API_MODELS_DIR}/${responseModelFile}`, `${ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");

                classImports.add(`import ${entityModel} from "${entityModelPath}";`);
            });
        }

        CommonUtils.createOrUpdateClassFile({
            folder: directory,
            file: responseModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            decorators: [`@${EXCLUDE}()`],
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
    private static async generateEntityModel(property: Property, directory: string) {
        const entityModelFile = `${Case.kebab(property.name)}.ts`;
        const className = `${Case.pascal(property.name)}`;
        const classDescription = Case.title(`the ${Case.sentence(property.name)} class`);

        CommonUtils.createDirIfNotExist(directory);

        if (property.properties) {
            let classContent: FileContent[] = [];
            let classImports: Set<string> = new Set;
            let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();

            decoratorImports.set(CLASS_TRANSFORMER_LIB, new Set<string>().add(EXCLUDE));

            property.properties.forEach(property => {
                const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, "entity");
                let propertyName = property.name;
                let propertyDecoratorDeclarations: string[] = [];

                if (!property.isRequired) {
                    propertyName = propertyName + "?";
                }
                transformDecorators.forEach(decorator => {
                    propertyDecoratorDeclarations.push(decorator.declaration);
                    decoratorImports.set(decorator.importLib,
                        (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
                });

                if (CommonUtils.isEntityObject(property)) {
                    classImports.add(`import ${Case.pascal(property.name)} from "./${Case.kebab(property.name)}";`);
                }

                const field = ModelsUtils.createField({
                    name: propertyName,
                    description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                    type: property.type,
                    decorators: propertyDecoratorDeclarations
                })

                classContent.push({ contentIdentifier: `${propertyName}:`, content: field });
            });

            CommonUtils.createOrUpdateClassFile({
                folder: directory,
                file: entityModelFile,
                content: classContent,
                decoratorImports: decoratorImports,
                decorators: [`@${EXCLUDE}()`],
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
    private static async generateDatabaseAdapterModel(verbBody: VerbBody, directory: string) {
        const className = Case.pascal(pluralize.singular(verbBody.name.replace("-model", "")) + "-database");
        const classDescription = Case.title(`the ${Case.sentence(className)} class`);
        const adapterModelFile = `${Case.kebab(className)}.ts`;
        const entityModel = Case.pascal(verbBody.name);

        CommonUtils.createDirIfNotExist(directory);

        let databaseFields: Property[] = [{
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
                databaseFields.push(property)
            }
        });

        let classContent: FileContent[] = [];
        let classImports: Set<string> = new Set;
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();

        decoratorImports.set(CLASS_TRANSFORMER_LIB, new Set<string>().add(EXCLUDE));

        databaseFields.forEach(property => {
            let propertyDecoratorDeclarations: string[] = [];

            const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, "database");
            transformDecorators.forEach(decorator => {
                propertyDecoratorDeclarations.push(decorator.declaration);
                decoratorImports.set(decorator.importLib,
                    (decoratorImports.get(decorator.importLib) || new Set).add(decorator.name));
            });

            const field = ModelsUtils.createField({
                name: property.name,
                description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                type: property.type,
                decorators: propertyDecoratorDeclarations
            })

            classContent.push({ contentIdentifier: `${property.name}:`, content: field });
        });

        const entityModelFile = Case.kebab(entityModel);
        const entityModelPath = path.relative(`${ADAPTER_MODELS_DIR}/`, `${ENTITY_MODELS_DIR}/${entityModelFile}`).replace(/\\/g, "/");

        classImports.add(`import ${entityModel} from "${entityModelPath}";`);

        CommonUtils.createOrUpdateClassFile({
            folder: directory,
            file: adapterModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            decorators: [`@${EXCLUDE}()`],
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
    private static async generateValidationMessagesConstants(constantsTypes: Map<string, string>, directory: string) {
        const validationMessagesFile = `${VALIDATION_MESSAGES_FILE}.ts`;
        let imports: Set<string> = new Set();

        const addExportToClassContent = (constant: string, type: string): FileContent => {
            let fileContent: FileContent = new FileContent;
            const contentIdentifier = `export const ${constant}`;
            if (constant.includes("REQUIRED")) {
                const property = constant.substring(0, constant.indexOf("_REQUIRED"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The ${Case.snake(property)} must be provided.";` };
            }
            if (constant.includes("FORMAT_TYPE")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_TYPE"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${Case.snake(property)} must be a ${type}.";` };
            }
            if (constant.includes("FORMAT_ARRAY")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_ARRAY"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${Case.snake(property)} must be an array.";` };
            }
            if (constant.includes("FORMAT_DATE") && !constant.includes("FORMAT_DATE_TIME")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_DATE"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${Case.snake(property)} must be formatted YYYY-MM-DD.";` };
            }
            if (constant.includes("FORMAT_DATE_TIME")) {
                const property = constant.substring(0, constant.indexOf("_FORMAT_DATE_TIME"));
                fileContent = { contentIdentifier, content: `export const ${constant} = "The field ${Case.snake(property)} must be formatted YYYY-MM-DDTHH:MM:SS.SSSZ.";` };
            }
            return fileContent;
        };

        let classContent: FileContent[] = [];

        constantsTypes.forEach((type, constant) => {
            classContent.push(addExportToClassContent(constant, type));
        });

        CommonUtils.createOrUpdatePlainFile({
            folder: directory,
            file: validationMessagesFile,
            content: classContent,
            imports
        })
    }
}
