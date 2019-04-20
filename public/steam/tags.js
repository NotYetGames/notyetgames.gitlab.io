"use strict";

// Map of steam pages
// Key: href of steam page
// Value: {
//      htmlData: HtmlDocument
//      href: String
//      name: String
//      tags: Array
// }
var steamPagesMap = {};

// Maps appid => href (steam page)
var appIdsToHrefsMap = {};

var appIdsArray = [];
var steamTopTags = {};
var steamTopTagsArray = [];
var numSteamPagesLoading = 0;

// Jquery elements
var $checkboxIncludeOnlyTopTags = null;
var $tableTags = null;
var $tableTopTags = null;
var $tablePlayerCountsComparisonGroup = null;
var $textAreaSteamPages = null;

function includeOnlyTopTags() {
    return $checkboxIncludeOnlyTopTags.is(":checked");
}

function templateFillTags() {
    if (jQuery.isEmptyObject(steamPagesMap)) {
        console.warn("templateFillTags empty object");
    }

    let dataForTable = [];
    let id = 1;
    for (const href in steamPagesMap) {
        if (!steamPagesMap.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPagesMap[href];

        // Fill steam tags
        let tagData = "";
        for (let tagIndex = 0; tagIndex < pageData.tags.length; tagIndex++) {
            let tagName = pageData.tags[tagIndex];
            if (tagIndex < pageData.tags.length - 1) {
                tagName += ", ";
            }

            if (isSteamTagNrRelevant(tagIndex)) {
                tagName = makeSpanSuccess(tagName);
            }
            tagData += tagName;
        }

        dataForTable.push({
            id: id,
            game: makeHtmlLink(href, pageData.name),
            tags: tagData
        });
        id++;
    }


    $tableTags.bootstrapTable('destroy');
    $tableTags.bootstrapTable({
        search: true,
        pagination: true,
        showToggle: true,

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

function fillSteamTopTags() {
    steamTopTags = {};
    steamTopTagsArray = [];

    // Initial fill our steamTopTags
    for (const href in steamPagesMap) {
        if (!steamPagesMap.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPagesMap[href];
        for (let tagIndex = 0; tagIndex < pageData.tags.length; tagIndex++) {
            const tagName = pageData.tags[tagIndex];

            // Ignore tag as it is not int top 15
            if (includeOnlyTopTags() && !isSteamTagNrRelevant(tagIndex)) {
                continue;
            }

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
            rank: 0,
            tag: tag,
            frequency: steamTopTags[tag]['frequency'],
            games_hrefs: steamTopTags[tag]['games_hrefs']
        };
    });

    // Sort in ascending order
    steamTopTagsArray.sort(function (left, right) {
        return -1 * (left.frequency - right.frequency);
    });

    // Set correct ranks
    for (let i = 0; i < steamTopTagsArray.length; i++) {
        steamTopTagsArray[i].rank = i + 1;
    }
}

function templateFillTopTags() {
    fillSteamTopTags();

    // Fill data for our table
    let dataForTable = [];
    for (let i = 0; i < steamTopTagsArray.length; i++) {
        let tagsData = steamTopTagsArray[i];

        // Parse games
        let games_present = "";
        let gamesHrefsIndex = 0;
        tagsData.games_hrefs.forEach(function (gameHref) {
            if (gameHref in steamPagesMap) {
                games_present += makeHtmlLink(gameHref, steamPagesMap[gameHref].name);
                if (gamesHrefsIndex < tagsData.games_hrefs.length - 1) {
                    games_present += ", "
                }
            }
            gamesHrefsIndex++;
        });

        const id = i + 1;
        dataForTable.push({
            id: id,
            rank: tagsData.rank,
            tag: tagsData.tag,
            frequency: tagsData.frequency,
            games: games_present,
        });
    }


    $tableTopTags.bootstrapTable('destroy');
    $tableTopTags.bootstrapTable({
        search: true,
        pagination: true,
        showToggle: true,

        // Initial sorting order
        sortName: "frequency",
        sortOrder: "desc",
        columns: [{
            field: 'rank',
            title: '#',
            sortable: true
        }, {
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

function templateFillPlayerCountsComparisonGroup() {
    // Add link to steamdb charts for players
    const maxChunk = 10;

    // Fill data for our table
    let dataForTable = [];
    const arrayLength = appIdsArray.length;
    for (let index = 0; index < arrayLength; index += maxChunk) {
        const minIndex = index;

        // Clamp max
        let maxIndex = minIndex + maxChunk;
        if (maxIndex > arrayLength) {
            maxIndex = arrayLength;
        }

        let tempAppIds = appIdsArray.slice(minIndex, maxIndex);

        if (tempAppIds.length > maxChunk) {
            console.warn("wtf");
            console.warn(tempAppIds, minIndex, maxIndex);
        }

        // Fill Games
        let games_present = "";
        for (let tempIndex = 0; tempIndex < tempAppIds.length; tempIndex++) {
            const tempAppId = tempAppIds[tempIndex];

            // Find href of game first
            if (tempAppId in appIdsToHrefsMap) {
                const gameHref = appIdsToHrefsMap[tempAppId];

                if (gameHref in steamPagesMap) {
                    games_present += makeHtmlLink(gameHref, steamPagesMap[gameHref].name);
                    if (tempIndex < tempAppIds.length - 1) {
                        games_present += ", "
                    }
                }

            }
        }

        dataForTable.push({
            range: "{0}-{1}".format(minIndex + 1, maxIndex),
            link: makeHtmlLink("https://steamdb.info/graph/?compare=" + tempAppIds.join(","), "Go to SteamDB"),
            games: games_present,
        });
    }

    $tablePlayerCountsComparisonGroup.bootstrapTable('destroy');
    $tablePlayerCountsComparisonGroup.bootstrapTable({
        search: true,
        pagination: true,
        showToggle: true,

        // sortName: "frequency",
        // sortOrder: "desc",
        columns: [{
            field: 'range',
            title: '#',
            sortable: false
        }, {
            field: 'link',
            title: 'SteamDB link',
            sortable: true
        }, {
            field: 'games',
            title: 'For Games'
        }],
        data: dataForTable
    });
}

function finishedSteamPageQuery() {
    // Are we done yet?
    numSteamPagesLoading--;
    if (numSteamPagesLoading == 0) {
        finishedAllSteamPageQueries();
    }
}

function finishedAllSteamPageQueries() {
    console.info("finishedAllSteamPageQueries: ", steamPagesMap);
    templateFillPlayerCountsComparisonGroup();
    templateFillTags();
    templateFillTopTags();

    // Enable checkbox
    $checkboxIncludeOnlyTopTags.prop("disabled", false);
    hideLoadingWidget();
}

function downloadSteamPage(page, retry_with_backup = false) {
    console.log("downloadSteamPage: " + page);

    if (!retry_with_backup) {
        numSteamPagesLoading++;
    }

    // Fight CORS
    // From: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
    const url = retry_with_backup ?
        "https://notyet.eu/get_steam_page.php?page=" + page :
        "https://cors-anywhere.herokuapp.com/" + page

    // Cache
    const appid = getSteamAppIdFromURL(page);
    appIdsArray.push(appid);
    appIdsToHrefsMap[appid] = page;

    $.ajax({
        url: url,
        type: 'GET',

        success: function (rawStringData, status, xhr) {
            if (page in steamPagesMap) {
                logWarning("Page = {0}, already exists inside our cache. Your input contains double values".format(makeHtmlLinkAlert(page)));
                return;
            }

            // Fill info about page
            let pageData = {
                htmlData: stringToHtmlDOM(rawStringData),
                href: page
            };

            const isAgePage = isSteamAgeCheckPage(pageData.htmlData);

            // Retry again
            if (!retry_with_backup && isAgePage) {
                // Retry again
                console.info("Retrying to get page = {0} because it is age verified".format(page));
                downloadSteamPage(page, true);
                return;
            }

            // Is retrying again but still nope :(
            if (retry_with_backup && isAgePage) {
                logWarning("Page {0} redirected to age check page. Ignoring. Can't retrieve it".format(makeHtmlLinkAlert(page)));
            }

            if (!isAgePage) {
                // Normal page
                pageData['appid'] = appid;
                pageData['tags'] = getSteamTagsFromHtmlPage(pageData.htmlData);
                pageData['name'] = getSteamAppNameFromHtmlPage(pageData.htmlData)

                // Parse tags
                if (pageData.tags.length != 0) {
                    steamPagesMap[page] = pageData;
                    console.info("Found tags ({0}): {1}".format(pageData.name, pageData.tags));
                } else {
                    logWarning("Can't get tags for page = {0}. Does it even have tags?".format(makeHtmlLinkAlert(page)));
                }
            }

            finishedSteamPageQuery();
        },
        error: function () {
            // We don't have this app id because there was an error
            arrayRemove(appIdsArray, appid);
            finishedSteamPageQuery();
            logError("Can't download page = {0}".format(makeHtmlLinkAlert(page)));
        }
    });
}

function clear() {
    $tableTags.bootstrapTable('destroy');
    $tableTopTags.bootstrapTable('destroy');
    $tablePlayerCountsComparisonGroup.bootstrapTable('destroy');
    clearAlerts();

    steamPagesMap = {};
    steamTopTags = {};
    appIdsArray = [];
    steamTopTagsArray = [];
    numSteamPagesLoading = 0;
}

function readyFn(jQuery) {
    hideLoadingWidget();

    // Handle checkboxes
    $checkboxIncludeOnlyTopTags = $("#checkboxIncludeOnlyTopTags");
    $checkboxIncludeOnlyTopTags.change(function () {
        templateFillTopTags();
    });

    $textAreaSteamPages = $("#steam-pages");
    $tableTags = $("#table-tags");
    $tableTopTags = $("#table-top-tags");
    $tablePlayerCountsComparisonGroup = $("#table-player-counts-comparison-groups");

    // Recover from local storage if any
    $textAreaSteamPages.val(getSteamLinksFromLocalStorage());

    $(document).on('click', '#btn-query-tags', function () {
        // Disable checkbox for now
        $checkboxIncludeOnlyTopTags.prop("disabled", true);
        showLoadingWidget();

        clear();
        const steamLinksRaw = $textAreaSteamPages.val().trim();
        setSteamLinkInLocalStorage(steamLinksRaw);

        // Splint by new lines
        const steamLinksArray = steamLinksRaw.split(/\r?\n/);

        // Clean whitespace
        let alreadySeenMap = {};
        for (let i = 0; i < steamLinksArray.length; i++) {
            const page = steamLinksArray[i].trim();

            // Already processed
            if (page in alreadySeenMap) {
                continue;
            }

            alreadySeenMap[page] = true;
            downloadSteamPage(page);
        }
    });
}

$(window).on("load", readyFn);
