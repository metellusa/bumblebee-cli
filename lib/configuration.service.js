"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const project_const_1 = require("./constants/project.const");
const templates_const_1 = require("./constants/templates.const");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
const configuration_utils_1 = __importDefault(require("./utils/configuration-utils"));
class ConfigurationService {
    /**
     * @description Generates configuration files for a repository
     * @param directory the repository folder
     * @param repoName the repository name
     * @returns {void} nothing returned
     */
    static async generateConfigFiles(directory, repoName) {
        // If an app.ts file does not exist, create it.
        if (!fs_1.default.existsSync(`${directory}/${project_const_1.APP_FILE_PATH}`)) {
            common_utils_1.default.createDirIfNotExist(`${directory}/${project_const_1.SRC_DIR}`);
            fs_1.default.copyFileSync(templates_const_1.APP_TS_FILE_TEMPLATE, `${directory}/${project_const_1.APP_FILE_PATH}`);
        }
        // If an index.ts file does not exist, create it.
        if (!fs_1.default.existsSync(`${directory}/${project_const_1.INDEX_FILE_PATH}`)) {
            common_utils_1.default.createDirIfNotExist(`${directory}/${project_const_1.CONFIG_DIR}`);
            const index = configuration_utils_1.default.createIndex(repoName, "");
            fs_1.default.writeFileSync(`${directory}/${project_const_1.INDEX_FILE_PATH}`, index);
        }
    }
}
exports.default = ConfigurationService;
//# sourceMappingURL=configuration.service.js.map