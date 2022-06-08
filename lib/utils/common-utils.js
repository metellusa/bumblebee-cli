"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_beautify_1 = __importDefault(require("js-beautify"));
const case_1 = __importDefault(require("case"));
const templates_const_1 = require("../constants/templates.const");
const verb_signatures_enum_1 = require("../enums/verb-signatures.enum");
/**
 * @description Utilities used across the service
 */
class CommonUtils {
    /**
     * @description Checks whether a field name is a valid REST verb
     * @param fieldName the field name to check
     * @returns returns a boolean value
     */
    static isValidVerb(fieldName) {
        return Object.values(verb_signatures_enum_1.VerbSignatures).includes(fieldName.toUpperCase());
    }
    /**
     * @description creates or updates an existing class file
     * @param classFile the class file attributes
     * @returns {void} nothing returned
     */
    static async createOrUpdateClassFile(classFile) {
        CommonUtils.createDirIfNotExist(classFile.folder);
        const beautifyOptions = { brace_style: "preserve-inline" };
        const filePath = `${classFile.folder}/${classFile.file}`;
        classFile.content.forEach(fileContent => {
            if (fs_1.default.existsSync(filePath)) {
                const existingClassContent = fs_1.default.readFileSync(filePath, { encoding: "utf-8" });
                let classImports = Array.from(classFile.imports);
                if (!existingClassContent.includes(js_beautify_1.default.js(fileContent.contentIdentifier, beautifyOptions))) {
                    let updatedClass = CommonUtils.updateClass(existingClassContent, `\n${fileContent.content}`);
                    if (classFile.decoratorImports) {
                        // Ensure that each decorator is only imported once
                        classFile.decoratorImports.forEach((importSet, importLib) => {
                            if (updatedClass.includes(`"${importLib}"`)) {
                                importSet.forEach(importedDecorator => {
                                    if (!updatedClass.includes(` ${importedDecorator}`)) {
                                        updatedClass = CommonUtils.updateClass(updatedClass, `, ${importedDecorator}`, updatedClass.indexOf(`} from "${importLib}"`));
                                    }
                                });
                            }
                            else {
                                classImports.push(`import{${Array.from(importSet).join(", ")}} from "${importLib}";`);
                            }
                        });
                    }
                    // Add the new imports to the class while ensuring that none of them is imported more than once
                    classImports.forEach((classImport, index) => {
                        if (!updatedClass.includes(js_beautify_1.default.js(classImport, beautifyOptions))) {
                            updatedClass = `${classImport}${index < classImports.length - 1 ? "\n" : ""}${updatedClass}`;
                        }
                    });
                    fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(updatedClass, beautifyOptions) + "\n");
                }
            }
            else {
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
                fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(classContent, beautifyOptions) + "\n");
            }
        });
    }
    /**
     * @description creates or updates an existing plain file
     * @param plainFile the plain file attributes
     * @returns {void} nothing returned
     */
    static async createOrUpdatePlainFile(plainFile) {
        CommonUtils.createDirIfNotExist(plainFile.folder);
        const beautifyOptions = { brace_style: "preserve-inline" };
        const filePath = `${plainFile.folder}/${plainFile.file}`;
        plainFile.content.forEach((fileContent) => {
            if (fs_1.default.existsSync(filePath)) {
                const existingContent = fs_1.default.readFileSync(filePath, { encoding: "utf-8" });
                let fileImports = Array.from(plainFile.imports);
                if (!existingContent.includes(js_beautify_1.default.js(fileContent.contentIdentifier, beautifyOptions))) {
                    let updatedClass = CommonUtils.updatePlainFile(existingContent, `${fileContent.content}`);
                    // Add the new imports to the file while ensuring that none of them is imported more than once
                    fileImports.forEach((fileImport, index) => {
                        if (!updatedClass.includes(js_beautify_1.default.js(fileImport, beautifyOptions))) {
                            updatedClass = `${fileImport}${index < fileImports.length - 1 ? "\n" : ""}${updatedClass}`;
                        }
                    });
                    fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(updatedClass, beautifyOptions) + "\n");
                }
            }
            else {
                const imports = Array.from(plainFile.imports).join("\n");
                const content = CommonUtils.createPlainFile(imports, fileContent.content);
                fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(content, beautifyOptions));
            }
        });
    }
    /**
     * @description formats the description parameters of a method
     * @param descriptionParams the array of description paramters to be formatted
     * @returns {string} returns the formatted description paramters as a string
     */
    static formatMethodDescrParams(descriptionParams) {
        for (let i = 0; i < descriptionParams.length; i++) {
            if (i === 0) {
                descriptionParams[i] = `@param ${descriptionParams[i]}`;
            }
            else {
                descriptionParams[i] = `* @param ${descriptionParams[i]}`;
            }
        }
        return descriptionParams.join("\n");
    }
}
exports.default = CommonUtils;
/**
 * @description Traverses a given object to look for a particular field
 * @param object the object to traverse
 * @param path the path of the field desired
 * @returns returns the field if it is found in target object. Else returns undefined
 */
