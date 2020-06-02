import parser from "../src/parser";
import { importRootDir } from "../src/runtime";
import { deepWalk } from "./fs_util";

describe("parser", function () {

  it("should be able to parse every source file in sslib", async function () {
    await deepWalk(importRootDir, async file => { parser.parseFile(file); });
  });

  it("should be able to parse every source file in ssexamples", async function () {
    await deepWalk("ssexamples", async file => { parser.parseFile(file); });
  });
});
