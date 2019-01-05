import * as fs from 'fs';
import * as path from 'path';

import * as Octokit from '@octokit/rest';
import { config } from './environment'

import { crawlRepositories, CrawlResult } from './repos'
import { RepositoryModel, RepoIdentifier } from './model'
import { showLimits } from './showlimit'
import { Configuration } from 'tslint';

export interface FullConfiguration {
    outputFile: string;
    outputFolder: string;
    statiticsFile: string;
    inputFolder: string;
    inputFile: string;
    todoFile: string;
    fishyFile: string;

    shoudOverrideOutput: boolean
    shouldConsoleLog: boolean;
    flattenOutput: boolean;
    skipTodo: boolean;
}

export interface Configuration extends Partial<FullConfiguration> { }

const DEFAULT_CONFIG: FullConfiguration = {

    outputFile: 'output.json',
    outputFolder: 'results',

    statiticsFile: 'stats.json',

    inputFolder: 'repo_input',
    inputFile: 'repos.json',
    todoFile: 'todo.json',
    fishyFile: 'naughtyRepos.json',

    shoudOverrideOutput: false,
    shouldConsoleLog: false,
    flattenOutput: true,
    skipTodo: false
}

const gitApi = new Octokit({
    headers: {
        'Time-Zone': 'Europe/Amsterdam',
        'Accept': 'application/vnd.github.mercy-preview+json, application/vnd.github.mercy-preview+json'
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
    } else if (args.includes('--justInput') || args.includes('justInput')) {
        await generateInputFile(gitApi);

    } else {

        await loadRepositories();
        await showLimits(gitApi);

    }
}
export async function generateInputFile(gitApi: Octokit, config: Configuration = {}): Promise<void> {
    let fullConfig = { ...DEFAULT_CONFIG, ...config };

    console.log('here we go');
    let response = await gitApi.repos.listPublic({ per_page: 100 });

}
export async function loadRepositories(config: Configuration = {}): Promise<CrawlResult> {
    let fullConfig = { ...DEFAULT_CONFIG, ...config }

    const repoIds = await loadRepoList(fullConfig);

    const crawlResult = await crawlRepositories(repoIds, gitApi, fullConfig);

    await saveResults(crawlResult, fullConfig);

    if (!crawlResult.isFinished()) {
        console.info("Cralw was not finished in one run");
        await saveTodos(crawlResult, fullConfig);
    }
    if (crawlResult.hasFishyRepos()) {
        console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>");
        console.info(`there were some fishy repos(${crawlResult.fhisyRepos.length}), we added them to the list`);
        await saveFishy(crawlResult, fullConfig)
    }
    return crawlResult;
}

async function loadRepoList(config: FullConfiguration): Promise<Array<RepoIdentifier>> {
    const inputPath: string = path.join(config.inputFolder, config.inputFile);
    const todoPath: string = path.join(config.inputFolder, config.todoFile);

    let read = (path: string, ): Array<RepoIdentifier> => {
        const input: Array<RepoIdentifier> = JSON.parse(fs.readFileSync(path).toString());
        console.log("We have " + input.length + " repos to read");
        return input;
    }
    if (fs.existsSync(todoPath) && !config.skipTodo) {
        console.info("Will read from Todo");
        return read(todoPath);

    } else {
        if (!fs.existsSync(inputPath)) {
            console.info(">>>ERROR! No input file specified");
        }

        return read(inputPath);
    }

}
async function saveResults(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {

    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }

    const outputPath = path.join(config.outputFolder, config.outputFile);

    let loaded = cralwResult.loadedRepos;
    if (!config.shoudOverrideOutput) {
        if (fs.existsSync(outputPath)) {
            let existingRepos: Array<RepositoryModel> = JSON.parse(fs.readFileSync(outputPath).toString());
            console.log('loaded existing repos:  ' + existingRepos.length)
            loaded= loaded.concat(existingRepos);
        }
    }

    let output;
    if (config.flattenOutput) {
        output = JSON.stringify(loaded);
    } else {
        output = JSON.stringify(loaded, null, 2);
    }

    console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>")
    console.info("we saved " + loaded.length + " repos");

    await fs.promises.writeFile(outputPath, output);
}

async function saveTodos(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const todoPath = path.join(config.outputFolder, config.todoFile);
    const todoOutput = JSON.stringify(cralwResult.todoRepos, null, 2)
    console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>")
    console.info("we have still " + cralwResult.todoRepos.length + " repos todo");

    await fs.promises.writeFile(todoPath, todoOutput);
}

async function saveFishy(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const fishyPath = path.join(config.outputFolder, config.fishyFile);
    await fs.promises.writeFile(fishyPath, JSON.stringify(cralwResult.fhisyRepos, null, 3));
}