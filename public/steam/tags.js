"use strict";

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}


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

var $checkboxIncludeOnlyTopTags = null;

function setCookie(c_name, value, exdays = -1) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}


function includeOnlyTopTags() {
    return $checkboxIncludeOnlyTopTags.is(":checked");
}

function makeHtmlLink(href, text = null, classes = "", new_tab = true) {
    if (text === null) {
        text = href;
    }
    let target = new_tab ? "_blank" : "_self";
    return '<a href="{0}" target="{2}" class="{3}">{1}</a>'.format(href, text, target, classes);
}

function makeHtmlLinkAlert(href, text = null, new_tab = true) {
    return makeHtmlLink(href, text, "alert-link", new_tab);
}


function makeSpanWithColor(text, class_color) {
    return '<span class="{1}">{0}</span>'.format(text, class_color);
}

function makeSpanSuccess(text) {
    return makeSpanWithColor(text, 'text-success');
}

function setSteamCookies() {
    setCookie("birthtime", '283993201');
    setCookie("mature_content", '1');
}

function isSteamTagNrRelevant(nr) {
    // From https://partner.steamgames.com/doc/store/tags#5
    // Only the first 15 are relevant
    return nr <= 15;
}

function showLoadingWidget() {
    $("#loading-widget").fadeIn();
}

function hideLoadingWidget() {
    $("#loading-widget").fadeOut();
}

function getSteamLinksFromLocalStorage() {
    let value = localStorage.getItem("steamLinks");
    return value === null ? "" : value;
}
function setSteamLinkInLocalStorage(steamLinks) {
    localStorage.setItem("steamLinks", steamLinks);
}

function clearAlerts() {
    $("#alerts-container").empty();
}

function addAlertBox(text, css_class) {
    $("#alerts-container").append('<div class="alert {0}" role="alert">{1}</div>'.format(css_class, text));
}

function addAlertWarningBox(text) {
    addAlertBox(text, "alert-warning");
}

function addAlertErrorBox(text) {
    addAlertBox(text, "alert-danger");
}

function logWarning(message) {
    console.warn(message);
    addAlertWarningBox(message);
}

function logError(message) {
    console.error(message);
    addAlertErrorBox(message);
}

