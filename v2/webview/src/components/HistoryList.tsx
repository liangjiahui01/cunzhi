import { useState, useCallback } from "react";
import type { WaitMeRequest } from "../types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  history: WaitMeRequest[];
  onItemClick: (item: WaitMeRequest) => void;
  onDeleteItems?: (ids: string[]) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function HistoryList({ history, onItemClick, onDeleteItems, onRefresh, isLoading }: Props) {
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
        <div className="text-4xl mb-4 opacity-30">🕐</div>
        <p className="text-sm">暂无历史记录</p>
        <p className="text-xs mt-1 opacity-60">完成的请求将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh} 
            disabled={isLoading}
            className="h-7 text-xs glass-button"
          >
            {isLoading ? "⏳" : "🔄"} 刷新
          </Button>
        )}
        {onDeleteItems && (
          <>
            {isSelecting ? (
              <>
                <Button variant="outline" size="sm" onClick={selectAll} className="h-7 text-xs">
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection} className="h-7 text-xs">
                  取消
                </Button>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDelete} className="h-7 text-xs">
                    删除 ({selectedIds.size})
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)} className="h-7 text-xs glass-button">
                选择
              </Button>
            )}
          </>
        )}
      </div>

      {history.map((item, index) => (
        <Card
          key={item.requestId}
          onClick={() => !isSelecting && onItemClick(item)}
          className={cn(
            "p-3 cursor-pointer transition-all duration-200 animate-fade-in-up",
            "glass-card hover:shadow-xl",
            selectedIds.has(item.requestId) && "ring-2 ring-primary"
          )}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              {isSelecting && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.requestId)}
                  onChange={(e) => toggleSelect(item.requestId, e as unknown as React.MouseEvent)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-muted-foreground/40"
                />
              )}
              <Badge variant="outline" className="text-[10px] font-normal">
                {item.projectPath?.split("/").pop() || "未知项目"}
              </Badge>
            </div>
            <span>{new Date(item.timestamp).toLocaleString()}</span>
          </div>

          <p className="text-sm line-clamp-2 mb-2">
            {item.message.replace(/[#*`]/g, "").slice(0, 100)}
            {item.message.length > 100 && "..."}
          </p>

          {item.response && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.response.selectedOptions && item.response.selectedOptions.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {item.response.selectedOptions[0]}
                </Badge>
              )}
              {item.response.userInput && (
                <span className="truncate max-w-[150px] opacity-70">
                  {item.response.userInput.split("\n")[0]}
                </span>
              )}
              {item.response.images && item.response.images.length > 0 && (
                <Badge variant="outline" className="text-[10px]">📷 {item.response.images.length}</Badge>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
