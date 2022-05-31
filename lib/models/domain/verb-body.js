"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerbBody = void 0;
const verb_element_1 = require("./verb-element");
/** A verb's object. Could be a request, response, or model */
class VerbBody extends verb_element_1.VerbElement {
    constructor() {
        super(...arguments);
        this.type = {};
        this.properties = [];
    }
}
exports.VerbBody = VerbBody;
//# sourceMappingURL=verb-body.js.map