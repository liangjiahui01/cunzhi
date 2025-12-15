import * as vscode from "vscode";
import { HttpClient } from "../services/http-client";
import { WebviewController, WebviewHost } from "./webview-controller";
import type { WaitMeConfig } from "../extension";

export class WaitMePanelProvider {
  public static currentPanel: WaitMePanelProvider | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _controller: WebviewController;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    httpClient: HttpClient
  ) {
    this._panel = panel;
    this._controller = new WebviewController(extensionUri, httpClient);

    this._panel.webview.html = this._controller.getHtmlForWebview(this._panel.webview, true);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    const host: WebviewHost = {
      postMessage: (message) => this._panel.webview.postMessage(message),
      onDidReceiveMessage: (callback) => {
        this._panel.webview.onDidReceiveMessage(callback, null, this._disposables);
      },
    };

    this._controller.setHost(host);
    this._controller.onPendingCountChange = (count) => this._updateTitle(count);
    this._controller.startPolling();
    this._controller.sendProjectPath();
  }

  public static createOrShow(extensionUri: vscode.Uri, httpClient: HttpClient) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WaitMePanelProvider.currentPanel) {
      WaitMePanelProvider.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "waitme.panel",
      "WaitMe",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview", "dist"),
        ],
      }
    );

    panel.iconPath = vscode.Uri.joinPath(extensionUri, "resources", "icon.svg");

    WaitMePanelProvider.currentPanel = new WaitMePanelProvider(
      panel,
      extensionUri,
      httpClient
    );
  }

  public setConfig(config: WaitMeConfig) {
    this._controller.setConfig(config);
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

  private _updateTitle(count: number) {
    if (count > 0) {
      this._panel.title = `WaitMe (${count})`;
    } else {
      this._panel.title = "WaitMe";
    }
  }

  public dispose() {
    WaitMePanelProvider.currentPanel = undefined;

    this._controller.stopPolling();
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
