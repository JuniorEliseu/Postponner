import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'LocalFlowDB';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('boards')) {
        const boardStore = db.createObjectStore('boards', { keyPath: 'id' });
        boardStore.createIndex('workspaceId', 'workspaceId', { unique: false });
      }
      if (!db.objectStoreNames.contains('lists')) {
        const listStore = db.createObjectStore('lists', { keyPath: 'id' });
        listStore.createIndex('boardId', 'boardId', { unique: false });
      }
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('boardId', 'boardId', { unique: false });
        cardStore.createIndex('listId', 'listId', { unique: false });
      }
    },
  });
}

export class Repository<T extends { id: string }> {
  storeName: string;
  constructor(storeName: string) {
    this.storeName = storeName;
  }

  async create(item: T): Promise<T> {
    const db = await initDB();
    await db.add(this.storeName, item);
    return item;
  }

  async get(id: string): Promise<T | undefined> {
    const db = await initDB();
    return db.get(this.storeName, id);
  }

  async getAll(): Promise<T[]> {
    const db = await initDB();
    return db.getAll(this.storeName);
  }

  async update(item: T): Promise<T> {
    const db = await initDB();
    await db.put(this.storeName, item);
    return item;
  }

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete(this.storeName, id);
  }
}

// Instanciar repositórios padrão
import type { Workspace } from '../models/Workspace';
import type { Board } from '../models/Board';
import type { List } from '../models/List';
import type { Card } from '../models/Card';

export const workspaceRepo = new Repository<Workspace>('workspaces');
export const boardRepo = new Repository<Board>('boards');
export const listRepo = new Repository<List>('lists');
export const cardRepo = new Repository<Card>('cards');
