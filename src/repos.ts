import * as Octokit from '@octokit/rest';
import { ReposGetResponse, ReposListPublicResponseItem } from '@octokit/rest';
import * as moment from 'moment';

import { RepositoryModel, Contributer, LanguageUsage, RepoIdentifier, RepoByName, RepoById } from './model'


export class CrawlResult {
    loadedRepos: Array<RepositoryModel>;
    todoRepos: Array<RepoIdentifier>;


    constructor(reposToRead: Array<RepoIdentifier>) {
        this.loadedRepos = []
        this.todoRepos = reposToRead;
    }

    isFinished(): boolean {
        return this.todoRepos.length === 0;
    }

    saveRepo(repoId: RepoIdentifier, loaded : RepositoryModel){
        this.loadedRepos.push(loaded);
        
        this.todoRepos.forEach( (item, index)=>{
            if(item == repoId) {
                this.todoRepos.splice(index, 1);
            }
        })
    }
}


export async function crawlRepositories(repos: Array<RepoIdentifier>, gitApi: Octokit): Promise<CrawlResult> {

    let result =  new CrawlResult(repos);

    console.info("------>Repo-File<----------")
    console.log(repos.slice(-1))

    for (let currentId of repos) {
        if (currentId instanceof RepoById) {
            console.error("atm there is no way to get repos by id")
        }
        if (currentId instanceof RepoByName) {
            try{
            let loaded = await createModelFromResponse(currentId, gitApi)
            result.saveRepo(currentId, loaded )
            }catch(e){
                console.error(e);
                console.log("Will save current result")
                return result;
            }
        }
    }
    return result;
}

/**
 * https://octokit.github.io/rest.js
 */
export async function createModelFromResponse(repoId: RepoByName, gitApi: Octokit): Promise<RepositoryModel> {

    const response = (await gitApi.repos.get({ owner: repoId.owner, repo: repoId.repository }))
    if (response.status == 403) {
        console.info(`error happend why accesing repository ${repoId.owner}/${repoId.repository} : \n` + JSON.stringify(response.headers))
        throw new Error('no more calls left')
    }

    const repostoriy = response.data;
    let result: RepositoryModel = {
        id: repostoriy.id,
        owner: repostoriy.owner.login,
        ownerId: repostoriy.owner.id,
        name: repostoriy.name,
        fullRepoName: repostoriy.full_name,
        mainLanguage: repostoriy.language,
        sizeInBytes: repostoriy.size,
        createdAt: repostoriy.created_at,
        updatedAt: repostoriy.updated_at,
        forkCount: repostoriy.forks_count,
        livetimeInDays: computeLifetime(repostoriy.created_at),
        contributers: await createContributors(repoId, gitApi),
        topics: await createTopics(repoId, gitApi),
        usedLanguages: await createLanguages(repoId, gitApi)
    }
    return result;
}

function computeLifetime(created_at: string): number {
    const createdAt = moment(created_at);
    return moment().diff(createdAt, 'days');
}
async function createContributors(repostoriy: RepoByName, gitApi: Octokit)
    : Promise<Array<Contributer>> {

    const response = await gitApi.repos.getContributorsStats({ owner: repostoriy.owner, repo: repostoriy.repository })

    if (response.status == 403) {
        console.info(`error happend why accesing contributers for${repostoriy.owner}/${repostoriy.repository} : \n` + JSON.stringify(response.headers))
        throw new Error('no more calls left')
    }
    const contributerStats = response.data;
    console.log("contributer:  " + JSON.stringify(contributerStats,null, 2))

    let result: Array<Contributer> = [];
    for (let currentContrib in contributerStats) {
        result.push({name: currentContrib })
    }
    console.log(result);
    return result;
}
async function createTopics(repostoriy: RepoByName, gitApi: Octokit)
    : Promise<Array<string>> {
    return ['java', 'c++', 'learn-shit']
}
async function createLanguages(repostoriy: RepoByName, gitApi: Octokit)
    : Promise<Array<LanguageUsage>> {
    return [{ name: 'java', sizeInBytes: 23 }, { name: 'cpp', sizeInBytes: 42 }]
}


