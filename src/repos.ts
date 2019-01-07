import * as Octokit from '@octokit/rest';
import * as moment from 'moment';

import { FullConfiguration, saveResults, saveTodos } from './index'
import { RepositoryModel, Contributer, LanguageUsage, RepoIdentifier } from './model'
import { getRateLimit } from './showlimit'

const CALLS_PER_REPO = 4;

export class CrawlResult {
    loadedRepos: Array<RepositoryModel>;
    todoRepos: Array<RepoIdentifier>;
    fhisyRepos: Array<RepoIdentifier>;

    constructor(reposToRead: Array<RepoIdentifier>) {
        this.loadedRepos = [];
        this.fhisyRepos = [];
        this.todoRepos = JSON.parse(JSON.stringify(reposToRead)); // "deep copy" see https://stackoverflow.com/a/23481096/1528488
    }

    isFinished(): boolean {
        return this.todoRepos.length === 0;
    }

    saveRepo(repoId: RepoIdentifier, loaded: RepositoryModel): void {
        this.loadedRepos.push(loaded);

        //console.log("remove repo" + repoString(repoId) + " from todo")
        this.todoRepos.forEach((item, index) => {

            if ((item.owner === repoId.owner)
                && (item.repository === repoId.repository)
            ) {
                this.todoRepos.splice(index, 1);

            }
        })
    }

    /* Some repos crash althoug they should work, we shold remove them from todo as well
        eg; chriseppstein/ruby-freebase,  reinh/dm
    */
    saveAsFishy(currentId: RepoIdentifier): void{
        this.fhisyRepos.push(currentId);
        
        this.todoRepos.forEach((item, index) => { 
            if ((item.owner === currentId.owner)
                && (item.repository === currentId.repository)
            ) {
                this.todoRepos.splice(index, 1);

            }
        })
    }

    hasFishyRepos():boolean{
        return this.fhisyRepos.length !== 0;
    }
}
function repoString(repo: RepoIdentifier): string {
    return repo.owner + '/' + repo.repository
}


export async function crawlRepositories(
    repos: Array<RepoIdentifier>,
    gitApi: Octokit,
    config: FullConfiguration
): Promise<CrawlResult> {

    let result = new CrawlResult(repos);
    console.info("Start readin repos")
    let i = 1;
    let max = repos.length
    for (let currentId of repos) {

        console.log(`----> Process  #${i}/${max}: (${currentId.owner}/${currentId.repository})`)
        i +=1;
        try {
            let loaded = await createModelFromResponse(currentId, gitApi, config)
            result.saveRepo(currentId, loaded)

        } catch (e) {
            console.error(e);
            const rateLimit = await getRateLimit(gitApi);
            const remaining = rateLimit.resources.core.remaining;
            if (remaining > config.CALLS_PER_REPO) {
                console.log(`What ever happend...\n try to delete (${currentId.owner}/${currentId.repository}) from input. we still have ${remaining} calls`);
                result.saveAsFishy(currentId)
            } else {
                console.log("Will stop and save current result")
                return result;
            }
        }
        if(i%200 ==0){
            console.info('save temporary Result');
            saveResults(result, config);
            saveTodos(result, config);
        }

    }
    console.log('Done with crawling');
    return result;
}


/**
 * https://octokit.github.io/rest.js
 */
export async function createModelFromResponse(
    repoId: RepoIdentifier,
    gitApi: Octokit,
    config: FullConfiguration
): Promise<RepositoryModel> {


    const response = (await gitApi.repos.get({ owner: repoId.owner, repo: repoId.repository }))
    const repostoriy = response.data;

    let result: RepositoryModel = {
        id: repostoriy.id,
        owner: repostoriy.owner.login,
        //ownerId: repostoriy.owner.id,
        name: repostoriy.name,
        fullRepoName: repostoriy.full_name,
        mainLanguage: repostoriy.language,
        sizeInBytes: repostoriy.size,
        createdAt: repostoriy.created_at,
        updatedAt: repostoriy.updated_at,
        forkCount: repostoriy.forks_count,
        livetimeInDays: computeLifetime(repostoriy.created_at),
        contributers: await createContributors(repoId, gitApi, config),
        topics: await createTopics(repoId, gitApi, config),
        usedLanguages: await createLanguages(repoId, gitApi, config)
    }
    return result;
}

function computeLifetime(created_at: string): number {
    const createdAt = moment(created_at);
    return moment().diff(createdAt, 'days');
}
async function createContributors(repostoriy: RepoIdentifier,
    gitApi: Octokit,
    config: FullConfiguration)
    : Promise<Array<Contributer>> {

    const response = await gitApi.repos.getContributorsStats({ owner: repostoriy.owner, repo: repostoriy.repository })
    checkForLimitError(repostoriy, response);
    const contributerStats = response.data;
    //console.log("contributer:  " + JSON.stringify(contributerStats, null, 2))
    let result: Array<Contributer> = [];
    if(!contributerStats){
        console.log('!! some thing funny happend: Repo ['+repostoriy.owner+'/'+repostoriy.repository+'] has no contrib stats');
        return [];
    }

    for (let i = 0; i < contributerStats.length; i++) {
        let contrib = contributerStats[i];
        result.push({
            name: contrib.author.login,
            totalSize: contrib.total
        })
    }
    if (config.shouldConsoleLog) {
        console.log(`Added ${result.length} contributors`);
    }
    return result;
}
async function createTopics(
    repo: RepoIdentifier,
    gitApi: Octokit,
    config: FullConfiguration
): Promise<Array<string>> {
    const response = await gitApi.repos.listTopics({ owner: repo.owner, repo: repo.repository })
    checkForLimitError(repo, response);

    const result: Array<string> = response.data.names
    if (config.shouldConsoleLog) {
        console.log(`Added Topics: ${JSON.stringify(result)}`)
    }
    return result;
}
async function createLanguages(
    repostoriy: RepoIdentifier,
    gitApi: Octokit,
    config: FullConfiguration
): Promise<Array<LanguageUsage>> {
    const response = await gitApi.repos.listLanguages({ owner: repostoriy.owner, repo: repostoriy.repository })
    checkForLimitError(repostoriy, response);

    const result: Array<LanguageUsage> = [];    
    
    
    Object.keys(response.data).forEach(
        (key) => {
            result.push({
                name: key,
                sizeInBytes: response.data[key]
            })
        })
    if (config.shouldConsoleLog) {
        console.log(`Added Languages: ${JSON.stringify(result)}`)
    }

    return result;
}

function checkForLimitError(repo: RepoIdentifier, response: any) {
    if (response.status == 403) {
        console.info(`error happend while accessin repo ${repo.owner}/${repo.repository} : \n` + JSON.stringify(response.headers))
        throw new Error('no more calls left')
    }
}


