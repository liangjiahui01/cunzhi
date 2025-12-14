import { useEffect, useState, useCallback, useMemo } from "react";
import { RequestCard } from "./components/RequestCard";
import { HistoryList } from "./components/HistoryList";
import { DetailModal } from "./components/DetailModal";
import type { WaitMeRequest, ImageAttachment, ContextRule } from "./types";

declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

function loadState<T>(key: string, defaultValue: T): T {
  try {
    const state = vscode.getState() as Record<string, unknown> | undefined;
    if (state && key in state) {
      return state[key] as T;
    }
  } catch (e) {
    console.error("Failed to load state:", e);
  }
  return defaultValue;
}

function saveState(key: string, value: unknown): void {
  try {
    const state = (vscode.getState() as Record<string, unknown>) || {};
    state[key] = value;
    vscode.setState(state);
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

const INITIAL_CONTEXT_RULES: ContextRule[] = [
  { id: "no_docs", label: "不要生成总结性Markdown文档", enabled: true, content: "❌请记住，不要生成总结性Markdown文档" },
  { id: "no_tests", label: "不要生成测试脚本", enabled: true, content: "❌请记住，不要生成测试脚本" },
  { id: "no_compile", label: "不要编译，用户自己编译", enabled: true, content: "❌请记住，不要编译，用户自己编译" },
  { id: "no_run", label: "不要运行，用户自己运行", enabled: true, content: "❌请记住，不要运行，用户自己运行" },
];

type TabType = "current" | "history";

function App() {
  const [requests, setRequests] = useState<WaitMeRequest[]>([]);
  const [history, setHistory] = useState<WaitMeRequest[]>(() => loadState("history", []));
  const [contextRules, setContextRules] = useState<ContextRule[]>(() => loadState("contextRules", INITIAL_CONTEXT_RULES));
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const [selectedItem, setSelectedItem] = useState<WaitMeRequest | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("current");
  const [currentProjectPath, setCurrentProjectPath] = useState<string>("");

  const filteredRequests = useMemo(() => {
    if (projectFilter === "all") return requests;
    if (!currentProjectPath) return requests;
    return requests.filter((r) => r.projectPath === currentProjectPath);
  }, [requests, projectFilter, currentProjectPath]);

  useEffect(() => {
    saveState("history", history);
  }, [history]);

  useEffect(() => {
    saveState("contextRules", contextRules);
  }, [contextRules]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "requests":
          setRequests(message.requests.filter((r: WaitMeRequest) => r.status !== "completed"));
          break;
        case "responseSent":
          setRequests((prev) => {
            const completed = prev.find((r) => r.requestId === message.requestId);
            if (completed) {
              setHistory((h) => [
                { ...completed, status: "completed", response: message.response },
                ...h.slice(0, 49),
              ]);
            }
            return prev.filter((r) => r.requestId !== message.requestId);
          });
          break;
        case "projectPath":
          setCurrentProjectPath(message.projectPath);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "getRequests" });

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleResponse = useCallback(
    (
      requestId: string,
      userInput?: string,
      selectedOptions?: string[],
      images?: ImageAttachment[]
    ) => {
      const enabledRules = contextRules.filter((r) => r.enabled);
      const contextSuffix = enabledRules.length > 0
        ? "\n\n" + enabledRules.map((r) => r.content).join("\n")
        : "";

      const finalInput = userInput ? userInput + contextSuffix : (contextSuffix ? contextSuffix.trim() : undefined);

      vscode.postMessage({
        type: "response",
        requestId,
        userInput: finalInput,
        selectedOptions,
        images,
      });
    },
    [contextRules]
  );

  const handleDelete = useCallback((requestId: string) => {
    setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    vscode.postMessage({ type: "deleteRequest", requestId });
  }, []);

  const toggleContextRule = useCallback((id: string) => {
    setContextRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-vscode-border">
        <div className="flex items-center gap-1 p-2">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              activeTab === "current"
                ? "bg-vscode-button text-vscode-buttonFg"
                : "hover:bg-vscode-secondary"
            }`}
          >
            当前 ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              activeTab === "history"
                ? "bg-vscode-button text-vscode-buttonFg"
                : "hover:bg-vscode-secondary"
            }`}
          >
            历史 ({history.length})
          </button>
          {activeTab === "history" && history.length > 0 && (
            <button
              onClick={clearHistory}
              className="ml-auto px-2 py-1 text-xs text-red-400 hover:text-red-300"
            >
              清空
            </button>
          )}
        </div>
        {activeTab === "current" && (
          <div className="flex items-center gap-1 px-2 pb-2">
            <button
              onClick={() => setProjectFilter("current")}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${
                projectFilter === "current"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              当前项目 ({currentProjectPath ? requests.filter((r) => r.projectPath === currentProjectPath).length : 0})
            </button>
            <button
              onClick={() => setProjectFilter("all")}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${
                projectFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              全部项目 ({requests.length})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "history" ? (
          <HistoryList history={history} onItemClick={setSelectedItem} />
        ) : filteredRequests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-vscode-fg opacity-50">
            <p>暂无待处理请求</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.requestId}
                request={request}
                onResponse={handleResponse}
                onDelete={handleDelete}
                contextRules={contextRules}
                onToggleContextRule={toggleContextRule}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

export default App;