CommonUtils.getField = (object, path) => {
    if (object == null) {
        return object;
    }
    const parts = path.split('.');
    for (let i = 0; i < parts.length; ++i) {
        if (object == null) {
            return undefined;
        }
        const key = parts[i];
        object = object[key];
    }
    return object;
};
/**
 * @description Creates a directory in a given path if it does not yet exist
 * @param targetPath the target path
 * @returns {void} nothing returned
 */
CommonUtils.createDirIfNotExist = (targetPath) => {
    if (!fs_1.default.existsSync(targetPath)) {
        fs_1.default.mkdirSync(targetPath, { recursive: true });
    }
};
/**
 * @description determined whether a property is an entity object or not
 * @param property the property
 * @returns {boolean} returns a boolean value
 */
CommonUtils.isEntityObject = (property) => {
    return property.type.replace('[]', '') === case_1.default.pascal(property.name);
};
/**
 * @description creates a class as a string based on the class template
 * @param newClass the new class attributes
 * @returns {string} returns the newly created class as a string
 */
CommonUtils.createClass = (newClass) => {
    const empty = "";
    const classDecorators = newClass.decorators ? newClass.decorators.join("\n") : empty;
    let createdClass = fs_1.default.readFileSync(newClass.decorators ? templates_const_1.DECORATED_CLASS_TEMPLATE : templates_const_1.CLASS_TEMPLATE, { encoding: "utf-8" });
    createdClass = createdClass.replace(/className/g, newClass.name)
        .replace(/classDescription/g, newClass.description)
        .replace(/classContent/g, newClass.content || empty)
        .replace(/classImports/g, newClass.imports || empty)
        .replace(/classDecorators/g, classDecorators)
        .replace(/classType/g, newClass.type);
    return createdClass;
};
/**
 * @description creates a plain file as a string based on the plain file template
 * @param imports the file imports
 * @param content the file content
 * @returns {string} returns the newly created file as a string
 */
CommonUtils.createPlainFile = (imports, content) => {
    let createdPlainFile = fs_1.default.readFileSync(templates_const_1.PLAIN_FILE_TEMPLATE, { encoding: "utf-8" });
    createdPlainFile = createdPlainFile.replace(/imports/g, imports)
        .replace(/content/g, content);
    return createdPlainFile;
};
/**
 * @description append a method at the end of an existing class
 * @param originalClass the original class
 * @param toAdd the method to append at the end of class
 * @param targetedIndex add a method at a postion other than the end of the class
 * @returns {string} returns the updated class
 */
CommonUtils.updateClass = (originalClass, toAdd, targetedIndex) => {
    return originalClass.substring(0, targetedIndex || (originalClass.lastIndexOf("}")))
        + toAdd
        + originalClass.substring(targetedIndex || (originalClass.lastIndexOf("}")), originalClass.length);
};
/**
 * @description append some content at the end of a file
 * @param originalFile the original file
 * @param toAdd the content to append at the end of the file
 * @param targetedIndex add content at a position other than the end of the file
 * @returns {string} returns the updated file
 */
CommonUtils.updatePlainFile = (originalFile, toAdd, targetedIndex) => {
    return originalFile.substring(0, targetedIndex || originalFile.length) + toAdd;
};
/**
 * @description creates a method as a string based on the method template
 * @param method the new method attributes
 * @returns {string} returns the newly created method as a string
 */
CommonUtils.createMethod = (method, additionalReplaces) => {
    const empty = "";
    const methodParamsDescription = method.paramsDescriptions || empty;
    const methodDecorators = method.decorators ? method.decorators.join("\n") : empty;
    const methodParams = method.params ? method.params : empty;
    let createdMethod = fs_1.default.readFileSync(method.decorators ? templates_const_1.DECORATED_METHOD_TEMPLATE : templates_const_1.METHOD_TEMPLATE, { encoding: "utf-8" });
    createdMethod = createdMethod.replace(/methodName/g, method.name)
        .replace(/methodDescription/g, method.description)
        .replace(/methodParamsDescription/g, methodParamsDescription)
        .replace(/methodReturnType/g, method.returnType || "void")
        .replace(/methodReturnDescr/g, `returns ${method.returnType ? `a ${method.returnType} object` : "nothing"}`)
        .replace(/methodDecorators/g, methodDecorators)
        .replace(/methodParams/g, methodParams)
        .replace(/methodOperationId/g, method.operationId);
    if (additionalReplaces) {
        additionalReplaces.forEach(target => {
            let re = new RegExp(`${target}`);
            createdMethod = createdMethod.replace(re, "");
        });
    }
    return createdMethod;
};
//# sourceMappingURL=common-utils.js.map