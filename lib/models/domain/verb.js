"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Verb = void 0;
/** A path's verb */
class Verb {
    constructor() {
        this.signature = "";
        this.tag = "";
        this.summary = "";
        this.url = "";
        this.model = "";
        this.operationId = "";
        this.responseCodes = [];
        this.isPersistedModel = false;
    }
}
exports.Verb = Verb;
//# sourceMappingURL=verb.js.map