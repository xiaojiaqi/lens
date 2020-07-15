// Inter-protocol communications (main <-> renderer)
// https://www.electronjs.org/docs/api/ipc-main
// https://www.electronjs.org/docs/api/ipc-renderer

import { ipcMain, ipcRenderer, WebContents, webContents } from "electron"
import logger from "../main/logger";

export type IpcChannel = string;

export interface IpcMessageOptions {
  timeout?: number;
}

export interface IpcMessageHandler<T extends any[] = any> {
  (...args: T): any;
}

export interface IpcBroadcastOpts {
  channel: IpcChannel
  filter?: (webContent: WebContents) => boolean
}

export function broadcastMessage({ channel, filter }: IpcBroadcastOpts, ...args: any[]) {
  if (!filter) {
    filter = webContent => webContent.getType() === "window"
  }
  webContents.getAllWebContents().filter(filter).forEach(webContent => {
    logger.debug(`[IPC]: broadcasting ${channel} to ${webContent.getType()}=${webContent.id}`);
    webContent.send(channel, ...args);
  })
}

// todo: support timeout
export async function invokeMessage<T = any>(channel: IpcChannel, ...args: any[]): Promise<T> {
  logger.debug(`[IPC]: invoke channel "${channel}"`, { args });
  return ipcRenderer.invoke(channel, ...args);
}

// todo: make isomorphic api
export function handleMessage<T extends any[]>(channel: IpcChannel, handler: IpcMessageHandler<T>, options: IpcMessageOptions = {}) {
  const { timeout = 0 } = options;
  ipcMain.handle(channel, async (event, ...args: T) => {
    logger.info(`[IPC]: handle "${channel}"`, { event, args });
    return new Promise(async (resolve, reject) => {
      let timerId;
      if (timeout) {
        timerId = setTimeout(() => {
          const timeoutError = new Error("[IPC]: response timeout");
          reject(timeoutError);
        }, timeout);
      }
      try {
        const result = await handler(...args); // todo: maybe exec in separate thread/worker
        clearTimeout(timerId);
        return result;
      } catch (err) {
        logger.debug(`[IPC]: handling "${channel}" error`, err);
      }
    })
  })
}

export function handleMessages(messages: Record<string, IpcMessageHandler>, options?: IpcMessageOptions) {
  Object.entries(messages).forEach(([channel, handler]) => {
    handleMessage(channel, handler, options);
  })
}
