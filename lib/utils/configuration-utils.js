"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const templates_const_1 = require("../constants/templates.const");
class ConfigurationUtils {
}
exports.default = ConfigurationUtils;
/**
 * @description creates a repo's index file based on the index-ts template
 * @param repoName the repository name
 * @param nameOfPrefix the name of prefix
 * @returns {string} returns the newly created index as a string
 */
ConfigurationUtils.createIndex = (repoName, nameOfPrefix) => {
    let createdIndex = fs_1.default.readFileSync(templates_const_1.INDEX_TS_FILE_TEMPLATE, { encoding: "utf-8" });
    createdIndex = createdIndex.replace(/repoName/g, repoName)
        .replace(/nameOfPrefix/g, nameOfPrefix);
    return createdIndex;
};
//# sourceMappingURL=configuration-utils.js.map