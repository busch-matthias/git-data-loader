import * as fs from 'fs';
import * as path from 'path';

import * as Octokit from '@octokit/rest';
import { config } from './environment'
import * as moment from 'moment';

import { crawlRepositories, CrawlResult } from './repos'
import { RepositoryModel, RepoIdentifier,LanguageUsage } from './model'
import { showLimits, getRateLimit } from './showlimit'
import { Configuration } from 'tslint';
import { textSpanContainsPosition } from 'typescript';
import { mapDefined } from 'tslint/lib/utils';

export interface FullConfiguration {
    outputFile: string;
    outputSearch: string;
    outputFolder: string;
    apriori_Matrix: string;
    knownIdsFile: string;

    statiticsFile: string;
    inputFolder: string;
    inputFile: string;
    todoFile: string;
    fishyFile: string;

    shoudOverrideOutput: boolean
    shouldConsoleLog: boolean;
    flattenOutput: boolean;
    skipTodo: boolean;

    MAX_SEARCH: number;
    MAX_HEADER_TYPE:number;
    MAX_HEADER_LANG:number;
}

export interface Configuration extends Partial<FullConfiguration> { }

const DEFAULT_CONFIG: FullConfiguration = {

    outputFolder: 'results',
    outputFile: 'output.json',
    apriori_Matrix: 'apirioriMatrix.json',
    outputSearch: 'searchedRepos.json',
    knownIdsFile: 'knownIds.json',
    statiticsFile: 'stats.json',

    inputFolder: 'repo_input',
    inputFile: 'input.json',
    todoFile: 'todo.json',
    fishyFile: 'naughtyRepos.json',

    shoudOverrideOutput: false,
    shouldConsoleLog: false,
    flattenOutput: true,
    skipTodo: false,

    MAX_SEARCH: 1000,
    MAX_HEADER_LANG: 30,
    MAX_HEADER_TYPE: 30

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
        await showLimits(gitApi);
    } else if (args.includes('--justTopics') || args.includes('justTopics')) {
        await generateApriori(gitApi);
    } else {

        await loadRepositories();
        await showLimits(gitApi);

    }
}

async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}
export async function generateApriori(gitApi: Octokit, partialConfig: Configuration = {}): Promise<void> {
    let config = { ...DEFAULT_CONFIG, ...partialConfig };
    console.log('start crawling topics');

    let filePath = path.join(config.outputFolder, config.outputFile);
    const input: Array<RepositoryModel> = JSON.parse(fs.readFileSync(filePath).toString());
    console.info('loaded ' + input.length + ' repos');

    let LanguagesMap = new Map<String, number>();
    let TopicsMap = new Map<String, number>();

    let increaseEntry = (map: Map<String, number>, entry: string): void => {
        let current = map.has(entry) ? map.get(entry) + 1 : 1;
        map.set(entry, current);
    }
    for (let currentRepo of input) {

        if (currentRepo.usedLanguages) {
            currentRepo.usedLanguages.forEach((value, index) => {
                increaseEntry(LanguagesMap, value.name);
            })
        } else {
            console.info(currentRepo.id + " has no languages")
        }
        if (currentRepo.topics) {
            currentRepo.topics.forEach((value, index) => {
                increaseEntry(TopicsMap, value);
            })
        } else {
            console.info(currentRepo.id + " has no topics")
        }
    }
    let sortEntrys = (a: [String, number], b: [String, number]): number => { return b[1] - a[1] };

    let topLanguages = Array.from(LanguagesMap.entries()).sort(sortEntrys);
    let topTopics = Array.from(TopicsMap.entries()).sort(sortEntrys);

    

    let reduceToKey = (val:[string,number], index) =>{ return val[0]}
    const topicHeader :Array<string> = topTopics.map(reduceToKey).slice(0, config.MAX_HEADER_TYPE);
    const langHader : Array<string> = topLanguages.map(reduceToKey).slice(0, config.MAX_HEADER_LANG);

    console.info(
     `--->Most ${config.MAX_HEADER_TYPE} Topics: 
     ${topicHeader} 
        
     ---> Most ${config.MAX_HEADER_LANG} Languages: 
     ${langHader} `);
   
     await saveAprioriMatrix(input,langHader,topicHeader, config  )
   
    let topicPath = path.join(config.outputFolder, 'map_topics.json');
    let langPath = path.join(config.outputFolder, 'map_languages.json');
    let topicsOut: Array<any> = Array.from(TopicsMap.entries()).map(
        (val: [string, number]) => { 
            let result={}
            result[val[0]] = val[1]
            return result;
        })
    let langOut:Array<any> = Array.from(LanguagesMap.entries()).map(
        (val: [string, number]) => { 
            let result={}
            result[val[0]] = val[1]
            return result;
        })
    fs.promises.writeFile(topicPath, JSON.stringify(topicsOut));
    fs.promises.writeFile(langPath, JSON.stringify(langOut));

}
export async function saveAprioriMatrix(
    input: Array<RepositoryModel>,
    langHader: Array<string>,
    topicHeader: Array<string>, 
    config: FullConfiguration  )
    :Promise<void>{
        let result:Array<{any}> = [];
        
        console.info('compute Apriori Matrix for '+input.length+' repos');
        const reducelangUsage = (val:LanguageUsage)=>{return val.name};
        for(let repo of input){
            let entry:any = {};
            entry.id = repo.id;
            entry.name= repo.fullRepoName;
            
            for(let lang of langHader){
                let langs = repo.usedLanguages.map(reducelangUsage);
                let hasIt = langs.includes(lang);
                entry[lang]= hasIt;
            }
            for(let topic of topicHeader){
                let hasIt=  repo.topics.includes(topic);
                entry[topic]= hasIt;
            }
            result.push(entry);    
        }
        const output = JSON.stringify(result,null,2);
        const filePath = path.join(config.outputFolder, config.apriori_Matrix);
        fs.promises.writeFile(filePath, output);
}

