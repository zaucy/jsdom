"use strict";

var jsdom = require("../..");
var EventEmitter = require("events").EventEmitter;
const injectIFrame = require("../util").injectIFrame;

var consoleMethods = [
  "assert",
  "clear",
  "count",
  "debug",
  "error",
  "group",
  "groupCollapse",
  "groupEnd",
  "info",
  "log",
  "table",
  "time",
  "timeEnd",
  "trace",
  "warn"
];

exports["jsdom.getVirtualConsole returns an instance of EventEmitter"] = function (t) {
  var window = jsdom.jsdom().defaultView;
  var vc = jsdom.getVirtualConsole(window);
  t.ok(vc instanceof EventEmitter, "getVirtualConsole returns an instance of EventEmitter");
  t.done();
};

exports["virtualConsole passes through any arguments"] = function (t) {
  var window = jsdom.jsdom().defaultView;
  var vc = jsdom.getVirtualConsole(window);

  consoleMethods.forEach(function (method) {
    var called = false;

    vc.on(method, function (arg1, arg2) {
      called = true;
      t.ok(arg1 === "yay", "virtualConsole.on '" + method + "' passes through any arguments (1)");
      t.ok(arg2 === "woo", "virtualConsole.on '" + method + "' passes through any arguments (2)");
    });
    window.console[method]("yay", "woo");

    t.ok(called, "virtualConsole emits '" + method + "' event");

    vc.removeAllListeners();
  });

  t.done();
};

exports["virtualConsole separates output by window"] = function (t) {
  var window1 = jsdom.jsdom().defaultView;
  var window2 = jsdom.jsdom().defaultView;
  var vc1Called = false;
  var vc2Called = false;
  var virtualConsole1 = jsdom.getVirtualConsole(window1);
  var virtualConsole2 = jsdom.getVirtualConsole(window2);

  virtualConsole1.on("log", function () {
    vc1Called = true;
  });
  virtualConsole2.on("log", function () {
    vc2Called = true;
  });

  window1.console.log("yay");

  t.ok(vc1Called === true, "should forward to window on which console was called");
  t.ok(vc2Called === false, "should not forward to window on which console was not called");

  t.done();
};

exports["virtualConsole.sendTo proxies console methods"] = function (t) {
  t.expect(consoleMethods.length);

  var window = jsdom.jsdom().defaultView;
  var virtualConsole = jsdom.getVirtualConsole(window);
  var fakeConsole = {};

  consoleMethods.forEach(function (method) {
    fakeConsole[method] = function () {
      t.ok(true, "sendTo works on all console methods");
    };
  });

  virtualConsole.sendTo(fakeConsole);

  consoleMethods.forEach(function (method) {
    window.console[method]();
  });

  t.done();
};

exports["createVirtualConsole returns a new virtual console"] = function (t) {
  var virtualConsole = jsdom.createVirtualConsole();

  t.ok(virtualConsole instanceof EventEmitter,
    "createVirtualConsole returns an instance of EventEmitter");

  t.done();
};

exports["jsdom.jsdom accepts a virtual console"] = function (t) {
  t.expect(2);
  var initialVirtualConsole = jsdom.createVirtualConsole();

  initialVirtualConsole.on("log", function (message) {
    t.ok(message === "yes",
      "supplied virtual console emits messages");
    t.done();
  });

  var window = jsdom.jsdom(null, {
    virtualConsole: initialVirtualConsole
  }).defaultView;

  var actualVirtualConsole = jsdom.getVirtualConsole(window);
  t.ok(initialVirtualConsole === actualVirtualConsole,
    "getVirtualConsole returns the console given in options");

  window.console.log("yes");
};

exports["jsdom.env accepts a virtual console"] = function (t) {
  t.expect(2);
  var initialVirtualConsole = jsdom.createVirtualConsole();

  initialVirtualConsole.on("log", function (message) {
    t.ok(message === "yes",
      "supplied virtual console emits messages");
    t.done();
  });

  jsdom.env({
    html: "",
    virtualConsole: initialVirtualConsole,
    done: function (errors, window) {
      var actualVirtualConsole = jsdom.getVirtualConsole(window);
      t.ok(initialVirtualConsole === actualVirtualConsole,
        "getVirtualConsole returns the console given in options");

      window.console.log("yes");
    }
  });
};

exports["virtualConsole option throws on bad input"] = function (t) {
  t.throws(function () {
    jsdom.jsdom(null, {
      virtualConsole: {}
    });
  });

  t.done();
};

exports["virtualConsole logs messages from child windows"] = function (t) {
  const virtualConsole = jsdom.createVirtualConsole();
  const messages = [];

  virtualConsole.on("log", function (message) {
    messages.push(message);
  });

  const document = jsdom.jsdom(null, {
    virtualConsole: virtualConsole
  });
  const window = document.defaultView;
  const iframeWindow = injectIFrame(document).contentWindow;

  window.console.log("parent window");
  iframeWindow.console.log("iframe window");

  window.onload = function () {
    t.equal(messages.length, 2);
    t.done();
  };
};

exports["virtualConsole.sendTo returns its instance of virtualConsole"] = function (t) {
  const window = jsdom.jsdom().defaultView;
  const virtualConsole = jsdom.getVirtualConsole(window);
  const actual = virtualConsole.sendTo(console);
  t.ok(actual === virtualConsole, "sendTo returns its instance of virtualConsole");
  t.done();
};

exports["not implemented messages show up as jsdomErrors in the virtual console"] = function (t) {
  const virtualConsole = jsdom.createVirtualConsole();
  virtualConsole.on("jsdomError", function (error) {
    t.ok(error instanceof Error);
    t.equal(error.message, "Not implemented: window.alert");
    t.done();
  });

  const doc = jsdom.jsdom("", { virtualConsole });
  doc.defaultView.alert();
};

exports["virtualConsole.sendTo forwards jsdomErrors to error by default"] = function (t) {
  t.expect(2);

  const e = new Error("Test message");
  e.detail = { foo: "bar" };

  const virtualConsole = jsdom.createVirtualConsole().sendTo({
    error(arg1, arg2) {
      t.strictEqual(arg1, e.stack);
      t.strictEqual(arg2, e.detail);
      t.done();
    }
  });

  virtualConsole.emit("jsdomError", e);
};

exports["virtualConsole.sendTo does not forward jsdomErrors when asked not to during construction"] = function (t) {
  const e = new Error("Test message");
  e.detail = { foo: "bar" };

  const virtualConsole = jsdom.createVirtualConsole({ omitJsdomErrors: true }).sendTo({
    error() {
      t.fail("should not call error");
    }
  });

  virtualConsole.emit("jsdomError", e);
  t.done();
};

exports["virtualConsole.sendTo does not forward jsdomErrors when asked not to after construction"] = function (t) {
  const e = new Error("Test message");
  e.detail = { foo: "bar" };

  const virtualConsole = jsdom.createVirtualConsole().sendTo({
    error() {
      t.fail("should not call error");
    }
  });

  t.strictEqual(virtualConsole.omitJsdomErrors, false);
  virtualConsole.omitJsdomErrors = true;

  virtualConsole.emit("jsdomError", e);
  t.done();
};
