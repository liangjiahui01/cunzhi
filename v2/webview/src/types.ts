export interface WaitMeRequest {
  requestId: string;
  projectPath: string;
  message: string;
  predefinedOptions?: string[];
  isMarkdown?: boolean;
  timestamp: string;
  status?: "pending" | "completed";
  response?: WaitMeResponse;
}

export interface WaitMeResponse {
  userInput?: string;
  selectedOptions?: string[];
  images?: ImageAttachment[];
  timestamp?: string;
}

export interface ImageAttachment {
  data: string;
  media_type: string;
  filename?: string;
}

export interface QuickTemplate {
  id: string;
  label: string;
  content: string;
}

export interface ContextRule {
  id: string;
  label: string;
  enabled: boolean;
  content: string;
}

export const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  { id: "done", label: "✓ Done", content: "完成" },
  { id: "clear", label: "✗ Clear", content: "清除" },
  { id: "issue", label: "★ New Issue", content: "新问题" },
  { id: "remember", label: "◉ Remember", content: "记住这个" },
  { id: "summary", label: "◎ Summary", content: "总结并重启" },
  { id: "review", label: "◉ Review", content: "审查并计划" },
];

export const DEFAULT_CONTEXT_RULES: ContextRule[] = [
  { id: "no_docs", label: "不要生成总结性Markdown文档", enabled: true, content: "❌请记住，不要生成总结性Markdown文档" },
  { id: "no_tests", label: "不要生成测试脚本", enabled: true, content: "❌请记住，不要生成测试脚本" },
  { id: "no_compile", label: "不要编译，用户自己编译", enabled: true, content: "❌请记住，不要编译，用户自己编译" },
  { id: "no_run", label: "不要运行，用户自己运行", enabled: true, content: "❌请记住，不要运行，用户自己运行" },
];

export interface WaitMeConfig {
  theme: "system" | "light" | "dark";
  showToast: boolean;
}
