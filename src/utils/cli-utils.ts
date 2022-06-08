import fs from "fs";
import inquirer, { Question } from "inquirer";
import { UoConnectors } from "../enums/uo-connectors.enum";

const uoConnectors = Object.keys(UoConnectors).map(connector => {
    return { name: connector }
});

export const pageSize = 30;

export const functionChoice = {
    type: "list",
    name: "functionChoice",
    message: "What would you like to do?",
    choices: ["Generate files for the swagger", "Validate the swagger"]
}

export const swaggerPathQuestion: Question = {
    type: "path",
    name: "swaggerPath",
    message: "What is the path to the swagger that you are working with?",
    async validate(path: string) {
        path = path.replace(/ /g, "");
        if (!path.endsWith(".yaml")) {
            return "Please enter a path to a valid yaml file.";
        } else if (!fs.existsSync(path)) {
            return "The path to the yaml specified does not exist."
        } else {
            return true;
        }
    }
}

export const repeatBumblebeeQuestion: Question = {
    type: "confirm",
    name: "repeatBumblebee",
    message: "Anything else I can help you with (just hit enter for YES)?",
    default: true,
}

export const targetLocationQuestion: Question = {
    type: "path",
    name: "targetLocation",
    message: "Please specify the path of the existing folder where the files will be generated",
    default: process.cwd(),
    validate(path: string) {
        path = path.replace(/ /g, "");
        if (!fs.existsSync(path)) {
            return "The specified folder does not exist"
        } else {
            return true;
        }
    }
}

export const fileGenerationChoicesQuestion = {
    type: "checkbox",
    message: "What files would you like me to generate from the swagger?",
    name: "fileGenerationChoices",
    choices: [
        new inquirer.Separator(separatingLine("Choices")),
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
    validate(answer: string) {
        if (answer.length < 1) {
            return "You must make at least 1 selection. That's why I'm here!";
        }
        return true;
    }
}

export const connectorGenerationQuestion = {
    type: "checkbox",
    message: "Any connector(s) you would like me to generate files for?",
    name: "connectorChoices",
    choices: [new inquirer.Separator(separatingLine("Connectors")), ...uoConnectors],
    pageSize
}

export function separatingLine(middleText?: string, lineLength?: number) {
    let line: string = "";

    for (let i = 0; i < (lineLength || 10); i++) {
        line += "_";
    }

    if (middleText) {
        line = line + middleText + line;
    }

    return line;
}
