"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const case_1 = __importDefault(require("case"));
const decorators_const_1 = require("../constants/decorators.const");
const common_utils_1 = __importDefault(require("./common-utils"));
const templates_const_1 = require("../constants/templates.const");
const libraries_const_1 = require("../constants/libraries.const");
/**
 * @description Utilities used within the models.service service file
 */
class ModelsUtils {
    /**
    * @description returns a list of transform decorators applicable to a given property
    * @param property the property for which the decorator list must be determined
    * @returns {Decorator[]} returns the list of decorators
    */
    static determineTransformerDecorators(property, modelType) {
        let decorators = [];
        if (modelType === "response" || modelType === "entity" || modelType === "database") {
            if (property.isPrimary) {
                if (modelType === "database") {
                    decorators.push({
                        name: decorators_const_1.EXCLUDE,
                        declaration: `@${decorators_const_1.EXCLUDE}()`,
                        importLib: libraries_const_1.CLASS_TRANSFORMER_LIB
                    });
                }
                else {
                    decorators.push({
                        name: decorators_const_1.EXPOSE,
                        declaration: `@${decorators_const_1.EXPOSE}()`,
                        importLib: libraries_const_1.CLASS_TRANSFORMER_LIB
                    });
                }
                if (modelType === "entity") {
                    decorators.push({
                        name: decorators_const_1.TRANSFORM_STRING_STRIP_PREFIX,
                        declaration: `@${decorators_const_1.TRANSFORM_STRING_STRIP_PREFIX}("_id", idPrefix, "", [""])`,
                        importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                    });
                }
            }
            else {
                decorators.push({
                    name: decorators_const_1.EXPOSE,
                    declaration: `@${decorators_const_1.EXPOSE}()`,
                    importLib: libraries_const_1.CLASS_TRANSFORMER_LIB
                });
            }
            if (property.type === "string") {
                decorators.push({
                    name: decorators_const_1.TRANSFORM_STRING,
                    declaration: `@${decorators_const_1.TRANSFORM_STRING}("${property.name}", "", [""] )`,
                    importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                });
            }
            if (property.type === "number") {
                decorators.push({
                    name: decorators_const_1.TRANSFORM_NUMBER,
                    declaration: `@${decorators_const_1.TRANSFORM_NUMBER}("${property.name}", 0, [""] )`,
                    importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                });
            }
            if (property.type === "boolean") {
                decorators.push({
                    name: decorators_const_1.TRANSFORM_BOOLEAN,
                    declaration: `@${decorators_const_1.TRANSFORM_BOOLEAN}("${property.name}", undefined, [""] )`,
                    importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                });
            }
            if (common_utils_1.default.isEntityObject(property) && !property.type.includes("[]")) {
                decorators.push({
                    name: decorators_const_1.TRANSFORM_OBJECT,
                    declaration: `@${decorators_const_1.TRANSFORM_OBJECT}("${property.name}", ${case_1.default.pascal(property.name)}, undefined, [""] )`,
                    importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                });
            }
            if (property.type.includes("[]")) {
                if (common_utils_1.default.isEntityObject(property)) {
                    decorators.push({
                        name: decorators_const_1.TRANSFORM_OBJECT_ARRAY,
                        declaration: `@${decorators_const_1.TRANSFORM_OBJECT_ARRAY}("${property.name}", ${case_1.default.pascal(property.name)}, [], [""] )`,
                        importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                    });
                }
                else if (property.type.includes("string")) {
                    decorators.push({
                        name: decorators_const_1.TRANSFORM_STRING_ARRAY,
                        declaration: `@${decorators_const_1.TRANSFORM_STRING_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                    });
                }
                else if (property.type.includes("number")) {
                    decorators.push({
                        name: decorators_const_1.TRANSFORM_NUMBER_ARRAY,
                        declaration: `@${decorators_const_1.TRANSFORM_NUMBER_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                    });
                }
                else if (property.type.includes("boolean")) {
                    decorators.push({
                        name: decorators_const_1.TRANSFORM_BOOLEAN_ARRAY,
                        declaration: `@${decorators_const_1.TRANSFORM_BOOLEAN_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: libraries_const_1.UO_TRANSFORM_DECORATORS_LIB
                    });
                }
            }
        }
        if (common_utils_1.default.isEntityObject(property)) {
            decorators.push({
                name: decorators_const_1.TYPE,
                declaration: `@${decorators_const_1.TYPE}(() => ${property.type.replace("[]", "")})`,
                importLib: libraries_const_1.CLASS_TRANSFORMER_LIB,
            });
        }
        return decorators;
    }
    /**
     * @description returns a list of validation decorators applicable to a given property
     * @param property the property for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    static determineValidationDecorators(property) {
        const type = property.type;
        const typesThatCannotBeEmptyIfRequired = ["string", "number", "boolean"];
        const propertyName = case_1.default.snake(property.name);
        const formatTypeMessageConst = case_1.default.constant(propertyName + "_format_type");
        const formatDateTimeConst = case_1.default.constant(propertyName + "_format_date_time");
        const formatDateConst = case_1.default.constant(propertyName + "_format_date");
        const formatArrayMessageConst = case_1.default.constant(propertyName + "_format_array");
        const requiredFieldMessageConst = case_1.default.constant(propertyName + "_required");
        let decorators = [];
        if (property.isRequired) {
            decorators.push({
                name: decorators_const_1.IS_DEFINED,
                declaration: `@${decorators_const_1.IS_DEFINED}({message: ${requiredFieldMessageConst}})`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                validationMessageConst: requiredFieldMessageConst
            });
            if (typesThatCannotBeEmptyIfRequired.includes(type)) {
                decorators.push({
                    name: decorators_const_1.IS_NOT_EMPTY,
                    declaration: `@${decorators_const_1.IS_NOT_EMPTY}()`,
                    importLib: libraries_const_1.CLASS_VALIDATOR_LIB
                });
                decorators.push({
                    name: decorators_const_1.IS_NOT_BLANK,
                    declaration: `@${decorators_const_1.IS_NOT_BLANK}({always: true})`,
                    importLib: libraries_const_1.UO_VALIDATION_DECORATOR_LIB
                });
            }
        }
        else {
            decorators.push({
                name: decorators_const_1.IS_OPTIONAL,
                declaration: `@${decorators_const_1.IS_OPTIONAL}()`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB
            });
        }
        if (propertyName.includes("email")) {
            decorators.push({
                name: decorators_const_1.IS_EMAIL,
                declaration: `@${decorators_const_1.IS_EMAIL}({message: ${formatTypeMessageConst}})`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (propertyName.includes("phone")) {
            decorators.push({
                name: decorators_const_1.IS_PHONE_NUMBER,
                declaration: `@${decorators_const_1.IS_PHONE_NUMBER}({message: ${formatTypeMessageConst}})`,
                importLib: libraries_const_1.UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (propertyName.includes("date_time")) {
            decorators.push({
                name: decorators_const_1.IS_DATE_TIME,
                declaration: `@${decorators_const_1.IS_DATE_TIME}({message: ${formatDateTimeConst}})`,
                importLib: libraries_const_1.UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatDateTimeConst
            });
        }
        else if (propertyName.includes("date") && !propertyName.includes("date_time")) {
            decorators.push({
                name: decorators_const_1.IS_DATE,
                declaration: `@${decorators_const_1.IS_DATE}({message: ${formatDateConst}})`,
                importLib: libraries_const_1.UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatDateConst
            });
        }
        else if (type === "string") {
            decorators.push({
                name: decorators_const_1.IS_STRING,
                declaration: `@${decorators_const_1.IS_STRING}({message: ${formatTypeMessageConst}})`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (type === "number") {
            decorators.push({
                name: decorators_const_1.IS_NUMBER,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                declaration: `@${decorators_const_1.IS_NUMBER}({allowNaN: false})`
            });
        }
        else if (type === "boolean") {
            decorators.push({
                name: decorators_const_1.IS_BOOLEAN,
                declaration: `@${decorators_const_1.IS_BOOLEAN}({message: ${formatTypeMessageConst}})`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (type.includes("[]")) {
            decorators.push({
                name: decorators_const_1.IS_ARRAY,
                declaration: `@${decorators_const_1.IS_ARRAY}({message: ${formatArrayMessageConst}})`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB,
                validationMessageConst: formatArrayMessageConst
            });
        }
        if (common_utils_1.default.isEntityObject(property)) {
            decorators.push({
                name: decorators_const_1.IS_OBJECT,
                declaration: `@${decorators_const_1.IS_OBJECT}()`,
                importLib: libraries_const_1.CLASS_VALIDATOR_LIB
            });
        }
        return decorators;
    }
}
exports.default = ModelsUtils;
/**
 * @description creates a field as a string based on the field template
 * @param field the field attributes
 * @returns {string} returns the newly created field as a string
 */
ModelsUtils.createField = (field, additionalReplaces) => {
    const empty = "";
    const fieldDecorators = field.decorators ? field.decorators.join("\n") : empty;
    let createdField = fs_1.default.readFileSync(templates_const_1.FIELD_TEMPLATE, { encoding: "utf-8" });
    createdField = createdField.replace(/fieldName/g, field.name)
        .replace(/fieldType/g, field.type)
        .replace(/fieldDescription/g, field.description)
        .replace(/fieldDecorators/g, fieldDecorators);
    if (additionalReplaces) {
        additionalReplaces.forEach(target => {
            let re = new RegExp(`${target}`);
            createdField = createdField.replace(re, "");
        });
    }
    return createdField;
};
//# sourceMappingURL=models-utils.js.map