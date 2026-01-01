import { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 使用 useMemo 缓存 components 对象，避免每次渲染时重新创建导致的闪烁
  const components = useMemo(() => {
    return {
      code({ node, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = !match && !className;
        const codeText = String(children).replace(/\n$/, "");

        if (isInline) {
          return (
            <code
              className={className || ""}
              {...props}
            >
              {children}
            </code>
          );
        }

        return (
          <div className="relative code-block-wrapper">
            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={match ? match[1] : "text"}
              PreTag="div"
              codeTagProps={{
                style: {
                  // 避免被全局 `.prose code { user-select: all; }` 命中导致“自动全选整块/选区抖动”
                  userSelect: "text",
                  WebkitUserSelect: "text",
                  // 清理行内 code 的样式，避免影响代码块布局/选择
                  background: "transparent",
                  padding: 0,
                  borderRadius: 0,
                },
              }}
              customStyle={{
                margin: "0.5em 0",
                borderRadius: "0.375rem",
                fontSize: "13px",
                backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                border: isDark ? "1px solid #30363d" : "1px solid #d0d7de",
              }}
            >
              {codeText}
            </SyntaxHighlighter>
          </div>
        );
      },
    };
  }, [isDark]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