function templateFillTags() {
    if (jQuery.isEmptyObject(steamPages)) {
        console.warn("templateFillTags empty object");
    }

    let dataForTable = [];
    let id = 1;
    for (const href in steamPages) {
        if (!steamPages.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPages[href];

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

    $("#table-tags").bootstrapTable('destroy');
    $("#table-tags").bootstrapTable({
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
    for (const href in steamPages) {
        if (!steamPages.hasOwnProperty(href)) {
            continue;
        }

        let pageData = steamPages[href];
        for (let tagIndex = 0; tagIndex < pageData.tags.length; tagIndex++) {
            let tagName = pageData.tags[tagIndex];

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
            if (gameHref in steamPages) {
                games_present += makeHtmlLink(gameHref, steamPages[gameHref].name);
                if (gamesHrefsIndex < tagsData.games_hrefs.length - 1) {
                    games_present += ", "
                }
            }
            gamesHrefsIndex++;
        });

        let id = i + 1;
        dataForTable.push({
            id: id,
            rank: tagsData.rank,
            tag: tagsData.tag,
            frequency: tagsData.frequency,
            games: games_present,
        });
    }

    $("#table-top-tags").bootstrapTable('destroy');
    $("#table-top-tags").bootstrapTable({
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

function finishedQuery() {
    // Are we done yet?
    numPagesLoading--;
    if (numPagesLoading == 0) {
        finishedAllQueries();
    }
}

function finishedAllQueries() {
    console.info("finishedAllQueries: ", steamPages);
    templateFillTags();
    templateFillTopTags();

    // Enable checkbox
    $checkboxIncludeOnlyTopTags.prop("disabled", false);
    hideLoadingWidget();
}

function getTagsFromHtmlPage(htmlData) {
    if (htmlData === null) {
        return [];
    }

    // Get all tags of page
    let tag_elements = htmlData.querySelectorAll(".app_tag");
    let tag_strings = [];
    for (let i = 0; i < tag_elements.length; i++) {
        let element = tag_elements[i]

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
    let $title = $(htmlData).find(".apphub_AppName");
    if ($title !== null) {
        return $title.first().text();
    }

    return "UNKNOWN"
}

function isAgeCheckPage(htmlData) {
    return htmlData.querySelector(".agegate_birthday_desc") !== null;
}


//

function downloadInfoForSteamPage(page, retry_with_backup = false) {
    console.log("downloadInfoForSteamPage: " + page);

    if (!retry_with_backup) {
        numPagesLoading++;
    }

    // Fight CORS
    // From: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
    let url = retry_with_backup ?
        "https://notyet.eu/get_steam_page.php?page=" + page :
        "https://cors-anywhere.herokuapp.com/" + page

    $.ajax({
        url: url,
        type: 'GET',

        success: function (rawStringData, status, xhr) {
            if (page in steamPages) {
                logWarning("Page = {0}, already exists inside our cache. Your input contains double values".format(makeHtmlLinkAlert(page)));
                return;
            }

            // Fill info about page
            let parser = new DOMParser();
            let pageData = {
                htmlData: parser.parseFromString(rawStringData, "text/html"),
                href: page
            };

            let isAgePage = isAgeCheckPage(pageData.htmlData);

            // Retry again
            if (!retry_with_backup && isAgePage) {
                // Retry again
                console.info("Retrying to get page = {0} because it is age verified".format(page));
                downloadInfoForSteamPage(page, true);
                return;
            }

            // Is retrying again but still nope :(
            if (retry_with_backup && isAgePage) {
                logWarning("Page {0} redirected to age check page. Ignoring. Can't retrieve it".format(makeHtmlLinkAlert(page)));
            }

            if (!isAgePage)
            {
                // Normal page
                pageData['tags'] = getTagsFromHtmlPage(pageData.htmlData);
                pageData['name'] = getAppNameFromHtmlPage(pageData.htmlData)

                // Parse tags
                if (pageData.tags.length != 0) {
                    steamPages[page] = pageData;
                    console.info("Found tags ({0}): {1}".format(pageData.name, pageData.tags));
                } else {
                    logWarning("Can't get tags for page = {0}. Does it even have tags?".format(makeHtmlLinkAlert(page)));
                }
            }

            finishedQuery();
        },
        error: function () {
            finishedQuery();
            logError("Can't download page = {0}".format(makeHtmlLinkAlert(page)));
        }
    });
}

function clear() {
    $("#table-tags").bootstrapTable('destroy');
    $("#table-top-tags").bootstrapTable('destroy');
    clearAlerts();

    steamPages = {};
    steamTopTags = {};
    steamTopTagsArray = [];
    numPagesLoading = 0;
}

function readyFn(jQuery) {
    hideLoadingWidget();
    setSteamCookies();

    // Handle checkboxes
    $checkboxIncludeOnlyTopTags = $("#checkboxIncludeOnlyTopTags");
    $checkboxIncludeOnlyTopTags.change(function () {
        templateFillTopTags();
    });

    let $steam_pages = $("#steam-pages");

    // Recover from local storage if any
    $steam_pages.val(getSteamLinksFromLocalStorage());

    $(document).on('click', '#btn-query-tags', function () {
        // Disable checkbox for now
        $checkboxIncludeOnlyTopTags.prop("disabled", true);
        showLoadingWidget();

        clear();
        let steamLinksRaw = $steam_pages.val().trim();
        setSteamLinkInLocalStorage(steamLinksRaw);

        let steamLinksArray = steamLinksRaw.split(/\r?\n/);

        // Clean whitespace
        let alreadySeenMap = {};
        for (let i = 0; i < steamLinksArray.length; i++) {
            let page = steamLinksArray[i].trim();

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
