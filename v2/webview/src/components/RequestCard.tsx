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
              { data: base64, mediaType: file.type, filename: file.name || "pasted-image.png" },
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
            { data: base64, mediaType: file.type, filename: file.name },
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
              { data: base64, mediaType: file.type, filename: file.name },
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
          <span>{request.projectPath.split("/").pop()}</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-400 hover:text-red-300 px-1"
            title="删除请求"
          >
            ✕
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mb-3 p-2 bg-red-900 bg-opacity-30 border border-red-500 rounded text-sm">
            <p className="text-red-300 mb-2">确定要删除此请求吗？MCP 客户端将收到空响应。</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete(request.requestId);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
              >
                确认删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 border border-vscode-border rounded text-xs hover:bg-vscode-secondary"
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
          <div className="flex flex-wrap gap-2 mb-4">
            {request.predefinedOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleQuickResponse(option)}
                disabled={isSubmitting}
                className={clsx(
                  "px-3 py-1.5 rounded text-sm transition-colors",
                  "bg-vscode-button text-vscode-buttonFg",
                  "hover:bg-vscode-buttonHover",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleQuickTemplate(tpl.content)}
              disabled={isSubmitting}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-secondary transition-colors disabled:opacity-50"
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
                  src={img.data}
                  alt={img.filename || "uploaded"}
                  className="h-16 w-16 object-cover rounded border border-vscode-border"
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
              "w-full px-3 py-2 rounded resize-none",
              "bg-vscode-input text-vscode-inputFg border border-vscode-inputBorder",
              "focus:outline-none focus:ring-1 focus:ring-vscode-button",
              "disabled:opacity-50",
              "min-h-[80px]"
            )}
            rows={3}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!userInput && images.length === 0)}
              className={clsx(
                "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors",
                "bg-vscode-button text-vscode-buttonFg",
                "hover:bg-vscode-buttonHover",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              发送
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
