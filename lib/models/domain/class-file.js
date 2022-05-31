"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassFile = void 0;
const plain_file_1 = require("./plain file");
class ClassFile extends plain_file_1.PlainFile {
    constructor() {
        super(...arguments);
        this.className = "";
        this.classDescription = "";
        this.type = "";
    }
}
exports.ClassFile = ClassFile;
//# sourceMappingURL=class-file.js.map