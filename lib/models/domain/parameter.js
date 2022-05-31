"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parameter = void 0;
const verb_element_1 = require("./verb-element");
/** A verb's parameter */
class Parameter extends verb_element_1.VerbElement {
    constructor() {
        super(...arguments);
        this.name = "";
        this.type = "";
        this.description = "";
        this.in = "";
        this.required = "";
    }
}
exports.Parameter = Parameter;
//# sourceMappingURL=parameter.js.map