import * as fs from 'fs';
import * as path from 'path';

import * as Octokit from '@octokit/rest';
import { config } from './environment'
import * as moment from 'moment';

import { crawlRepositories, CrawlResult } from './repos'
import { RepositoryModel, RepoIdentifier, LanguageUsage } from './model'
import { showLimits, getRateLimit } from './showlimit'
import { Configuration } from 'tslint';
import { stringify } from 'querystring';

export interface FullConfiguration {
    outputFile: string;
    outputSearch: string;
    outputFolder: string;
    knownIdsFile: string;

    analyticsFolder: string;
    apriori_Matrix: string;
    langMap: string;
    topicsMap: string;
    repoModelFile: string;

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
    MAX_HEADER_TYPE: number;
    MAX_HEADER_LANG: number;
    CALLS_PER_REPO: number;
}
export interface Configuration extends Partial<FullConfiguration> { }

const DEFAULT_CONFIG: FullConfiguration = {

    outputFolder: 'results',
    outputFile: 'output.json',
    outputSearch: 'searchedRepos.json',
    knownIdsFile: 'knownIds.json',

    statiticsFile: 'stats.json',

    analyticsFolder: 'analytics',
    apriori_Matrix: 'Matrix_apriori.json',
    topicsMap: 'Map_topics.json',
    langMap: 'Map_language.json',
    repoModelFile: 'RepoData.json',

    inputFolder: 'repo_input',
    inputFile: 'input.json',
    todoFile: 'todo.json',
    fishyFile: 'naughtyRepos.json',

    shoudOverrideOutput: false,
    shouldConsoleLog: false,
    flattenOutput: true,
    skipTodo: false,

    MAX_SEARCH: 2000,
    MAX_HEADER_LANG: 60,
    MAX_HEADER_TYPE: 60,
    CALLS_PER_REPO: 4

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
    } else if (args.includes('--justAnalysisData') || args.includes('justAnalysisData')) {
        await generateAnalysisData();
    } else {
        let todoPath = path.join(DEFAULT_CONFIG.outputFolder, DEFAULT_CONFIG.todoFile)
        do {
            await loadRepositories(gitApi);
            const limit = await getRateLimit(gitApi);
            if (limit.resources.core.remaining < DEFAULT_CONFIG.CALLS_PER_REPO) {
                console.info('no calls left, should rest, check for todo')
                break;
            }
        } while (fs.existsSync(todoPath))


        await generateAnalysisData()
        await showLimits(gitApi);

    }
}

