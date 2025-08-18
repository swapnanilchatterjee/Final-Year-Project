import React, { useState, useEffect } from "react";
import GraphNeuralNetwork from "../algorithms/GraphNeuralNetwork";

// ✅ Import JSON directly from src/data
import sampleLogs from "../data/sample_logs.json";
import testData from "../data/test_data.json";

// Utility: Convert JSON to CSV string
const convertToCSV = (objArray) => {
  const array = Array.isArray(objArray) ? objArray : [objArray];
  if (array.length === 0) return "";

  const keys = Object.keys(array[0]);
  const csv = [
    keys.join(","), // header
    ...array.map((row) =>
      keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")
    ),
  ];
  return csv.join("\n");
};

const GNNLogAnalyzer = () => {
  const [dataset, setDataset] = useState("sample"); // "sample" or "test"
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  // ✅ Load data when dataset changes
  useEffect(() => {
    if (dataset === "sample") {
      setData(sampleLogs);
    } else {
      setData(testData);
    }
  }, [dataset]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const gnn = new GraphNeuralNetwork(data.nodes, data.edges);
      const results = gnn.analyze();
      setAnalysisResults(results);
    } catch (e) {
      console.error("Analysis error:", e);
      alert("Analysis failed: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportCSV = () => {
    if (!analysisResults) {
      alert("Run analysis first!");
      return;
    }

    const anomaliesCSV = convertToCSV(analysisResults.anomalies || []);
    const blob = new Blob([anomaliesCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "analysis_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 border rounded-lg shadow bg-white">
      {/* ✅ Dataset selector */}
      <div className="mb-4">
        <label className="mr-2 font-medium">Choose Dataset:</label>
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="sample">Sample Logs</option>
          <option value="test">Test Data</option>
        </select>
      </div>

      <div className="space-x-2">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </button>

        <button
          onClick={exportCSV}
          disabled={!analysisResults}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {analysisResults && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Overview</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(analysisResults.overview, null, 2)}
          </pre>

          <h2 className="text-xl font-semibold">System Health</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(analysisResults.systemHealth, null, 2)}
          </pre>

          <h2 className="text-xl font-semibold">Anomalies</h2>
          {analysisResults.anomalies?.length > 0 ? (
            <ul className="list-disc pl-6">
              {analysisResults.anomalies.map((a, i) => (
                <li key={i}>
                  <strong>{a.nodeId}</strong> – {a.reasons} (score: {a.score})
                </li>
              ))}
            </ul>
          ) : (
            <p>No anomalies detected</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GNNLogAnalyzer;
