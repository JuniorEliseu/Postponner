import { eventBus } from '../events/EventBus';
import type { Workspace } from '../../models/Workspace';
import type { Board } from '../../models/Board';
import type { Card } from '../../models/Card';

export interface ApplicationState {
  currentWorkspace: Workspace | null;
  currentBoard: Board | null;
  currentView: 'board' | 'table' | 'calendar' | 'timeline' | 'dashboard' | 'map';
  selectedCards: Card[];
  filters: any;
  search: string;
  theme: 'light' | 'dark' | 'custom';
  user: any;
}

const initialState: ApplicationState = {
  currentWorkspace: null,
  currentBoard: null,
  currentView: 'board',
  selectedCards: [],
  filters: {},
  search: '',
  theme: 'light',
  user: null,
};

class AppState {
  private state: ApplicationState;

  constructor() {
    this.state = { ...initialState };
  }

  get getState(): ApplicationState {
    return { ...this.state };
  }

  updateState(partialState: Partial<ApplicationState>): void {
    this.state = { ...this.state, ...partialState };
    // Notifica toda a aplicação de que o estado global (UI / Contexto) mudou
    eventBus.publish('STATE_CHANGED', this.state);
  }
}

export const appState = new AppState();
