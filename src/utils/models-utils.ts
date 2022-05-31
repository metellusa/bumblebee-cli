import fs from "fs";
import Case from "case";
import { EXCLUDE, EXPOSE, IS_ARRAY, IS_BOOLEAN, IS_DATE, IS_DATE_TIME, IS_DEFINED, IS_EMAIL, IS_NOT_BLANK, IS_NOT_EMPTY, IS_NUMBER, IS_OBJECT, IS_OPTIONAL, IS_PHONE_NUMBER, IS_STRING, TRANSFORM_BOOLEAN, TRANSFORM_BOOLEAN_ARRAY, TRANSFORM_NUMBER, TRANSFORM_NUMBER_ARRAY, TRANSFORM_OBJECT, TRANSFORM_OBJECT_ARRAY, TRANSFORM_STRING, TRANSFORM_STRING_ARRAY, TRANSFORM_STRING_STRIP_PREFIX, TYPE } from "../constants/decorators.const";
import { Decorator } from "../models/domain/decorator";
import { Property } from "../models/domain/property";
import CommonUtils from "./common-utils";
import { Field } from "../models/domain/field";
import { FIELD_TEMPLATE } from "../constants/templates.const";
import { CLASS_TRANSFORMER_LIB, CLASS_VALIDATOR_LIB, UO_TRANSFORM_DECORATORS_LIB, UO_VALIDATION_DECORATOR_LIB } from "../constants/libraries.const";

/**
 * @description Utilities used within the models.service service file
 */
