export interface RepositoryModel{
    id: number;
    owner: string;
    ownerId: number;
    name: string;
    fullRepoName: string;
    contributers : Contributer[];
    topics: string[];
    mainLanguage: string;
    usedLanguages: LanguageUsage[];
    sizeInBytes: number;
    createdAt: string;
    livetimeInDays: number;
    updatedAt: string;
    forkCount: number;

}
export interface LanguageUsage{
    name: string;
    sizeInBytes: number;
}

export interface RepoByName{
    repository: string;
    owner: string
}
export interface RepoById{
    id: number
}
export type RepoIdentifier = RepoById | RepoByName;

export interface Contributer{
    name: string;
    class?: ContributerClass;
}

export enum ContributerClass{
    MAIN,  //asds
    SINGLE_GOD,
    MINOR,
}