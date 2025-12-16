import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  isDark?: boolean;
}

export function MarkdownRenderer({ content, isDark = true }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !className;
          
          if (isInline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          
          return (
            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={match ? match[1] : "text"}
              PreTag="div"
              customStyle={{
                margin: "0.5em 0",
                borderRadius: "0.375rem",
                fontSize: "13px",
              }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
