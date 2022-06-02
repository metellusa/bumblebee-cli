#!/usr/bin/env node
import ActionsService from "./actions.service";
import ModelsService from "./models.service";
import SourceCodeService from "./source-code.service";
import UnitTestService from "./unit-test.service";
import { Swagger } from "./models/domain/swagger";
import { SubmitSwaggerResponse } from "./models/api/submit-swagger-response";
import inquirer from "inquirer";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import ConnectorService from "./connector.service";
import { Path } from "./models/domain/path";
import ValidationService from "./validation.service";
import { connectorGenerationQuestion, fileGenerationChoicesQuestion, functionChoice, pageSize, repeatBumblebeeQuestion, separatingLine, swaggerPathQuestion, targetLocationQuestion } from "./utils/cli-utils";
import { SwaggerValidationLevels } from "./enums/swagger-validation-levels.enum";

const appVersion = "v1.0.0";

function runBumblebeeCli() {
  clear();
  console.log(
    chalk.yellowBright(
      figlet.textSync(`bumblebee-cli \t ${appVersion}`, { horizontalLayout: 'full' })
    )
  );

  inquirer.prompt([
    swaggerPathQuestion,
    functionChoice
  ])
    .then(async (initialPromptAnswers) => {
      const submitSwaggerResponse: SubmitSwaggerResponse = await ActionsService.submitSwagger(initialPromptAnswers.swaggerPath);
      const paths: any[] = [];

      submitSwaggerResponse.paths.forEach((pathDetail) => {
        pathDetail.verbs.forEach((verb) => {
          const path: string = `${verb.signature.toUpperCase()} ${pathDetail.path}`;
          paths.push([path, pathDetail]);
        });
      });

      const pathsMap = new Map(paths);
      const selectedPathsQuestion = {
        type: 'checkbox',
        message: 'Which APIs would you like to generate files for',
        name: 'selectedPaths',
        choices: [new inquirer.Separator(separatingLine("APIs")), ...pathsMap.keys()],
        pageSize: pathsMap.size,
        validate(answer: string[]) {
          if (answer.length < 1) {
            return "You must choose at least 1 API to generate files for. That's why I'm here!";
          }

          return true;
        }
      }

      if (initialPromptAnswers.functionChoice.includes("Validate")) {
        const pathsValidationErrorsMap: Map<string, string[]> = await ValidationService.validateSwagger(initialPromptAnswers.swaggerPath);

        if (pathsValidationErrorsMap.size > 0) {
          pathsValidationErrorsMap.forEach((errors, path) => {
            console.log(chalk.blueBright(path) + "\n" + separatingLine("", path.length));
            errors.forEach((error, index) => {
              if (error.includes(SwaggerValidationLevels.Critical)) {
                console.log(`${index + 1}. ${chalk.red(error)}`);
              }
              if (error.includes(SwaggerValidationLevels.Suggestion)) {
                console.log(`${index + 1}. ${chalk.yellow(error)}`);
              }
            })
          })
        } else {
          console.log(chalk.green("The swagger looks clean!"));
        }
        console.log("\n");
        optionToRepeatBumblebee();
      } else {
        inquirer.prompt([
          selectedPathsQuestion,
          targetLocationQuestion,
          fileGenerationChoicesQuestion,
          connectorGenerationQuestion
        ])
          .then(async (answers) => {
            const fileGenerationChoices: string[] = answers.fileGenerationChoices;
            const connectorChoices: string[] = answers.connectorChoices;
            const targetLocation: string = answers.targetLocation;
            const selectedPaths: Path[] = answers.selectedPaths.map((selectedPath: string) => {
              return pathsMap.get(selectedPath);
            });

            let swagger: Swagger = {
              repoName: submitSwaggerResponse.repoName,
              components: submitSwaggerResponse.components,
              paths: selectedPaths,
              targetLocation,
              hasRedis: submitSwaggerResponse.hasRedis
            }

            swagger.targetLocation = answers.targetLocation.replace(/ /g, "");

            if (fileGenerationChoices.includes("Models")) {
              ModelsService.generateModelFiles(swagger);
              console.log("\n\t * Models generated successfully...");
            }
            if (fileGenerationChoices.includes("Source code files")) {
              SourceCodeService.generateCodeFiles(swagger);
              console.log("\n\t * Source code files generated successfully...");
            }
            if (fileGenerationChoices.includes("Unit test files")) {
              UnitTestService.generateUnitTestFiles(swagger);
              console.log("\n\t * Unit tests generated successfully...");
            }
            if (connectorChoices.length > 0) {
              ConnectorService.generateConnectorFiles(answers.targetLocation, connectorChoices);
              console.log("\n\t * Connector files generated successfully...");
            }
            console.log("\n");
            optionToRepeatBumblebee();
          })
      }
    }).catch((err) => {
      console.log(chalk.red(`Oooops! ${err}`));
    })
}

function optionToRepeatBumblebee() {
  inquirer.prompt([repeatBumblebeeQuestion])
    .then(answer => {
      if (answer.repeatBumblebee) {
        runBumblebeeCli();
      } else {
        console.log(chalk.greenBright("\n I have fulfilled all of your requests. Hopefully I made your life easier today!"));
      }
    })
}

runBumblebeeCli();
