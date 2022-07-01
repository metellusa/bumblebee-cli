import fs from "fs";
import beautify, { JSBeautifyOptions } from "js-beautify";
import { Property } from "../models/domain/property";
import { Class } from "../models/domain/class";
import Case from "case";
import { Method } from "../models/domain/method";
import { ClassFile } from "../models/domain/class-file";
import { CLASS_TEMPLATE, DECORATED_CLASS_TEMPLATE, DECORATED_METHOD_TEMPLATE, METHOD_TEMPLATE, PLAIN_FILE_TEMPLATE } from "../constants/templates.const";
import { PlainFile } from "../models/domain/plain file";
import { VerbSignatures } from "../enums/verb-signatures.enum";

/**
 * @description Utilities used across the service
 */
export default class CommonUtils {
    /**
     * @description Checks whether a field name is a valid REST verb
     * @param fieldName the field name to check
     * @returns returns a boolean value
     */
    public static isValidVerb(fieldName: string): boolean {
        return Object.values(VerbSignatures).includes(fieldName.toUpperCase() as VerbSignatures);
    }

    /**
     * @description Returns a field's value that is nested within a given object 
     * @param object the target object
     * @param path the path of the target field within the target object
     * @returns returns the field's value or undefined if it doesn't exist
     */
    public static getField = (object: any, path: string) => {
        if (object == null) {
            return object;
        }
        const parts = path.split('.');
        for (let i = 0; i < parts.length; ++i) {
            if (object == null) {
                return undefined;
            }
            const key: string = parts[i];
            object = object[key];
        }
        return object;
    };

    /**
     * @description Returns a field's value that is nested within a given object 
     * @param object the object to search through
     * @param targetProperty the target property within the object
     * @returns returns the field's value or undefined if it doesn't exist
     */
    public static searchField = (object: any, targetProperty: string): any => {
        let result = undefined;
        if (object instanceof Array) {
            for (var i = 0; i < object.length; i++) {
                result = this.searchField(object[i], targetProperty);
                if (result) {
                    break;
                }
            }
        }
        else {
            for (var prop in object) {
                if (prop === targetProperty) {
                    return object[prop];
                }
                if (object[prop] instanceof Object || object[prop] instanceof Array) {
                    result = this.searchField(object[prop], targetProperty);
                    if (result) {
                        break;
                    }
                }
            }
        }
        return result;
    }

    /**
     * @description Creates a directory in a given path if it does not yet exist
     * @param targetPath the target path
     * @returns {void} nothing returned
     */
    public static createDirIfNotExist = (targetPath: string) => {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
    }

    /**
     * @description determined whether a property is an object field
     * @param property the property
     * @returns {boolean} returns a boolean value
     */
    public static isObjectField = (property: Property) => {
        return property.type.replace('[]', '') === Case.pascal(property.name);
    }

    /**
     * @description creates a class as a string based on the class template
     * @param newClass the new class attributes
     * @returns {string} returns the newly created class as a string
     */
    public static createClass = (newClass: Class): string => {
        const empty = "";
        const classDecorators = newClass.decorators ? newClass.decorators.join("\n") : empty;
        let createdClass = fs.readFileSync(newClass.decorators ? DECORATED_CLASS_TEMPLATE : CLASS_TEMPLATE, { encoding: "utf-8" });

        createdClass = createdClass.replace(/<className>/g, newClass.name)
            .replace(/<classDescription>/g, newClass.description)
            .replace(/<classContent>/g, newClass.content || empty)
            .replace(/<classImports>/g, newClass.imports || empty)
            .replace(/<classDecorators>/g, classDecorators)
            .replace(/<classType>/g, newClass.type);

        return createdClass;
    }

    /**
     * @description creates a plain file as a string based on the plain file template
     * @param imports the file imports
     * @param content the file content
     * @returns {string} returns the newly created file as a string
     */
    public static createPlainFile = (imports: string, content: string): string => {

        let createdPlainFile = fs.readFileSync(PLAIN_FILE_TEMPLATE, { encoding: "utf-8" });

        createdPlainFile = createdPlainFile.replace(/<imports>/g, imports)
            .replace(/<content>/g, content);

        return createdPlainFile;
    }

    /**
     * @description append a method at the end of an existing class
     * @param originalClass the original class
     * @param toAdd the method to append at the end of class
     * @param targetedIndex add a method at a postion other than the end of the class
     * @returns {string} returns the updated class
     */
    public static updateClass = (originalClass: string, toAdd: string, targetedIndex?: number): string => {

        return originalClass.substring(0, targetedIndex || (originalClass.lastIndexOf("}")))
            + toAdd
            + originalClass.substring(targetedIndex || (originalClass.lastIndexOf("}")), originalClass.length);
    }

    /**
     * @description append some content at the end of a file
     * @param originalFile the original file
     * @param toAdd the content to append at the end of the file
     * @param targetedIndex add content at a position other than the end of the file
     * @returns {string} returns the updated file
     */
    public static updatePlainFile = (originalFile: string, toAdd: string, targetedIndex?: number): string => {

        return originalFile.substring(0, targetedIndex || originalFile.length) + toAdd;
    }

