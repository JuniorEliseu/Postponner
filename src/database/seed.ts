import { v4 as uuidv4 } from 'uuid';
import { workspaceRepo, boardRepo, listRepo, cardRepo } from './indexeddb';

export async function seedDatabaseIfEmpty() {
  const workspaces = await workspaceRepo.getAll();
  
  // Se já tem dados, não faz o seed
  if (workspaces.length > 0) return;

  const now = Date.now();

  // 1. Criar Workspace
  const workspaceId = uuidv4();
  await workspaceRepo.create({
    id: workspaceId,
    name: 'Desenvolvimento App',
    description: 'Workspace principal para desenvolvimento do LocalFlow',
    icon: 'folder-notch',
    color: '#818cf8',
    createdAt: now,
    updatedAt: now,
    settings: {}
  });

  // 2. Criar Board
  const boardId = uuidv4();
  await boardRepo.create({
    id: boardId,
    workspaceId: workspaceId,
    name: 'Sprint 1',
    description: 'Tarefas da primeira sprint',
    background: 'default',
    backgroundType: 'color',
    visibility: 'private',
    starred: true,
    archived: false,
    template: false,
    createdAt: now,
    updatedAt: now
  });

  // 3. Criar Listas
  const listBacklogId = uuidv4();
  const listDoingId = uuidv4();
  
  await listRepo.create({
    id: listBacklogId,
    boardId: boardId,
    name: 'BACKLOG',
    position: 0,
    color: 'default',
    collapsed: false,
    archived: false
  });

  await listRepo.create({
    id: listDoingId,
    boardId: boardId,
    name: 'EM ANDAMENTO',
    position: 1,
    color: 'default',
    collapsed: false,
    archived: false
  });

  // 4. Criar Cards
  await cardRepo.create({
    id: uuidv4(),
    boardId: boardId,
    listId: listBacklogId,
    title: 'Criar a interface visual base do projeto no padrão LocalFlow',
    description: 'Implementar dark mode, estilos globais e UI.',
    position: 0,
    members: ['JT'],
    labels: ['purple'],
    startDate: null,
    dueDate: null,
    dueTime: null,
    completed: false,
    cover: {},
    checklists: [],
    attachments: ['1', '2'],
    customFields: {},
    comments: [],
    watchers: [],
    dependencies: [],
    location: null,
    archived: false,
    createdAt: now,
    updatedAt: now
  });

  await cardRepo.create({
    id: uuidv4(),
    boardId: boardId,
    listId: listBacklogId,
    title: 'Configurar Offline Mode Service Worker',
    description: 'Permitir o funcionamento offline.',
    position: 1,
    members: ['JD'],
    labels: ['red'],
    startDate: null,
    dueDate: now + 86400000, // +1 dia
    dueTime: null,
    completed: false,
    cover: {},
    checklists: [],
    attachments: [],
    customFields: {},
    comments: [],
    watchers: [],
    dependencies: [],
    location: null,
    archived: false,
    createdAt: now,
    updatedAt: now
  });

  await cardRepo.create({
    id: uuidv4(),
    boardId: boardId,
    listId: listDoingId,
    title: 'Setup inicial do IndexedDB com a biblioteca idb',
    description: 'Criar repositories para as entidades',
    position: 0,
    members: ['JT'],
    labels: ['green'],
    startDate: null,
    dueDate: null,
    dueTime: null,
    completed: false,
    cover: {},
    checklists: [],
    attachments: [],
    customFields: {},
    comments: [],
    watchers: [],
    dependencies: [],
    location: null,
    archived: false,
    createdAt: now,
    updatedAt: now
  });
}
