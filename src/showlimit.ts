import * as Octokit from '@octokit/rest';
import * as moment from 'moment';
import { BaseError } from 'make-error';
import { promises } from 'fs';

export class Limit{
    limit: number;
    remaining: number;
    reset: string;
}
export class APILimit{
    resources:{core: Limit;
    search: Limit;
    graphql: Limit;
    };
    rate: Limit;
}
export enum ResourceType{
    core    = 'core',
    search  = 'search',
    graphql	='graphql'
}

export async function showLimits(gitApi : Octokit) {
    const rateLimit = await getRateLimit(gitApi)
    console.log('<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>');
    let coreLimit = getLimitString(rateLimit,ResourceType.core)
    let searchLimit = getLimitString(rateLimit,ResourceType.search);

    console.log(coreLimit);
    console.log(searchLimit);
    console.log('<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>');
}

export async function getRateLimit(gitApi : Octokit) : Promise<APILimit>{
    const response = await gitApi.request('GET /rate_limit');
    const rateLimit: APILimit = response.data;
    return rateLimit;
}

export function getLimitString(rateLimitObject: APILimit,resource: string): string{
    let resetTime = moment(rateLimitObject.resources[resource].reset* 1000)
    let remaining = rateLimitObject.resources[resource].remaining;
    let limit = rateLimitObject.resources[resource].limit;
    
    return `${resource} limit: you have ${remaining} (Used ${limit - remaining}). \n Reset ${resetTime.fromNow()}`
}