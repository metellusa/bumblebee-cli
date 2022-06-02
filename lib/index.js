#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const actions_service_1 = __importDefault(require("./actions.service"));
const models_service_1 = __importDefault(require("./models.service"));
const source_code_service_1 = __importDefault(require("./source-code.service"));
const unit_test_service_1 = __importDefault(require("./unit-test.service"));
const inquirer_1 = __importDefault(require("inquirer"));
const clear_1 = __importDefault(require("clear"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const connector_service_1 = __importDefault(require("./connector.service"));
const validation_service_1 = __importDefault(require("./validation.service"));
const cli_utils_1 = require("./utils/cli-utils");
const swagger_validation_levels_enum_1 = require("./enums/swagger-validation-levels.enum");
const appVersion = "v1.0.0";
function runBumblebeeCli() {
    (0, clear_1.default)();
    console.log(chalk_1.default.yellowBright(figlet_1.default.textSync(`bumblebee-cli \t ${appVersion}`, { horizontalLayout: 'full' })));
    inquirer_1.default.prompt([
        cli_utils_1.swaggerPathQuestion,
        cli_utils_1.functionChoice
    ])
        .then(async (initialPromptAnswers) => {
        const submitSwaggerResponse = await actions_service_1.default.submitSwagger(initialPromptAnswers.swaggerPath);
        const paths = [];
        submitSwaggerResponse.paths.forEach((pathDetail) => {
            pathDetail.verbs.forEach((verb) => {
                const path = `${verb.signature.toUpperCase()} ${pathDetail.path}`;
                paths.push([path, pathDetail]);
            });
        });
        const pathsMap = new Map(paths);
        const selectedPathsQuestion = {
            type: 'checkbox',
            message: 'Which APIs would you like to generate files for',
            name: 'selectedPaths',
            choices: [new inquirer_1.default.Separator((0, cli_utils_1.separatingLine)("APIs")), ...pathsMap.keys()],
            pageSize: pathsMap.size,
            validate(answer) {
                if (answer.length < 1) {
                    return "You must choose at least 1 API to generate files for. That's why I'm here!";
                }
                return true;
            }
        };
        if (initialPromptAnswers.functionChoice.includes("Validate")) {
            const pathsValidationErrorsMap = await validation_service_1.default.validateSwagger(initialPromptAnswers.swaggerPath);
            if (pathsValidationErrorsMap.size > 0) {
                pathsValidationErrorsMap.forEach((errors, path) => {
                    console.log(chalk_1.default.blueBright(path) + "\n" + (0, cli_utils_1.separatingLine)("", path.length));
                    errors.forEach((error, index) => {
                        if (error.includes(swagger_validation_levels_enum_1.SwaggerValidationLevels.Critical)) {
                            console.log(`${index + 1}. ${chalk_1.default.red(error)}`);
                        }
                        if (error.includes(swagger_validation_levels_enum_1.SwaggerValidationLevels.Suggestion)) {
                            console.log(`${index + 1}. ${chalk_1.default.yellow(error)}`);
                        }
                    });
                });
            }
            else {
                console.log(chalk_1.default.green("The swagger looks clean!"));
            }
            console.log("\n");
            optionToRepeatBumblebee();
        }
        else {
            inquirer_1.default.prompt([
                selectedPathsQuestion,
                cli_utils_1.targetLocationQuestion,
                cli_utils_1.fileGenerationChoicesQuestion,
                cli_utils_1.connectorGenerationQuestion
            ])
                .then(async (answers) => {
                const fileGenerationChoices = answers.fileGenerationChoices;
                const connectorChoices = answers.connectorChoices;
                const targetLocation = answers.targetLocation;
                const selectedPaths = answers.selectedPaths.map((selectedPath) => {
                    return pathsMap.get(selectedPath);
                });
                let swagger = {
                    repoName: submitSwaggerResponse.repoName,
                    components: submitSwaggerResponse.components,
                    paths: selectedPaths,
                    targetLocation,
                    hasRedis: submitSwaggerResponse.hasRedis
                };
                swagger.targetLocation = answers.targetLocation.replace(/ /g, "");
                if (fileGenerationChoices.includes("Models")) {
                    models_service_1.default.generateModelFiles(swagger);
                    console.log("\n\t * Models generated successfully...");
                }
                if (fileGenerationChoices.includes("Source code files")) {
                    source_code_service_1.default.generateCodeFiles(swagger);
                    console.log("\n\t * Source code files generated successfully...");
                }
                if (fileGenerationChoices.includes("Unit test files")) {
                    unit_test_service_1.default.generateUnitTestFiles(swagger);
                    console.log("\n\t * Unit tests generated successfully...");
                }
                if (connectorChoices.length > 0) {
                    connector_service_1.default.generateConnectorFiles(answers.targetLocation, connectorChoices);
                    console.log("\n\t * Connector files generated successfully...");
                }
                console.log("\n");
                optionToRepeatBumblebee();
            });
        }
    }).catch((err) => {
        console.log(chalk_1.default.red(`Oooops! ${err}`));
    });
}
function optionToRepeatBumblebee() {
    inquirer_1.default.prompt([cli_utils_1.repeatBumblebeeQuestion])
        .then(answer => {
        if (answer.repeatBumblebee) {
            runBumblebeeCli();
        }
        else {
            console.log(chalk_1.default.greenBright("\n I have fulfilled all of your requests. Hopefully I made your life easier today!"));
        }
    });
}
runBumblebeeCli();
//# sourceMappingURL=index.js.map