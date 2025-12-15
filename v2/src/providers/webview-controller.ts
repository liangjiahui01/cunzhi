import * as vscode from "vscode";
import { HttpClient } from "../services/http-client";
import type { WaitMeConfig } from "../extension";
import { WEBVIEW_POLL_INTERVAL } from "../config";

export interface WebviewHost {
  postMessage(message: any): void;
  onDidReceiveMessage(callback: (message: any) => void): void;
}

export class WebviewController {
  private _httpClient: HttpClient;
  private _extensionUri: vscode.Uri;
  private _pollInterval?: NodeJS.Timeout;
  private _config: WaitMeConfig = { theme: "system", showToast: true };
  private _host?: WebviewHost;
  private _lastRequestCount: number = 0;
  private _pendingCount: number = 0;
  private _serverOnline: boolean = false;
  public onRequestCountChange?: (count: number, isNew: boolean) => void;
  public onPendingCountChange?: (count: number) => void;
  public onStartServer?: () => void;
  public onStopServer?: () => void;

  constructor(extensionUri: vscode.Uri, httpClient: HttpClient) {
    this._extensionUri = extensionUri;
    this._httpClient = httpClient;
  }

  public setHost(host: WebviewHost): void {
    this._host = host;
    host.onDidReceiveMessage((message) => this._handleMessage(message));
  }

  public setConfig(config: WaitMeConfig): void {
    this._config = config;
    this._postMessage({ type: "config", config });
  }

  public startPolling(): void {
    this._fetchAndSendRequests();
    this._pollInterval = setInterval(() => {
      this._fetchAndSendRequests();
    }, WEBVIEW_POLL_INTERVAL);
  }

  public stopPolling(): void {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = undefined;
    }
  }

  public sendProjectPath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const projectPath = workspaceFolders?.[0]?.uri.fsPath || "";
    this._postMessage({ type: "projectPath", projectPath });
    this._postMessage({ type: "config", config: this._config });
  }

  public get pendingCount(): number {
    return this._pendingCount;
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case "response":
        await this._httpClient.sendResponse(
          message.requestId,
          message.userInput,
          message.selectedOptions,
          message.images
        );
        this._postMessage({
          type: "responseSent",
          requestId: message.requestId,
          response: {
            userInput: message.userInput,
            selectedOptions: message.selectedOptions,
            images: message.images,
            timestamp: new Date().toISOString(),
          },
        });
        this._lastRequestCount = Math.max(0, this._lastRequestCount - 1);
        this._notifyCountChange(this._lastRequestCount);
        break;
      case "deleteRequest":
        await this._httpClient.deleteRequest(message.requestId);
        this._lastRequestCount = Math.max(0, this._lastRequestCount - 1);
        this._notifyCountChange(this._lastRequestCount);
        break;
      case "getRequests":
        this.sendProjectPath();
        this._postMessage({ type: "serverStatus", online: this._serverOnline });
        await this._fetchAndSendRequests();
        break;
      case "startServer":
        if (this.onStartServer) {
          this.onStartServer();
        }
        break;
      case "stopServer":
        if (this.onStopServer) {
          vscode.window.showWarningMessage(
            "确定要停止 WaitMe 服务吗？",
            "确定",
            "取消"
          ).then((result) => {
            if (result === "确定" && this.onStopServer) {
              this.onStopServer();
            }
          });
        }
        break;
    }
  }

  public sendServerStatus(online: boolean): void {
    this._serverOnline = online;
    this._postMessage({ type: "serverStatus", online });
  }

  private async _fetchAndSendRequests(): Promise<void> {
    try {
      const requests = await this._httpClient.getRequests();
      this._postMessage({ type: "requests", requests });

      const isNew = requests.length > this._lastRequestCount;
      this._notifyCountChange(requests.length, isNew);

      this._pendingCount = requests.length;
      if (this.onPendingCountChange) {
        this.onPendingCountChange(this._pendingCount);
      }

      this._lastRequestCount = requests.length;
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  }

  private _notifyCountChange(count: number, isNew: boolean = false): void {
    if (this.onRequestCountChange) {
      this.onRequestCountChange(count, isNew);
    }
  }

  private _postMessage(message: any): void {
    this._host?.postMessage(message);
  }

  public getHtmlForWebview(webview: vscode.Webview, fullHeight: boolean = false): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "dist", "index.css")
    );

    const nonce = getNonce();
    const heightStyle = fullHeight ? ' style="height: 100%;"' : '';
    const bodyStyle = fullHeight ? ' style="height: 100%; margin: 0; padding: 0;"' : '';
    const rootStyle = fullHeight ? ' style="height: 100%;"' : '';

    return `<!DOCTYPE html>
<html lang="zh-CN"${heightStyle}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:;">
  <link href="${styleUri}" rel="stylesheet">
  <title>WaitMe</title>
</head>
<body${bodyStyle}>
  <div id="root"${rootStyle}></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
