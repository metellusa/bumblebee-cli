import fs from "fs";
import { INDEX_TS_FILE_TEMPLATE } from "../constants/templates.const";

export default class ConfigurationUtils {
    /**
     * @description creates a repo's index file based on the index-ts template
     * @param repoName the repository name
     * @param nameOfPrefix the name of prefix
     * @returns {string} returns the newly created index as a string
     */
    public static createIndex = (repoName: string, nameOfPrefix: string): string => {
        let createdIndex = fs.readFileSync(INDEX_TS_FILE_TEMPLATE, { encoding: "utf-8" });

        createdIndex = createdIndex.replace(/repoName/g, repoName)
            .replace(/nameOfPrefix/g, nameOfPrefix);

        return createdIndex;
    }
}
