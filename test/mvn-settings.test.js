"use strict";

const { describe, it } = require("mocha");

const path = require("path");
const fs = require("fs");

const assert = require("assert");
const mockedEnv = require("mocked-env");

const { extendArray, generateSettings } = require("../mvn-settings");

let settingsPath = path.join(__dirname, "settings.xml");

const minify1 = /\s{2,}|($(\r|\n))/gm;
const minify2 = />\s</gm;

function minify(str) {
  return str.replace(minify1, " ").replace(minify2, "><");
}

function getSettingsXML(content) {
  return (
    '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">' +
    content +
    "</settings>"
  );
}

function readSettingsFile(custompath) {
  if (custompath === undefined) {
    return minify(fs.readFileSync(settingsPath, "utf8"));
  } else {
    return minify(fs.readFileSync(custompath, "utf8"));
  }
}

function deleteSettingsFile(custompath) {
  if (custompath === undefined) {
    try {
      fs.unlinkSync(settingsPath);
    } catch (e) {
      console.error(`Could not delete settings file ${settingsPath}`);
    }
  } else {
    try {
      fs.unlinkSync(custompath);
    } catch (e) {
      console.error(`Could not delete settings file ${custompath}`);
    }
  }
}

describe("test/mvn-settings.test.js", function () {
  describe("#minify()", function () {
    it("should minify the settings.xml properly", function () {
      let Sqrl = require("squirrelly");
      assert.strictEqual(
        minify(
          Sqrl.render(
            fs.readFileSync(
              path.join(__dirname, "..", "template", "settings.xml"),
              "utf8"
            ),
            {}
          )
        ),
        getSettingsXML("")
      );
    });
  });
});

describe("index.js", function () {
  it("should create an empty settings file", function () {
    let restore = mockedEnv({
      UNIT_TEST: "true",
      PLUGIN_CUSTOMPATH: settingsPath,
    });
    try {
      require("../index");
      assert.strictEqual(readSettingsFile(), getSettingsXML(""));
    } finally {
      restore();
    }
  });
});

