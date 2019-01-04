import * as Octokit from '@octokit/rest';
import * as moment from 'moment';

import { RepositoryModel, Contributer, LanguageUsage, RepoIdentifier } from './model'


export class CrawlResult {
    loadedRepos: Array<RepositoryModel>;
    todoRepos: Array<RepoIdentifier>;


    constructor(reposToRead: Array<RepoIdentifier>) {
        this.loadedRepos = []
        this.todoRepos = JSON.parse(JSON.stringify(reposToRead)); // "deep copy" see https://stackoverflow.com/a/23481096/1528488
     }

    isFinished(): boolean {
        return this.todoRepos.length === 0;
    }

    saveRepo(repoId: RepoIdentifier, loaded: RepositoryModel) {
        this.loadedRepos.push(loaded);

        console.log("remove repo" + repoString(repoId) + "from todo")
        this.todoRepos.forEach((item, index) => {

            if (    (item.owner === repoId.owner)
                     && (item.repository === repoId.repository)
                ) {
                this.todoRepos.splice(index, 1);
                
            }
        })
    }
}
function repoString(repo: RepoIdentifier): string {
    return repo.owner + '/' + repo.repository
}


export async function crawlRepositories(repos: Array<RepoIdentifier>, gitApi: Octokit): Promise<CrawlResult> {

    let result = new CrawlResult(repos);
    console.info("Start readin repos")

    for (let currentId of repos) {

        console.log(`----> Process Reop (${currentId.owner}/${currentId.repository})`)
        try {
            let loaded = await createModelFromResponse(currentId, gitApi)
            result.saveRepo(currentId, loaded)
        
        } catch (e) {
            console.error(e);
            console.log("Will save current result")
            return result;
        }

    }
    console.log('Done with crawling');
    return result;
}


/**
 * https://octokit.github.io/rest.js
 */
export async function createModelFromResponse(repoId: RepoIdentifier, gitApi: Octokit): Promise<RepositoryModel> {

    const response = (await gitApi.repos.get({ owner: repoId.owner, repo: repoId.repository }))
    if (response.status == 403) {
        console.info(`error happend why accesing repository ${repoId.owner}/${repoId.repository} : \n` + JSON.stringify(response.headers))
        throw new Error('no more calls left')
    }

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
async function createContributors(repostoriy: RepoIdentifier, gitApi: Octokit)
    : Promise<Array<Contributer>> {

    const response = await gitApi.repos.getContributorsStats({ owner: repostoriy.owner, repo: repostoriy.repository })
    checkForLimitError(repostoriy, response);
    const contributerStats = response.data;
    //console.log("contributer:  " + JSON.stringify(contributerStats, null, 2))
    let result: Array<Contributer> = [];
    for (let i = 0; i < contributerStats.length; i++) {
        let contrib = contributerStats[i];
        result.push({
            name: contrib.author.login,
            totalSize: contrib.total
        })
    }

    console.log(`Added ${result.length} contributors`);
    return result;
}
async function createTopics(repo: RepoIdentifier, gitApi: Octokit)
    : Promise<Array<string>> {
    const response = await gitApi.repos.listTopics({ owner: repo.owner, repo: repo.repository })
    checkForLimitError(repo, response);

    const result: Array<string> = response.data.names
    console.log(`Added Topics: ${JSON.stringify(result)}`)

    return result;
}
async function createLanguages(repostoriy: RepoIdentifier, gitApi: Octokit)
    : Promise<Array<LanguageUsage>> {
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
    console.log(`Added Languages: ${JSON.stringify(result)}`)

    return result;
}

function checkForLimitError(repo: RepoIdentifier, response: any) {
    if (response.status == 403) {
        console.info(`error happend why accesing contributers for${repo.owner}/${repo.repository} : \n` + JSON.stringify(response.headers))
        throw new Error('no more calls left')
    }
}


