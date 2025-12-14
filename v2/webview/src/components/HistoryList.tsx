import { useState, useCallback } from "react";
import type { WaitMeRequest } from "../types";

interface Props {
  history: WaitMeRequest[];
  onItemClick: (item: WaitMeRequest) => void;
  onDeleteItems?: (ids: string[]) => void;
}

export function HistoryList({ history, onItemClick, onDeleteItems }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(history.map((h) => h.requestId)));
  }, [history]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedIds.size > 0 && onDeleteItems) {
      onDeleteItems(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelecting(false);
    }
  }, [selectedIds, onDeleteItems]);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-vscode-fg opacity-50">
        <p>暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {onDeleteItems && (
        <div className="flex items-center gap-2 mb-2">
          {isSelecting ? (
            <>
              <button
                onClick={selectAll}
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                全选
              </button>
              <button
                onClick={clearSelection}
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                取消
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-500"
                >
                  删除 ({selectedIds.size})
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setIsSelecting(true)}
              className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              选择
            </button>
          )}
        </div>
      )}

      {history.map((item) => (
        <div
          key={item.requestId}
          onClick={() => !isSelecting && onItemClick(item)}
          className={`rounded-lg border bg-vscode-bg p-3 cursor-pointer hover:border-vscode-button transition-colors ${
            selectedIds.has(item.requestId) ? "border-blue-500" : "border-vscode-border"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-vscode-fg opacity-50 mb-1">
            <div className="flex items-center gap-2">
              {isSelecting && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.requestId)}
                  onChange={(e) => toggleSelect(item.requestId, e as unknown as React.MouseEvent)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded"
                />
              )}
              <span>{item.projectPath.split("/").pop()}</span>
            </div>
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
