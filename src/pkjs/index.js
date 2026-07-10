const moddableProxy = require("@moddable/pebbleproxy");

Pebble.addEventListener("ready", function(event) {
  console.log("PebbleKit JS ready");
  moddableProxy.readyReceived(event);
});

Pebble.addEventListener("appmessage", function(event) {
  moddableProxy.appMessageReceived(event);
});