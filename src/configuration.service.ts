import fs from "fs";
import { APP_FILE_PATH, CONFIG_DIR, INDEX_FILE_PATH, SRC_DIR } from "./constants/project.const";
import { APP_TS_FILE_TEMPLATE } from "./constants/templates.const";
import CommonUtils from "./utils/common-utils";
import ConfigurationUtils from "./utils/configuration-utils";

export default class ConfigurationService {

    /**
     * @description Generates configuration files for a repository
     * @param directory the repository folder
     * @param repoName the repository name
     * @returns {void} nothing returned
     */
    public static async generateConfigFiles(directory: string, repoName: string) {
        // If an app.ts file does not exist, create it.
        if (!fs.existsSync(`${directory}/${APP_FILE_PATH}`)) {
            CommonUtils.createDirIfNotExist(`${directory}/${SRC_DIR}`);
            fs.copyFileSync(APP_TS_FILE_TEMPLATE, `${directory}/${APP_FILE_PATH}`);
        }
        // If an index.ts file does not exist, create it.
        if (!fs.existsSync(`${directory}/${INDEX_FILE_PATH}`)) {
            CommonUtils.createDirIfNotExist(`${directory}/${CONFIG_DIR}`);
            const index = ConfigurationUtils.createIndex(repoName,"");
            fs.writeFileSync(`${directory}/${INDEX_FILE_PATH}`, index);
        }
    }
}
