"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENVIRONMENTS = exports.PROJECT_FILES = exports.CORRELATION_ID_PARAM_DESCR = exports.ENV_FILE_PATH = exports.LOGGER_FILE_PATH = exports.RESORT_AREA_CODE_ENUM_PATH = exports.INDEX_FILE_PATH = exports.APP_FILE_PATH = exports.VALIDATION_MESSAGES_FILE = exports.ADAPTER_TEST_FILE_SUFFIX = exports.SERVICE_TEST_FILE_SUFFIX = exports.CONTROLLER_TEST_FILE_SUFFIX = exports.CONNECTOR_FILE_SUFFIX = exports.REDIS_ADAPTER_FILE_SUFFIX = exports.DATABASE_ADAPTER_FILE_SUFFIX = exports.SERVICE_FILE_SUFFIX = exports.CONTROLLER_FILE_SUFFIX = exports.API_TESTS_PATH_SUFFIX = exports.VALIDATION_MESSAGES_FILE_DIR = exports.CONNECTORS_MODELS_DIR = exports.ADAPTER_TESTS_DIR = exports.ADAPTER_MODELS_DIR = exports.ENTITY_MODELS_DIR = exports.API_MODELS_DIR = exports.CONNECTORS_DIR = exports.REDIS_ADAPTERS_DIR = exports.DATABASE_ADAPTERS_DIR = exports.CONFIG_DIR = exports.APIS_DIR = exports.SWAGGER_DIR = exports.K8S_DIR = exports.SRC_DIR = void 0;
/** Project file paths, prefixes and suffixes */
exports.SRC_DIR = "src";
exports.K8S_DIR = "k8s";
exports.SWAGGER_DIR = "definitions";
exports.APIS_DIR = `${exports.SRC_DIR}/api`;
exports.CONFIG_DIR = `${exports.SRC_DIR}/configs`;
exports.DATABASE_ADAPTERS_DIR = `${exports.SRC_DIR}/adapters/database`;
exports.REDIS_ADAPTERS_DIR = `${exports.SRC_DIR}/adapters/redis`;
exports.CONNECTORS_DIR = `${exports.SRC_DIR}/adapters/connectors`;
exports.API_MODELS_DIR = `${exports.SRC_DIR}/models/api`;
exports.ENTITY_MODELS_DIR = `${exports.SRC_DIR}/models/entity`;
exports.ADAPTER_MODELS_DIR = `${exports.SRC_DIR}/models/adapter`;
exports.ADAPTER_TESTS_DIR = `${exports.SRC_DIR}/adapters/database/tests`;
exports.CONNECTORS_MODELS_DIR = `${exports.SRC_DIR}/models/adapters/connectors`;
exports.VALIDATION_MESSAGES_FILE_DIR = `${exports.SRC_DIR}/models/api/shared`;
exports.API_TESTS_PATH_SUFFIX = "/tests";
exports.CONTROLLER_FILE_SUFFIX = "controller.ts";
exports.SERVICE_FILE_SUFFIX = "service.ts";
exports.DATABASE_ADAPTER_FILE_SUFFIX = "database.adapter.ts";
exports.REDIS_ADAPTER_FILE_SUFFIX = "redis.adapter.ts";
exports.CONNECTOR_FILE_SUFFIX = "adapter.ts";
exports.CONTROLLER_TEST_FILE_SUFFIX = "controller.spec.ts";
exports.SERVICE_TEST_FILE_SUFFIX = "service.spec.ts";
exports.ADAPTER_TEST_FILE_SUFFIX = "adapter.spec.ts";
exports.VALIDATION_MESSAGES_FILE = "validation-messages.const";
exports.APP_FILE_PATH = `${exports.SRC_DIR}/app.ts`;
exports.INDEX_FILE_PATH = `${exports.CONFIG_DIR}/index.ts`;
exports.RESORT_AREA_CODE_ENUM_PATH = `${exports.SRC_DIR}/models/enums/resort-area-code.enum.ts`;
exports.LOGGER_FILE_PATH = `${exports.SRC_DIR}/logger.ts`;
exports.ENV_FILE_PATH = exports.INDEX_FILE_PATH;
/** Other constants */
exports.CORRELATION_ID_PARAM_DESCR = "correlationId the id used for tracking the flow of a request";
// For each project file, please specify its name, template path and target directory (omit targetDirectory if it's in root directory)
exports.PROJECT_FILES = [
    {
        name: "app.ts",
        template: "./templates/project-files/app.ts.template",
        targetDirectory: `${exports.SRC_DIR}`
    },
    {
        name: "Dockerfile",
        template: "./templates/project-files/Dockerfile.template"
    },
    {
        name: "logger.ts",
        template: "./templates/project-files/logger.ts.template",
        targetDirectory: `${exports.SRC_DIR}`
    },
    {
        name: "package.json",
        template: "./templates/project-files/package.json.template"
    },
    {
        name: "tsconfig.json",
        template: "./templates/project-files/tsconfig.json.template"
    },
    {
        name: "index.ts",
        template: "./templates/project-files/index.ts.template",
        targetDirectory: `${exports.CONFIG_DIR}`
    },
    {
        name: "server.ts",
        template: "./templates/project-files/server.ts.template",
        targetDirectory: `${exports.SRC_DIR}`
    },
    {
        name: "root.controller.ts",
        template: "./templates/project-files/root.controller.ts.template",
        targetDirectory: `${exports.APIS_DIR}/root`
    },
    {
        name: "root.controller.spec.ts",
        template: "./templates/project-files/root.controller.spec.ts.template",
        targetDirectory: `${exports.APIS_DIR}/root/test`
    },
    {
        name: "health-check.mock.ts",
        template: "./templates/project-files/health-check.mock.ts.template",
        targetDirectory: `${exports.SRC_DIR}/test-utilities/mocks`
    },
    {
        name: "shared.mock.ts",
        template: "./templates/project-files/shared.mock.ts.template",
        targetDirectory: `${exports.SRC_DIR}/test-utilities/mocks`
    },
    {
        name: "resort-area-code.enum.ts",
        template: "./templates/project-files/resort-area-code.ts.template",
        targetDirectory: `${exports.SRC_DIR}/models/enums`
    },
    {
        name: "tsconfig.prod.json",
        template: "./templates/project-files/tsconfig.prod.json.template"
    },
    {
        name: "readme.md",
        template: "./templates/project-files/readme.md.template"
    },
    {
        name: ".env",
        template: "./templates/project-files/env.template"
    },
    {
        name: ".nycrc",
        template: "./templates/project-files/nycrc.template"
    },
    {
        name: ".gitignore",
        template: "./templates/project-files/gitignore.template"
    },
    {
        name: ".eslintrc",
        template: "./templates/project-files/eslintrc.template"
    }
];
exports.ENVIRONMENTS = ['dev', 'qa', 'uat', 'stg', 'stg02', 'prod'];
//# sourceMappingURL=project.const.js.map