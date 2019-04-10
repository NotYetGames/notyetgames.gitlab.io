
// Map of steam pages
// Key: href of steam page
// Value: {
//      htmlData: HtmlDocument
//      href: String
//      name: String
//      tags: Array
// }
var steamPages = {};

var steamTopTags = {};
var steamTopTagsArray = [];
var numPagesLoading = 0;

function makeHtmlLink(href, text, new_tab = true) {
    var target = new_tab ? "_blank" : "_self";
    return '<a href="' + href + '" target="' + target + '">' + text + '</a>'
}

function getSteamLinksFromLocalStorage() {
    var value = localStorage.getItem("steamLinks");
    return value === null ? "" : value;
}
function setSteamLinkInLocalStorage(steamLinks) {
    localStorage.setItem("steamLinks", steamLinks);
}

function templateFillTags() {
    if (jQuery.isEmptyObject(steamPages)) {
        console.warn("templateFillTags empty object");
    }

    var dataForTable = [];
    var id = 1;
    for (const href in steamPages) {
        if (!steamPages.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPages[href];
        dataForTable.push({
            id: id,
            game: makeHtmlLink(href, pageData.name),
            tags: pageData.tags.join(", ")
        });
        id++;
    }

    $("#table-tags").bootstrapTable({
        search: true,
        pagination: true,
        columns: [{
            field: 'game',
            title: 'Game',
            sortable: true
        }, {
            field: 'tags',
            title: 'Tags'
        }],
        data: dataForTable
    })
}

function templateFillTopTags() {
    // Initial fill our steamTopTags
    for (const href in steamPages) {
        if (!steamPages.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPages[href];
        for (var i = 0; i < pageData.tags.length; i++) {
            var tagName = pageData.tags[i];

            if (tagName in steamTopTags) {
                // exists
                steamTopTags[tagName]['frequency']++;
                steamTopTags[tagName]['games_hrefs'].push(href);

            } else {
                // add it the first time
                steamTopTags[tagName] = {
                    frequency: 1,
                    games_hrefs: [href]
                }
            }
        }
    }

    // Convert to array so that we can sort
    steamTopTagsArray = Object.keys(steamTopTags).map(function (tag) {
        return {
            tag: tag,
            frequency: steamTopTags[tag]['frequency'],
            games_hrefs: steamTopTags[tag]['games_hrefs']
        };
    });

    // Sort in ascending order
    steamTopTagsArray.sort(function (left, right) {
        return left.frequency < right.frequency;
    });

    // Fill data for our table
    var dataForTable = [];
    for (var i = 0; i < steamTopTagsArray.length; i++) {
        var tagsData = steamTopTagsArray[i];

        // Parse games
        var games_present = "";
        var gamesHrefsIndex = 0;
        tagsData.games_hrefs.forEach(function (gameHref) {
            if (gameHref in steamPages) {
                games_present += makeHtmlLink(gameHref, steamPages[gameHref].name);
                if (gamesHrefsIndex < tagsData.games_hrefs.length - 1) {
                    games_present += ", "
                }
            }
            gamesHrefsIndex++;
        });

        dataForTable.push({
            id: i + 1,
            tag: tagsData.tag,
            frequency: tagsData.frequency,
            games: games_present,
        });
    }

    $("#table-top-tags").bootstrapTable({
        search: true,
        pagination: true,

        // Initial sorting order
        sortName: "frequency",
        sortOrder: "desc",
        columns: [{
            field: 'frequency',
            title: 'Frequency',
            sortable: true
        }, {
            field: 'tag',
            title: 'Tag Name',
            sortable: true
        }, {
            field: 'games',
            title: 'Games Present'
        }],
        data: dataForTable
    });
}

function finishedAllQueries() {
    console.info("finishedAllQueries: ", steamPages);
    templateFillTags();
    templateFillTopTags();
}

function getTagsFromHtmlPage(htmlData) {
    if (htmlData === null) {
        return [];
    }

    // Get all tags of page
    var tag_elements = htmlData.querySelectorAll(".app_tag");
    var tag_strings = [];
    for (var i = 0; i < tag_elements.length; i++) {
        var element = tag_elements[i]

        // Don't add plus button
        if (!$(element).hasClass("add_button")) {
            tag_strings.push(element.innerText.trim());
        }
    }
    return tag_strings;
}

function getAppNameFromHtmlPage(htmlData) {
    if (htmlData === null) {
        return "CAN'T PARSE";
    }
    var $title = $(htmlData).find(".apphub_AppName");
    if ($title !== null) {
        return $title.first().text();
    }

    return "UNKNOWN"
}

function downloadInfoForSteamPage(page) {
    console.log("downloadInfoForSteamPage: " + page);

    numPagesLoading++;
    $.ajax({
        // Fight CORS
        // From: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
        url: 'https://cors-anywhere.herokuapp.com/' + page,
        type: 'GET',
        success: function (rawStringData, status, xhr) {
            if (page in steamPages) {
                console.warn("Page already exists inside our cache: " + page);
                return;
            }

            // Fill info about page
            var parser = new DOMParser();
            var pageData = {
                htmlData: parser.parseFromString(rawStringData, "text/html"),
                href: page
            };
            pageData['tags'] = getTagsFromHtmlPage(pageData.htmlData);
            pageData['name'] = getAppNameFromHtmlPage(pageData.htmlData)

            // Parse tags
            if (pageData.tags.length != 0) {
                steamPages[page] = pageData;
                console.info("Found tags: " + pageData.tags);
            } else {
                console.warn("Can't get tags for page: " + page);
            }
            numPagesLoading--;

            if (numPagesLoading == 0) {
                finishedAllQueries();
            }
        },
        error: function () {
            console.error("Can't download page for: " + page);
        }
    });
}

function clear() {
    $("#table-tags").bootstrapTable('destroy');
    $("#table-top-tags").bootstrapTable('destroy');

    steamPages = {};
    steamTopTags = {};
    steamTopTagsArray = [];
    numPagesLoading = 0;
}

function readyFn(jQuery) {
    var $steam_pages = $("#steam-pages");

    // Recover from local storage if any
    $steam_pages.val(getSteamLinksFromLocalStorage());

    $(document).on('click', '#btn-query-tags', function () {
        clear();
        var steamLinksRaw = $steam_pages.val().trim();
        setSteamLinkInLocalStorage(steamLinksRaw);

        var steamLinksArray = steamLinksRaw.split(/\r?\n/);

        // Clean whitespace
        var alreadySeenMap = {};
        for (var i = 0; i < steamLinksArray.length; i++) {
            var page = steamLinksArray[i].trim();

            // Already processed
            if (page in alreadySeenMap) {
                continue;
            }

            alreadySeenMap[page] = true;
            downloadInfoForSteamPage(page);
        }
    });
}

$(window).on("load", readyFn);
