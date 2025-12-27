const Parser = require('rss-parser')
const parser = new Parser()

module.exports.fetchFeed = async function(url) {
  const feed = await parser.parseURL(url)
  return feed
}
