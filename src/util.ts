import * as Octokit from '@octokit/rest';
const octokit = new Octokit();

export async function paginate(method, args) {
    let response = await method({ per_page: 100, ...args })
    let { data } = response
    console.info(Object.getOwnPropertyNames(data))
    for (let prop in data){
        console.info('Shit has properties: '+ prop)
    }
    while (octokit.hasNextPage(response)) {
        response = await octokit.getNextPage(response)
        data = data.concat(response.data)
    }
    return data
}