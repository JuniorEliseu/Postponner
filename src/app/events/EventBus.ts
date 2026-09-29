export type EventType =
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_MOVED'
  | 'CARD_ARCHIVED'
  | 'LIST_CREATED'
  | 'LIST_UPDATED'
  | 'CHECKLIST_UPDATED'
  | 'LABEL_ADDED'
  | 'DUE_DATE_CHANGED'
  | 'BOARD_UPDATED'
  | 'STATE_CHANGED'; // Evento genérico para estado UI

type EventCallback = (payload: any) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  subscribe(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Retorna a função de unsubscribe
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    };
  }

  publish(event: EventType, payload?: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(payload);
      } catch (e) {
        console.error(`Erro no listener para o evento ${event}:`, e);
      }
    });
  }
}

export const eventBus = new EventBus();
