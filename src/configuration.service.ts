import fs from "fs";
import { PROJECT_FILES, ENVIRONMENTS, K8S_DIR, SWAGGER_DIR } from "./constants/project.const";
import CommonUtils from "./utils/common-utils";
import ConfigurationUtils from "./utils/configuration-utils";

export default class ConfigurationService {

    /**
     * @description Generates all project files
     * @param swaggerPath the swagger path (used to copy original yaml to definitions folder)
     * @param directory the repository folder
     * @param serviceName the microservice name
     * @param serviceDescription the microservice description
     * @returns {void} nothing returned
     */
    public static async generateProjectFiles(swaggerPath: string, directory: string, serviceName: string, serviceDescription: string): Promise<string[]> {
        let generatedFiles: string[] = [];
        // Create each config file if it does not exist
        PROJECT_FILES.forEach(file => {
            const filePath = file.targetDirectory ? `${file.targetDirectory}/${file.name}` : file.name;

            if (!fs.existsSync(`${directory}/${filePath}`)) {
                if (file.targetDirectory) {
                    CommonUtils.createDirIfNotExist(`${directory}/${file.targetDirectory}`);
                }
                fs.writeFileSync(`${directory}/${filePath}`, ConfigurationUtils.createConfigFile(serviceName, serviceDescription, file.template));
                generatedFiles.push(filePath);
            }
        })

        // Create K8 folder if it does not exist
        CommonUtils.createDirIfNotExist(`${directory}/${K8S_DIR}`);
        // Verify that each enviroment has a yml file
        ENVIRONMENTS.forEach(env => {
            const ymlFilePath = `${env}.yml`;
            if (!fs.existsSync(`${directory}/${K8S_DIR}/${ymlFilePath}`)) {
                fs.writeFileSync(`${directory}/${K8S_DIR}/${ymlFilePath}`, ConfigurationUtils.createK8Yaml(serviceName, env));
                generatedFiles.push(ymlFilePath);
            }
        });

        // Create definitions folder if it does not exist
        CommonUtils.createDirIfNotExist(`${directory}/${SWAGGER_DIR}`);
        if (!fs.existsSync(`${directory}/${SWAGGER_DIR}/${serviceName}.yaml`)) {
            fs.copyFileSync(`${swaggerPath}`, `${directory}/${SWAGGER_DIR}/${serviceName}.yaml`);
            generatedFiles.push(`${SWAGGER_DIR}/${serviceName}.yaml`);
        }

        return generatedFiles;
    }
}
