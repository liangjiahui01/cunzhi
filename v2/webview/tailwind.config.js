/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: "var(--wm-bg, var(--vscode-editor-background))",
          fg: "var(--wm-fg, var(--vscode-editor-foreground))",
          border: "var(--wm-border, var(--vscode-panel-border))",
          button: "var(--wm-button-bg, var(--vscode-button-background))",
          buttonHover: "var(--vscode-button-hoverBackground)",
          buttonFg: "var(--wm-button-fg, var(--vscode-button-foreground))",
          input: "var(--wm-input-bg, var(--vscode-input-background))",
          inputFg: "var(--wm-input-fg, var(--vscode-input-foreground))",
          inputBorder: "var(--wm-border, var(--vscode-input-border))",
          secondary: "var(--wm-secondary, var(--vscode-button-secondaryBackground))",
          secondaryHover: "var(--vscode-button-secondaryHoverBackground)",
          secondaryFg: "var(--wm-fg, var(--vscode-button-secondaryForeground))",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--wm-fg, var(--vscode-editor-foreground))",
            a: { color: "var(--vscode-textLink-foreground)" },
            strong: { color: "var(--wm-fg, var(--vscode-editor-foreground))" },
            code: {
              color: "var(--wm-code-fg, var(--vscode-editor-foreground))",
              backgroundColor: "var(--wm-code-bg, var(--vscode-textBlockQuote-background))",
              padding: "0.125rem 0.25rem",
              borderRadius: "0.25rem",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              backgroundColor: "var(--wm-code-bg, var(--vscode-textBlockQuote-background))",
              color: "var(--wm-fg, var(--vscode-editor-foreground))",
            },
            h1: { color: "var(--wm-fg, var(--vscode-editor-foreground))" },
            h2: { color: "var(--wm-fg, var(--vscode-editor-foreground))" },
            h3: { color: "var(--wm-fg, var(--vscode-editor-foreground))" },
            h4: { color: "var(--wm-fg, var(--vscode-editor-foreground))" },
            blockquote: {
              color: "var(--wm-fg, var(--vscode-editor-foreground))",
              borderLeftColor: "var(--wm-border, var(--vscode-panel-border))",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
