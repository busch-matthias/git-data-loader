export interface RepositoryModel {
    owner: string;
    name: string;
    contributers?: Contributer[];
    topics?: string[];
    mainLanguage?: string;
    usedLanguages?: LanguageUsage[];
    sizeInBytes?: number;
    createdAt?: string;
    livetimeInDays?: number;
    updatedAt?: string;
    forkCount?: number;
}
export interface LanguageUsage {
    name: string;
    sizeInBytes: number;
}
export interface Contributer {
    name: string;
    class?: ContributerClass;
}
export declare enum ContributerClass {
    MAIN = 0,
    SINGLE_GOD = 1,
    MINOR = 2
}
