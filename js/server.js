"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var child_process_1 = require("child_process");
var express_1 = __importDefault(require("express"));
var app = (0, express_1.default)();
var port = "2000";
app.use(express_1.default.static("./", {
    index: "./index.html"
}));
app.listen(port, function () {
    var url = "http://localhost:".concat(port);
    console.log("Server listening at ".concat(url));
    var cmd = path.join(__dirname, "xdg-open");
    if (process.platform === "darwin")
        cmd = "open";
    else if (process.platform === "win32")
        cmd = "start \"\"";
    (0, child_process_1.exec)("".concat(cmd, " ").concat(url));
});
//# sourceMappingURL=server.js.map