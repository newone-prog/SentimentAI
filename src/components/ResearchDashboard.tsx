import React, { useState } from 'react';

// Using types defined in backend (assuming shared or manually copied)
interface ResearchReport {
  ticker: string;
  executiveSummary: string;
  investmentThesis: string;
  finalVerdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidenceScore: number;
}

export const ResearchDashboard: React.FC = () => {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const handleResearch = async () => {
    setLoading(true);
    setReport(null);
    try {
      // Stub: Fetching from Firebase function endpoint
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate research report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Institutional Research Orchestrator</h1>
      
      <div className="flex space-x-4">
        <input 
          type="text" 
          value={ticker} 
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter Ticker (e.g. AAPL)"
          className="border p-2 rounded w-full"
        />
        <button 
          onClick={handleResearch} 
          disabled={loading || !ticker}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Researching..." : "Analyze"}
        </button>
      </div>

      {loading && (
        <div className="animate-pulse flex flex-col space-y-4 pt-8">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
        </div>
      )}

      {report && (
        <div className="border rounded p-6 bg-white shadow mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">{report.ticker} Research Report</h2>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${
              report.finalVerdict === "BULLISH" ? "bg-green-100 text-green-800" :
              report.finalVerdict === "BEARISH" ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {report.finalVerdict} ({report.confidenceScore}% Confidence)
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-lg border-b pb-2">Executive Summary</h3>
            <p className="mt-2 text-gray-700">{report.executiveSummary}</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg border-b pb-2">Investment Thesis</h3>
            <p className="mt-2 text-gray-700">{report.investmentThesis}</p>
          </div>
          
          {/* Future sections: Bull Case, Bear Case, Risk Matrix, Opportunity Matrix, Thesis Breakers */}
        </div>
      )}
    </div>
  );
};
