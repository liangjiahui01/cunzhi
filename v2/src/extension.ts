import * as vscode from "vscode";
import { WaitMeViewProvider } from "./providers/webview-provider";
import { HttpClient } from "./services/http-client";

const HTTP_PORT = 19528;

let statusBarItem: vscode.StatusBarItem;

export interface WaitMeConfig {
  theme: "system" | "light" | "dark";
  showToast: boolean;
}

function getConfig(): WaitMeConfig {
  const config = vscode.workspace.getConfiguration("waitme");
  return {
    theme: config.get<"system" | "light" | "dark">("theme", "system"),
    showToast: config.get<boolean>("showToast", true),
  };
}

export function activate(context: vscode.ExtensionContext) {
  console.log("WaitMe extension is now active");

  const httpClient = new HttpClient(HTTP_PORT);
  const provider = new WaitMeViewProvider(context.extensionUri, httpClient);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = "waitme.openSettings";
  context.subscriptions.push(statusBarItem);

  const config = getConfig();
  provider.setConfig(config);

  provider.onRequestCountChange = (count: number, isNew: boolean) => {
    const currentConfig = getConfig();
    if (count > 0) {
      statusBarItem.text = `$(bell) WaitMe (${count})`;
      statusBarItem.tooltip = `${count} 个待处理请求`;
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      statusBarItem.show();
      if (isNew && currentConfig.showToast) {
        vscode.window.showInformationMessage(
          `WaitMe: 有 ${count} 个待处理请求`,
          "查看"
        ).then((action) => {
          if (action === "查看") {
            provider.show();
          }
        });
      }
    } else {
      statusBarItem.hide();
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("waitme")) {
        provider.setConfig(getConfig());
      }
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("waitme.mainView", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.copyMcpConfig", () => {
      const config = {
        mcpServers: {
          waitme: {
            command: "node",
            args: [
              context.extensionUri.fsPath + "/dist/mcp-server.js",
            ],
          },
        },
      };
      vscode.env.clipboard.writeText(JSON.stringify(config, null, 2));
      vscode.window.showInformationMessage("MCP 配置已复制到剪贴板");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.copyPrompt", () => {
      const prompt = `# WaitMe 使用规则

- 需求不明确时使用 \`waitme\` 询问澄清，提供预定义选项
- 在有多个方案时，使用 \`waitme\` 询问用户选择
- 即将完成请求前必须调用 \`waitme\` 请求反馈
- 未通过 \`waitme\` 确认前，禁止主动结束任务`;
      vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage("参考提示词已复制到剪贴板");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.openSettings", () => {
      provider.show();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.restartServer", async () => {
      const result = await vscode.window.showWarningMessage(
        "确定要重启 WaitMe 服务吗？这将清除所有待处理的请求。",
        "确定",
        "取消"
      );
      if (result === "确定") {
        try {
          await httpClient.restartServer();
          vscode.window.showInformationMessage("WaitMe 服务已重启");
        } catch (error) {
          vscode.window.showErrorMessage(`重启失败: ${error}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.killServer", async () => {
      const result = await vscode.window.showWarningMessage(
        "⚠️ 确定要强制杀死 WaitMe 服务吗？这将终止占用端口 19528 的进程。",
        "确定",
        "取消"
      );
      if (result === "确定") {
        try {
          const { exec } = require("child_process");
          const isWin = process.platform === "win32";
          const cmd = isWin
            ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :19528') do taskkill /F /PID %a`
            : `lsof -ti:19528 | xargs kill -9 2>/dev/null || true`;
          
          exec(cmd, (error: Error | null) => {
            if (error) {
              vscode.window.showWarningMessage("没有找到运行中的服务，或已被终止");
            } else {
              vscode.window.showInformationMessage("WaitMe 服务已被强制终止");
            }
          });
        } catch (error) {
          vscode.window.showErrorMessage(`终止失败: ${error}`);
        }
      }
    })
  );

  registerToHttpServer(httpClient);
}

async function registerToHttpServer(httpClient: HttpClient) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const projectPath = workspaceFolders[0].uri.fsPath;
  const windowId = vscode.env.sessionId;

  try {
    await httpClient.register(windowId, projectPath);
    console.log(`Registered to HTTP server: ${projectPath}`);
  } catch (error) {
    console.error("Failed to register to HTTP server:", error);
  }
}

export function deactivate() {
  console.log("WaitMe extension is now deactivated");
}
