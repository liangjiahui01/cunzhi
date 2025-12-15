import { useEffect, useState, useCallback, useMemo } from "react";
import { RequestCard } from "./components/RequestCard";
import { HistoryList } from "./components/HistoryList";
import { DetailModal } from "./components/DetailModal";
import type { WaitMeRequest, ImageAttachment, ContextRule, WaitMeConfig } from "./types";

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

type TabType = "current" | "all" | "history";

function App() {
  const [requests, setRequests] = useState<WaitMeRequest[]>([]);
  const [history, setHistory] = useState<WaitMeRequest[]>(() => loadState("history", []));
  const [contextRules, setContextRules] = useState<ContextRule[]>(() => loadState("contextRules", INITIAL_CONTEXT_RULES));
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const [selectedItem, setSelectedItem] = useState<WaitMeRequest | null>(null);
  const [currentProjectPath, setCurrentProjectPath] = useState<string>("");
  const [config, setConfig] = useState<WaitMeConfig>({ theme: "system", showToast: true });
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return requests;
    if (activeTab === "current") {
      if (!currentProjectPath) return requests;
      return requests.filter((r) => r.projectPath === currentProjectPath);
    }
    return [];
  }, [requests, activeTab, currentProjectPath]);

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
        case "config":
          setConfig(message.config);
          break;
        case "serverStatus":
          setServerOnline(message.online);
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
    if (window.confirm("确定要清空所有历史记录吗？此操作不可撤销。")) {
      setHistory([]);
    }
  }, []);

  const deleteHistoryItems = useCallback((ids: string[]) => {
    setHistory((prev) => prev.filter((h) => !ids.includes(h.requestId)));
  }, []);

  const effectiveTheme = useMemo(() => {
    if (config.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return config.theme;
  }, [config.theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme]);

  const currentProjectCount = currentProjectPath ? requests.filter((r) => r.projectPath === currentProjectPath).length : 0;

  return (
    <div className={`flex h-full overflow-hidden theme-${effectiveTheme}`}>
      {/* 左侧 tabs */}
      <div className="flex flex-col w-12 shrink-0 border-r border-vscode-border bg-vscode-bg">
        <button
          onClick={() => setActiveTab("current")}
          title="当前项目"
          className={`px-2 py-3 text-sm text-center transition-colors border-b border-vscode-border ${
            activeTab === "current"
              ? "bg-vscode-button text-vscode-buttonFg"
              : "hover:bg-vscode-secondary"
          }`}
        >
          📁<br/><span className="text-xs">{currentProjectCount}</span>
        </button>
        <button
          onClick={() => setActiveTab("all")}
          title="全部项目"
          className={`px-2 py-3 text-sm text-center transition-colors border-b border-vscode-border ${
            activeTab === "all"
              ? "bg-vscode-button text-vscode-buttonFg"
              : "hover:bg-vscode-secondary"
          }`}
        >
          📋<br/><span className="text-xs">{requests.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          title="历史记录"
          className={`px-2 py-3 text-sm text-center transition-colors border-b border-vscode-border ${
            activeTab === "history"
              ? "bg-vscode-button text-vscode-buttonFg"
              : "hover:bg-vscode-secondary"
          }`}
        >
          🕐<br/><span className="text-xs">{history.length}</span>
        </button>
        {activeTab === "history" && history.length > 0 && (
          <button
            onClick={clearHistory}
            title="清空历史"
            className="px-2 py-3 text-sm text-center text-red-400 hover:text-red-300 border-b border-vscode-border"
          >
            🗑️
          </button>
        )}
        {/* 底部服务状态 */}
        <div className="mt-auto border-t border-vscode-border">
          <button
            onClick={() => {
              if (serverOnline) {
                vscode.postMessage({ type: "stopServer" });
              } else {
                vscode.postMessage({ type: "startServer" });
              }
            }}
            title={serverOnline ? "服务在线 - 点击停止" : "服务离线 - 点击启动"}
            className={`w-full px-2 py-3 text-sm text-center transition-colors ${
              serverOnline 
                ? "text-green-500 hover:bg-red-500/20" 
                : "text-red-500 hover:bg-green-500/20"
            }`}
          >
            {serverOnline ? "⚡" : "⏻"}
          </button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "history" ? (
          <HistoryList history={history} onItemClick={setSelectedItem} onDeleteItems={deleteHistoryItems} />
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
