import parser from "../src/parser";
import { importRootDir } from "../src/runtime";
import { deepLsSync } from "./fs_util";

describe("parser", function () {

  function testParse(folder: string): void {
    deepLsSync(folder).forEach(file => {
      if (!file.endsWith(".ss")) {
        return;
      }
      it(file, async function () {
        parser.parseFile(file);
      });
    });
  }

  describe("should be able to parse every script in sslib", function () {
    testParse(importRootDir);
  });

  describe("should be able to parse every script in the parser test folder", function () {
    testParse("test/parser/_sstests");
  });

  describe("should be able to parse every script in the compiler test folder", function () {
    testParse("test/compiler/_sstests");
  });

  describe("should be able to parse every script in the runtime test folder", function () {
    testParse("test/runtime/_sstests");
  });
});
