import * as fs from 'fs';
import * as path from 'path';

import * as Octokit from '@octokit/rest';

import { config } from './environment'

import { crawlRepositories, CrawlResult } from './repos'
import { RepositoryModel, RepoIdentifier } from './model'
import { showLimits } from './showlimit'
import { Configuration } from 'tslint';
import { consoleTestResultHandler } from 'tslint/lib/test';
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
    inputFile: 'repos.json',
    todoFile: 'todo.json',
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
    let fullConfig = { ...DEFAULT_CONFIG, ...config }
}
export async function loadRepositories(config: Configuration = {}): Promise<CrawlResult> {
    let fullConfig = { ...DEFAULT_CONFIG, ...config }

    const repoIds = await loadTodoList(fullConfig);

    const crawlResult = await crawlRepositories(repoIds, gitApi);

    await saveResults(crawlResult, fullConfig);
    
    if (!crawlResult.isFinished()) {
        console.info("Cralw was not finished in one run")
        await saveTodos(crawlResult, fullConfig);
    }
    return crawlResult;
}

async function loadTodoList(config: FullConfiguration): Promise<Array<RepoIdentifier>> {
    const inputPath :string = path.join(config.inputFolder, config.inputFile);
    const todoPath :string = path.join(config.inputFolder, config.todoFile);
    if (fs.existsSync(todoPath)) {
        console.info(">>>ERROR! can not read from todo-File at the moment");
    } else {
        if (!fs.existsSync(inputPath)) {
            console.info(">>>ERROR! No input file specified");
        }
        let content  = fs.readFileSync(inputPath);
        const input: Array<RepoIdentifier> = JSON.parse(content.toString());
        console.log("We have "+ input.length+" repos to read")
        return input;
    }
    return [];
}
async function saveResults(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {

    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }

    const outputPath = path.join(config.outputFolder, config.outputFile);
    const output = JSON.stringify(cralwResult.loadedRepos,null,2);

    console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>")
    console.info("we saved " + cralwResult.loadedRepos.length + " repos");

    await fs.promises.appendFile(outputPath, output);
}

async function saveTodos(cralwResult: CrawlResult, config: FullConfiguration): Promise<void>{
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const todoPath= path.join(config.outputFolder, config.todoFile);
    const todoOutput = JSON.stringify(cralwResult.todoRepos,null,2)
    console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>")
    console.info("we have still " + cralwResult.todoRepos.length + " repos todo");

    await fs.promises.writeFile(todoPath, todoOutput);
}
