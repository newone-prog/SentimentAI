# SentimentAI Project Roadmap

This document outlines our upcoming goals and feature developments, ordered from easiest to most difficult as requested.

## 1. [COMPLETED] Split Investor Tab LLM Calls (Easy)
Currently, the `AgenticOrchestrator` generates both the Research Paper and the Devil's Advocate (DA) report in a single LLM call. This results in the DA report being overly concise due to token and attention limits.
- **Goal:** Split this into two sequential LLM calls.
- **Execution:** 
  1. Trigger the Research Paper LLM generation.
  2. Pass the generated Research Paper as context into a *second* LLM call specifically designed to act as the Devil's Advocate.

## 2. [COMPLETED] Fix Mutual Fund (MF) Analysis (Medium)
The current Mutual Fund analysis in the Investor tab is lacking deep fundamental and technical data, and the UI doesn't match the robust Equity analysis interface.
- **Goal:** Enhance MF data fetching and unify the UI.
- **Execution:** 
  1. Update the backend web scrapers and APIs to fetch comprehensive MF data (holdings, sector weightings, AUM, expense ratios, technical momentum).
  2. Migrate the MF analysis results to use the exact same UI components as the Equity analysis for a consistent, deep-dive experience.

## 3. [COMPLETED] Futures & Options (FnO) Analysis in Trader Tab (Hard)
Add advanced derivatives analysis for the Indian markets (NIFTY50, NIFTYBANK, FINNIFTY, SENSEX, etc.).
- **Goal:** Provide accurate FnO trading signals and predictions.
- **Execution:**
  1. Integrate Options Chain data fetching.
  2. Implement advanced technical calculations specific to options (All Option Greeks, ATM/ITM/OTM pricing, Gamma blast detection, implied volatility rank).
  3. Generate precise entry/exit signals for options buyers/sellers.

## 4. SamAI Conversational Interface (Complex)
Build a flagship, Claude-like conversational AI page dedicated to finance.
- **Goal:** A free-form conversational interface using NVIDIA NIM's best models for complex financial tasks.
- **Features:**
  - Direct user chat regarding markets, portfolio management, investment advice, CA/CFA knowledge, etc.
  - **Tool Use/Agentic Capabilities:** SamAI can trigger web searches to find live data.
  - **Action Orchestration:** If a user asks "Analyze Tata Motors," SamAI can seamlessly trigger the backend Research Paper analysis pipeline and render the full report in the chat feed.
  - **Navigation:** Add a dedicated link to the main Navbar to access SamAI.
