"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.separatingLine = exports.connectorGenerationQuestion = exports.fileGenerationChoicesQuestion = exports.targetLocationQuestion = exports.repeatBumblebeeQuestion = exports.swaggerPathQuestion = exports.functionChoice = exports.pageSize = void 0;
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const uo_connectors_enum_1 = require("../enums/uo-connectors.enum");
const uoConnectors = Object.keys(uo_connectors_enum_1.UoConnectors).map(connector => {
    return { name: connector };
});
exports.pageSize = 30;
exports.functionChoice = {
    type: "list",
    name: "functionChoice",
    message: "What would you like to do?",
    choices: ["Generate files for the swagger", "Validate the swagger"]
};
exports.swaggerPathQuestion = {
    type: "path",
    name: "swaggerPath",
    message: "What is the path to the swagger that you are working with?",
    async validate(path) {
        path = path.replace(/ /g, "");
        if (!path.endsWith(".yaml")) {
            return "Please enter a path to a valid yaml file.";
        }
        else if (!fs_1.default.existsSync(path)) {
            return "The path to the yaml specified does not exist.";
        }
        else {
            return true;
        }
    }
};
exports.repeatBumblebeeQuestion = {
    type: "confirm",
    name: "repeatBumblebee",
    message: "Anything else I can help you with (just hit enter for YES)?",
    default: true,
};
exports.targetLocationQuestion = {
    type: "path",
    name: "targetLocation",
    message: "Please specify the path of the existing folder where the files will be generated",
    default: process.cwd(),
    validate(path) {
        path = path.replace(/ /g, "");
        if (!fs_1.default.existsSync(path)) {
            return "The specified folder does not exist";
        }
        else {
            return true;
        }
    }
};
exports.fileGenerationChoicesQuestion = {
    type: "checkbox",
    message: "What files would you like me to generate from the swagger?",
    name: "fileGenerationChoices",
    choices: [
        new inquirer_1.default.Separator(separatingLine("Choices")),
        {
            name: "Models",
        },
        {
            name: "Source code files",
        },
        {
            name: "Unit test files",
        }
    ],
    validate(answer) {
        if (answer.length < 1) {
            return "You must make at least 1 selection. That's why I'm here!";
        }
        return true;
    }
};
exports.connectorGenerationQuestion = {
    type: "checkbox",
    message: "Any connector(s) you would like me to generate files for?",
    name: "connectorChoices",
    choices: [new inquirer_1.default.Separator(separatingLine("Connectors")), ...uoConnectors],
    pageSize: exports.pageSize
};
function separatingLine(middleText, lineLength) {
    let line = "";
    for (let i = 0; i < (lineLength || 10); i++) {
        line += "_";
    }
    if (middleText) {
        line = line + middleText + line;
    }
    return line;
}
exports.separatingLine = separatingLine;
//# sourceMappingURL=cli-utils.js.map