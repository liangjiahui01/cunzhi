/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-editor-foreground)",
          border: "var(--vscode-panel-border)",
          button: "var(--vscode-button-background)",
          buttonHover: "var(--vscode-button-hoverBackground)",
          buttonFg: "var(--vscode-button-foreground)",
          input: "var(--vscode-input-background)",
          inputFg: "var(--vscode-input-foreground)",
          inputBorder: "var(--vscode-input-border)",
          secondary: "var(--vscode-button-secondaryBackground)",
          secondaryHover: "var(--vscode-button-secondaryHoverBackground)",
          secondaryFg: "var(--vscode-button-secondaryForeground)",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--vscode-editor-foreground)",
            a: { color: "var(--vscode-textLink-foreground)" },
            strong: { color: "var(--vscode-editor-foreground)" },
            code: {
              color: "var(--vscode-editor-foreground)",
              backgroundColor: "var(--vscode-textBlockQuote-background)",
              padding: "0.125rem 0.25rem",
              borderRadius: "0.25rem",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              backgroundColor: "var(--vscode-textBlockQuote-background)",
              color: "var(--vscode-editor-foreground)",
            },
            h1: { color: "var(--vscode-editor-foreground)" },
            h2: { color: "var(--vscode-editor-foreground)" },
            h3: { color: "var(--vscode-editor-foreground)" },
            h4: { color: "var(--vscode-editor-foreground)" },
            blockquote: {
              color: "var(--vscode-editor-foreground)",
              borderLeftColor: "var(--vscode-panel-border)",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
