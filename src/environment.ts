import * as dotenv from 'dotenv';
dotenv.config();

export const config ={
    GIT_TOKEN: process.env.GITHUB_PERSONAL_TOKEN || 'this should crash because you have no Token! >.<'
};