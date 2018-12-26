import * as Octokit from '@octokit/rest';
import * as moment from 'moment';

import {config} from './environment'

const gitApi = new Octokit({
    headers:{
        'Time-Zone': 'Europe/Amsterdam'
    }
})
gitApi.authenticate({
    type: 'token',
    token: config.GIT_TOKEN
})


//main();
showLimits();

//https://octokit.github.io/rest.js
async function main(): Promise<any> {
   const repoUrls = await gitApi.repos.listPublic({})
   repoUrls.data
   //const test repo = repo
   console.log(repoUrls);
}

async function showLimits() {
    const rateLimit = await gitApi.request('GET /rate_limit');
    console.log('<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>');
    let coreLimit = getLimitString(rateLimit.data,'core')
    let searchLimit = getLimitString(rateLimit.data,'search');
  
    console.log(coreLimit);
    console.log(searchLimit);
    console.log('<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>');
}

function getLimitString(rateLimitObject: any,resource: string): string{
    let resetTime = moment(rateLimitObject.resources[resource].reset* 1000)
    let remaining = rateLimitObject.resources[resource].remaining;
    let limit = rateLimitObject.resources[resource].limit;
    
    return `${resource} limit: you have ${remaining} (Used ${limit - remaining}). \n Reset ${resetTime.fromNow()}`
}
async function getRepositoryModel(repoUrl :string): Promise<any> {
  
}
