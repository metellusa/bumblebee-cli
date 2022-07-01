import Case from "case";
import fs from "fs";
import {
    API_MODELS_DIR,
    ENTITY_MODELS_DIR,
    VALIDATION_MESSAGES_FILE_DIR,
    VALIDATION_MESSAGES_FILE,
    ADAPTER_MODELS_DIR,
    ENTITY_MODEL_FILE_SUFFIX,
    ENTITY_MODEL_CLASS_SUFFIX,
    RESPONSE_MODEL_FILE_SUFFIX,
    REQUEST_MODEL_FILE_SUFFIX,
    REQUEST_MODEL_CLASS_SUFFIX,
    RESPONSE_MODEL_CLASS_SUFFIX,
    WORDS_TO_EXCLUDE
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
import { Field } from "./models/domain/field";

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
        let models: string[] = [];

        verbBody.properties.forEach(property => {
            if (CommonUtils.isObjectField(property)) {
                this.generateModel(property, modelsDirectory, verbBody.type);
                models.push(property.type.replace("[]", ""));

                this.createNestedModels(modelsDirectory, verbBody.type, property.properties);
            }
        });

        if (verbBody.type === VerbBodyType.request) {
            this.generateRequestModel(verbBody, modelsDirectory, models);
        }

        if (verbBody.type === VerbBodyType.response) {
            this.generateResponseModel(verbBody, modelsDirectory, models);
        }

        if (!verbBody.name.includes(VerbBodyType.request) &&
            !verbBody.name.includes(VerbBodyType.response)) {
            const entityModel = {
                name: verbBody.name,
                properties: verbBody.properties
            } as Property;

            this.generateModel(entityModel, entityModelsDirectory, VerbBodyType.model);

            if (isPersistedModel) {
                //Generate database adapter models
                this.generateDatabaseAdapterModel(verbBody, adapterModelsDirectory);
            }
        }
    }

    /**
     * @description Recursively creates nested models
     * @param properties array of properties that may have nested properties
     * @param modelsDirectory directory path where the model files will be generated
     */
    private static createNestedModels(modelsDirectory: string, verbBodyType: VerbBodyType, properties?: Property[]) {
        properties?.forEach(property => {
            if (CommonUtils.isObjectField(property)) {
                this.generateModel(property, modelsDirectory, verbBodyType);
                this.createNestedModels(modelsDirectory, verbBodyType, property.properties);
            }
        });
    }

    /**
     * @description Generates the request model for a given verbBody
     * @param verbBody the verbBody for which the model must be generated
     * @param directory the directory where the model must be generated
     * @returns {void} nothing returned
     */
    private static async generateRequestModel(verbBody: VerbBody, directory: string, modelsToImport?: string[]) {
        const requestModelFile = `${Case.kebab(verbBody.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}.${REQUEST_MODEL_FILE_SUFFIX}`;
        const className = `${Case.pascal(verbBody.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}${REQUEST_MODEL_CLASS_SUFFIX}`;
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
                type: CommonUtils.isObjectField(property) ? `${property.type}${REQUEST_MODEL_CLASS_SUFFIX}` : property.type,
                decorators: propertyDecoratorDeclarations
            })

            classContent.push({ contentIdentifier: `${propertyName}:`, content: field });

        });

        if (modelsToImport) {
            modelsToImport.forEach(model => {
                const modelFile = `${Case.kebab(model)}.${REQUEST_MODEL_FILE_SUFFIX}`.replace(".ts", "");
                classImports.add(`import { ${model}${REQUEST_MODEL_CLASS_SUFFIX} } from "./${modelFile}";`);
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
    private static async generateResponseModel(verbBody: VerbBody, directory: string, modelsToImport?: string[]) {
        const responseModelFile = `${Case.kebab(verbBody.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}.${RESPONSE_MODEL_FILE_SUFFIX}`;
        const className = `${Case.pascal(verbBody.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}${RESPONSE_MODEL_CLASS_SUFFIX}`;
        const classDescription = Case.title(`the ${Case.sentence(verbBody.name)} class`);
        let classContent: FileContent[] = [];
        let classImports: Set<string> = new Set;
        let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();

        CommonUtils.createDirIfNotExist(directory);

        decoratorImports.set(CLASS_TRANSFORMER_LIB, new Set<string>().add(EXCLUDE));

        verbBody.properties.forEach(property => {
            const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, "response");
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

            const field = ModelsUtils.createField({
                name: propertyName,
                description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                type: CommonUtils.isObjectField(property) ? `${property.type}${RESPONSE_MODEL_CLASS_SUFFIX}`: property.type,
                decorators: propertyDecoratorDeclarations
            })

            classContent.push({ contentIdentifier: `${propertyName}:`, content: field });
        });

        if (modelsToImport) {
            modelsToImport.forEach(model => {
                const modelFile = `${Case.kebab(model)}.${RESPONSE_MODEL_FILE_SUFFIX}`.replace(".ts", "");
                classImports.add(`import { ${model}${RESPONSE_MODEL_CLASS_SUFFIX} } from "./${modelFile}";`);
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
     * @description Generates a model for a given property
     * @param property the property to convert into a model
     * @param directory the directory where the model must be generated
     * @param verbBodyType the parent verbBodyType of the property
     * @returns {void} nothing returned
     */
    private static async generateModel(property: Property, directory: string, verbBodyType: VerbBodyType) {
        let modelFile = `${Case.kebab(property.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}`;
        let className = `${Case.pascal(property.name.replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), ""))}`;
        let modelType: "request" | "response" | "entity";
        const classDescription = Case.title(`the ${Case.sentence(property.name)} class`);

        if (verbBodyType === VerbBodyType.request) {
            modelType = "request";
            modelFile = `${modelFile}.${REQUEST_MODEL_FILE_SUFFIX}`;
            className = `${className}${REQUEST_MODEL_CLASS_SUFFIX}`;
        } else if (verbBodyType === VerbBodyType.response) {
            modelType = "response";
            modelFile = `${modelFile}.${RESPONSE_MODEL_FILE_SUFFIX}`;
            className = `${className}${RESPONSE_MODEL_CLASS_SUFFIX}`;
        } else if (verbBodyType === VerbBodyType.model) {
            modelType = "entity";
            modelFile = `${modelFile}.${ENTITY_MODEL_FILE_SUFFIX}`;
            className = `${className}${ENTITY_MODEL_CLASS_SUFFIX}`;
        }

        CommonUtils.createDirIfNotExist(directory);

        if (property.properties) {
            let classContent: FileContent[] = [];
            let classImports: Set<string> = new Set;
            let decoratorImports: Map<string, Set<string>> = new Map<string, Set<string>>();

            decoratorImports.set(CLASS_TRANSFORMER_LIB, new Set<string>().add(EXCLUDE));

            property.properties.forEach(property => {
                const transformDecorators: Decorator[] = ModelsUtils.determineTransformerDecorators(property, modelType);
                const isObjectField = CommonUtils.isObjectField(property);
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

                let fieldData: Field = {
                    name: propertyName,
                    description: property.description || Case.sentence(`the ${Case.sentence(property.name)}`),
                    type: property.type,
                    decorators: propertyDecoratorDeclarations
                }

                if (isObjectField) {
                    if (verbBodyType === VerbBodyType.request) {
                        classImports.add(`import { ${Case.pascal(property.name)}${REQUEST_MODEL_CLASS_SUFFIX} } from "./${Case.kebab(property.name)}.request.model";`);
                        fieldData.typeSuffix = REQUEST_MODEL_CLASS_SUFFIX;
                    } else if (verbBodyType === VerbBodyType.response) {
                        classImports.add(`import { ${Case.pascal(property.name)}${RESPONSE_MODEL_CLASS_SUFFIX} } from "./${Case.kebab(property.name)}.response.model";`);
                        fieldData.typeSuffix = RESPONSE_MODEL_FILE_SUFFIX;
                    } else if (verbBodyType === VerbBodyType.model) {
                        classImports.add(`import { ${Case.pascal(property.name)}${ENTITY_MODEL_CLASS_SUFFIX} } from "./${Case.kebab(property.name)}.entity.model";`);
                        fieldData.typeSuffix = ENTITY_MODEL_CLASS_SUFFIX;
                    }
                }

                const field = ModelsUtils.createField(fieldData);

                classContent.push({ contentIdentifier: `${propertyName}:`, content: field });
            });

            CommonUtils.createOrUpdateClassFile({
                folder: directory,
                file: modelFile,
                content: classContent,
                decoratorImports: decoratorImports,
                decorators: [`@${EXCLUDE}()`],
                imports: classImports,
                className,
                type: "",
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
        const entityModel = Case.pascal(verbBody.name).replace(new RegExp(WORDS_TO_EXCLUDE, "gi"), "");

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

        classImports.add(`import { ${entityModel}${ENTITY_MODEL_CLASS_SUFFIX} } from "${entityModelPath}.entity.model";`);

        CommonUtils.createOrUpdateClassFile({
            folder: directory,
            file: adapterModelFile,
            content: classContent,
            decoratorImports: decoratorImports,
            decorators: [`@${EXCLUDE}()`],
            imports: classImports,
            className: `${className} extends ${entityModel}${ENTITY_MODEL_CLASS_SUFFIX}`,
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
