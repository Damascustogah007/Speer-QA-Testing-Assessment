const axios = require('axios');
const fs = require('fs');

async function isValidWikiLink(link) {
  try {
    const response = await axios.get(link);
    return response.headers['content-type'].includes('text/html');
  } catch (error) {
    return false;
  }
}

async function getLinksFromWikiPage(link) {
  const response = await axios.get(link);
  const pageContent = response.data;
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
  const links = [];

  let match;
  while ((match = linkRegex.exec(pageContent))) {
    const url = match[1].trim();
    if (url.startsWith('/wiki/') && !url.includes(':') && !url.includes('#')) {
      links.push('https://en.wikipedia.org' + url);
    }
  }

  return links.slice(0, 10); // Limit to the first 10 links to reduce complexity
}

async function crawlWikiLinks(startingLink, n) {
  const visitedLinks = new Set();
  const queue = [[startingLink, 0]]; // Each element of the queue will be an array [link, level]
  const result = new Set();

  while (queue.length > 0) {
    const [currentLink, level] = queue.shift();

    if (!visitedLinks.has(currentLink)) {
      visitedLinks.add(currentLink);
      if (level <= n) {
        const links = await getLinksFromWikiPage(currentLink);
        links.forEach((link) => {
          queue.push([link, level + 1]);
          result.add(link);
        });
      }
    }
  }

  return Array.from(result);
}

async function main() {
  const wikiLink = process.argv[2];
  const n = parseInt(process.argv[3], 10);

  if (!wikiLink || !wikiLink.startsWith('https://en.wikipedia.org/wiki/')) {
    throw new Error('Please provide a valid Wikipedia link as the first argument.');
  }

  if (isNaN(n) || n < 1 || n > 3) {
    throw new Error('Please provide a valid integer between 1 and 3 as the second argument.');
  }

  const allLinks = await crawlWikiLinks(wikiLink, n);
  const uniqueLinks = Array.from(new Set(allLinks));

  const resultObject = {
    totalCount: allLinks.length,
    uniqueCount: uniqueLinks.length,
    links: uniqueLinks,
  };

  const resultJSON = JSON.stringify(resultObject, null, 2);

  fs.writeFileSync('wiki_links_result.json', resultJSON, 'utf8');
}

main().catch((err) => console.error(err));
