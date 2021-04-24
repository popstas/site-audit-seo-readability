const { Readability } = require('@mozilla/readability');
const JSDOM = require('jsdom').JSDOM;
const createDOMPurify = require('dompurify');
const readingTime = require('reading-time');

const skipArticleTags = ['script', 'style', 'noscript'/* , 'head', 'header', 'footer', 'nav', 'aside' */];

// return readability article
function getArticle(result) {
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  const purifiedStr = DOMPurify.sanitize(result.content, {FORBID_TAGS: skipArticleTags});
  // console.log('purifiedStr: ', purifiedStr);
  const cleanDoc = new JSDOM(purifiedStr, {
    url: result.response.url,
  });
  const reader = new Readability(cleanDoc.window.document, {/* debug: true */});
  const article = reader.parse();
  // console.log('article:', article);
  return article;
}

function afterRequest(result, options) {
  const article = getArticle(result);
  if (article) {
    const readingStats = readingTime(article.textContent);
    if (readingStats) {
      result.readability_minutes = readingStats.minutes;
      result.readability_time = readingStats.time;
      result.readability_words = readingStats.words;
      result.readability_length = article.length;
      result.readability_text = article.content;
      result.readability_excerpt = article.excerpt;
    }

    const info = getContentInfo(article.content, result);
    // console.log(`info ${result.response.url}: `, info);
    for (let name in info) {
      result[`readability_${name}`] = info[name];
    }
  }

  // console.log('result: ', result);
  return result;
}

// extract info from readability html
function getContentInfo(html, result) {
  const dom = new JSDOM(html, {
    url: result.response.url,
  });
  const doc = dom.window.document;

  let domainParts = dom.window.location.host.split('.');
  const domain2level = domainParts.slice(domainParts.length - 2).join('.');

  // count png images
  let imgPng = [];
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src.match(/\.png$/)) imgPng.push(src);
  });

  const info = {
    links: doc.querySelectorAll('a[href]:not([href^="javascript"]):not([href^="#"])').length,
    links_inner: doc.querySelectorAll(`a[href^="/"], a[href*="${domain2level}"]`).length,
    links_outer: doc.querySelectorAll(`a[href^="http"]:not([href^="javascript"]):not([href^="#"]):not([href^="/"]):not([href*="${domain2level}"])`).length,
    links_anchors: doc.querySelectorAll(`a[href^="#"]`).length,
    images: doc.querySelectorAll('img').length,
    images_png: imgPng.length,
    images_png_links: imgPng.join('\n'),
  };

  return info;
}

module.exports = afterRequest;
