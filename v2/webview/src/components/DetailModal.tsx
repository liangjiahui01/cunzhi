import type { WaitMeRequest } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
        className="glass-card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-normal">
              {item.projectPath.split("/").pop()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            ×
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Message */}
            <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
              <MarkdownRenderer content={item.message} />
            </div>

            {/* Predefined options */}
            {item.predefinedOptions && item.predefinedOptions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">预定义选项:</p>
                <div className="flex flex-wrap gap-2">
                  {item.predefinedOptions.map((opt, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Response section */}
            {item.response && (
              <div className="border-t border-border/50 pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3">回复:</p>
                
                {item.response.selectedOptions && item.response.selectedOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.response.selectedOptions.map((opt, i) => (
                      <Badge key={i} className="font-normal">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.response.userInput && (
                  <div className="bg-muted/50 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap border border-border/30">
                    {item.response.userInput}
                  </div>
                )}

                {item.response.images && item.response.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {item.response.images.map((img, i) => (
                      <img
                        key={i}
                        src={img.data}
                        alt=""
                        className="max-h-32 rounded-lg border border-border shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
