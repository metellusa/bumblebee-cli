"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_ID_PARAM_DESCR = exports.ENV_FILE_PATH = exports.LOGGER_FILE_PATH = exports.INDEX_FILE_PATH = exports.APP_FILE_PATH = exports.VALIDATION_MESSAGES_FILE = exports.ADAPTER_TEST_FILE_SUFFIX = exports.SERVICE_TEST_FILE_SUFFIX = exports.CONTROLLER_TEST_FILE_SUFFIX = exports.CONNECTOR_FILE_SUFFIX = exports.REDIS_ADAPTER_FILE_SUFFIX = exports.DATABASE_ADAPTER_FILE_SUFFIX = exports.SERVICE_FILE_SUFFIX = exports.CONTROLLER_FILE_SUFFIX = exports.API_TESTS_PATH_SUFFIX = exports.CONFIG_DIR = exports.VALIDATION_MESSAGES_FILE_DIR = exports.CONNECTORS_MODELS_DIR = exports.ADAPTER_TESTS_DIR = exports.ADAPTER_MODELS_DIR = exports.ENTITY_MODELS_DIR = exports.API_MODELS_DIR = exports.CONNECTORS_DIR = exports.REDIS_ADAPTERS_DIR = exports.DATABASE_ADAPTERS_DIR = exports.APIS_DIR = exports.SRC_DIR = void 0;
/** Project file paths, prefixes and suffixes */
exports.SRC_DIR = "src";
exports.APIS_DIR = "src/api";
exports.DATABASE_ADAPTERS_DIR = "src/adapters/database";
exports.REDIS_ADAPTERS_DIR = "src/adapters/redis";
exports.CONNECTORS_DIR = "src/adapters/connectors";
exports.API_MODELS_DIR = "src/models/api";
exports.ENTITY_MODELS_DIR = "src/models/entity";
exports.ADAPTER_MODELS_DIR = "src/models/adapter";
exports.ADAPTER_TESTS_DIR = "src/adapters/database/tests";
exports.CONNECTORS_MODELS_DIR = "src/models/adapters/connectors";
exports.VALIDATION_MESSAGES_FILE_DIR = "src/models/api/shared";
exports.CONFIG_DIR = "src/configs";
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
exports.APP_FILE_PATH = "src/app.ts";
exports.INDEX_FILE_PATH = `${exports.CONFIG_DIR}/index.ts`;
exports.LOGGER_FILE_PATH = exports.APP_FILE_PATH;
exports.ENV_FILE_PATH = exports.INDEX_FILE_PATH;
/** Other constants */
exports.CORRELATION_ID_PARAM_DESCR = "correlationId the id used for tracking the flow of a request";
//# sourceMappingURL=project.const.js.map