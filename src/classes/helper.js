const axios = require('axios');
const htmlparser2 = require('htmlparser2');
const fs = require('fs');
const path = require('path');

const pinterestParser = async url => {
    let isDone = false;
    let isCorrectScript = false;
    let data, images, videos;

    const parser = new htmlparser2.Parser(
    {
        onopentag(name, atts) {
            if (!isDone && name === 'script' && atts.id === 'initial-state') {
                isCorrectScript = true;
            }
        },
        onattribute(name, value) {

        },
        ontext(text) {
            if (!isDone && isCorrectScript) {
                data = JSON.parse(text);
            }
        },
        onclosetag(tagname) {
            if (!isDone && tagname === 'script' && isCorrectScript) {
                isDone = true;
            }
        }
    },
    { decodeEntities: true }
    );

    try {
        const response = await axios.get(url);
        
        parser.write(response.data);
        parser.end();
        
        images = data.resourceResponses[0].response.data.images;
        videos = data.resourceResponses[0].response.data.videos;
    }
    catch(err) {
        return Promise.reject(`Could not fetch page. Error: ${err}`)
    };

    return { images, videos, "isVideo": videos !== null}
}

const random = (min, max) => {
  return parseInt(min + Math.random() * (max - min + 1));
}

const downloadFileViaURL = async (url, newPath, name) => {  
  if (!name || name === '') {
    let ext = path.extname(url);
    let date = new Date();
    name = date.getTime() + random(1000, 9999) + ext;
  }
  newPath = path.resolve(newPath, name);
  
  const writer = fs.createWriteStream(newPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports = {
    pinterestParser,
    downloadFileViaURL
}