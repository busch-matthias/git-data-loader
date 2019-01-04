export interface RepositoryModel{
    id: number;
    owner: string;
    //ownerId: string;
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

export class RepoIdentifier{
    repository: string;
    owner: string
}

export interface Contributer{
    
    name: string;
    totalSize: number;
    class?: ContributerClass;
}

export enum ContributerClass{
    MAIN,  //asds
    SINGLE_GOD,
    MINOR,
}