async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}
export async function generateAnalysisData(partialConfig: Configuration = {}): Promise<void> {
    let config = { ...DEFAULT_CONFIG, ...partialConfig };
    console.log('-------Start building files for data analysis--------');

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



    let reduceToKey = (val: [string, number], index) => { return val[0] }
    const topicHeader: Array<string> = topTopics.map(reduceToKey).slice(0, config.MAX_HEADER_TYPE);
    const langHader: Array<string> = topLanguages.map(reduceToKey).slice(0, config.MAX_HEADER_LANG);

    console.info(`--->Most ${config.MAX_HEADER_TYPE} Topics: \n${topicHeader}\n\n---> Most ${config.MAX_HEADER_LANG} Languages:\n${langHader}\n `);

    saveAprioriMatrix(input, langHader, topicHeader, config)
    saveClassifierData(input, langHader, topicHeader, config)
    saveMapData(TopicsMap, LanguagesMap, config)


}
export async function saveMapData(topics: Map<String, number>, langs: Map<String, number>, config: FullConfiguration): Promise<void> {
    if (!fs.existsSync(config.analyticsFolder)) {
        fs.mkdirSync(config.analyticsFolder)
    }
    let topicPath = path.join(config.analyticsFolder, config.topicsMap);
    let langPath = path.join(config.analyticsFolder, config.langMap);

    let genObject = (val: [string, number]) => {
        let result = {}
        result[val[0]] = val[1]
        return result;
    };

    let topicsOut: Array<any> = Array.from(topics.entries()).map(genObject)
    let langOut: Array<any> = Array.from(langs.entries()).map(genObject);

    fs.promises.writeFile(topicPath, JSON.stringify(topicsOut));
    fs.promises.writeFile(langPath, JSON.stringify(langOut));
}
export async function saveAprioriMatrix(
    input: Array<RepositoryModel>,
    langHader: Array<string>,
    topicHeader: Array<string>,
    config: FullConfiguration)
    : Promise<void> {

    
    let result: Array<{ any }> = [];
    console.info('compute Apriori Matrix for ' + input.length + ' repos');
    const reducelangUsage = (val: LanguageUsage) => { return val.name };
    for (let repo of input) {
        let entry: any = {};
        entry.id = repo.id;
        entry.name = repo.fullRepoName;

        for (let lang of langHader) {
            let langs = repo.usedLanguages.map(reducelangUsage);
            let hasIt = langs.includes(lang);
            entry[lang] = hasIt ? 1 : 0;//it is easyer to parse that way..
        }
        for (let topic of topicHeader) {
            let hasIt = repo.topics.includes(topic);
            entry['t_' + topic] = hasIt ? 1 : 0; //it is easyer to parse that way..
        }
        result.push(entry);
    }
    if (!fs.existsSync(config.analyticsFolder)) {
        fs.mkdirSync(config.analyticsFolder)
    }
    const output = JSON.stringify(result, null, 2);
    const filePath = path.join(config.analyticsFolder, config.apriori_Matrix);
    fs.promises.writeFile(filePath, output);
}
export async function saveClassifierData(
    input: Array<RepositoryModel>,
    langHader: Array<string>,
    topicHeader: Array<string>,
    config: FullConfiguration)
    : Promise<void> {

    console.info('compute ClassifierData for ' + input.length + ' repos');

    let reduceContributers = (repo: RepositoryModel): number => {
        return repo.contributers.length;
    };
    let reduceTopics = (result: any, repo: RepositoryModel) => {
        for (let topic of topicHeader) {
            result['t_' + topic] = repo.topics.includes(topic) ? 1 : 0;
        }
    };
    let reduceLanguages = (result: any, repo: RepositoryModel) => {
        for (let lang of langHader) {
            let langMap = new Map<string, number>();

            repo.usedLanguages.forEach((val, i) => {
                langMap.set(val.name, val.sizeInBytes);
            })
            result[lang] = langMap.has(lang) ? langMap.get(lang) : 0;
        }
    };
    let result: Array<{ any }> = [];
    for (let repo of input) {
        let entry: any = {}
        entry.id = repo.id;
        entry.name = repo.fullRepoName;
        entry.yearCreated = moment(repo.createdAt).get('year');
        entry.yearLastUpdated = moment(repo.updatedAt).get('year');
        entry.sizeInBytes = repo.sizeInBytes;
        entry.mainLanguage = repo.mainLanguage;
        entry.forkCount = repo.forkCount;
        entry.contributers = reduceContributers(repo);
        reduceTopics(entry, repo);
        reduceLanguages(entry, repo);
        result.push(entry);
    }
    const output = JSON.stringify(result, null, 2);
    const filePath = path.join(config.analyticsFolder, config.repoModelFile);
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
                q: 'topics:>2',
                sort: 'updated',
                order: 'asc'
            });
            console.info('search yields to ' + respone.data.total_count + ' repos')
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
export async function loadRepositories(gitApi: Octokit, partialConfig: Configuration = {}): Promise<CrawlResult> {
    let config = { ...DEFAULT_CONFIG, ...partialConfig }

    const repoIds = await loadRepoList(config);
    //saveToKnownIds(repoIds, fullConfig);

    const crawlResult = await crawlRepositories(repoIds, gitApi, config);

    await saveResults(crawlResult, config);

    if (!crawlResult.isFinished()) {
        console.info("Cralw was not finished in one run");
        await saveTodos(crawlResult, config);
    } else {
        removeTodoFile(config);
    }
    if (crawlResult.hasFishyRepos()) {
        await saveFishy(crawlResult, config)
    }
    return crawlResult;
}
async function saveToKnownIds(newIds: Array<RepoIdentifier>, config: FullConfiguration) {
    console.info('first save known ids');
    const knownPath = path.join(config.outputFolder, config.knownIdsFile)
    let loadedIds = newIds;
    if (fs.existsSync(knownPath)) {
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
            let rsltMap = new Map<number, RepositoryModel>();
            let existingRepos: Array<RepositoryModel> = JSON.parse(fs.readFileSync(outputPath).toString());
            console.log('loaded existing repos:  ' + existingRepos.length)

            let copyToMap = (input: Array<RepositoryModel>): void => {
                input.forEach((val, i) => { rsltMap.set(val.id, val) })
            }
            copyToMap(existingRepos);
            copyToMap(loaded);
            loaded = Array.from(rsltMap.values());
            console.info(`will write ${loaded.length - existingRepos.length} new repositories`)
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
        let noDoublettes = new Map<string, RepoIdentifier>();
        loaded.forEach((value, index) => {
            noDoublettes.set(value.owner + '/' + value.repository, value);
        })
        loaded = Array.from(noDoublettes.values());
        console.log(`will save ${loaded.length - existingIds.length} new inputs (total: ${loaded.length})`);
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
async function removeTodoFile(config: FullConfiguration) {
    const todoPath = path.join(config.outputFolder, config.todoFile);
    if (fs.existsSync(todoPath)) {
        console.info('will delete todo file!!')
        fs.unlinkSync(todoPath);
    }
}
async function saveFishy(cralwResult: CrawlResult, config: FullConfiguration): Promise<void> {
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder)
    }
    const loaded = cralwResult.fhisyRepos;
    const fishyPath = path.join(config.outputFolder, config.fishyFile);
    let existing = [];
    if (fs.existsSync(fishyPath)) {
        existing = JSON.parse(fs.readFileSync(fishyPath).toString())
    }
    console.info("<<====>>>>><<<<<<<<>>>>>>><<<<<<====>>");
    console.info(`there were some fishy repos(${cralwResult.fhisyRepos.length}), we added them to the list`);

    await fs.promises.writeFile(fishyPath, JSON.stringify(loaded.concat(existing), null, 3));
}
