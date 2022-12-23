const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");

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
    let urlFromHtmlCleaned = urlFromHtml;

    if (
      urlFromHtml !== undefined &&
      urlFromHtml !== "" &&
      urlFromHtml !== "/" &&
      !urlFromHtml.includes("tel") &&
      !urlFromHtml.includes("#") &&
      !urlFromHtml.includes("http")
    ) {
      // CLEANING UP URL ADDRESS FROM PAGE HTML
      if (urlFromHtml.charAt(urlFromHtml.length - 1) === "/") {
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

  const visitedArray = [...visited];
  const toVisitArray = [...toVisit];

  const uniqueLinks = [...new Set(links)]
    .sort()
    .filter((item) => !visitedArray?.includes(item))
    .map((el) => {
      // console.log("toVisit array", toVisitArray);
      toVisit.add(el);
      return el;
    });

  return uniqueLinks;
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
    toVisit.delete(url);

    fs.appendFileSync("file.txt", `${url}\n`);
    // ------------------------------
    // TO SEE THE PROGRESS!!!!!
    console.log("nestLvl", nesting, "URL- ", url);
    // ------------------------------

    const { data } = await axios.get(url, {
      headers: {
        "Accept-Encoding": "text/html", //application/json
      },
    });

    const $ = cheerio.load(data);
    extractLinks($);

    const toVisitArray = [...toVisit];
    // console.log("toVisitArray", toVisitArray);

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
