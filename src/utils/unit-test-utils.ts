import fs from "fs";
import beautify, { JSBeautifyOptions } from "js-beautify";
import { DESCRIBE_BLOCK_TEMPLATE, SPEC_FILE_TEMPLATE } from "../constants/templates.const";
import { DescribeBlock } from "../models/domain/describe-block";
import { Spec } from "../models/domain/spec";
import { SpecFile } from "../models/domain/spec-file";
import CommonUtils from "./common-utils";

/**
 * @description Utilities used within the unit-test.service file
 */
export default class UnitTestUtils {
    /**
     * @description creates a spec as a string based on the spec template
     * @param spec the spec attributes
     * @param additionalReplaces a list of additional targets to remove from the template
     * @returns {string} returns the newly created spec as a string
     */
    public static createSpec = (spec: Spec, additionalReplaces?: string[]): string => {
        const empty = "";
        let createdSpec = fs.readFileSync(SPEC_FILE_TEMPLATE, { encoding: "utf-8" });

        createdSpec = createdSpec.replace(/<specDescription>/g, spec.description)
            .replace(/<specContent>/g, spec.content || empty)
            .replace(/<specImports>/g, spec.imports || empty);

        if (additionalReplaces) {
            additionalReplaces.forEach(target => {
                let re = new RegExp(`${target}`);
                createdSpec = createdSpec.replace(re, "");
            })
        }

        return createdSpec;
    }

    /**
     * @description creates a describe block as a string based on the describe block template
     * @param describeBlock the describe block attributes
     * @param additionalReplaces a list of additional targets to remove from the template
     * @returns {string} returns the newly created describe block as a string
     */
    public static createDescribeBlock = (describeBlock: DescribeBlock, additionalReplaces?: string[]): string => {
        const empty = "";
        let createdDescribeBlock = fs.readFileSync(DESCRIBE_BLOCK_TEMPLATE, { encoding: "utf-8" });

        createdDescribeBlock = createdDescribeBlock.replace(/<description>/g, describeBlock.description)
            .replace(/<content>/g, describeBlock.content || empty);

        if (additionalReplaces) {
            additionalReplaces.forEach(target => {
                let re = new RegExp(`${target}`);
                createdDescribeBlock = createdDescribeBlock.replace(re, "");
            })
        }

        return createdDescribeBlock;
    }

    /**
     * @description creates or updates a spec file 
     * @param specFile the spec file attributes
     * @returns {void} nothing returned
     */
    public static async createOrUpdateSpecFile(specFile: SpecFile) {
        CommonUtils.createDirIfNotExist(specFile.folder);
        const filePath = `${specFile.folder}/${specFile.file}`;
        const beautifyOptions: JSBeautifyOptions = { brace_style: "preserve-inline" };

        if (fs.existsSync(filePath)) {
            const existingSpecContent = fs.readFileSync(filePath, { encoding: "utf-8" });
            if (!existingSpecContent.includes(specFile.innerDescribeBlockDescription)) {
                let updatedSpec = CommonUtils.updateClass(existingSpecContent, `\n${specFile.innerDescribeBlock}`);
                // Add the new imports to the spec file while ensuring that none of them is imported more than once
                specFile.specImports.forEach((specImport, index) => {
                    if (!updatedSpec.includes(specImport)) {
                        updatedSpec = `${specImport}${index < specFile.specImports.length - 1 ? "\n" : ""}${updatedSpec}`;
                    }
                });
                fs.writeFileSync(filePath, beautify.js(updatedSpec, beautifyOptions) + "\n");
            }
        } else {
            const spec = this.createSpec({
                description: specFile.specDescription,
                content: specFile.innerDescribeBlock,
                imports: specFile.specImports.join("\n")
            });
            fs.writeFileSync(filePath, beautify.js(spec, beautifyOptions) + "\n");
        }
    }

    public static determineCodeDescription = (code: string): string => {
        if (code === "200") {
            return "200 Success";
        }
        if (code === "201") {
            return "201 Success";
        }
        if (code === "204") {
            return "204 Success";
        }
        if (code === "400") {
            return "Bad Request";
        }
        if (code === "404") {
            return "Property not found";
        }
        if (code === "409") {
            return "Document conflict";
        }
        if (code === "422") {
            return "Unprocessable entity error";
        }
        if (code === "500") {
            return "Internal server error";
        }
        if (code === "503") {
            return "Service unavailable";
        }
        return code;
    }
}
