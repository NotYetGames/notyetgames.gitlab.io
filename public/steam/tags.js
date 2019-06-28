"use strict";


/**
 Map of steam pages
 Key: href of steam page
 Value: {
    htmlData: HtmlDocument
    href: String
    name: String
    appid: String
    tags: Array

    // After quering the steamdb
    steamdbHtmlData: HtmlDocument,
    steamdbPlayersData: {
        online: {
            now: Number,
            24hPeak: Number,
            AllTimePeak: Number
        },
        playTime: {
            avgTotal: String,
            avg2Weeks: String
        },
        owners: String Range
    }
 }
*/
var steamPagesMap = {};

// Maps appid => href (steam page)
var appIdsToHrefsMap = {};

var appIdsArray = [];
var steamTopTags = {};
var steamTopTagsArray = [];
var numSteamPagesLoading = 0;
var numSteamDBPagesLoading = 0;

// Jquery elements
var $checkboxIncludeOnlyTopTags = null;
var $tableTags = null;
var $tableTopTags = null;
var $tablePlayerCountsComparisonGroup = null;
var $tablePlayersData = null;
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

function templateFillPlayersData() {

    // Fill data for our table
    let dataForTable = [];
    for (const href in steamPagesMap) {
        if (!steamPagesMap.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPagesMap[href];
        //console.log(pageData);

        let playersData = pageData['steamdbPlayersData'];
        const ownersString = playersData['owners'];
        const arrayMinMax = ownersString.split("..");
        const ownersMin = arrayMinMax.length > 0 ? arrayMinMax[0].trim() : 0;
        const ownersMax = arrayMinMax.length > 1 ? arrayMinMax[1].trim() : 0;

        dataForTable.push({
            game: makeHtmlLink("https://steamdb.info/app/{0}/graphs/".format(pageData.appid), pageData.name),
            online_now: playersData['online']['now'],
            online_24hPeak: playersData['online']['24hPeak'],
            online_allTimePeak: playersData['online']['AllTimePeak'],
            owners_min: ownersMin,
            owners_max: ownersMax,
            playTime_avgTotal: playersData['playTime']['avgTotal'],
            playTime_avg2Weeks: playersData['playTime']['avg2Weeks']
        });
    }

    $tablePlayersData.bootstrapTable('destroy');
    $tablePlayersData.bootstrapTable({
        search: true,
        pagination: true,
        showToggle: true,

        // sortName: "frequency",
        // sortOrder: "desc",
        columns: [
            {
                field: 'game',
                title: 'Game',
                sortable: true
            },
            {
                field: 'online_now',
                title: 'Online right now',
                sortable: true
            },
            {
                field: 'online_24hPeak',
                title: 'Online 24h Peak',
                sortable: true
            },
            {
                field: 'online_allTimePeak',
                title: 'Online All Month Peak',
                sortable: true
            },
            {
                field: 'owners_min',
                title: 'Owners Min',
                sortable: true
            },
            {
                field: 'owners_max',
                title: 'Owners Max',
                sortable: true
            },
            // {
            //     field: 'owners',
            //     title: 'Owners Range Estimation',
            //     sortable: true
            // },
            {
                field: 'playTime_avgTotal',
                title: 'AVG total playtime',
                sortable: true
            },
            {
                field: 'playTime_avg2Weeks',
                title: 'AVG playtime 2 weeks ',
                sortable: true
            }
        ],
        data: dataForTable
    });
}

function finishedAllSteamDBPageQueries() {
    console.info("finishedAllSteamDBPageQueries", steamPagesMap);
    templateFillPlayersData();
}

function finishedSteamDBPageQuery() {
    // Are we done yet?
    numSteamDBPagesLoading--;
    if (numSteamDBPagesLoading == 0) {
        finishedAllSteamDBPageQueries();
    }
}

function downloadSteamDBPage(steamPage, retry_num = 0) {
    console.log("downloadSteamDBPage: " + steamPage);
    const maxRetryNum = 10;

    if (!(steamPage in steamPagesMap)) {
        return;
    }

    const pageData = steamPagesMap[steamPage];
    const appid = pageData["appid"];
    const url = "https://notyet.eu/get_steamdb_page.php?appid={0}".format(appid);

    // First time
    if (retry_num == 0) {
        numSteamDBPagesLoading++;
    }

    function canRetryThis() {
        return retry_num < maxRetryNum;
    }

    function retryThis() {
        setTimeout(function(){
            downloadSteamDBPage(steamPage, retry_num + 1);
        }, delaysArray.random());
    }

    const delaysArray = [500, 700, 1000, 1500, 2000, 2500, 3000];
    $.ajax({
        url: url,
        type: 'GET',

        success: function(rawStringData, status, xhr) {
            if (rawStringData.includes("<title>429 Too Many Requests</title>") && canRetryThis()) {
                retryThis();
            } else {
                // Success
                let htmlData = stringToHtmlDOM(rawStringData);
                steamPagesMap[steamPage]['steamdbHtmlData'] = htmlData;
                let playersData = getSteamDBPlayersDataFromHtmlPage(htmlData);
                // console.log(playersData);
                steamPagesMap[steamPage]['steamdbPlayersData'] = playersData

                finishedSteamDBPageQuery();
            }
        },
        error: function(xhr, ajaxOptions, thrownError) {
            // Retry recursively
            if (canRetryThis()) {
                retryThis();
            } else {
                // :(
                finishedSteamDBPageQuery();
                logError("Can't download page = {0}".format(makeHtmlLinkAlert(url)));
            }
        }
    });
}

function startDownloadingAllSteamDBPages() {
    for (const href in steamPagesMap) {
        if (!steamPagesMap.hasOwnProperty(href)) {
            continue;
        }

        // let pageData = steamPagesMap[href];
        downloadSteamDBPage(href);
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

    // Star steamdb downloads
    startDownloadingAllSteamDBPages();
}

function finishedSteamPageQuery() {
    // Are we done yet?
    numSteamPagesLoading--;
    if (numSteamPagesLoading == 0) {
        finishedAllSteamPageQueries();
    }
}

function downloadSteamPage(steamPage, retry_with_backup = false) {
    console.log("downloadSteamPage: " + steamPage);

    if (!retry_with_backup) {
        numSteamPagesLoading++;
    }

    // Fight CORS
    // From: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
    const url = retry_with_backup ?
        "https://notyet.eu/get_steam_page.php?page=" + steamPage :
        "https://cors-anywhere.herokuapp.com/" + steamPage

    // Cache
    const appid = getSteamAppIdFromURL(steamPage);
    appIdsArray.push(appid);
    appIdsToHrefsMap[appid] = steamPage;

    $.ajax({
        url: url,
        type: 'GET',

        success: function (rawStringData, status, xhr) {
            if (steamPage in steamPagesMap) {
                logWarning("Page = {0}, already exists inside our cache. Your input contains double values".format(makeHtmlLinkAlert(page)));
                return;
            }

            // Fill info about page
            let pageData = {
                htmlData: stringToHtmlDOM(rawStringData),
                href: steamPage
            };

            const isAgePage = isSteamAgeCheckPage(pageData.htmlData);

            // Retry again
            if (!retry_with_backup && isAgePage) {
                // Retry again
                console.info("Retrying to get page = {0} because it is age verified".format(steamPage));
                downloadSteamPage(steamPage, true);
                return;
            }

            // Is retrying again but still nope :(
            if (retry_with_backup && isAgePage) {
                logWarning("Page {0} redirected to age check page. Ignoring. Can't retrieve it".format(makeHtmlLinkAlert(steamPage)));
            }

            if (!isAgePage) {
                // Normal page
                pageData['appid'] = appid;
                pageData['tags'] = getSteamTagsFromHtmlPage(pageData.htmlData);
                pageData['name'] = getSteamAppNameFromHtmlPage(pageData.htmlData)
                pageData['steamdbPlayersData'] = getSteamEmptyPlayersData();

                // Parse tags
                if (pageData.tags.length != 0) {
                    steamPagesMap[steamPage] = pageData;
                    console.info("Found tags ({0}): {1}".format(pageData.name, pageData.tags));
                } else {
                    logWarning("Can't get tags for page = {0}. Does it even have tags?".format(makeHtmlLinkAlert(steamPage)));
                }
            }

            finishedSteamPageQuery();
        },
        error: function () {
            // We don't have this app id because there was an error
            arrayRemove(appIdsArray, appid);
            finishedSteamPageQuery();
            logError("Can't download page = {0}".format(makeHtmlLinkAlert(steamPage)));
        }
    });
}

function startDownloadingAllSteamPages() {
    // Disable checkbox for now
    $checkboxIncludeOnlyTopTags.prop("disabled", true);
    showLoadingWidget();

    clear();
    const steamLinksRaw = $textAreaSteamPages.val().trim();
    setSteamLinkInLocalStorage(steamLinksRaw);
    setSteamLinkToCurrentPageUrl(steamLinksRaw);

    // Splint by new lines
    const steamLinksArray = steamLinksRaw.split(/\r?\n/);

    // Clean whitespace
    let alreadySeenMap = {};
    for (let i = 0; i < steamLinksArray.length; i++) {
        const steamPage = steamLinksArray[i].trim();

        // Already processed
        if (steamPage in alreadySeenMap) {
            continue;
        }

        alreadySeenMap[steamPage] = true;
        downloadSteamPage(steamPage);
    }
}

function clear() {
    $tableTags.bootstrapTable('destroy');
    $tableTopTags.bootstrapTable('destroy');
    $tablePlayerCountsComparisonGroup.bootstrapTable('destroy');
    $tablePlayersData.bootstrapTable('destroy');
    clearAlerts();

    steamPagesMap = {};
    steamTopTags = {};
    appIdsArray = [];
    steamTopTagsArray = [];
    numSteamPagesLoading = 0;
    numSteamDBPagesLoading = 0;
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
    $tablePlayersData = $("#table-players-data");

    // Recover links
    // First try url
    const urlLinks = getSteamLinksFromCurrentPageUrl();
    if (urlLinks !== null)
    {
        $textAreaSteamPages.val(urlLinks);
    }
    else
    {
        // finally try local storage if any
        $textAreaSteamPages.val(getSteamLinksFromLocalStorage());
    }

    $(document).on('click', '#btn-query-tags', function () {
        startDownloadingAllSteamPages();
    });
}

$(window).on("load", readyFn);
