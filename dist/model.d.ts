export interface RepositoryModel {
    name: string;
    contributers: Contributer[];
    topics: string[];
}
export interface Contributer {
    name: string;
    class: ContributerClass;
}
export declare enum ContributerClass {
    MAIN = 0,
    SINGLE_GOD = 1,
    MINOR = 2
}
