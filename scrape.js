const axios = require('axios');
const fs = require('fs');

// Sleep function
function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Returns array of internal urls
function getSpeciesUrls(species, callback){
  let source = "";
  const reg = /<li><a href="\/wiki\/.*?" class="mw-redirect"/g;
  let speciesUrls = [];

  axios.get(species).then(response => {
    source = response.data;
    speciesUrls = source.match(reg).map(s => s.slice(19, s.length - 21));
    callback(speciesUrls);
  });
}

// Returns array of revisions 
async function countRevisions(speciesUrls, callback){
  const results = [];
  let i = 0;

  for(url of speciesUrls){
    i++;
    url = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=user&rvlimit=max&format=json&redirects&titles=' + url;
    let arr;
    let revs = 0;
    axios.get(url).then(async response => {
      let resp = response;
      while(resp.data.continue){
        revs = revs + 500;
        newurl = url + '&rvcontinue=' + resp.data.continue.rvcontinue;
        let newresp = await axios.get(newurl);
        await sleep(1000);
        resp = newresp;
      }
      arr = resp.data.query.pages;
      results.push(revs + Object.keys(arr).map(key => (arr[key] && arr[key].revisions && arr[key].revisions.length)).filter(n => n)[0]);
      await sleep(1000);
      if(i >= speciesUrls.length){
        callback(results);
      }
    }).catch(err => console.log(err));
  }
}

// Returns a single formatted cvs row
function getRow(species, callback){
  let urls;
  let revs;
  getSpeciesUrls(species, c => {
    urls = c
    countRevisions(urls, c => {
    
    revs = c;

    let string = species;
    for(rev of revs){
      string = string + ',' + rev;
    }
    callback(string+ '\n');})});
}

// Write results to file
async function writeData(){
  let data = '';
  const listUrls = ['https://en.wikipedia.org/wiki/List_of_critically_endangered_amphibians',
    'https://en.wikipedia.org/wiki/List_of_critically_endangered_birds',
    'https://en.wikipedia.org/wiki/List_of_critically_endangered_mammals'];
  
  for(url of listUrls){
    let row;
    await getRow(url, c => row = c);
    data = data + row;
    await sleep(500);
  }

  fs.writeFileSync('data.csv',data);
}
