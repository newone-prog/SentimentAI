"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const growwScraper_1 = require("./growwScraper");
const test = async () => {
    console.log("Testing Groww Options Chain...");
    const data = await (0, growwScraper_1.fetchGrowwOptionsChain)("NIFTY");
    console.log("Result:", data ? "Success" : "Failed - returned null");
};
test();
//# sourceMappingURL=testGrowwScraper.js.map