"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacroAgent = void 0;
const BaseAgent_1 = require("./BaseAgent");
class MacroAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        super("MacroAgent");
    }
    buildPrompt(input) {
        return `
      You are the Macro Agent.
      Analyze interest rates, inflation, sector conditions, commodity impacts, and economic risks related to ${input.context.ticker}.
      Guidelines: ${input.guidelines}
    `;
    }
}
exports.MacroAgent = MacroAgent;
//# sourceMappingURL=MacroAgent.js.map