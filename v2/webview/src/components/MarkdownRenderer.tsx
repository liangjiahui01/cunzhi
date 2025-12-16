import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const codeIdRef = { current: 0 };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  codeIdRef.current = 0;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !className;
          const codeText = String(children).replace(/\n$/, "");
          const codeId = `code-${codeIdRef.current++}`;
          const isCopied = copiedId === codeId;
          
          if (isInline) {
            return (
              <code 
                className={`${className || ""} cursor-pointer hover:opacity-80 transition-all ${isCopied ? "bg-emerald-500/20" : ""}`}
                onClick={() => copyToClipboard(codeText, codeId)}
                title="点击复制"
                {...props}
              >
                {children}
              </code>
            );
          }
          
          return (
            <div 
              className="relative group cursor-pointer"
              onClick={() => copyToClipboard(codeText, codeId)}
              title="点击复制代码"
            >
              <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={match ? match[1] : "text"}
                PreTag="div"
                customStyle={{
                  margin: "0.5em 0",
                  borderRadius: "0.375rem",
                  fontSize: "13px",
                  backgroundColor: isDark ? "#282c34" : "#fafafa",
                }}
              >
                {codeText}
              </SyntaxHighlighter>
              <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded transition-opacity ${
                isCopied 
                  ? "opacity-100 bg-emerald-500 text-white" 
                  : "opacity-0 group-hover:opacity-100 bg-black/50 text-white"
              }`}>
                {isCopied ? "✓ 已复制" : "点击复制"}
              </span>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
