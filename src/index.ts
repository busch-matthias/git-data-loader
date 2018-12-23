import * as Octokit from '@octokit/rest';

import {config} from './environment'

const gitApi = new Octokit()
gitApi.authenticate({
    type: 'token',
    token: config.GIT_TOKEN
})


main();

//https://octokit.github.io/rest.js
async function main(): Promise<any> {
   const repoUrls = await gitApi.repos.listPublic({})
   console.log(repoUrls);
}

async function getRepositoryModel(repoUrl :string): Promise<any> {
  
}
