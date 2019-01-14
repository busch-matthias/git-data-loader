
## Notes
 * https://github.com/octokit/rest.js#custom-requests
 * 

## TODO
 * https://octokit.github.io/rest.js/#api-Repos-listTopics
 * https://developer.github.com/v3/repos/#get


## Installation of the project 
### 1. Git Clone
```
git clone git@github.com:Londane/git-data-loader.git
```

### 2. NPM stuff  
prerequisites:
* installed Node & npm : [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
* maybe install TypeScript :   
  run in your terminal
  ```
  npm install -g typescript
  ```


After all prerequisites are installed, go into the project directory and run these commands :  
1. let npm do it's install `"magic"`
   ```
   npm install
   ```
1. create your **very own** special little `.env` file   
(you will need it later for you api token)
   ```
   npm run init-env
   ```
   (if you already have an .env file this command will do nothing. That will happen if you run it twice. So if in doubt check your existing .env file)
### 2. GIT-Hub Personal API Token
If we do not authorize we only have `60 calls per HOUR`!  
But **If we do authorize** we will have `5000 calls per Hour`.  
[See](https://developer.github.com/v3/rate_limit/)

So this script needs a valid API-Token and thus will eat up all of your Remaining calls to the github api. But do not fear, the rate limit will be reset after an hour! 

Do:
* create a personal api Token: [Github-Blog](https://blog.github.com/2013-05-16-personal-api-tokens/)  
**MIND that you only see your token once.**  
 So write it down or `ctrl + c` it !

 * to see your private repos you have to give full controle in the repo section

 * `ctrl + v` your api token into the `.env` file.  
  (Use the `GITHUB_PERSONAL_TOKEN` variable)




# cralw repositories

The script uses a 2 step procedure to crawl the desired repositories.
  1. First you generate a input-list witch holds all repository identifiers you want to cralw.
  
      *  At the moment you have to manually configure the desired search query in the code in the `generateInputFile`: `index.ts line:299`.

      * Then use the following command to append the searched repositorys to your input file   
        ```
        npm run gen-input
        ```
        
  2. If you generated the input file place it in the `input` folder and start the script with  
      ```
       npm run go
      ```  
     *  The script will now load all repositorys to the `output` folder. You can let the script run as it will save a temporary resoult every 200 loaded repositorys and will also wait and restart if your git hub api rate limit runs out.
     *  The script will also write all unloaded repositorys to the `todo` file. That way the original `input` file won't be changed.
     * There exist some repositorys wich can not be loaded. These repositorys will land in the `naughtyRepos.json`list.
     
  
# generate datasets model

The script will save the repository data into the `output.json` file.
THen you can use 
```
npm run gen-analyticData
```
To generate the matrices for the apriori rule extraction.
It will compute the most used config.MAX_HEADER_TOPICS topics and config.MAX_HEADER_LANG languages and then will check for each repository if it contains one of these topics / languages.
It will create a `data.zip` wich you can then analyse with the R scripts.

# Util
Use the following command to see your git hub api rate limit and when it will refresh
```
npm run limit
```
