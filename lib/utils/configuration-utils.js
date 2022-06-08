"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_1 = __importDefault(require("case"));
const fs_1 = __importDefault(require("fs"));
const templates_const_1 = require("../constants/templates.const");
class ConfigurationUtils {
}
exports.default = ConfigurationUtils;
/**
 * @description creates a repo's config file
 * @param serviceName the microservice name
 * @param template the config file's template location
 * @returns {string} returns the newly created config file as a string
 */
ConfigurationUtils.createConfigFile = (serviceName, serviceDescription, template) => {
    let createdConfigFile = fs_1.default.readFileSync(template, { encoding: "utf-8" });
    createdConfigFile = createdConfigFile.replace(/<serviceName>/g, serviceName)
        .replace(/<serviceDescription>/g, serviceDescription)
        .replace(/<camelCaseServiceName>/g, case_1.default.camel(serviceName));
    return createdConfigFile;
};
/**
 * @description creates a k8 yml file for a microservice
 * @param serviceName the microservice name
 * @param environment the environment for which the k8 yml is to be created
 * @returns {string} returns the newly created yml as a string
 */
ConfigurationUtils.createK8Yaml = (serviceName, environment) => {
    let createdK8Yml = fs_1.default.readFileSync(`${templates_const_1.k8_YML_TEMPLATE}`, { encoding: "utf-8" });
    createdK8Yml = createdK8Yml.replace(/<serviceName>/g, serviceName)
        .replace(/<environment>/g, environment);
    return createdK8Yml;
};
//# sourceMappingURL=configuration-utils.js.map