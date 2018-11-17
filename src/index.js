const octokit = require('@octokit/rest')()
const fs = require('fs');

// Compare: https://developer.github.com/v3/repos/#list-organization-repositories
/*octokit.repos.getForOrg({
    org: 'octokit',
    type: 'public'
}).then(({ data, headers, status }) => {
    // handle data
    console.info('status:' + JSON.stringify(status, null, 2))
    console.info('headers:' + JSON.stringify(headers, null, 2))
    console.info('data:' + JSON.stringify(data, null, 2))
})*/

async function paginate(method, args) {
    let response = await method({ per_page: 100, ...args })
    let { data } = response
    console.info(Object.getOwnPropertyNames(data))
    for (prop in data){
        console.info('Shit has propertie'+ prop)
    }
    while (octokit.hasNextPage(response)) {
        response = await octokit.getNextPage(response)
        data = data.concat(response.data)
    }
    return data
}

// could be that we need application/vnd.github.mercy-preview+json
paginate(octokit.search.topics,{
    q: 'is:curated repositories:>20',
  }).then(data => {
      let string = JSON.stringify(data, null, 2);
      fs.writeFile('search.json', string, (err) => {
          if (err) throw err;
          console.log('complete search');
      })

  })
/*paginate(octokit.repos.getForOrg,{org: 'octokit', type: 'public'})
    .then(data => {
        let string = JSON.stringify(data,null,2);
        fs.writeFile('result.json', string, (err) => {
            if (err) throw err;
            console.log('complete getOrg');
        })
    })
*/