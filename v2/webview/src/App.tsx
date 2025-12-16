import { useEffect, useState, useCallback, useMemo } from "react";
import { RequestCard } from "./components/RequestCard";
import { HistoryList } from "./components/HistoryList";
import { DetailModal } from "./components/DetailModal";
import type { WaitMeRequest, ImageAttachment, ContextRule, WaitMeConfig } from "./types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set(loadState<string[]>("collapsedIds", [])));
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const [selectedItem, setSelectedItem] = useState<WaitMeRequest | null>(null);
  const [currentProjectPath, setCurrentProjectPath] = useState<string>("");
  const [config, setConfig] = useState<WaitMeConfig>({ theme: "system", showToast: true });
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  const filteredRequests = useMemo(() => {
    let result: WaitMeRequest[] = [];
    if (activeTab === "all") {
      result = requests;
    } else if (activeTab === "current") {
      if (!currentProjectPath) return [];
      result = requests.filter((r) => r.projectPath === currentProjectPath);
    }
    // 按时间倒序排列（最新的在上面）
    return [...result].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [requests, activeTab, currentProjectPath]);

  useEffect(() => {
    saveState("history", history);
  }, [history]);

  useEffect(() => {
    saveState("contextRules", contextRules);
  }, [contextRules]);

  useEffect(() => {
    saveState("collapsedIds", Array.from(collapsedIds));
  }, [collapsedIds]);

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
    setHistory([]);
  }, []);

  const deleteHistoryItems = useCallback((ids: string[]) => {
    setHistory((prev) => prev.filter((h) => !ids.includes(h.requestId)));
  }, []);

  const toggleCollapse = useCallback((requestId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  }, []);

  // Detect VSCode theme
  const [vsCodeTheme, setVsCodeTheme] = useState<"dark" | "light">(() => {
    const body = document.body;
    const isDark = body.classList.contains("vscode-dark") || 
                   body.getAttribute("data-vscode-theme-kind")?.includes("dark") ||
                   getComputedStyle(body).getPropertyValue("--vscode-editor-background").trim().match(/^#[0-3]/);
    return isDark ? "dark" : "light";
  });

  // Listen for VSCode theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const body = document.body;
      const isDark = body.classList.contains("vscode-dark") || 
                     body.getAttribute("data-vscode-theme-kind")?.includes("dark") ||
                     getComputedStyle(body).getPropertyValue("--vscode-editor-background").trim().match(/^#[0-3]/);
      setVsCodeTheme(isDark ? "dark" : "light");
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-vscode-theme-kind"] });
    return () => observer.disconnect();
  }, []);

  const effectiveTheme = useMemo(() => {
    if (config.theme === "system") {
      return vsCodeTheme;
    }
    return config.theme;
  }, [config.theme, vsCodeTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme]);

  const currentProjectCount = currentProjectPath ? requests.filter((r) => r.projectPath === currentProjectPath).length : 0;

  // Apply dark class to document for shadcn theming
  useEffect(() => {
    if (effectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [effectiveTheme]);

  return (
    <div className={cn(
      "flex h-full overflow-hidden",
      effectiveTheme === "dark" ? "bg-zinc-950" : "bg-gradient-to-br from-slate-50 to-slate-100"
    )}>
      {/* 左侧导航栏 - Glassmorphism 风格 */}
      <div className="flex flex-col w-14 shrink-0 glass-card rounded-none border-r border-l-0 border-t-0 border-b-0">
        {/* Tab 切换 */}
        <div className="flex flex-col gap-1 p-2">
          <Button
            variant={activeTab === "current" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("current")}
            title="当前项目"
            className={cn(
              "flex flex-col items-center justify-center h-auto py-2 px-1 gap-0.5",
              activeTab === "current" && "bg-slate-200 dark:bg-primary/90 shadow-lg"
            )}
          >
            <span className="text-base">📁</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 min-w-[20px] flex items-center justify-center">
              {currentProjectCount}
            </Badge>
          </Button>
          
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
            title="全部项目"
            className={cn(
              "flex flex-col items-center justify-center h-auto py-2 px-1 gap-0.5",
              activeTab === "all" && "bg-slate-200 dark:bg-primary/90 shadow-lg"
            )}
          >
            <span className="text-base">📋</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 min-w-[20px] flex items-center justify-center">
              {requests.length}
            </Badge>
          </Button>
          
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("history")}
            title="历史记录"
            className={cn(
              "flex flex-col items-center justify-center h-auto py-2 px-1 gap-0.5",
              activeTab === "history" && "bg-slate-200 dark:bg-primary/90 shadow-lg"
            )}
          >
            <span className="text-base">🕐</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 min-w-[20px] flex items-center justify-center">
              {history.length}
            </Badge>
          </Button>
        </div>

        {/* 清空历史按钮 */}
        {activeTab === "history" && history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            title="清空历史"
            className="mx-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            🗑️
          </Button>
        )}

        {/* 底部服务状态 */}
        <div className="mt-auto p-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (serverOnline) {
                vscode.postMessage({ type: "stopServer" });
              } else {
                vscode.postMessage({ type: "startServer" });
              }
            }}
            title={serverOnline ? "服务在线 - 点击停止" : "服务离线 - 点击启动"}
            className={cn(
              "w-full transition-all duration-300",
              serverOnline 
                ? "text-emerald-500 hover:bg-red-500/10 hover:text-red-500" 
                : "text-red-500 hover:bg-emerald-500/10 hover:text-emerald-500"
            )}
          >
            <span className="text-lg">
              {serverOnline ? "⚡" : "⏻"}
            </span>
          </Button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "history" ? (
            <HistoryList history={history} onItemClick={setSelectedItem} onDeleteItems={deleteHistoryItems} />
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
              <div className="text-4xl mb-4 opacity-30">🎯</div>
              <p className="text-sm">暂无待处理请求</p>
              <p className="text-xs mt-1 opacity-60">等待 AI 发起交互...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <div 
                  key={request.requestId} 
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <RequestCard
                    request={request}
                    onResponse={handleResponse}
                    onDelete={handleDelete}
                    contextRules={contextRules}
                    onToggleContextRule={toggleContextRule}
                    collapsed={collapsedIds.has(request.requestId)}
                    onToggleCollapse={toggleCollapse}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

export default App;
