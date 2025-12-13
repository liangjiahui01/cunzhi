import * as vscode from "vscode";
import { HttpClient } from "../services/http-client";
import type { WaitMeRequest } from "../types";

export class WaitMeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "waitme.mainView";
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _httpClient: HttpClient;
  private _pollInterval?: NodeJS.Timeout;

  constructor(extensionUri: vscode.Uri, httpClient: HttpClient) {
    this._extensionUri = extensionUri;
    this._httpClient = httpClient;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview", "dist"),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
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
          break;
        case "deleteRequest":
          await this._httpClient.deleteRequest(message.requestId);
          break;
        case "getRequests":
          await this._fetchAndSendRequests();
          break;
      }
    });

    this._startPolling();

    webviewView.onDidDispose(() => {
      this._stopPolling();
    });
  }

  public show() {
    if (this._view) {
      this._view.show(true);
    }
  }

  private _startPolling() {
    this._pollInterval = setInterval(() => {
      this._fetchAndSendRequests();
    }, 1000);
  }

  private _stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
    }
  }

  private async _fetchAndSendRequests() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const projectPath = workspaceFolders?.[0]?.uri.fsPath;
      const requests = await this._httpClient.getRequests(projectPath);
      this._postMessage({ type: "requests", requests });

      if (requests.length > 0) {
        this._view?.show(true);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  }

  private _postMessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "dist", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "dist", "index.css")
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>WaitMe</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
