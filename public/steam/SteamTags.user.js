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

function get_tags_from_element(parent_element) {
  // Get all tags of page
  var tag_elements = parent_element.querySelectorAll(".app_tag");
  var tag_strings = [];
  for (var i = 0; i < tag_elements.length; i++) {
    var element = tag_elements[i]
    tag_strings.push(element.innerText.trim());
  }
  return tag_strings;
}

function create_steam_button(text) {
  var button = document.createElement("button");
  button.className += "btnv6_blue_hoverfade btn_medium steam_element";
  button.innerHTML = "<span>" + text + "</span>";
  return button;
}

function main() {
  'use strict';

  GM_addStyle(`
    .steam_element {
      display: block;
      margin-bottom: 6px;
    }
` );

  // Get tags line parent
  var element_tags_root_container = element_tags_root_container = document.querySelector(".es_side_details > div:nth-child(4)");
  //console.log(element_tags_root_container);

  var readeable_tags_string = get_tags_from_element(element_tags_root_container).join(", ")
  console.log(readeable_tags_string);

  var button_show = create_steam_button("Show Tags");
  var button_copy = create_steam_button("Copy Tags to clipboard");

  button_show.appendAfter(element_tags_root_container);
  button_copy.appendAfter(element_tags_root_container);

  button_show.addEventListener("click", function () {
    alert(readeable_tags_string);
  });
  button_copy.addEventListener("click", function () {
    copyToClipboard(readeable_tags_string);
  });
}

(function () {
  'use strict';
  console.log("Steam Tags Loaded");
  window.addEventListener('load', function () {
    console.log("Steam Tags Window Loaded");
    waitFor(".es_side_details > div:nth-child(4)").then(main);
  }, false);
})();
