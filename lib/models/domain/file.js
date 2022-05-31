"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
class File {
    constructor() {
        this.folder = "";
        this.file = "";
        this.content = [];
        this.classImports = new Set();
        this.className = "";
        this.classDescription = "";
        this.classType = "";
    }
}
exports.File = File;
//# sourceMappingURL=file.js.map