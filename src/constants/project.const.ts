/** Project file paths, prefixes and suffixes */
export const SRC_DIR = "src";
export const APIS_DIR = "src/api";
export const DATABASE_ADAPTERS_DIR = "src/adapters/database";
export const REDIS_ADAPTERS_DIR = "src/adapters/redis";
export const CONNECTORS_DIR = "src/adapters/connectors";
export const API_MODELS_DIR = "src/models/api";
export const ENTITY_MODELS_DIR = "src/models/entity";
export const ADAPTER_MODELS_DIR = "src/models/adapter";
export const ADAPTER_TESTS_DIR = "src/adapters/database/tests";
export const CONNECTORS_MODELS_DIR = "src/models/adapters/connectors";
export const VALIDATION_MESSAGES_FILE_DIR = "src/models/api/shared";
export const CONFIG_DIR = "src/configs";
export const API_TESTS_PATH_SUFFIX = "/tests";
export const CONTROLLER_FILE_SUFFIX = "controller.ts";
export const SERVICE_FILE_SUFFIX = "service.ts";
export const DATABASE_ADAPTER_FILE_SUFFIX = "database.adapter.ts";
export const REDIS_ADAPTER_FILE_SUFFIX = "redis.adapter.ts";
export const CONNECTOR_FILE_SUFFIX = "adapter.ts";
export const CONTROLLER_TEST_FILE_SUFFIX = "controller.spec.ts";
export const SERVICE_TEST_FILE_SUFFIX = "service.spec.ts";
export const ADAPTER_TEST_FILE_SUFFIX = "adapter.spec.ts";
export const VALIDATION_MESSAGES_FILE = "validation-messages.const";
export const APP_FILE_PATH = "src/app.ts";
export const INDEX_FILE_PATH = `${CONFIG_DIR}/index.ts`;
export const LOGGER_FILE_PATH = APP_FILE_PATH;
export const ENV_FILE_PATH = INDEX_FILE_PATH;

/** Other constants */
export const CORRELATION_ID_PARAM_DESCR = "correlationId the id used for tracking the flow of a request";
