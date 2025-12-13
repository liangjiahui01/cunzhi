import type { WaitMeRequest } from "../types";

interface Props {
  history: WaitMeRequest[];
  onItemClick: (item: WaitMeRequest) => void;
}

export function HistoryList({ history, onItemClick }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-vscode-fg opacity-50">
        <p>暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((item) => (
        <div
          key={item.requestId}
          onClick={() => onItemClick(item)}
          className="rounded-lg border border-vscode-border bg-vscode-bg p-3 cursor-pointer hover:border-vscode-button transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-vscode-fg opacity-50 mb-1">
            <span>{item.projectPath.split("/").pop()}</span>
            <span>{new Date(item.timestamp).toLocaleString()}</span>
          </div>

          <p className="text-sm text-vscode-fg line-clamp-2 mb-2">
            {item.message.replace(/[#*`]/g, "").slice(0, 100)}
            {item.message.length > 100 && "..."}
          </p>

          {item.response && (
            <div className="flex items-center gap-2 text-xs text-vscode-fg opacity-60">
              {item.response.selectedOptions && item.response.selectedOptions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-vscode-button text-vscode-buttonFg">
                  {item.response.selectedOptions[0]}
                </span>
              )}
              {item.response.userInput && (
                <span className="truncate max-w-[150px]">
                  {item.response.userInput.split("\n")[0]}
                </span>
              )}
              {item.response.images && item.response.images.length > 0 && (
                <span>📷 {item.response.images.length}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
