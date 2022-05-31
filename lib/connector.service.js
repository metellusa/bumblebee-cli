"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const case_1 = __importDefault(require("case"));
const path_1 = __importDefault(require("path"));
const imports_const_1 = require("./constants/imports.const");
const project_const_1 = require("./constants/project.const");
const uo_connectors_enum_1 = require("./enums/uo-connectors.enum");
const common_utils_1 = __importDefault(require("./utils/common-utils"));
class ConnectorService {
    /**
     * @description Generates connector files for list of UO connectors
     * @param connectors the list of connectors
     * @returns {void} nothing returned
     */
    static async generateConnectorFiles(targetLocation, connectors) {
        connectors.forEach(connector => {
            if (Object.values(uo_connectors_enum_1.UoConnectors).includes(connector)) {
                this.generateConnector(targetLocation, connector);
            }
        });
    }
    static generateConnector(directory, connector) {
        const connectorFolder = `${directory}/${project_const_1.CONNECTORS_DIR}/`;
        const connectorFile = `${case_1.default.kebab(connector.replace("connector", ""))}.${project_const_1.CONNECTOR_FILE_SUFFIX}`;
        const className = `${case_1.default.pascal(connector.replace("connector", "adapter"))}`;
        let method = "";
        let classImports = new Set;
        const appFileRelativePath = path_1.default.relative(`${project_const_1.CONNECTORS_DIR}`, `${project_const_1.APP_FILE_PATH}`.replace(".ts", "")).replace(/\\/g, "/");
        classImports.add(`import { ${imports_const_1.LOGGER_VAR_NAME} } from "${appFileRelativePath}";`);
        classImports.add(`import { ${case_1.default.pascal(connector)} } from "@uo/${connector}";`);
        common_utils_1.default.createOrUpdateClassFile({
            folder: connectorFolder,
            file: connectorFile,
            content: [{ contentIdentifier: method, content: method }],
            imports: classImports,
            className: `${className} extends ${case_1.default.pascal(connector)}`,
            type: "default",
            classDescription: case_1.default.sentence(`${className}`)
        });
    }
}
exports.default = ConnectorService;
//# sourceMappingURL=connector.service.js.map