"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsAgent = void 0;
const BaseAgent_1 = require("./BaseAgent");
class NewsAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super("NewsAgent");
    }
    buildPrompt(input) {
        return `
      You are the News Agent.
      Analyze the recent news to detect catalysts, risks, and overarching narratives for ${input.context.ticker}.
      News: ${JSON.stringify(input.context.news)}
      Guidelines: ${input.guidelines}
    `;
    }
}
exports.NewsAgent = NewsAgent;
//# sourceMappingURL=NewsAgent.js.map