export async function generateInputFile(gitApi: Octokit, partialConfig: Configuration = {}): Promise<void> {
    let config = { ...DEFAULT_CONFIG, ...partialConfig };

    console.log('here we go');
    const result: Array<RepoIdentifier> = [];
    let page = 0;
    for (let i = 0; result.length < config.MAX_SEARCH; i++) {
        try {
            const respone = await gitApi.search.repos({
                per_page: 100,
                page: page,
                q: 'topics:>1',
                sort: 'stars',
                order: 'asc'
            });
            page += 1;

            let repos = respone.data.items;

            for (let currentIndex = 0; repos.length; currentIndex++) {
                let currentRepo = repos[currentIndex];
                //console.log(currentRepo)
                result.push(
                    {
                        owner: currentRepo.owner.login,
                        repository: currentRepo.name
                    })

            }
            console.log('loaded prepos: ' + result.length)
            console.log('loaded page: ' + page + ' with ' + repos.length + ' repos');
        } catch (error) {
            console.log('We got an error at page' + i)
            console.log(error)

            if (error.status === 422) {
                return await saveInputSearch(result, config);
            }
            const rateLimit = await getRateLimit(gitApi);
            const remaining = rateLimit.resources.search.remaining;

            const resetAt = moment(rateLimit.resources.search.reset * 1000);
            const waitFor = moment().diff(resetAt, 'milliseconds')
            if (remaining < 1) {
                console.log('will wait for ' + waitFor + ' ms')
                await sleep(waitFor)
            }
        }
    }
    console.log('done search');
    await saveInputSearch(result, config);

}
export async function loadRepositories(config: Configuration = {}): Promise<CrawlResult> {
    let fullConfig = { ...DEFAULT_CONFIG, ...config }

    const repoIds = await loadRepoList(fullConfig);
    saveInputSearch(repoIds, fullConfig);
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
async function saveToKnownIds(newIds: Array<RepoIdentifier>, config: FullConfiguration) {
    console.info('first save known ids');
    const knownPath = path.join(config.outputFolder, config.knownIdsFile)
    let loadedIds = newIds;
    if(fs.existsSync(knownPath)){
        let existingRepos: Array<RepoIdentifier> = JSON.parse(fs.readFileSync(knownPath).toString());
        loadedIds = loadedIds.concat(existingRepos);
    }
    fs.promises.writeFile(knownPath, JSON.stringify(loadedIds));
    
}
async function loadRepoList(config: FullConfiguration): Promise<Array<RepoIdentifier>> {
    const inputPath: string = path.join(config.inputFolder, config.inputFile);
    const todoPath: string = path.join(config.outputFolder, config.todoFile);

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
export async function saveResults(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {

    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const outputPath = path.join(config.outputFolder, config.outputFile);

    let loaded = cralwResult.loadedRepos;
    if (!config.shoudOverrideOutput) {
        if (fs.existsSync(outputPath)) {
            let existingRepos: Array<RepositoryModel> = JSON.parse(fs.readFileSync(outputPath).toString());
            console.log('loaded existing repos:  ' + existingRepos.length)
            loaded = loaded.concat(existingRepos);
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
async function saveInputSearch(inputRepos: Array<RepoIdentifier>, config: FullConfiguration) {
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const outputPath = path.join(config.outputFolder, config.outputSearch);
    let loaded = inputRepos;
    if (fs.existsSync(outputPath)) {
        let existingIds: Array<RepoIdentifier> = JSON.parse(fs.readFileSync(outputPath).toString());
        console.log('loaded existing ids:  ' + existingIds.length)
        loaded = loaded.concat(existingIds);
    }
    await fs.promises.writeFile(outputPath, JSON.stringify(loaded));
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
    await fs.promises.appendFile(fishyPath, JSON.stringify(cralwResult.fhisyRepos, null, 3));
}
