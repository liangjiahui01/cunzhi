import * as vscode from "vscode";
import { HttpClient } from "../services/http-client";
import { WebviewController, WebviewHost } from "./webview-controller";
import type { WaitMeConfig } from "../extension";

export class WaitMeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "waitme.mainView";
  private _view?: vscode.WebviewView;
  private _controller: WebviewController;

  constructor(extensionUri: vscode.Uri, httpClient: HttpClient) {
    this._controller = new WebviewController(extensionUri, httpClient);
  }

  public get onRequestCountChange() {
    return this._controller.onRequestCountChange;
  }

  public set onRequestCountChange(callback: ((count: number, isNew: boolean) => void) | undefined) {
    this._controller.onRequestCountChange = callback;
  }

  public set onStartServer(callback: (() => void) | undefined) {
    this._controller.onStartServer = callback;
  }

  public set onStopServer(callback: (() => void) | undefined) {
    this._controller.onStopServer = callback;
  }

  public sendServerStatus(online: boolean): void {
    this._controller.sendServerStatus(online);
  }

  public setConfig(config: WaitMeConfig): void {
    this._controller.setConfig(config);
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
        vscode.Uri.joinPath(this._controller["_extensionUri"], "webview", "dist"),
      ],
    };

    webviewView.webview.html = this._controller.getHtmlForWebview(webviewView.webview, false);

    const host: WebviewHost = {
      postMessage: (message) => webviewView.webview.postMessage(message),
      onDidReceiveMessage: (callback) => {
        webviewView.webview.onDidReceiveMessage(callback);
      },
    };

    this._controller.setHost(host);
    this._controller.startPolling();
    this._controller.sendProjectPath();

    webviewView.onDidDispose(() => {
      this._controller.stopPolling();
    });
  }

  public show() {
    if (this._view) {
      this._view.show(true);
    }
  }
}
