import { useState, useCallback, useRef } from "react";
import type { WaitMeRequest, ImageAttachment, ContextRule } from "../types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ImagePreview } from "./ImagePreview";

const QUICK_TEMPLATES = [
  { id: "done", label: "✓ Done", content: "完成", tooltip: "标记任务已完成，AI 将停止当前任务" },
  { id: "clear", label: "✗ Clear", content: "清除", tooltip: "清除当前内容，重新开始" },
  { id: "newtopic", label: "🔖 新话题", content: "[新话题开始] 请立即在回复开头输出分界线，格式：---新话题：{根据当前会话内容自动生成的标题}---", tooltip: "开始新讨论主题，AI 会自动生成话题标题" },
  { id: "issue", label: "★ Issue", content: "新问题", tooltip: "提出新问题或发现问题" },
  { id: "remember", label: "◉ Remember", content: "记住", tooltip: "让 AI 记住重要信息到 Memory" },
  { id: "summary", label: "◎ Summary", content: "总结", tooltip: "让 AI 总结当前对话或代码" },
  { id: "review", label: "◉ Review", content: "审查", tooltip: "让 AI 审查代码或方案" },
  { id: "architect", label: "🏛️ Architect", content: "架构师视角", tooltip: "从架构层面思考，关注系统设计、模块拆分、技术选型" },
  { id: "debugger", label: "🔍 Debugger", content: "调试模式", tooltip: "专注问题定位，分析日志、堆栈、状态变化" },
  { id: "mentor", label: "👨‍🏫 Mentor", content: "导师模式", tooltip: "解释原理、循序渐进指导、提供学习建议" },
  { id: "security", label: "🛡️ Security", content: "安全审查", tooltip: "关注安全漏洞、权限控制、数据保护" },
];

interface Props {
  request: WaitMeRequest;
  onResponse: (
    requestId: string,
    userInput?: string,
    selectedOptions?: string[],
    images?: ImageAttachment[]
  ) => void;
  onDelete: (requestId: string) => void;
  contextRules: ContextRule[];
  onToggleContextRule: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: (requestId: string) => void;
}

export function RequestCard({
  request,
  onResponse,
  onDelete,
  contextRules,
  onToggleContextRule,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const [userInput, setUserInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!userInput && selectedOptions.length === 0 && images.length === 0) {
      return;
    }
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      userInput || undefined,
      selectedOptions.length > 0 ? selectedOptions : undefined,
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, userInput, selectedOptions, images, onResponse]);

  const handleQuickResponse = useCallback(
    (option: string) => {
      setIsSubmitting(true);
      onResponse(request.requestId, undefined, [option], undefined);
    },
    [request.requestId, onResponse]
  );

  const handleQuickTemplate = useCallback((content: string) => {
    setUserInput((prev) => (prev ? prev + " " + content : content));
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));

    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          try {
            const base64 = await fileToBase64(file);
            setImages((prev) => [
              ...prev,
              { data: base64, media_type: file.type, filename: file.name || "pasted-image.png" },
            ]);
          } catch (err) {
            console.error("Failed to process pasted image:", err);
          }
        }
      }
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          const base64 = await fileToBase64(file);
          setImages((prev) => [
            ...prev,
            { data: base64, media_type: file.type, filename: file.name },
          ]);
        } catch (err) {
          console.error("Failed to process dropped image:", err);
        }
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          try {
            const base64 = await fileToBase64(file);
            setImages((prev) => [
              ...prev,
              { data: base64, media_type: file.type, filename: file.name },
            ]);
          } catch (err) {
            console.error("Failed to process selected image:", err);
          }
        }
      }
      e.target.value = "";
    },
    []
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <Card
      className="glass-card overflow-hidden transition-all duration-300 hover:shadow-2xl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleCollapse(request.requestId)}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              >
                {collapsed ? "▶" : "▼"}
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={request.projectPath}>
              {request.projectPath.split('/').pop()}
            </span>
            <span className="text-[10px] text-muted-foreground">#{request.requestId.slice(0, 8)}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(request.timestamp).toLocaleTimeString()}</span>
            {collapsed && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {request.message.replace(/[#*`\n]/g, " ").slice(0, 50)}...
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            ✕
          </Button>
        </div>
      </CardHeader>

      {!collapsed && <CardContent className="px-4 pb-4">
        {showDeleteConfirm && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm mb-3 text-destructive">⚠️ 确定要删除此请求吗？MCP 客户端将收到空响应。</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(request.requestId);
                  setShowDeleteConfirm(false);
                }}
              >
                确认删除
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          {request.isMarkdown !== false ? (
            <MarkdownRenderer content={request.message} />
          ) : (
            <p className="whitespace-pre-wrap">{request.message}</p>
          )}
        </div>

        {/* Predefined options */}
        {request.predefinedOptions && request.predefinedOptions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">选择选项 (可多选):</p>
            <div className="space-y-1.5">
              {request.predefinedOptions.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all",
                    "border border-transparent",
                    selectedOptions.includes(option)
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all",
                    selectedOptions.includes(option)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}>
                    {selectedOptions.includes(option) && "✓"}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={() => {
                      setSelectedOptions((prev) =>
                        prev.includes(option)
                          ? prev.filter((o) => o !== option)
                          : [...prev, option]
                      );
                    }}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Quick templates */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {QUICK_TEMPLATES.map((tpl) => (
            <Tooltip key={tpl.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTemplate(tpl.content)}
                  disabled={isSubmitting}
                  className="h-7 text-xs glass-button"
                >
                  {tpl.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">{tpl.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Uploaded images */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <ImagePreview
                  src={img.data.startsWith("data:") ? img.data : `data:${img.media_type};base64,${img.data}`}
                  alt={img.filename || "uploaded"}
                  className="h-16 w-16 object-cover rounded-lg border border-border shadow-sm"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="space-y-3">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="输入回复... (可粘贴/拖拽图片)"
            disabled={isSubmitting}
            className="min-h-[100px] max-h-[300px] resize-y bg-background/50 backdrop-blur-sm"
            rows={4}
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!userInput && selectedOptions.length === 0 && images.length === 0)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all"
            >
              发送{selectedOptions.length > 0 && ` (${selectedOptions.length})`}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="glass-button"
                >
                  📎
                </Button>
              </TooltipTrigger>
              <TooltipContent>上传图片</TooltipContent>
            </Tooltip>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

      {/* Context rules - always visible */}
      <div className="border-t border-border/50 px-4 py-3 bg-muted/20">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {contextRules.map((rule) => (
            <label
              key={rule.id}
              className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:text-foreground transition-colors"
            >
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => onToggleContextRule(rule.id)}
                className="w-3 h-3 rounded border-muted-foreground/40"
              />
              <span className={cn(
                "transition-opacity",
                rule.enabled ? "opacity-100 text-foreground" : "opacity-50"
              )}>
                {rule.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      </CardContent>}
    </Card>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
