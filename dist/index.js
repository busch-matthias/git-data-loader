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
const octokit = new Octokit();
// Compare: https://developer.github.com/v3/repos/#list-organization-repositories
/*octokit.repos.getForOrg({
    org: 'octokit',
    type: 'public'
}).then(({ data, headers, status }) => {
    // handle data
    console.info('status:' + JSON.stringify(status, null, 2))
    console.info('headers:' + JSON.stringify(headers, null, 2))
    console.info('data:' + JSON.stringify(data, null, 2))
})*/
main();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
function getRepositoryModel() {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
//# sourceMappingURL=index.js.map