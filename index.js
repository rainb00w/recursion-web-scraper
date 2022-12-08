const cheerio = require("cheerio");
const axios = require("axios");

const mainRequest = async (url, nesting) => {
  let emails = [];

  // GETTING LINKS LIST
  const getLinks = async (url, nesting) => {
    // CHECKING THE END OF RECURSION
    if (nesting === 0) {
      return;
    }

    // CURRENT FETCH REQUEST
    const getHTML = async (currentUrl) => {
      try {
        let validationUrl = validURL(currentUrl);

        if (validationUrl) {
          console.log("FETCHING", currentUrl);
          const { data } = await axios.get(currentUrl, {
            headers: {
              "Accept-Encoding": "text/html", //application/json
            },
          });
          if (data !== undefined) {
            return cheerio.load(data);
          }
        } else {
          return;
        }
      } catch (error) {}
    };

    // LOADING DATA TO CHEERIO
    const $ = await getHTML(url);
    if (!$) {
      return;
    }
    const linkObjects = $("a");
    const links = [];

    linkObjects.each((index, element) => {
      // EXTRACTING LINKS FROM THE PAGE CODE
      const urlFromHtml = $(element).attr("href");
      let urlFromHtmlCleaned = undefined;
      let newCurrentUrl = undefined;

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

        // CLEANING UP CURRENT FETCHED URL ADDRESS
        if (url.charAt(url.length - 1) === "/") {
          newCurrentUrl = url.slice(0, -1);
        } else {
          newCurrentUrl = url;
        }

        // GETTING EMAILS
        if (urlFromHtml.includes("mailto")) {
          emails.push(urlFromHtml.replace("mailto:", ""));
        }

        // ADDING LINKS TO AN ARRAY
        if (!urlFromHtml.includes("mailto")) {
          links.push(
            newCurrentUrl + urlFromHtmlCleaned // get the href attribute
          );
        }
      }
    });

    // SORTING LINKS AND DELETING UNNECESSARY ONES
    const uniqueLinks = [...new Set(links)].sort();
    if (uniqueLinks.length === 0) {
      return;
    }

    // RECURSION THROUGH LINKS
    function iterate(index) {
      if (index === uniqueLinks.length) {
        return;
      }

      // console.log("Process", uniqueLinks[index], "nesting", nesting - 1);
      getLinks(uniqueLinks[index], nesting - 1);

      iterate(index + 1);
    }

    iterate(0);

    return emails;
  };

  const resultEmails = await getLinks(url, nesting);

  const uniqueEmails = [...new Set(resultEmails)];
  return uniqueEmails;
};

function validURL(str) {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator

  return !!pattern.test(str);
}

const actionIndex = process.argv.indexOf("myapp");

// RECEIVING ARGUMENTS FROM COMMAND LINE AND STARTING PROCESS
(async () => {
  if (actionIndex !== -1) {
    const nesting = process.argv[actionIndex + 1];
    const url = process.argv[actionIndex + 2];
    const finalEmails = await mainRequest(url, nesting);
    console.log("WEBSITE EMAILS", finalEmails);
  }
})();