    /**
     * @description creates a method as a string based on the method template
     * @param method the new method attributes
     * @returns {string} returns the newly created method as a string
     */
    public static createMethod = (method: Method, additionalReplaces?: string[]): string => {
        const empty = "";
        const methodParamsDescription = method.paramsDescriptions || empty;
        const methodDecorators = method.decorators ? method.decorators.join("\n") : empty;
        const methodParams = method.params ? method.params : empty;
        let createdMethod = fs.readFileSync(method.decorators ? DECORATED_METHOD_TEMPLATE : METHOD_TEMPLATE, { encoding: "utf-8" });

        createdMethod = createdMethod.replace(/<methodName>/g, method.name)
            .replace(/<methodDescription>/g, method.description)
            .replace(/<methodParamsDescription>/g, methodParamsDescription)
            .replace(/<methodReturnType>/g, method.returnType || "void")
            .replace(/<methodReturnDescr>/g, `returns ${method.returnType ? `a ${method.returnType} object` : "nothing"}`)
            .replace(/<methodDecorators>/g, methodDecorators)
            .replace(/<methodParams>/g, methodParams)
            .replace(/<methodOperationId>/g, method.operationId)
            .replace(/<methodRequestBody>/g, method.requestBody || "{}");

        if (additionalReplaces) {
            additionalReplaces.forEach(target => {
                let re = new RegExp(`${target}`);
                createdMethod = createdMethod.replace(re, "");
            })
        }

        return createdMethod;
    }

    /**
     * @description creates or updates an existing class file 
     * @param classFile the class file attributes
     * @returns {void} nothing returned
     */
    public static async createOrUpdateClassFile(classFile: ClassFile) {
        CommonUtils.createDirIfNotExist(classFile.folder);
        const beautifyOptions: JSBeautifyOptions = { brace_style: "preserve-inline" };
        const filePath = `${classFile.folder}/${classFile.file}`;

        classFile.content.forEach(fileContent => {
            if (fs.existsSync(filePath)) {
                const existingClassContent = fs.readFileSync(filePath, { encoding: "utf-8" });
                let classImports = Array.from(classFile.imports);
                if (!existingClassContent.includes(beautify.js(fileContent.contentIdentifier, beautifyOptions))) {
                    let updatedClass = CommonUtils.updateClass(existingClassContent, `\n${fileContent.content}`);
                    if (classFile.decoratorImports) {
                        // Ensure that each decorator is only imported once
                        classFile.decoratorImports.forEach((importSet, importLib) => {
                            if (updatedClass.includes(`"${importLib}"`)) {
                                importSet.forEach(importedDecorator => {
                                    if (!updatedClass.includes(` ${importedDecorator}`)) {
                                        updatedClass = CommonUtils.updateClass(updatedClass, `, ${importedDecorator}`, updatedClass.indexOf(`} from "${importLib}"`));
                                    }
                                })
                            } else {
                                classImports.push(`import{${Array.from(importSet).join(", ")}} from "${importLib}";`);
                            }
                        });
                    }
                    // Add the new imports to the class while ensuring that none of them is imported more than once
                    classImports.forEach((classImport, index) => {
                        if (!updatedClass.includes(beautify.js(classImport, beautifyOptions))) {
                            updatedClass = `${classImport}${index < classImports.length - 1 ? "\n" : ""}${updatedClass}`;
                        }
                    });
                    fs.writeFileSync(filePath, beautify.js(updatedClass, beautifyOptions) + "\n");
                }
            } else {
                if (classFile.decoratorImports) {
                    classFile.decoratorImports.forEach((importSet, importLib) => {
                        if (importSet) {
                            classFile.imports.add(`import { ${Array.from(importSet).join(", ")} } from "${importLib}";`);
                        }
                    });
                }

                const classContent = CommonUtils.createClass({
                    name: classFile.className,
                    description: classFile.classDescription,
                    type: classFile.type || "",
                    content: fileContent.content,
                    imports: Array.from(classFile.imports).join("\n"),
                    decorators: classFile.decorators
                });
                fs.writeFileSync(filePath, beautify.js(classContent, beautifyOptions) + "\n");
            }
        });
    }

    /**
     * @description creates or updates an existing plain file 
     * @param plainFile the plain file attributes
     * @returns {void} nothing returned
     */
    public static async createOrUpdatePlainFile(plainFile: PlainFile) {
        CommonUtils.createDirIfNotExist(plainFile.folder);
        const beautifyOptions: JSBeautifyOptions = { brace_style: "preserve-inline" };
        const filePath = `${plainFile.folder}/${plainFile.file}`;

        plainFile.content.forEach((fileContent) => {
            if (fs.existsSync(filePath)) {
                const existingContent = fs.readFileSync(filePath, { encoding: "utf-8" });
                let fileImports = Array.from(plainFile.imports);
                if (!existingContent.includes(beautify.js(fileContent.contentIdentifier, beautifyOptions))) {
                    let updatedClass = CommonUtils.updatePlainFile(existingContent, `${fileContent.content}`);
                    // Add the new imports to the file while ensuring that none of them is imported more than once
                    fileImports.forEach((fileImport, index) => {
                        if (!updatedClass.includes(beautify.js(fileImport, beautifyOptions))) {
                            updatedClass = `${fileImport}${index < fileImports.length - 1 ? "\n" : ""}${updatedClass}`;
                        }
                    });
                    fs.writeFileSync(filePath, beautify.js(updatedClass, beautifyOptions) + "\n");
                }
            } else {
                const imports = Array.from(plainFile.imports).join("\n");
                const content = CommonUtils.createPlainFile(imports, fileContent.content);
                fs.writeFileSync(filePath, beautify.js(content, beautifyOptions));
            }
        });
    }

    /**
     * @description formats the description parameters of a method
     * @param descriptionParams the array of description paramters to be formatted
     * @returns {string} returns the formatted description paramters as a string
     */
    public static formatMethodDescrParams(descriptionParams: string[]): string {
        for (let i = 0; i < descriptionParams.length; i++) {
            if (i === 0) {
                descriptionParams[i] = `@param ${descriptionParams[i]}`;
            } else {
                descriptionParams[i] = `* @param ${descriptionParams[i]}`;
            }
        }
        return descriptionParams.join("\n");
    }
}
