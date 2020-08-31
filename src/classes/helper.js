const axios = require('axios');
const htmlparser2 = require('htmlparser2');
const fs = require('fs');
const path = require('path');
const appConfigs = require('../config/config.js');

const pinterestParser = async url => {
    let isDone = false;
    let isCorrectScript = false;
    let data, images, videos;

    url = await pinterestUrlSanitizer(url);

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
    }

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

const isValidUrl = url => {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(url);
}

const isSupportedUrl = url => {
    if (!isValidUrl(url)) {
        return false;
    }
    const supportedDomains = appConfigs.SUPPORTED_DOMAINS;
    url = typeof url === "string" ? new URL(url) : url;

    return supportedDomains.some(domain => domain === url.hostname || `www.${domain}` === url.hostname);
}

const isShortenDomain = domain => {
    return appConfigs.SHORTEN_DOMAINS.some(d => d === domain || `www.${d}` === domain);
}

const isFacebookRouter = domain => {
    return appConfigs.FACEBOOK_LINK_ROUTER.some(d => d === domain);
}

const shortenToFullUrl = async url => {
    try {
        // deal with shortened URL. Because maxRedirects: 0 will treat every redirection as error
        // but the error will contain the destination url
        await axios({
            method: "get",
            url: url,
            maxRedirects: 0
        });
    }
    catch(err) {
        if (err.response && Math.trunc(err.response.status / 100) === 3) {
            return Promise.resolve(err.response.headers.location);
        }
        return Promise.reject(`Could not fetch page. Error: ${err}`)
    }
};

const pinterestUrlSanitizer = async url => {
    url = url.replace(/\/$/, "");
    url = new URL(url);

    if (!isSupportedUrl(url)) {
        return Promise.reject(`${url.hostname} is not supported yet.`);
    }

    if (isShortenDomain(url.hostname)) {
        url = new URL(await shortenToFullUrl(url.href));
    }
    return /(https:\/\/(www.)*\w+.com\/pin\/\d+\/*)/g.exec(url.href)[0];
}

module.exports = {
    pinterestParser,
    downloadFileViaURL,
    pinterestUrlSanitizer,
    isSupportedUrl,
    isFacebookRouter
}