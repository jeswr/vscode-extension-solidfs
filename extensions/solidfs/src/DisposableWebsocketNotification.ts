import type { NotificationOptions } from "@inrupt/solid-client-notifications";
import { WebsocketNotification } from "@inrupt/solid-client-notifications";

export class DisposableWebsocketNotification {
  private socket: Promise<WebsocketNotification>;

  constructor(topic: Promise<string>, options?: NotificationOptions) {
    this.socket = topic.then((t) => new WebsocketNotification(t, options));
  }

  on(messageEvent: "message", listener: (notification: object) => void) {
    this.socket.then((socket) => socket.on(messageEvent, listener));
  }

  off(notificationEvent: "message", listener: (notification: object) => void) {
    this.socket.then((socket) => socket.off(notificationEvent, listener));
  }

  disconnect() {
    this.socket.then((socket) => socket.disconnect());
  }

  dispose() {
    this.disconnect();
  }
}
