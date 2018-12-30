import * as fs from 'fs';
import * as path from 'path';

import * as Octokit from '@octokit/rest';

import { config } from './environment'

import { crawlRepositories, createAllRepositoriesById } from './repos'
import { RepositoryModel, RepoIdentifier } from './model'
import { showLimits } from './showlimit'
import { Configuration } from 'tslint';
interface FullConfiguration {
    outputFile: string;
    outputFolder: string;
    statiticsFile: string;
    inputFolder: string;
    inputFile: string;
    todoFile: string;
}

export interface Configuration extends Partial<FullConfiguration> { }

const DEFAULT_CONFIG: FullConfiguration = {

    outputFile: 'output.json',
    outputFolder: 'results',

    statiticsFile: 'stats.json',

    inputFolder: 'repo_input',
    inputFile: 'repositories.json',
    todoFile: 'todo.json',
}

const gitApi = new Octokit({
    headers: {
        'Time-Zone': 'Europe/Amsterdam',
        'Accept': 'application/vnd.github.mercy-preview+json'
    }
})

gitApi.authenticate({
    type: 'token',
    token: config.GIT_TOKEN
})

main();

async function main() {
    let args = process.argv || []
    
    if (args.includes('--justShow') || args.includes('justShow')) {
        showLimits(gitApi);
    } else {

        await loadRepositories();
        await showLimits(gitApi);

    }
}

export async function loadRepositories(config: Configuration = {}): Promise<CrawlResult> {
    let fullConfig = { ...DEFAULT_CONFIG, ...config }

    const repoIds = await loadTodoList(gitApi, fullConfig);

    const {repoModels, crawlResult} = await crawlRepositories(repoIds, gitApi);

    await saveResults(repoModels, fullConfig);
    return crawlResult;
}

async function loadTodoList(gitApi: Octokit, config: FullConfiguration): Promise<Array<RepoIdentifier>> {
    return null
}
async function saveResults(repoModels: Array<RepositoryModel>, config: FullConfiguration): Promise<any> {

    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const outputPath = path.join(config.outputFolder, config.outputFile);
    const output = JSON.stringify(repoModels, null, 2);

    await fs.promises.appendFile(outputPath, output);
}

