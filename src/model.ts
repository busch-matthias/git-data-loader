export interface RepositoryModel{
    name: string;
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
export interface Contributer{
    name: string;
    class?: ContributerClass;

}
export enum ContributerClass{
    MAIN,  //asds
    SINGLE_GOD,
    MINOR,
}