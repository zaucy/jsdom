"use strict";
var defineGetter = require("../utils").defineGetter;
var core = require("../level3/core").dom.level3.core;
require("./node");

// modify cloned instance for more info check: https://github.com/tmpvar/jsdom/issues/325
core = Object.create(core);


/*
  // Introduced in Living Standard:
  interface DOMImplementation {
    [NewObject] Document createHTMLDocument(optional DOMString title);
  };
*/

core.DOMImplementation.prototype.createHTMLDocument = function(title) {
  // Let doc be a new document that is an HTML document.
  // Set doc's content type to "text/html".
  var document = new core.Document({
    contentType: "text/html"
  });

  // Values set according to w3c test suite:
  // https://github.com/w3c/web-platform-tests/blob/master/dom/nodes/DOMImplementation-createHTMLDocument.html
  document.URL = document.documentURI = "about:blank";
  document.compatMode = "CSS1Compat";
  document.characterSet = "UTF-8";

  // Create a doctype, with "html" as its name and with its node document set
  // to doc. Append the newly created node to doc.
  document.doctype = this.createDocumentType("html", "", "");

  // Create an html element in the HTML namespace, and append it to doc.
  var htmlElement = document.createElementNS("http://www.w3.org/1999/xhtml", "html");
  document.appendChild(htmlElement);

  // Create a head element in the HTML namespace, and append it to the html
  // element created in the previous step.
  var headElement = document.createElement("head");
  htmlElement.appendChild(headElement);

  // If the title argument is not omitted:
  if (title !== undefined) {
    // Create a title element in the HTML namespace, and append it to the head
    // element created in the previous step.
    var titleElement = document.createElement("title");
    headElement.appendChild(titleElement);

    // Create a Text node, set its data to title (which could be the empty
    // string), and append it to the title element created in the previous step.
    titleElement.appendChild(document.createTextNode(title));
  }

  // Create a body element in the HTML namespace, and append it to the html
  // element created in the earlier step.
  htmlElement.appendChild(document.createElement("body"));

  // doc's origin is an alias to the origin of the context object's associated
  // document, and doc's effective script origin is an alias to the effective
  // script origin of the context object's associated document.

  return document;
};



// https://dom.spec.whatwg.org/#concept-element-local-name
// This getter exists because of the problems cause by our historical layering structure. Although in the modern DOM
// Standard localName is defined for all elements, our code in level1 and level2 only sets the _localName property for
// elements created in a namespace. We hack around that by falling back to splitting _nodeName when a _localName isn't
// present. Patches welcome to clean this up; otherwise it'll happen as we move to a single file defining Element.
defineGetter(core.Element.prototype, "localName", function() {
  if (this._localName) {
    return this._localName;
  }

  var nodeName = this._nodeName.split(":")[1] || this._nodeName;
  if (nodeName) {
    nodeName = nodeName.toLowerCase();
  }
  return nodeName !== undefined ? nodeName : null;
});


exports.dom = { living: { core: core } };
