import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { WaitMeRequest } from "../types";

interface Props {
  item: WaitMeRequest;
  onClose: () => void;
}

export function DetailModal({ item, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-vscode-bg border border-vscode-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-vscode-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {item.projectPath.split("/").pop()}
            </span>
            <span className="text-xs text-vscode-fg opacity-50">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-vscode-secondary text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-sm prose-invert max-w-none mb-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.message}
            </ReactMarkdown>
          </div>

          {item.predefinedOptions && item.predefinedOptions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-vscode-fg opacity-50 mb-2">预定义选项:</div>
              <div className="flex flex-wrap gap-2">
                {item.predefinedOptions.map((opt, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs rounded bg-vscode-secondary"
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.response && (
            <div className="border-t border-vscode-border pt-4 mt-4">
              <div className="text-xs text-vscode-fg opacity-50 mb-2">回复:</div>
              
              {item.response.selectedOptions && item.response.selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.response.selectedOptions.map((opt, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs rounded bg-vscode-button text-vscode-buttonFg"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}

              {item.response.userInput && (
                <div className="bg-vscode-input p-3 rounded text-sm whitespace-pre-wrap">
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
                      className="max-h-32 rounded border border-vscode-border"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
