/** Project file paths, prefixes and suffixes */
export const SRC_DIR = "src";
export const K8S_DIR = "k8s";
export const SWAGGER_DIR = "definitions";
export const APIS_DIR = `${SRC_DIR}/api`;
export const CONFIG_DIR = `${SRC_DIR}/configs`;
export const DATABASE_ADAPTERS_DIR = `${SRC_DIR}/adapters/database`;
export const REDIS_ADAPTERS_DIR = `${SRC_DIR}/adapters/redis`;
export const CONNECTORS_DIR = `${SRC_DIR}/adapters/connectors`;
export const API_MODELS_DIR = `${SRC_DIR}/models/api`;
export const ENTITY_MODELS_DIR = `${SRC_DIR}/models/entities`;
export const ADAPTER_MODELS_DIR = `${SRC_DIR}/models/adapter`;
export const ADAPTER_TESTS_DIR = `${SRC_DIR}/adapters/database/tests`;
export const CONNECTORS_MODELS_DIR = `${SRC_DIR}/models/adapters/connectors`;
export const VALIDATION_MESSAGES_FILE_DIR = `${SRC_DIR}/models/api/shared`;
export const MIDDLEWARES_DIR = `${SRC_DIR}/middlewares`;
export const API_TESTS_PATH_SUFFIX = "/tests";
export const CONTROLLER_FILE_SUFFIX = "controller.ts";
export const SERVICE_FILE_SUFFIX = "service.ts";
export const ENTITY_MODEL_FILE_SUFFIX = "entity.model.ts";
export const REQUEST_MODEL_FILE_SUFFIX = "request.model.ts";
export const RESPONSE_MODEL_FILE_SUFFIX = "response.model.ts";
export const DATABASE_ADAPTER_FILE_SUFFIX = "database.adapter.ts";
export const REDIS_ADAPTER_FILE_SUFFIX = "redis.adapter.ts";
export const CONNECTOR_FILE_SUFFIX = "adapter.ts";
export const CONTROLLER_TEST_FILE_SUFFIX = "controller.spec.ts";
export const SERVICE_TEST_FILE_SUFFIX = "service.spec.ts";
export const ADAPTER_TEST_FILE_SUFFIX = "adapter.spec.ts";
export const VALIDATION_MESSAGES_FILE = "validation-messages.const";
export const APP_FILE_PATH = `${SRC_DIR}/app.ts`;
export const INDEX_FILE_PATH = `${CONFIG_DIR}/index.ts`;
export const RESORT_AREA_CODE_ENUM_PATH = `${SRC_DIR}/models/enums/resort-area-code.enum.ts`;
export const LOGGER_FILE_PATH = `${SRC_DIR}/logger.ts`;
export const RESORT_AREA_CODE_MIDDLEWARE_PATH = `${MIDDLEWARES_DIR}/resort-area-code.middleware.ts`;
export const ENV_FILE_PATH = INDEX_FILE_PATH;
export const ENTITY_MODEL_CLASS_SUFFIX = "EntityModel";
export const REQUEST_MODEL_CLASS_SUFFIX = "RequestModel";
export const RESPONSE_MODEL_CLASS_SUFFIX = "ResponseModel";
export const WORDS_TO_EXCLUDE = ["model", "request", "response", ].join("|");

/** Other constants */
export const CORRELATION_ID_PARAM_DESCR = "correlationId the id used for tracking the flow of a request";

// For each project file, please specify its name, template path and target directory (omit targetDirectory if it's in root directory)
export const PROJECT_FILES = [
    {
        name: "app.ts",
        template: "templates/project-files/app.ts.template",
        targetDirectory: `${SRC_DIR}`
    },
    {
        name: "Dockerfile",
        template: "templates/project-files/Dockerfile.template"
    },
    {
        name: "logger.ts",
        template: "templates/project-files/logger.ts.template",
        targetDirectory: `${SRC_DIR}`
    },
    {
        name: "package.json",
        template: "templates/project-files/package.json.template"
    },
    {
        name: "tsconfig.json",
        template: "templates/project-files/tsconfig.json.template"
    },
    {
        name: "index.ts",
        template: "templates/project-files/index.ts.template",
        targetDirectory: `${CONFIG_DIR}`
    },
    {
        name: "server.ts",
        template: "templates/project-files/server.ts.template",
        targetDirectory: `${SRC_DIR}`
    },
    {
        name: "root.controller.ts",
        template: "templates/project-files/root.controller.ts.template",
        targetDirectory: `${APIS_DIR}/root`
    },
    {
        name: "root.controller.spec.ts",
        template: "templates/project-files/root.controller.spec.ts.template",
        targetDirectory: `${APIS_DIR}/root/test`
    },
    {
        name: "health-check.mock.ts",
        template: "templates/project-files/health-check.mock.ts.template",
        targetDirectory: `${SRC_DIR}/test-utilities/mocks`
    },
    {
        name: "shared.mock.ts",
        template: "templates/project-files/shared.mock.ts.template",
        targetDirectory: `${SRC_DIR}/test-utilities/mocks`
    },
    {
        name: "resort-area-code.enum.ts",
        template: "templates/project-files/resort-area-code.ts.template",
        targetDirectory: `${SRC_DIR}/models/enums`
    },
    {
        name: "tsconfig.prod.json",
        template: "templates/project-files/tsconfig.prod.json.template"
    },
    {
        name: "readme.md",
        template: "templates/project-files/readme.md.template"
    },
    {
        name: ".env",
        template: "templates/project-files/env.template"
    },
    {
        name: ".nycrc",
        template: "templates/project-files/nycrc.template"
    },
    {
        name: ".gitignore",
        template: "templates/project-files/gitignore.template"
    },
    {
        name: ".eslintrc",
        template: "templates/project-files/eslintrc.template"
    },
    {
        name: "resort-area-code.middleware.ts",
        template: "templates/project-files/resort-area-code.middleware.ts.template",
        targetDirectory: `${MIDDLEWARES_DIR}`
    }
];

export const ENVIRONMENTS = ['dev', 'qa', 'uat', 'stg', 'stg02', 'prod'];
