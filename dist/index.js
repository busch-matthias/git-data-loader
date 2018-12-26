"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Octokit = require("@octokit/rest");
const moment = require("moment");
const environment_1 = require("./environment");
const gitApi = new Octokit();
gitApi.authenticate({
    type: 'token',
    token: environment_1.config.GIT_TOKEN
});
//main();
showLimits();
//https://octokit.github.io/rest.js
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const repoUrls = yield gitApi.repos.listPublic({});
        repoUrls.data;
        //const test repo = repo
        console.log(repoUrls);
    });
}
function showLimits() {
    return __awaiter(this, void 0, void 0, function* () {
        const rateLimit = yield gitApi.request('GET /rate_limit');
        console.log('<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>');
        let resetTime = moment(rateLimit.data.core.reset);
        let coreLimit = `core: you have ${rateLimit.data.core.remaining} (Used ${rateLimit.data.core.limit - rateLimit.data.core.remaining}). \n Reset at ${resetTime.format('LLL')}`;
        console.log(coreLimit);
    });
}
function getRepositoryModel(repoUrl) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
//# sourceMappingURL=index.js.map