"use strict";
const Sqrl = require("squirrelly");
const path = require("path");
const fs = require("fs");
const extend = require("extend");

Sqrl.defaultConfig.autoEscape = false;

function generateSettings() {
  if (process.env["UNIT_TEST"] !== "true") {
    console.log("Creating settings.xml file...");
  }

  let settings = require("drone-env-parser").parseEnvs();

  if (settings.serversecrets) {
    settings.servers = extendArray(
      "id",
      settings.servers,
      settings.serversecrets
    );
  }
  if (settings.mirrorsecrets) {
    settings.mirrors = extendArray(
      "id",
      settings.mirrors,
      settings.mirrorsecrets
    );
  }

  let settingsTemplate = fs.readFileSync(
    path.join(__dirname, "template", "settings.xml"),
    "utf8"
  );
  let settingsFile = Sqrl.render(settingsTemplate, settings);

  let outputPath = "settings.xml";
  if (settings.custompath) {
    outputPath = settings.custompath;
  }

  fs.writeFileSync(outputPath, settingsFile);
  if (process.env["UNIT_TEST"] !== "true") {
    console.log("The settings.xml file has been created");
  }
}

function extendArray(uniqueKey, targetArray, sourceArray) {
  if (targetArray === undefined) {
    return sourceArray;
  }
  sourceArray.forEach((sourceElement) => {
    let targetElementIndex = targetArray.findIndex(
      (targetElement) => targetElement[uniqueKey] === sourceElement[uniqueKey]
    );
    if (targetElementIndex === -1) {
      targetArray.push(sourceElement);
    } else {
      extend(true, targetArray[targetElementIndex], sourceElement);
    }
  });
  return targetArray;
}

module.exports = {
  generateSettings,
  extendArray,
};
