import * as Octokit from '@octokit/rest';
import * as moment from 'moment';


export async function showLimits(gitApi : Octokit) {
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