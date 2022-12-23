const cheerio = require("cheerio");
const axios = require("axios");

// https://madappgang.com

const visited = new Set();
const toVisit = new Set();

const actionIndex = process.argv.indexOf("myapp");
// to insert nesting level from CL. Not Active now !!!!
// const nestingFromCL = process.argv[actionIndex + 2];
const baseUrl = process.argv[actionIndex + 1];
let emails = [];

if (actionIndex !== -1) {
  toVisit.add(baseUrl);
} else {
  console.log("There are no valid URL !");
}

// Extracting urls and emails from html document with cheerio
const extractLinks = ($) => {
  const linkObjects = $("a");
  const links = [];

  linkObjects.each((index, element) => {
    // EXTRACTING LINKS FROM THE PAGE CODE
    const urlFromHtml = $(element).attr("href");
    let urlFromHtmlCleaned = undefined;

    if (
      urlFromHtml !== undefined &&
      urlFromHtml !== "" &&
      urlFromHtml !== "/" &&
      !urlFromHtml.includes("tel") &&
      !urlFromHtml.includes("#") &&
      !urlFromHtml.includes("http")
    ) {
      // CLEANING UP URL ADDRESS FROM PAGE HTML
      if (urlFromHtml.charAt(1) === "/") {
        urlFromHtmlCleaned = urlFromHtml.slice(0, -1);
      } else {
        urlFromHtmlCleaned = urlFromHtml;
      }

      // GETTING EMAILS
      if (urlFromHtml.includes("mailto")) {
        emails.push(urlFromHtml.replace("mailto:", ""));
      }

      // ADDING LINKS TO AN ARRAY
      if (!urlFromHtml.includes("mailto")) {
        links.push(
          baseUrl + urlFromHtmlCleaned // get the href attribute
        );
      }
    }
  });

  return [...new Set(links)];
};

async function request(links, nesting) {
  return Promise.allSettled(links.map((el) => crawl(el, nesting - 1)));
}

// ----------------------------
// NESTING LEVEL IS SET HERE ->
const crawl = async (url, nesting = 3) => {
  try {
    if (nesting < 1) {
      return;
    }
    visited.add(url);

    // ------------------------------
    // TO SEE THE PROGRESS!!!!!
    // console.log("nestLvl", nesting, "URL- ", url);
    // ------------------------------

    const { data } = await axios.get(url, {
      headers: {
        "Accept-Encoding": "text/html", //application/json
      },
    });

    const $ = cheerio.load(data);
    const links = extractLinks($);

    if (links) {
      links
        .filter((link) => !visited.has(link)) // Filter out already visited links
        .forEach((link) => toVisit.add(link));
    }

    toVisit.delete(url);
    const toVisitArray = [...toVisit];

    if (toVisitArray.length > 0) {
      const _ = await request(toVisitArray, nesting);
    }

    // ------------------------------
    // Liniar Iteration ( for of ) without NESTING !
    // ------------------------------
    // for (const nextLink of toVisit.values()) {
    //   if (nesting < 1) {
    //     console.log("nesting break");
    //     break;
    //   }

    //   await crawl(nextLink);
    // }
  } catch (error) {}
};

(async () => {
  console.log("We're starting, please wait.");
  //------------ this one to receive nesting level from CL. Doesn't active now!!!
  // const data = await crawl(baseUrl, nestingFromCL);
  const _ = await crawl(baseUrl);

  // ------------------------------
  // SHOWING THE DATA
  // console.log(toVisit);
  console.log(`----- ${[...toVisit].length} |LINKS TO VISIT----`);
  // console.log(visited);
  console.log(`-------${[...visited].length} | VISITED LINKS -------`);
  console.log("---------------------------------");
  console.log("-------------EMAILS-------------");
  console.log([...new Set(emails)]);
})();
