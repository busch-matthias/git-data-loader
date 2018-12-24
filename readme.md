## TODO
https://octokit.github.io/rest.js/#api-Repos-listTopics
https://developer.github.com/v3/repos/#get

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




# create repository model

