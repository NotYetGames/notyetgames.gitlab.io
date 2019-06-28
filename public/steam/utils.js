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

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
}

if (!Array.prototype.random) {
    Array.prototype.random = function () {
        return this[Math.floor((Math.random() * this.length))];
    }
}

function arrayRemove(arr, value) {
    return arr.filter(function (ele) {
        return ele != value;
    });
}

function arrayChunks(myArray, chunk_size) {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index + chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}

function stringToHtmlDOM(string) {
    const parser = new DOMParser();
    return parser.parseFromString(string, "text/html");
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

function showLoadingWidget() {
    $("#loading-widget").fadeIn();
}

function hideLoadingWidget() {
    $("#loading-widget").fadeOut();
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

function addAlertPrimaryBox(text) {
    addAlertBox(text, "alert-primary");
}

function logWarning(message) {
    console.warn(message);
    addAlertWarningBox(message);
}

function logError(message) {
    console.error(message);
    addAlertErrorBox(message);
}


function isSteamTagNrRelevant(nr) {
    // From https://partner.steamgames.com/doc/store/tags#5
    // Only the first 15 are relevant
    // 0 Index based
    return nr < 15;
}

function getSteamLinksFromLocalStorage() {
    let value = localStorage.getItem("steamLinks");
    return value === null ? null : value;
}

function setSteamLinkInLocalStorage(steamLinks) {
    localStorage.setItem("steamLinks", steamLinks);
}

function getSteamLinksFromCurrentPageUrl() {
    const params = new URLSearchParams(location.search);
    return params.get("links");
}

function setSteamLinkToCurrentPageUrl(steamLinks) {
    const params = new URLSearchParams(location.search);
    params.set('links', steamLinks);
    window.history.replaceState({}, '', `${location.pathname}?${params}`);
    // document.location.search = '?' + $.param({'links': steamLinks});
}

function getSteamAppIdFromURL(url) {
    const regex = /.*store\.steampowered.com\/app\/(\d+).*/i;

    let matches = null;
    if ((matches = regex.exec(url)) !== null) {
        // Has first
        if (matches.length >= 1) {
            return matches[1];
        }
        // matches.forEach((match, groupIndex) => {
        // console.log(`Found match, group ${groupIndex}: ${match}`);
        // });
    }

    return null;
}

function getSteamTagsFromHtmlPage(htmlData) {
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

function getSteamAppNameFromHtmlPage(htmlData) {
    if (htmlData === null) {
        return "CAN'T PARSE";
    }
    let $title = $(htmlData).find(".apphub_AppName");
    if ($title !== null) {
        return $title.first().text();
    }

    return "UNKNOWN"
}

function isSteamAgeCheckPage(htmlData) {
    return htmlData.querySelector(".agegate_birthday_desc") !== null;
}

function getSteamEmptyPlayersData() {
    return {
        'online': {
            'now': 0,
            '24hPeak': 0,
            '3MonthsPeak': 0
        },
        'playTime': {
            'avgTotal': '',
            'avg2Weeks': ''
        },
        'owners': ''
    };
}

function getSteamDBPlayersDataFromHtmlPage(htmlData) {
    let playersData = getSteamEmptyPlayersData();

    const $htmlData = $(htmlData);

    function getCleanText($element) {
        return $element.text().replaceAll(",", "");
    }

    // NOTE: paths are copied  using inspect element -> CSS selector copy
    // Children
    playersData['online'] = {
        'now': getCleanText($htmlData.find("ul.app-chart-numbers:nth-child(2) > li:nth-child(1) > strong:nth-child(1)")),
        '24hPeak': getCleanText($htmlData.find("ul.app-chart-numbers:nth-child(2) > li:nth-child(2) > strong:nth-child(1)")),
        'AllTimePeak': getCleanText($htmlData.find("ul.app-chart-numbers:nth-child(2) > li:nth-child(3) > strong:nth-child(1)"))
    };

    // $playersOnlineList.children().each(function(index, li) {
    //     if (index == 0) {
    //         // right now

    //     } else if (index == 1) {
    //         // 24 hour peak

    //     } else if (index == 2) {
    //         // all time peak - 3 months ago

    //     }
    //     console.log(li);
    // });

    let $steamSpyEstimatorsList = $htmlData.find("ul.steamspy-stats:nth-child(4)");
    // Children
    playersData['owners'] = getCleanText($htmlData.find("ul.app-chart-numbers:nth-child(4) > li:nth-child(3) > strong:nth-child(1)"));
    playersData['playTime'] = {
        'avgTotal': $htmlData.find("ul.app-chart-numbers:nth-child(4) > li:nth-child(2) > strong:nth-child(2)").text(),
        'avg2Weeks': $htmlData.find("ul.app-chart-numbers:nth-child(4) > li:nth-child(2) > strong:nth-child(1)").text()
    };

    return playersData;
}
