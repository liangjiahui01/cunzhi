import type { WaitMeRequest } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ImagePreview } from "./ImagePreview";

interface Props {
  item: WaitMeRequest;
  onClose: () => void;
}

export function DetailModal({ item, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 与 RequestCard 风格一致 */}
        <CardHeader className="pb-2 pt-3 px-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={item.projectPath}>
                {item.projectPath.split("/").pop()}
              </span>
              <span className="text-[10px] text-muted-foreground">#{item.requestId.slice(0, 8)}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              ×
            </Button>
          </div>
        </CardHeader>

        {/* Content - 可滚动区域 */}
        <CardContent 
          className="flex-1 overflow-y-auto px-4 py-4" 
          style={{ 
            maxHeight: "calc(80vh - 60px)",
            scrollbarColor: "#c1c1c1 transparent",
          }}
        >
          {/* Message */}
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            <MarkdownRenderer content={item.message} />
          </div>

          {/* Predefined options - 与 RequestCard 风格一致 */}
          {item.predefinedOptions && item.predefinedOptions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">预定义选项:</p>
              <div className="flex flex-wrap gap-1.5">
                {item.predefinedOptions.map((opt, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg text-sm border border-border/50 bg-muted/30 text-foreground"
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Response section */}
          {item.response && (
            <div className="border-t border-border/50 pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-3">回复:</p>
              
              {/* Selected options - 醒目的选中样式 */}
              {item.response.selectedOptions && item.response.selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.response.selectedOptions.map((opt, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                        "bg-emerald-600 text-white"
                      )}
                    >
                      <span className="w-4 h-4 rounded border-2 border-white/50 flex items-center justify-center text-xs">
                        ✓
                      </span>
                      {opt}
                    </span>
                  ))}
                </div>
              )}

              {/* User input - 与 RequestCard 的输入框风格一致 */}
              {item.response.userInput && (
                <div className="bg-background/50 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap border border-border/30 text-foreground">
                  {item.response.userInput}
                </div>
              )}

              {/* Images */}
              {item.response.images && item.response.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.response.images.map((img, i) => (
                    <ImagePreview
                      key={i}
                      src={img.data}
                      alt={img.filename || ""}
                      className="h-16 w-16 object-cover rounded-lg border border-border shadow-sm"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
