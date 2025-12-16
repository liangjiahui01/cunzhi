/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			vscode: {
  				bg: 'var(--wm-bg, var(--vscode-editor-background))',
  				fg: 'var(--wm-fg, var(--vscode-editor-foreground))',
  				border: 'var(--wm-border, var(--vscode-panel-border))',
  				button: 'var(--wm-button-bg, var(--vscode-button-background))',
  				buttonHover: 'var(--vscode-button-hoverBackground)',
  				buttonFg: 'var(--wm-button-fg, var(--vscode-button-foreground))',
  				input: 'var(--wm-input-bg, var(--vscode-input-background))',
  				inputFg: 'var(--wm-input-fg, var(--vscode-input-foreground))',
  				inputBorder: 'var(--wm-border, var(--vscode-input-border))',
  				secondary: 'var(--wm-secondary, var(--vscode-button-secondaryBackground))',
  				secondaryHover: 'var(--vscode-button-secondaryHoverBackground)',
  				secondaryFg: 'var(--wm-fg, var(--vscode-button-secondaryForeground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					color: 'var(--wm-fg, var(--vscode-editor-foreground))',
  					a: {
  						color: 'var(--vscode-textLink-foreground)'
  					},
  					strong: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					code: {
  						color: 'var(--wm-code-fg, var(--vscode-editor-foreground))',
  						backgroundColor: 'var(--wm-code-bg, var(--vscode-textBlockQuote-background))',
  						padding: '0.125rem 0.25rem',
  						borderRadius: '0.25rem'
  					},
  					'code::before': {
  						content: '"'
  					},
  					'code::after': {
  						content: '"'
  					},
  					pre: {
  						backgroundColor: 'var(--wm-code-bg, var(--vscode-textBlockQuote-background))',
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					h1: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					h2: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					h3: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					h4: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))'
  					},
  					blockquote: {
  						color: 'var(--wm-fg, var(--vscode-editor-foreground))',
  						borderLeftColor: 'var(--wm-border, var(--vscode-panel-border))'
  					}
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
