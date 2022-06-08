"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const case_1 = __importDefault(require("case"));
const project_const_1 = require("./constants/project.const");
const pluralize_1 = __importDefault(require("pluralize"));
const unit_test_utils_1 = __importDefault(require("./utils/unit-test-utils"));
const libraries_const_1 = require("./constants/libraries.const");
const imports_const_1 = require("./constants/imports.const");
class UnitTestService {
    /**
     * @description Generates unit test files for a given swagger
     * @param swagger the swagger for which the test files must be generated
     * @returns {void} nothing returned
     */
    static async generateUnitTestFiles(swagger) {
        if (fs_1.default.existsSync(swagger.targetLocation)) {
            swagger.paths.forEach((path) => {
                path.verbs.forEach((verb) => {
                    const testFilesDirectory = `${swagger.targetLocation}/${project_const_1.APIS_DIR}/${case_1.default.kebab(verb.tag)}/${project_const_1.API_TESTS_PATH_SUFFIX}/`;
                    // Generate the service unit test files
                    this.generateServiceTests(verb, testFilesDirectory);
                    // Generate the controller unit test files
                    this.generateControllerTests(verb, testFilesDirectory);
                    if (verb.isPersistedModel) {
                        this.generateAdapterTests(verb, `${swagger.targetLocation}/${project_const_1.ADAPTER_TESTS_DIR}`);
                    }
                });
            });
        }
        else {
            throw new Error(`Target location: ${swagger.targetLocation} does not exist`);
        }
    }
    /**
     * @description Generates service spec files in a given directory
     * @param verb the verb for which the service spec files must be generated
     * @param directory the directory where the spec files must be generated
     * @returns {void} nothing returned
     */
    static async generateServiceTests(verb, directory) {
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        let serviceSpecFile;
        let specImports = [];
        let methodName;
        let content = "";
        const specDescription = `"${case_1.default.title(`${verb.signature}_${verb.model}_service`)}"`;
        if (verb.isPersistedModel) {
            serviceSpecFile = `${verb.signature}-${verb.model}.${project_const_1.SERVICE_TEST_FILE_SUFFIX}`;
            methodName = `${case_1.default.camel(`${verb.signature}-${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize_1.default.plural(methodName);
            }
        }
        else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/") + 1, verb.url.length);
            serviceSpecFile = `${verb.signature}-${businessFunction}.${project_const_1.SERVICE_TEST_FILE_SUFFIX}`;
            methodName = `${case_1.default.camel(`${verb.signature}-${businessFunction}`)}`;
        }
        specImports.push(`import ${imports_const_1.EXPECT} from "${libraries_const_1.CHAI}";`);
        specImports.push(`import ${libraries_const_1.SINON} from "${libraries_const_1.SINON}";`);
        verb.responseCodes.forEach(code => {
            content += unit_test_utils_1.default.createDescribeBlock({
                description: `"${unit_test_utils_1.default.determineCodeDescription(code)}"`
            });
        });
        const innerDescribeBlock = unit_test_utils_1.default.createDescribeBlock({
            description: `"${methodName}"`,
            content
        });
        unit_test_utils_1.default.createOrUpdateSpecFile({
            folder: directory,
            file: serviceSpecFile,
            specDescription,
            specImports,
            innerDescribeBlock: innerDescribeBlock,
            innerDescribeBlockDescription: `"${case_1.default.constant(verb.signature)} ${case_1.default.pascal(verb.model)}"`
        });
    }
    /**
     * @description Generates controller spec files in a given directory
     * @param verb the verb for which the controller spec files must be generated
     * @param directory the directory where the spec files must be generated
     * @returns {void} nothing returned
     */
    static async generateControllerTests(verb, directory) {
        const controllerTestFile = `${case_1.default.kebab(verb.tag)}.${project_const_1.CONTROLLER_TEST_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        let specImports = [];
        let methodName;
        let content = "";
        const specDescription = `"${case_1.default.title(`${verb.signature}_${verb.model}_controller`)}"`;
        if (verb.isPersistedModel) {
            methodName = `${case_1.default.camel(`${verb.signature}-${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize_1.default.plural(methodName);
            }
        }
        else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/") + 1, verb.url.length);
            methodName = `${case_1.default.camel(`${verb.signature}-${businessFunction}`)}`;
        }
        specImports.push(`import ${imports_const_1.EXPECT} from "${libraries_const_1.CHAI}";`);
        specImports.push(`import ${libraries_const_1.SINON} from "${libraries_const_1.SINON}";`);
        verb.responseCodes.forEach(code => {
            content += unit_test_utils_1.default.createDescribeBlock({
                description: `"${unit_test_utils_1.default.determineCodeDescription(code)}"`
            });
        });
        const innerDescribeBlock = unit_test_utils_1.default.createDescribeBlock({
            description: `"${methodName}"`,
            content
        });
        unit_test_utils_1.default.createOrUpdateSpecFile({
            folder: directory,
            file: controllerTestFile,
            specDescription,
            specImports,
            innerDescribeBlock: innerDescribeBlock,
            innerDescribeBlockDescription: `"${case_1.default.constant(verb.signature)} ${case_1.default.pascal(verb.model)}"`
        });
    }
    /**
     * @description Generates adapter spec files in a given directory
     * @param verb the verb for which the adapter spec files must be generated
     * @param directory the directory where the spec files must be generated
     * @returns {void} nothing returned
     */
    static async generateAdapterTests(verb, directory) {
        const adapterTestFile = `${case_1.default.kebab(verb.model)}.${project_const_1.ADAPTER_TEST_FILE_SUFFIX}`;
        const isGetById = verb.signature === "get" && verb.url.charAt(verb.url.length - 1) === "}";
        let specImports = [];
        let methodName;
        let content = "";
        const specDescription = `"${case_1.default.title(`${verb.signature}_${verb.model}_adapter`)}"`;
        if (verb.isPersistedModel) {
            methodName = `${case_1.default.camel(`${verb.signature}-${verb.model}`)}${isGetById ? "ById" : ""}`;
            if (verb.signature === "get" && !isGetById) {
                methodName = pluralize_1.default.plural(methodName);
            }
        }
        else {
            const businessFunction = verb.url.substring(verb.url.lastIndexOf("/") + 1, verb.url.length);
            methodName = `${case_1.default.camel(`${verb.signature}-${businessFunction}`)}`;
        }
        specImports.push(`import ${imports_const_1.EXPECT} from "${libraries_const_1.CHAI}";`);
        specImports.push(`import ${libraries_const_1.SINON} from "${libraries_const_1.SINON}";`);
        verb.responseCodes.forEach(code => {
            content += unit_test_utils_1.default.createDescribeBlock({
                description: `"${unit_test_utils_1.default.determineCodeDescription(code)}"`
            });
        });
        const innerDescribeBlock = unit_test_utils_1.default.createDescribeBlock({
            description: `"${methodName}"`,
            content
        });
        unit_test_utils_1.default.createOrUpdateSpecFile({
            folder: directory,
            file: adapterTestFile,
            specDescription,
            specImports,
            innerDescribeBlock: innerDescribeBlock,
            innerDescribeBlockDescription: `"${case_1.default.constant(verb.signature)} ${case_1.default.pascal(verb.model)}"`
        });
    }
}
exports.default = UnitTestService;
//# sourceMappingURL=unit-test.service.js.map