export default class ModelsUtils {
    /**
    * @description returns a list of transform decorators applicable to a given property
    * @param property the property for which the decorator list must be determined
    * @returns {Decorator[]} returns the list of decorators
    */
    public static determineTransformerDecorators(property: Property, modelType: "request" | "response" | "entity" | "database"): Decorator[] {
        let decorators: Decorator[] = [];

        if (modelType === "response" || modelType === "entity" || modelType === "database") {
            if (property.isPrimary) {
                if (modelType === "database") {
                    decorators.push({
                        name: EXCLUDE,
                        declaration: `@${EXCLUDE}()`,
                        importLib: CLASS_TRANSFORMER_LIB
                    })
                } else {
                    decorators.push({
                        name: EXPOSE,
                        declaration: `@${EXPOSE}()`,
                        importLib: CLASS_TRANSFORMER_LIB
                    })
                }
                if (modelType === "entity") {
                    decorators.push({
                        name: TRANSFORM_STRING_STRIP_PREFIX,
                        declaration: `@${TRANSFORM_STRING_STRIP_PREFIX}("_id", idPrefix, "", [""])`,
                        importLib: UO_TRANSFORM_DECORATORS_LIB
                    })
                }
            } else {
                decorators.push({
                    name: EXPOSE,
                    declaration: `@${EXPOSE}()`,
                    importLib: CLASS_TRANSFORMER_LIB
                })
            }

            if (property.type === "string") {
                decorators.push({
                    name: TRANSFORM_STRING,
                    declaration: `@${TRANSFORM_STRING}("${property.name}", "", [""] )`,
                    importLib: UO_TRANSFORM_DECORATORS_LIB
                })
            }
            if (property.type === "number") {
                decorators.push({
                    name: TRANSFORM_NUMBER,
                    declaration: `@${TRANSFORM_NUMBER}("${property.name}", 0, [""] )`,
                    importLib: UO_TRANSFORM_DECORATORS_LIB
                })
            }
            if (property.type === "boolean") {
                decorators.push({
                    name: TRANSFORM_BOOLEAN,
                    declaration: `@${TRANSFORM_BOOLEAN}("${property.name}", undefined, [""] )`,
                    importLib: UO_TRANSFORM_DECORATORS_LIB
                })
            }
            if (CommonUtils.isEntityObject(property) && !property.type.includes("[]")) {
                decorators.push({
                    name: TRANSFORM_OBJECT,
                    declaration: `@${TRANSFORM_OBJECT}("${property.name}", ${Case.pascal(property.name)}, undefined, [""] )`,
                    importLib: UO_TRANSFORM_DECORATORS_LIB
                })
            }
            if (property.type.includes("[]")) {
                if (CommonUtils.isEntityObject(property)) {
                    decorators.push({
                        name: TRANSFORM_OBJECT_ARRAY,
                        declaration: `@${TRANSFORM_OBJECT_ARRAY}("${property.name}", ${Case.pascal(property.name)}, [], [""] )`,
                        importLib: UO_TRANSFORM_DECORATORS_LIB
                    })
                } else if (property.type.includes("string")) {
                    decorators.push({
                        name: TRANSFORM_STRING_ARRAY,
                        declaration: `@${TRANSFORM_STRING_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: UO_TRANSFORM_DECORATORS_LIB
                    })
                } else if (property.type.includes("number")) {
                    decorators.push({
                        name: TRANSFORM_NUMBER_ARRAY,
                        declaration: `@${TRANSFORM_NUMBER_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: UO_TRANSFORM_DECORATORS_LIB
                    })
                } else if (property.type.includes("boolean")) {
                    decorators.push({
                        name: TRANSFORM_BOOLEAN_ARRAY,
                        declaration: `@${TRANSFORM_BOOLEAN_ARRAY}("${property.name}", undefined, [""] )`,
                        importLib: UO_TRANSFORM_DECORATORS_LIB
                    })
                }
            }
        }

        if (CommonUtils.isEntityObject(property)) {
            decorators.push({
                name: TYPE,
                declaration: `@${TYPE}(() => ${property.type.replace("[]", "")})`,
                importLib: CLASS_TRANSFORMER_LIB,
            });
        }

        return decorators;
    }

    /**
     * @description returns a list of validation decorators applicable to a given property
     * @param property the property for which the decorator list must be determined
     * @returns {Decorator[]} returns the list of decorators
     */
    public static determineValidationDecorators(property: Property): Decorator[] {
        const type = property.type;
        const typesThatCannotBeEmptyIfRequired = ["string", "number", "boolean"];
        const propertyName = Case.snake(property.name);
        const formatTypeMessageConst = Case.constant(propertyName + "_format_type");
        const formatDateTimeConst = Case.constant(propertyName + "_format_date_time");
        const formatDateConst = Case.constant(propertyName + "_format_date");
        const formatArrayMessageConst = Case.constant(propertyName + "_format_array");
        const requiredFieldMessageConst = Case.constant(propertyName + "_required");
        let decorators: Decorator[] = [];

        if (property.isRequired) {
            decorators.push({
                name: IS_DEFINED,
                declaration: `@${IS_DEFINED}({message: ${requiredFieldMessageConst}})`,
                importLib: CLASS_VALIDATOR_LIB,
                validationMessageConst: requiredFieldMessageConst
            });

            if (typesThatCannotBeEmptyIfRequired.includes(type)) {
                decorators.push({
                    name: IS_NOT_EMPTY,
                    declaration: `@${IS_NOT_EMPTY}()`,
                    importLib: CLASS_VALIDATOR_LIB
                });
                decorators.push({
                    name: IS_NOT_BLANK,
                    declaration: `@${IS_NOT_BLANK}({always: true})`,
                    importLib: UO_VALIDATION_DECORATOR_LIB
                });
            }
        } else {
            decorators.push({
                name: IS_OPTIONAL,
                declaration: `@${IS_OPTIONAL}()`,
                importLib: CLASS_VALIDATOR_LIB
            });
        }

        if (propertyName.includes("email")) {
            decorators.push({
                name: IS_EMAIL,
                declaration: `@${IS_EMAIL}({message: ${formatTypeMessageConst}})`,
                importLib: CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (propertyName.includes("phone")) {
            decorators.push({
                name: IS_PHONE_NUMBER,
                declaration: `@${IS_PHONE_NUMBER}({message: ${formatTypeMessageConst}})`,
                importLib: UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (propertyName.includes("date_time")) {
            decorators.push({
                name: IS_DATE_TIME,
                declaration: `@${IS_DATE_TIME}({message: ${formatDateTimeConst}})`,
                importLib: UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatDateTimeConst
            });
        }
        else if (propertyName.includes("date") && !propertyName.includes("date_time")) {
            decorators.push({
                name: IS_DATE,
                declaration: `@${IS_DATE}({message: ${formatDateConst}})`,
                importLib: UO_VALIDATION_DECORATOR_LIB,
                validationMessageConst: formatDateConst
            });
        }
        else if (type === "string") {
            decorators.push({
                name: IS_STRING,
                declaration: `@${IS_STRING}({message: ${formatTypeMessageConst}})`,
                importLib: CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (type === "number") {
            decorators.push({
                name: IS_NUMBER,
                importLib: CLASS_VALIDATOR_LIB,
                declaration: `@${IS_NUMBER}({allowNaN: false})`
            });
        }
        else if (type === "boolean") {
            decorators.push({
                name: IS_BOOLEAN,
                declaration: `@${IS_BOOLEAN}({message: ${formatTypeMessageConst}})`,
                importLib: CLASS_VALIDATOR_LIB,
                validationMessageConst: formatTypeMessageConst
            });
        }
        else if (type.includes("[]")) {
            decorators.push({
                name: IS_ARRAY,
                declaration: `@${IS_ARRAY}({message: ${formatArrayMessageConst}})`,
                importLib: CLASS_VALIDATOR_LIB,
                validationMessageConst: formatArrayMessageConst
            });
        }

        if (CommonUtils.isEntityObject(property)) {
            decorators.push({
                name: IS_OBJECT,
                declaration: `@${IS_OBJECT}()`,
                importLib: CLASS_VALIDATOR_LIB
            });
        }

        return decorators;
    }

    /**
     * @description creates a field as a string based on the field template
     * @param field the field attributes
     * @returns {string} returns the newly created field as a string
     */
    public static createField = (field: Field, additionalReplaces?: string[]): string => {
        const empty = "";
        const fieldDecorators = field.decorators ? field.decorators.join("\n") : empty;
        let createdField = fs.readFileSync(FIELD_TEMPLATE, { encoding: "utf-8" });

        createdField = createdField.replace(/fieldName/g, field.name)
            .replace(/fieldType/g, field.type)
            .replace(/fieldDescription/g, field.description)
            .replace(/fieldDecorators/g, fieldDecorators)

        if (additionalReplaces) {
            additionalReplaces.forEach(target => {
                let re = new RegExp(`${target}`);
                createdField = createdField.replace(re, "");
            })
        }

        return createdField;
    }
}
