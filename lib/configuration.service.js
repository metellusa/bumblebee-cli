"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const project_const_1 = require("./constants/project.const");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
const configuration_utils_1 = __importDefault(require("./utils/configuration-utils"));
class ConfigurationService {
    /**
     * @description Generates all project files
     * @param swaggerPath the swagger path (used to copy original yaml to definitions folder)
     * @param directory the repository folder
     * @param serviceName the microservice name
     * @param serviceDescription the microservice description
     * @returns {void} nothing returned
     */
    static async generateProjectFiles(swaggerPath, directory, serviceName, serviceDescription) {
        let generatedFiles = [];
        // Create each config file if it does not exist
        project_const_1.PROJECT_FILES.forEach(file => {
            const filePath = file.targetDirectory ? `${file.targetDirectory}/${file.name}` : file.name;
            if (!fs_1.default.existsSync(`${directory}/${filePath}`)) {
                if (file.targetDirectory) {
                    common_utils_1.default.createDirIfNotExist(`${directory}/${file.targetDirectory}`);
                }
                fs_1.default.writeFileSync(`${directory}/${filePath}`, configuration_utils_1.default.createConfigFile(serviceName, serviceDescription, file.template));
                generatedFiles.push(filePath);
            }
        });
        // Create K8 folder if it does not exist
        common_utils_1.default.createDirIfNotExist(`${directory}/${project_const_1.K8S_DIR}`);
        // Verify that each enviroment has a yml file
        project_const_1.ENVIRONMENTS.forEach(env => {
            const ymlFilePath = `${env}.yml`;
            if (!fs_1.default.existsSync(`${directory}/${project_const_1.K8S_DIR}/${ymlFilePath}`)) {
                fs_1.default.writeFileSync(`${directory}/${project_const_1.K8S_DIR}/${ymlFilePath}`, configuration_utils_1.default.createK8Yaml(serviceName, env));
                generatedFiles.push(ymlFilePath);
            }
        });
        // Create definitions folder if it does not exist
        common_utils_1.default.createDirIfNotExist(`${directory}/${project_const_1.SWAGGER_DIR}`);
        if (!fs_1.default.existsSync(`${directory}/${project_const_1.SWAGGER_DIR}/${serviceName}.yaml`)) {
            fs_1.default.copyFileSync(`${swaggerPath}`, `${directory}/${project_const_1.SWAGGER_DIR}/${serviceName}.yaml`);
            generatedFiles.push(`${project_const_1.SWAGGER_DIR}/${serviceName}.yaml`);
        }
        return generatedFiles;
    }
}
exports.default = ConfigurationService;
//# sourceMappingURL=configuration.service.js.map