import * as fs from 'fs';

import { paginate } from './util';
import { RepositoryModel } from './model';

import * as Octokit from '@octokit/rest';

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

async function main(): Promise<any>{

}

async function getRepositoryModel():Promise<any>{

}
