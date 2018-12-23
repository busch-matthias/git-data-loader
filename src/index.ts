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
    const result = await gitApi.repos.list({per_page:100, affiliation: 'owner'})
    console.log(result.data)
    console.log(`All in all we have ${result.data.length} Repositories`)
    console.log('also note :' +JSON.stringify(result.headers, null, 4))
}

async function getRepositoryModel(repoUrl :string): Promise<any> {
  
}
