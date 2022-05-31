import Case from "case";
import path from "path";
import { LOGGER_VAR_NAME } from "./constants/imports.const";
import { APP_FILE_PATH, CONNECTORS_DIR, CONNECTOR_FILE_SUFFIX } from "./constants/project.const";
import { UoConnectors } from "./enums/uo-connectors.enum";
import CommonUtils from "./utils/common-utils";

export default class ConnectorService {

    /**
     * @description Generates connector files for list of UO connectors
     * @param connectors the list of connectors
     * @returns {void} nothing returned
     */
    public static async generateConnectorFiles(targetLocation: string, connectors: string[]) {
        connectors.forEach(connector => {
            if (Object.values(UoConnectors).includes(connector as UoConnectors)) {
                this.generateConnector(targetLocation, connector);
            }
        })
    }

    private static generateConnector(directory: string, connector: string) {
        const connectorFolder = `${directory}/${CONNECTORS_DIR}/`;
        const connectorFile = `${Case.kebab(connector.replace("connector", ""))}.${CONNECTOR_FILE_SUFFIX}`;
        const className = `${Case.pascal(connector.replace("connector", "adapter"))}`;
        let method: string = "";

        let classImports: Set<string> = new Set;

        const appFileRelativePath = path.relative(`${CONNECTORS_DIR}`, `${APP_FILE_PATH}`.replace(".ts", "")).replace(/\\/g, "/");
        classImports.add(`import { ${LOGGER_VAR_NAME} } from "${appFileRelativePath}";`);
        classImports.add(`import { ${Case.pascal(connector)} } from "@uo/${connector}";`);

        CommonUtils.createOrUpdateClassFile({
            folder: connectorFolder,
            file: connectorFile,
            content: [{ contentIdentifier: method, content: method }],
            imports: classImports,
            className: `${className} extends ${Case.pascal(connector)}`,
            type: "default",
            classDescription: Case.sentence(`${className}`)
        });
    }
}