describe("mvn-settings.js", function () {
  describe("#extendArray()", function () {
    it("should use the source array if the target is not defined", function () {
      let source = [
        {
          key: 1,
          name: "The first",
          value: "it is great",
        },
        {
          key: 2,
          name: "The second",
          value: "still good",
        },
      ];
      assert.deepStrictEqual(extendArray("key", undefined, source), source);
    });
    it("should extend the array properly based on the unique key", function () {
      let target = [
        {
          key: 1,
          name: "The first",
          value: "it is great",
        },
        {
          key: 2,
          name: "The second",
          value: "still good",
        },
      ];
      let source = [
        {
          key: 2,
          extended: "the true value",
        },
      ];
      assert.deepStrictEqual(extendArray("key", target, source), [
        {
          key: 1,
          name: "The first",
          value: "it is great",
        },
        {
          key: 2,
          name: "The second",
          value: "still good",
          extended: "the true value",
        },
      ]);
    });
    it("should add new elements if they are missing", function () {
      let target = [
        {
          key: 1,
          name: "The first",
          value: "it is great",
        },
        {
          key: 2,
          name: "The second",
          value: "still good",
        },
      ];
      let source = [
        {
          key: 3,
          name: "The third",
          value: "kinda bad",
        },
      ];
      assert.deepStrictEqual(extendArray("key", target, source), [
        {
          key: 1,
          name: "The first",
          value: "it is great",
        },
        {
          key: 2,
          name: "The second",
          value: "still good",
        },
        {
          key: 3,
          name: "The third",
          value: "kinda bad",
        },
      ]);
    });
  });
  describe("#generateSettings()", function () {
    it("should create an empty settings file", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(readSettingsFile(), getSettingsXML(""));
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
    it("should output something to the console", function () {
      let restore = mockedEnv(
        {
          PLUGIN_CUSTOMPATH: settingsPath,
        },
        { clear: true }
      );
      let originalLog = console.log;
      let consoleOutput = [];
      console.log = (str) => consoleOutput.push(str);
      try {
        generateSettings();
        assert.strictEqual(readSettingsFile(), getSettingsXML(""));
        assert.deepEqual(consoleOutput, [
          "Creating settings.xml file...",
          "The settings.xml file has been created",
        ]);
      } finally {
        restore();
        console.log = originalLog;
        deleteSettingsFile();
      }
    });
    it("should add the local repository declaration", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
          PLUGIN_LOCALREPOSITORY: "https://example.org/",
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(
          readSettingsFile(),
          getSettingsXML(
            "<localRepository>https://example.org/</localRepository>"
          )
        );
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
    it("should add the server declarations", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
          PLUGIN_SERVERS: JSON.stringify([
            {
              id: "sytm-nexus",
              username: "md5lukas",
              password: "password",
            },
            {
              id: "sonatype",
              username: "sona",
              password: "type",
            },
          ]),
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(
          readSettingsFile(),
          getSettingsXML(
            "<servers><server><id>sytm-nexus</id><username>md5lukas</username><password>password</password></server>" +
              "<server><id>sonatype</id><username>sona</username><password>type</password></server></servers>"
          )
        );
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
    it("should merge the server secret variable into the server declarations", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
          PLUGIN_SERVERS: JSON.stringify([
            {
              id: "sytm-nexus",
              username: "md5lukas",
            },
            {
              id: "sonatype",
              username: "sona",
            },
          ]),
          PLUGIN_SERVERSECRETS: JSON.stringify([
            {
              id: "sytm-nexus",
              password: "password",
            },
            {
              id: "sonatype",
              password: "type",
            },
          ]),
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(
          readSettingsFile(),
          getSettingsXML(
            "<servers><server><id>sytm-nexus</id><username>md5lukas</username><password>password</password></server>" +
              "<server><id>sonatype</id><username>sona</username><password>type</password></server></servers>"
          )
        );
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
    it("should add the mirror declarations", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
          PLUGIN_MIRRORS: JSON.stringify([
            {
              id: "central-proxy",
              name: "Central Proxy",
              url: "https://repo.sytm.de/repository/maven-central/",
              mirrorOf: "central",
            },
          ]),
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(
          readSettingsFile(),
          getSettingsXML(
            "<mirrors><mirror><id>central-proxy</id><name>Central Proxy</name><url>https://repo.sytm.de/repository/maven-central/</url><mirrorOf>central</mirrorOf></mirror></mirrors>"
          )
        );
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
    it("should merge the mirror secret variable into the mirror declarations", function () {
      let restore = mockedEnv(
        {
          UNIT_TEST: "true",
          PLUGIN_CUSTOMPATH: settingsPath,
          PLUGIN_MIRRORS: JSON.stringify([
            {
              id: "central-proxy",
              name: "Central Proxy",
              mirrorOf: "central",
            },
            {
              id: "sonatype-proxy",
              name: "Sonatype Proxy",
              mirrorOf: "sonatype",
            },
          ]),
          PLUGIN_MIRRORSECRETS: JSON.stringify([
            {
              id: "central-proxy",
              url: "https://repo.sytm.de/repository/maven-central/",
            },
            {
              id: "sonatype-proxy",
              url: "https://repo.sytm.de/repository/maven-sonatype/",
            },
          ]),
        },
        { clear: true }
      );
      try {
        generateSettings();
        assert.strictEqual(
          readSettingsFile(),
          getSettingsXML(
            "<mirrors><mirror><id>central-proxy</id><name>Central Proxy</name><mirrorOf>central</mirrorOf><url>https://repo.sytm.de/repository/maven-central/</url></mirror><mirror><id>sonatype-proxy</id><name>Sonatype Proxy</name><mirrorOf>sonatype</mirrorOf><url>https://repo.sytm.de/repository/maven-sonatype/</url></mirror></mirrors>"
          )
        );
      } finally {
        restore();
        deleteSettingsFile();
      }
    });
  });
});
