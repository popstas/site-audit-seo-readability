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
  }

  // console.log('result: ', result);
  return result;
}

module.exports = afterRequest;
