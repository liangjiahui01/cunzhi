import { useState, useCallback, useRef } from "react";
import type { WaitMeRequest, ContextRule, ImageAttachment } from "../types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ImagePreview } from "./ImagePreview";

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
  collapsed?: boolean;
  onToggleCollapse?: (requestId: string) => void;
}

export function PlanCard({
  request,
  onResponse,
  onDelete,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planData = request.planData;
  const isDraftMode = planData?.mode === "draft";

  // 讨论模式：继续讨论 / 请给最终方案
  const handleContinueDraft = useCallback(() => {
    if (!feedback.trim() && images.length === 0) return;
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["continue_draft"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

  const handleRequestFinal = useCallback(() => {
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["request_final"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

  const handleRequestFinalQuick = useCallback(() => {
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["request_final_quick"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

  const handleApprove = useCallback(() => {
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["approved"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

  // 最终模式：批准执行 / 还要改
  const handleNeedsModification = useCallback(() => {
    if (!feedback.trim() && images.length === 0) return;
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["needs_modification"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

  const handleReject = useCallback(() => {
    setIsSubmitting(true);
    onResponse(
      request.requestId,
      feedback || undefined,
      ["rejected"],
      images.length > 0 ? images : undefined
    );
  }, [request.requestId, feedback, images, onResponse]);

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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (!planData) {
    return null;
  }

  return (
    <Card
      className={cn(
        "glass-card overflow-hidden transition-all duration-300 hover:shadow-2xl border-l-4",
        isDraftMode ? "border-l-amber-500" : "border-l-blue-500"
      )}
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
            <Badge 
              variant="outline" 
              className={cn(
                isDraftMode 
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30" 
                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
              )}
            >
              {isDraftMode ? "💬 讨论中" : "📋 最终方案"}
            </Badge>
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={request.projectPath}>
              {request.projectPath.split('/').pop()}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(request.timestamp).toLocaleTimeString()}</span>
            {collapsed && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {planData.title}
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
            <p className="text-sm mb-3 text-destructive">⚠️ 确定要删除此计划吗？AI 将收到拒绝响应。</p>
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

        {/* Plan Title */}
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className={isDraftMode ? "text-amber-500" : "text-blue-500"}>
            {isDraftMode ? "💬" : "📋"}
          </span>
          {planData.title}
        </h3>

        {/* Description */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4 bg-muted/30 rounded-lg p-3">
          <MarkdownRenderer content={planData.description} />
        </div>

        {/* Steps - 仅在 final 模式或有内容时显示 */}
        {planData.steps && planData.steps.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span>📝</span> 执行步骤
            </h4>
            <ol className="space-y-1.5 pl-1">
              {planData.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Files to modify - 仅在 final 模式或有内容时显示 */}
        {planData.filesToModify && planData.filesToModify.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span>📁</span> 涉及文件
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {planData.filesToModify.map((file, index) => (
                <Badge key={index} variant="secondary" className="font-mono text-xs">
                  {file}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Feedback input */}
        <div className="space-y-3">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onPaste={handlePaste}
            placeholder={isDraftMode ? "输入你的反馈或问题..." : "反馈意见（可选，如需修改则必填）..."}
            disabled={isSubmitting}
            className="min-h-[80px] max-h-[200px] resize-y bg-background/50 backdrop-blur-sm"
            rows={3}
          />

          {/* Uploaded images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          {/* Action buttons - 根据模式显示不同按钮 */}
          {isDraftMode ? (
            // 讨论模式按钮
            <div className="flex items-center gap-2">
              <Button
                onClick={handleContinueDraft}
                disabled={isSubmitting || (!feedback.trim() && images.length === 0)}
                variant="outline"
                className={cn(
                  "flex-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10",
                  !feedback.trim() && images.length === 0 && "opacity-50 cursor-not-allowed"
                )}
                title={!feedback.trim() && images.length === 0 ? "请先输入反馈或上传图片" : ""}
              >
                💬 继续讨论
              </Button>
              <Button
                onClick={handleRequestFinal}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1 border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
              >
                📋 请给最终方案
              </Button>
              <Button
                onClick={handleRequestFinalQuick}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all"
              >
                ⚡ 直接执行（跳最终）
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="glass-button"
              >
                📎
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting}
                variant="outline"
                className="border-red-500/50 text-red-600 hover:bg-red-500/10 px-3"
              >
                ❌
              </Button>
            </div>
          ) : (
            // 最终模式按钮
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl transition-all"
              >
                ✅ 批准执行
              </Button>
              <Button
                onClick={handleNeedsModification}
                disabled={isSubmitting || (!feedback.trim() && images.length === 0)}
                variant="outline"
                className={cn(
                  "flex-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10",
                  !feedback.trim() && images.length === 0 && "opacity-50 cursor-not-allowed"
                )}
                title={!feedback.trim() && images.length === 0 ? "请先输入修改意见或上传图片" : ""}
              >
                ✏️ 还要改
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="glass-button"
              >
                📎
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting}
                variant="outline"
                className="border-red-500/50 text-red-600 hover:bg-red-500/10 px-3"
              >
                ❌
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
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
