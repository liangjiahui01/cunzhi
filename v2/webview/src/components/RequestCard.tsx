import { useState, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import type { WaitMeRequest, ImageAttachment, ContextRule } from "../types";

const QUICK_TEMPLATES = [
  { id: "done", label: "✓ Done", content: "完成" },
  { id: "clear", label: "✗ Clear", content: "清除" },
  { id: "issue", label: "★ Issue", content: "新问题" },
  { id: "remember", label: "◉ Remember", content: "记住" },
  { id: "summary", label: "◎ Summary", content: "总结" },
  { id: "review", label: "◉ Review", content: "审查" },
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
}

export function RequestCard({
  request,
  onResponse,
  onDelete,
  contextRules,
  onToggleContextRule,
}: Props) {
  const [userInput, setUserInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContextRules, setShowContextRules] = useState(false);
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
    <div
      className="rounded-lg border border-vscode-border bg-vscode-bg"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-vscode-fg opacity-50 mb-2">
          <div className="flex items-center gap-2">
            <span>{request.projectPath.split("/").pop()}</span>
            <span className="opacity-60">#{request.requestId.slice(0, 8)}</span>
            <span className="opacity-60">{new Date(request.timestamp).toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400 hover:text-red-300 px-1"
            title="删除请求"
          >
            ✕
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mb-3 p-3 bg-red-950 border border-red-600 rounded-md">
            <p className="text-red-100 text-sm mb-3">⚠️ 确定要删除此请求吗？MCP 客户端将收到空响应。</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete(request.requestId);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-500"
              >
                确认删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-500"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="prose prose-sm prose-invert max-w-none mb-4">
          {request.isMarkdown !== false ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {request.message}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{request.message}</p>
          )}
        </div>

        {request.predefinedOptions && request.predefinedOptions.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-vscode-fg opacity-60 mb-2">选择选项 (可多选):</div>
            <div className="space-y-1.5">
              {request.predefinedOptions.map((option) => (
                <label
                  key={option}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded text-sm cursor-pointer transition-all",
                    selectedOptions.includes(option)
                      ? "text-blue-400"
                      : "text-vscode-fg hover:text-blue-300"
                  )}
                >
                  <span className={clsx(
                    "w-4 h-4 rounded border-2 flex items-center justify-center text-xs flex-shrink-0",
                    selectedOptions.includes(option)
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-500"
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

        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleQuickTemplate(tpl.content)}
              disabled={isSubmitting}
              className={clsx(
                "px-2 py-1 text-xs rounded transition-colors",
                "bg-gray-700 text-gray-300",
                "hover:bg-gray-600 hover:text-white",
                "disabled:opacity-50"
              )}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img.data.startsWith("data:") ? img.data : `data:${img.media_type};base64,${img.data}`}
                  alt={img.filename || "uploaded"}
                  className="h-16 w-16 object-cover rounded border border-vscode-border"
                  onError={(e) => {
                    console.error("Image load error:", img.filename);
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23333' width='64' height='64'/%3E%3Ctext x='32' y='32' text-anchor='middle' fill='%23888'%3E?%3C/text%3E%3C/svg%3E";
                  }}
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="输入回复... (可粘贴/拖拽图片)"
            disabled={isSubmitting}
            className={clsx(
              "w-full px-3 py-2 rounded resize-y",
              "bg-vscode-input text-vscode-inputFg border border-vscode-inputBorder",
              "focus:outline-none focus:ring-1 focus:ring-vscode-button",
              "disabled:opacity-50",
              "min-h-[100px] max-h-[300px]"
            )}
            rows={4}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!userInput && selectedOptions.length === 0 && images.length === 0)}
              className={clsx(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                "bg-green-600 text-white",
                "hover:bg-green-500 hover:shadow-md",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              发送{selectedOptions.length > 0 && ` (${selectedOptions.length})`}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className={clsx(
                "px-3 py-2 rounded text-sm transition-colors",
                "border border-vscode-border",
                "hover:bg-vscode-secondary",
                "disabled:opacity-50"
              )}
              title="上传图片"
            >
              📎
            </button>

            <button
              onClick={() => setShowContextRules(!showContextRules)}
              className={clsx(
                "px-3 py-2 rounded text-sm transition-colors",
                "border border-vscode-border",
                showContextRules ? "bg-vscode-button text-vscode-buttonFg" : "hover:bg-vscode-secondary"
              )}
              title="上下文规则"
            >
              ⚙
            </button>

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
      </div>

      {showContextRules && (
        <div className="border-t border-vscode-border p-3 bg-vscode-input bg-opacity-30">
          <div className="text-xs text-vscode-fg opacity-70 mb-2">上下文规则 (自动追加到回复)</div>
          <div className="space-y-1">
            {contextRules.map((rule) => (
              <label
                key={rule.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-vscode-secondary hover:bg-opacity-30 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => onToggleContextRule(rule.id)}
                  className="rounded"
                />
                <span className={rule.enabled ? "text-vscode-fg" : "text-vscode-fg opacity-50"}>
                  {rule.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
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
