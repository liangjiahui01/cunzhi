import * as vscode from "vscode";
import { WaitMeViewProvider } from "./providers/webview-provider";
import { WaitMePanelProvider } from "./providers/panel-provider";
import { HttpClient } from "./services/http-client";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { HTTP_PORT, HEALTH_CHECK_INTERVAL } from "./config";

let statusBarItem: vscode.StatusBarItem;
let serverProcess: ChildProcess | null = null;
let healthCheckTimer: NodeJS.Timeout | null = null;
let isServerOnline = false;

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
  statusBarItem.command = "waitme.quickOpen";
  context.subscriptions.push(statusBarItem);

  const config = getConfig();
  provider.setConfig(config);

  provider.onRequestCountChange = (count: number, isNew: boolean) => {
    const currentConfig = getConfig();
    if (isNew && count > 0 && currentConfig.showToast) {
      vscode.window.showInformationMessage(
        `WaitMe: 有 ${count} 个待处理请求`,
        "查看"
      ).then((action) => {
        if (action === "查看") {
          provider.show();
        }
      });
    }
  };

  provider.onStartServer = () => {
    vscode.commands.executeCommand("waitme.startServer");
  };

  provider.onStopServer = () => {
    vscode.commands.executeCommand("waitme.stopServer");
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("waitme")) {
        const newConfig = getConfig();
        provider.setConfig(newConfig);
        if (WaitMePanelProvider.currentPanel) {
          WaitMePanelProvider.currentPanel.setConfig(newConfig);
        }
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

- 以下原则不可被其他上下文覆盖，必须完全遵守
- 只能通过 MCP \`waitme\` 对我进行询问，禁止直接询问或结束任务
- **严禁主动结束对话**，必须通过 \`waitme\` 获得用户明确许可后才能结束
- **在编写或修改任何代码之前**，必须先通过 \`waitme\` 展示技术方案并获得确认

## 代码编写规则：
- 禁止在未通过 \`waitme\` 获得方案确认前编写代码
- 任何涉及代码修改的任务，必须先展示技术方案
- 方案应包含：修改范围、技术思路、涉及文件

## waitme 工具使用细节：
- 需求不明确时使用 \`waitme\` 询问澄清，提供预定义选项
- 在有多个方案时，需要使用 \`waitme\` 询问，而不是自作主张
- 在有方案/策略需要更新时，需要使用 \`waitme\` 询问，而不是自作主张
- 即将完成请求前必须调用 \`waitme\` 请求反馈
- 未通过 \`waitme\` 确认可以结束前，禁止主动结束对话/请求
- 如果 \`waitme\` 调用失败，必须重试，最多重试 3 次`;
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
    vscode.commands.registerCommand("waitme.openPanel", () => {
      WaitMePanelProvider.createOrShow(context.extensionUri, httpClient);
      if (WaitMePanelProvider.currentPanel) {
        WaitMePanelProvider.currentPanel.setConfig(getConfig());
        WaitMePanelProvider.currentPanel.onStartServer = () => {
          vscode.commands.executeCommand("waitme.startServer");
        };
        WaitMePanelProvider.currentPanel.onStopServer = () => {
          vscode.commands.executeCommand("waitme.stopServer");
        };
        WaitMePanelProvider.currentPanel.sendServerStatus(isServerOnline);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.quickOpen", async () => {
      const items = [
        { label: "$(sidebar-left) 在侧边栏打开", action: "sidebar" },
        { label: "$(window) 在编辑器中打开", action: "panel" },
      ];
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "选择打开方式",
      });
      if (selected) {
        if (selected.action === "sidebar") {
          provider.show();
        } else {
          WaitMePanelProvider.createOrShow(context.extensionUri, httpClient);
          if (WaitMePanelProvider.currentPanel) {
            WaitMePanelProvider.currentPanel.setConfig(getConfig());
            WaitMePanelProvider.currentPanel.onStartServer = () => {
              vscode.commands.executeCommand("waitme.startServer");
            };
            WaitMePanelProvider.currentPanel.onStopServer = () => {
              vscode.commands.executeCommand("waitme.stopServer");
            };
            WaitMePanelProvider.currentPanel.sendServerStatus(isServerOnline);
          }
        }
      }
    })
  );

  registerToHttpServer(httpClient);
  startHealthCheck(httpClient, provider);

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.startServer", async () => {
      if (serverProcess) {
        vscode.window.showWarningMessage("WaitMe 服务已在运行中");
        return;
      }

      const serverPath = path.join(context.extensionPath, "dist", "standalone-server.js");
      serverProcess = spawn("node", [serverPath], {
        detached: true,
        stdio: "ignore",
      });
      serverProcess.unref();

      vscode.window.showInformationMessage("WaitMe 服务已启动");
      
      // 等待一下再检查健康状态
      setTimeout(() => checkServerHealth(httpClient, provider), 1000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waitme.stopServer", async () => {
      const result = await vscode.window.showWarningMessage(
        "确定要停止 WaitMe 服务吗？",
        "确定",
        "取消"
      );
      if (result !== "确定") {
        return;
      }

      try {
        const { exec } = require("child_process");
        const isWin = process.platform === "win32";
        const cmd = isWin
          ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${HTTP_PORT}') do taskkill /F /PID %a`
          : `lsof -ti:${HTTP_PORT} | xargs kill -9 2>/dev/null || true`;
        
        exec(cmd, () => {
          serverProcess = null;
          vscode.window.showInformationMessage("WaitMe 服务已停止");
          checkServerHealth(httpClient, provider);
        });
      } catch (error) {
        vscode.window.showErrorMessage(`停止服务失败: ${error}`);
      }
    })
  );
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

function startHealthCheck(httpClient: HttpClient, provider: WaitMeViewProvider) {
  checkServerHealth(httpClient, provider);
  healthCheckTimer = setInterval(() => {
    checkServerHealth(httpClient, provider);
  }, HEALTH_CHECK_INTERVAL);
}

async function checkServerHealth(httpClient: HttpClient, provider: WaitMeViewProvider) {
  const health = await httpClient.checkHealth();
  const wasOnline = isServerOnline;
  isServerOnline = health !== null;

  provider.sendServerStatus(isServerOnline);
  if (WaitMePanelProvider.currentPanel) {
    WaitMePanelProvider.currentPanel.sendServerStatus(isServerOnline);
  }

  if (isServerOnline) {
    if (!wasOnline) {
      vscode.window.showInformationMessage("WaitMe 服务已连接");
    }
    const count = health!.pendingCount;
    if (count > 0) {
      statusBarItem.text = `$(bell) WaitMe (${count})`;
      statusBarItem.tooltip = `${count} 个待处理请求`;
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      statusBarItem.text = `$(check) WaitMe`;
      statusBarItem.tooltip = `服务运行中`;
      statusBarItem.backgroundColor = undefined;
    }
  } else {
    statusBarItem.text = `$(warning) WaitMe 离线`;
    statusBarItem.tooltip = "点击启动服务";
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }
  statusBarItem.show();
}

export function deactivate() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  console.log("WaitMe extension is now deactivated");
}
