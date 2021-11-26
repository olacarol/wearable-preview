export enum MessageType {
  LOAD = 'load',
  ERROR = 'error',
}

export function sendMessage(type: MessageType, message?: string) {
  const event = JSON.stringify({ type, message })
  window.parent && window.parent.postMessage(event, '*')
}
