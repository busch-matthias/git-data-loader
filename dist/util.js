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
function paginate(method, args) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield method(Object.assign({ per_page: 100 }, args));
        let { data } = response;
        console.info(Object.getOwnPropertyNames(data));
        for (let prop in data) {
            console.info('Shit has properties: ' + prop);
        }
        while (octokit.hasNextPage(response)) {
            response = yield octokit.getNextPage(response);
            data = data.concat(response.data);
        }
        return data;
    });
}
exports.paginate = paginate;
//# sourceMappingURL=util.js.map