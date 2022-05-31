"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_beautify_1 = __importDefault(require("js-beautify"));
const templates_const_1 = require("../constants/templates.const");
const common_utils_1 = __importDefault(require("./common-utils"));
/**
 * @description Utilities used within the unit-test.service file
 */
class UnitTestUtils {
    /**
     * @description creates or updates a spec file
     * @param specFile the spec file attributes
     * @returns {void} nothing returned
     */
    static async createOrUpdateSpecFile(specFile) {
        common_utils_1.default.createDirIfNotExist(specFile.folder);
        const filePath = `${specFile.folder}/${specFile.file}`;
        const beautifyOptions = { brace_style: "preserve-inline" };
        if (fs_1.default.existsSync(filePath)) {
            const existingSpecContent = fs_1.default.readFileSync(filePath, { encoding: "utf-8" });
            if (!existingSpecContent.includes(specFile.innerDescribeBlockDescription)) {
                let updatedSpec = common_utils_1.default.updateClass(existingSpecContent, `\n${specFile.innerDescribeBlock}`);
                // Add the new imports to the spec file while ensuring that none of them is imported more than once
                specFile.specImports.forEach((specImport, index) => {
                    if (!updatedSpec.includes(specImport)) {
                        updatedSpec = `${specImport}${index < specFile.specImports.length - 1 ? "\n" : ""}${updatedSpec}`;
                    }
                });
                fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(updatedSpec, beautifyOptions) + "\n");
            }
        }
        else {
            const spec = this.createSpec({
                description: specFile.specDescription,
                content: specFile.innerDescribeBlock,
                imports: specFile.specImports.join("\n")
            });
            fs_1.default.writeFileSync(filePath, js_beautify_1.default.js(spec, beautifyOptions) + "\n");
        }
    }
}
exports.default = UnitTestUtils;
/**
 * @description creates a spec as a string based on the spec template
 * @param spec the spec attributes
 * @param additionalReplaces a list of additional targets to remove from the template
 * @returns {string} returns the newly created spec as a string
 */
UnitTestUtils.createSpec = (spec, additionalReplaces) => {
    const empty = "";
    let createdSpec = fs_1.default.readFileSync(templates_const_1.SPEC_FILE_TEMPLATE, { encoding: "utf-8" });
    createdSpec = createdSpec.replace(/specDescription/g, spec.description)
        .replace(/specContent/g, spec.content || empty)
        .replace(/specImports/g, spec.imports || empty);
    if (additionalReplaces) {
        additionalReplaces.forEach(target => {
            let re = new RegExp(`${target}`);
            createdSpec = createdSpec.replace(re, "");
        });
    }
    return createdSpec;
};
/**
 * @description creates a describe block as a string based on the describe block template
 * @param describeBlock the describe block attributes
 * @param additionalReplaces a list of additional targets to remove from the template
 * @returns {string} returns the newly created describe block as a string
 */
UnitTestUtils.createDescribeBlock = (describeBlock, additionalReplaces) => {
    const empty = "";
    let createdDescribeBlock = fs_1.default.readFileSync(templates_const_1.DESCRIBE_BLOCK_TEMPLATE, { encoding: "utf-8" });
    createdDescribeBlock = createdDescribeBlock.replace(/description/g, describeBlock.description)
        .replace(/content/g, describeBlock.content || empty);
    if (additionalReplaces) {
        additionalReplaces.forEach(target => {
            let re = new RegExp(`${target}`);
            createdDescribeBlock = createdDescribeBlock.replace(re, "");
        });
    }
    return createdDescribeBlock;
};
UnitTestUtils.determineCodeDescription = (code) => {
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
};
//# sourceMappingURL=unit-test-utils.js.map