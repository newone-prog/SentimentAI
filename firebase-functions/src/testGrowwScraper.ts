import { fetchGrowwOptionsChain } from "./growwScraper";

const test = async () => {
    console.log("Testing Groww Options Chain...");
    const data = await fetchGrowwOptionsChain("NIFTY");
    console.log("Result:", data ? "Success" : "Failed - returned null");
}

test();
