import * as vscode from "vscode";
import { WaitMeViewProvider } from "./providers/webview-provider";
import { HttpClient } from "./services/http-client";

const HTTP_PORT = 19528;

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log("WaitMe extension is now active");

  const httpClient = new HttpClient(HTTP_PORT);
  const provider = new WaitMeViewProvider(context.extensionUri, httpClient);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = "waitme.openSettings";
  context.subscriptions.push(statusBarItem);

  provider.onRequestCountChange = (count: number) => {
    if (count > 0) {
      statusBarItem.text = `$(bell) WaitMe (${count})`;
      statusBarItem.tooltip = `${count} 个待处理请求`;
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("waitme.mainView", provider)
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
            timeout: 7200000,
          },
        },
      };
      vscode.env.clipboard.writeText(JSON.stringify(config, null, 2));
      vscode.window.showInformationMessage("MCP 配置已复制到剪贴板 (timeout: 2小时)");
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
