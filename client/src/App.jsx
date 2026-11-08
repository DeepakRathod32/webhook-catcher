import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000';

export default function App() {
  const [binId, setBinId] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [copied, setCopied] = useState(false);

  // 1. Create a new bin
  const createBin = async () => {
    try {
      const response = await fetch(`/api/bins`, { method: 'POST' });
      const data = await response.json();
      setBinId(data.binId);
      setWebhookUrl(`${BACKEND_URL}${data.url}`);
      setRequests([]);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Failed to create bin:', err);
    }
  };

  // 2. Connect to Socket.io whenever binId changes
  useEffect(() => {
    if (!binId) return;

    const socket = io(BACKEND_URL);

    socket.emit('join_bin', binId);

    socket.on('initial_requests', (existingRequests) => {
      setRequests(existingRequests);
      if (existingRequests.length > 0) {
        setSelectedRequest(existingRequests[0]);
      }
    });

    socket.on('new_request', (newReq) => {
      setRequests((prev) => [newReq, ...prev]);
      // Auto-select the newest request if nothing is selected
      setSelectedRequest((current) => current || newReq);
    });

    return () => {
      socket.disconnect();
    };
  }, [binId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-blue-400">⚡ WebhookCatcher</h1>
        {!binId ? (
          <button
            onClick={createBin}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            Create Request Bin
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Your Endpoint:</span>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-3 py-1 rounded text-sm w-80 select-all"
            />
            <button
              onClick={copyToClipboard}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition"
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {!binId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-3xl font-semibold mb-3">Inspect incoming webhooks instantly</h2>
          <p className="text-gray-400 max-w-md mb-6">
            Generate a unique URL to capture, inspect, and debug webhooks from Stripe, GitHub, and other services in real time.
          </p>
          <button
            onClick={createBin}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl shadow-lg transition"
          >
            Get Started — Create Bin
          </button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Request List */}
          <div className="w-1/3 border-r border-gray-800 overflow-y-auto bg-gray-900/50">
            <div className="p-3 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
              <span>Requests</span>
              <span>{requests.length} received</span>
            </div>
            {requests.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Waiting for incoming webhooks... Send a request to your URL!
              </div>
            ) : (
              <ul>
                {requests.map((req) => (
                  <li
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-3 border-b border-gray-800 cursor-pointer transition flex items-center justify-between ${
                      selectedRequest?.id === req.id ? 'bg-blue-950/40 border-l-4 border-l-blue-500' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          req.method === 'POST' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'
                        }`}
                      >
                        {req.method}
                      </span>
                      <span className="text-sm font-mono text-gray-300">/hook/...</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(req.timeStamp).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Panel: Detailed Inspector */}
          <div className="w-2/3 flex flex-col overflow-y-auto bg-gray-950 p-6">
            {selectedRequest ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Request ID</span>
                    <span className="font-mono text-lg text-white">{selectedRequest.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Timestamp</span>
                    <span className="text-sm text-gray-300">{selectedRequest.timeStamp}</span>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Headers</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto space-y-1">
                    {Object.entries(selectedRequest.headers || {}).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-blue-400">{key}:</span> {val}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body / Payload */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Payload Body</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                    <pre>{JSON.stringify(selectedRequest.body, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a request from the sidebar to inspect its headers and payload.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}