import * as Octokit from '@octokit/rest';
import {ReposGetResponse,ReposListPublicResponseItem }from '@octokit/rest';
import * as moment from 'moment';

import { RepositoryModel, Contributer, ContributerClass, LanguageUsage, RepoIdentifier, RepoByName } from './model'

export class CrawlResult{
    loadedRepos: Array<RepositoryModel>;
    todoRepos: Array<RepositoryModel>;
    isFinished: boolean;
}


export async function crawlRepositories(repos: Array<Octokit.ReposListPublicResponseItem>, gitApi: Octokit): Promise<Array<RepositoryModel>> {
    const models = new Array<RepositoryModel>();
    console.info("------>Repo-File<----------")
    console.log(repos.slice(-1))
    
    for (let currentRepo of repos) {
        let tmp = await getRepositoryModelByPublicList(currentRepo, gitApi)
        models.push(tmp);
    }
    return models;
}

/**
 * https://octokit.github.io/rest.js
 */
export async function createModelFromResponse(repoId: RepoByName, gitApi: Octokit): Promise<RepositoryModel> {
    
    const repostoriy = (await gitApi.repos.get({owner:repoId.owner,repo:repoId.repository})).data
    let  result: RepositoryModel = {
        id: repostoriy.id,
        owner: repostoriy.owner.login,
        ownerId: repostoriy.owner.id,
        name: repostoriy.name,
        fullRepoName: repostoriy.full_name,
        mainLanguage: 'not there',
        sizeInBytes: -1,
        createdAt: 'repostoriy.created_at',
        updatedAt: 'repostoriy.updated_at',
        forkCount: -1,
        livetimeInDays: -1,
        contributers: await createContributors(repostoriy, gitApi),
        topics: await createTopics(repostoriy, gitApi),
        usedLanguages: await createLanguages(repostoriy,gitApi)    
    }
    return result;
}
export async function  createAllRepositoriesById(repoIds: Array<RepoIdentifier>, gitApi: Octokit): Promise<Array<RepositoryModel>> {
    let crawResult = new CrawlResult();
    
    return null;
}
function computeLifetime(created_at : string): number{
    const createdAt = moment(created_at);
    return moment().diff(createdAt, 'days'); 
}
async function createContributors(repostoriy: ReposGetResponse|ReposListPublicResponseItem, gitApi: Octokit)
: Promise<Array<Contributer>> {
    let gitContribs =  await gitApi.request(repostoriy.contributors_url)
    console.log("contributer")
    console.log(gitContribs);
    return null;
}
async function createTopics(repostoriy: ReposGetResponse|ReposListPublicResponseItem, gitApi: Octokit)
: Promise<Array<string>> {
    return ['java', 'c++', 'learn-shit']
}
async function createLanguages(repostoriy: ReposGetResponse|ReposListPublicResponseItem, gitApi: Octokit)
: Promise<Array<LanguageUsage>> {
    return [{name: 'java', sizeInBytes: 23}, {name: 'cpp', sizeInBytes: 42}]
}


