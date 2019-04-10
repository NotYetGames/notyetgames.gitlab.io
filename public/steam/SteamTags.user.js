// ==UserScript==
// @name         Steam Tags
// @namespace    steam
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://store.steampowered.com/app/*
// @grant        none
// ==/UserScript==

Element.prototype.appendAfter = function (element) {
    element.parentNode.insertBefore(this, element.nextSibling);
};

Element.prototype.appendBefore = function (element) {
    element.parentNode.insertBefore(this, element);
};

function GM_addStyle(css) {
    const style = document.getElementById("GM_addStyleBy8626") || (function () {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.id = "GM_addStyleBy8626";
        document.head.appendChild(style);
        return style;
    })();
    const sheet = style.sheet;
    sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
}

const waitFor = (...selectors) => new Promise(resolve => {
    const delay = 500
    const f = () => {
        const elements = selectors.map(selector => document.querySelector(selector))
        if (elements.every(element => element != null)) {
            resolve(elements)
        } else {
            //console.log("Steam Tag delaying");
            setTimeout(f, delay)
        }
    }
    f()
})

const copyToClipboard = str => {
    const el = document.createElement('textarea');  // Create a <textarea> element
    el.value = str;                                 // Set its value to the string that you want copied
    el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
    el.style.position = 'absolute';
    el.style.left = '-9999px';                      // Move outside the screen to make it invisible
    document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
    const selected =
        document.getSelection().rangeCount > 0        // Check if there is any content selected previously
            ? document.getSelection().getRangeAt(0)     // Store selection if found
            : false;                                    // Mark as false to know no selection existed before
    el.select();                                    // Select the <textarea> content
    document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
    document.body.removeChild(el);                  // Remove the <textarea> element
    if (selected) {                                 // If a selection existed before copying
        document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
        document.getSelection().addRange(selected);   // Restore the original selection
    }
};

const FIRST_PARENT_SELECTOR = ".es_side_details > div:nth-child(4)";
const SECOND_PARENT_SELECTOR = ".glance_tags_ctn";

var readable_tags_string = "";

function getSteamTagsFromParentElement(parent_element) {
    // Get all tags of page
    var tag_elements = parent_element.querySelectorAll(".app_tag");
    var tag_strings = [];
    for (var i = 0; i < tag_elements.length; i++) {
        var element = tag_elements[i];
        var text = element.innerText.trim();
        if (text !== "+") {
            tag_strings.push(text);
        }
    }
    return tag_strings;
}

function createSteamButton(text) {
    var button = document.createElement("button");
    button.className += "btnv6_blue_hoverfade btn_medium steam_element";
    button.innerHTML = "<span>" + text + "</span>";
    return button;
}


function onClickShowButton() {
    alert(readable_tags_string);
}

function onClickCopyButton() {
    copyToClipboard(readable_tags_string);
}

function createShowButton(parent) {
    var button_show = createSteamButton("Show Tags");
    button_show.appendAfter(parent);
    button_show.addEventListener("click", onClickShowButton);
}

function createCopyButton(parent) {
    var button_copy = createSteamButton("Copy Tags to clipboard");
    button_copy.appendAfter(parent);
    button_copy.addEventListener("click", onClickCopyButton);
}

function createButtonsForParent(selector) {
    console.info("Steam Tags: createButtonsForParent for selector = " + selector);

    var parent = document.querySelector(selector);
    if (parent === null) {
        console.warn("Got null parent");
        return;
    }

    // Get from first one
    if (readable_tags_string.length == 0) {
        readable_tags_string = getSteamTagsFromParentElement(parent).join(", ")
    }
    console.log(readable_tags_string);

    createShowButton(parent);
    createCopyButton(parent);
}

(function () {
    'use strict';
    console.log("Steam Tags Loaded");
    window.addEventListener('load', function () {
        console.log("Steam Tags Window Loaded");
        GM_addStyle(`
        .steam_element {
          display: block;
          margin-bottom: 6px;
        }
    ` );

        createButtonsForParent(SECOND_PARENT_SELECTOR);
        createButtonsForParent(FIRST_PARENT_SELECTOR);

        // waitFor(SECOND_PARENT_SELECTOR).then(function() {
        // });
        // waitFor(FIRST_PARENT_SELECTOR).then(function() {
        // });
    }, false);
})();
