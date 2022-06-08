import Case from "case";
import fs from "fs";
import { k8_YML_TEMPLATE } from "../constants/templates.const";

export default class ConfigurationUtils {

    /**
     * @description creates a repo's config file
     * @param serviceName the microservice name
     * @param template the config file's template location
     * @returns {string} returns the newly created config file as a string
     */
    public static createConfigFile = (serviceName: string, serviceDescription: string, template: string): string => {
        let createdConfigFile = fs.readFileSync(template, { encoding: "utf-8" });

        createdConfigFile = createdConfigFile.replace(/<serviceName>/g, serviceName)
        .replace(/<serviceDescription>/g, serviceDescription)
        .replace(/<camelCaseServiceName>/g, Case.camel(serviceName));

        return createdConfigFile;
    }

    /**
     * @description creates a k8 yml file for a microservice
     * @param serviceName the microservice name
     * @param environment the environment for which the k8 yml is to be created
     * @returns {string} returns the newly created yml as a string
     */
    public static createK8Yaml = (serviceName: string, environment: string): string => {
        let createdK8Yml = fs.readFileSync(`${k8_YML_TEMPLATE}`, { encoding: "utf-8" });

        createdK8Yml = createdK8Yml.replace(/<serviceName>/g, serviceName)
            .replace(/<environment>/g, environment);

        return createdK8Yml;
    }
}
