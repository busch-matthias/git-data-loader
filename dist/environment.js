"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
exports.config = {
    GIT_TOKEN: process.env.GITHUB_PERSONAL_TOKEN || 'this should crash because you have no Token! >.<'
};
//# sourceMappingURL=environment.js.map