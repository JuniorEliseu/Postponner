import './style.css';
import { v4 as uuidv4 } from 'uuid';
import { seedDatabaseIfEmpty } from './database/seed';
import { boardRepo, listRepo, cardRepo } from './database/indexeddb';
import { appState } from './app/state/AppState';
import { eventBus } from './app/events/EventBus';
import { initAutomationEngine } from './app/automation/AutomationEngine';
import { registerSW } from 'virtual:pwa-register';
import type { List } from './models/List';
import type { Card } from './models/Card';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

let currentBoardId: string | null = null;
let currentOpenedCard: Card | null = null;
let quillInstance: any = null;
let quillCommentInstance: any = null;

async function initApp() {
  await seedDatabaseIfEmpty();

  const boards = await boardRepo.getAll();
  if (boards.length === 0) return;
  const currentBoard = boards[0];
  currentBoardId = currentBoard.id;

  setupModalHtml();
  setupBaseLayout();
  initAutomationEngine();

  registerSW({
    onNeedRefresh() {},
    onOfflineReady() {
      console.log('App is ready to work offline');
    },
  });

  eventBus.subscribe('STATE_CHANGED', () => {
    renderBoard();
  });

  await renderBoard();
}

function setupBaseLayout() {
  const appElement = document.querySelector<HTMLDivElement>('#app')!;
  
  if (!appElement.querySelector('.main-wrapper')) {
    appElement.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-header">
          <i class="ph-fill ph-infinity logo-icon"></i>
          <h1>Postponer</h1>
        </div>
          <div class="nav-item active"><i class="ph ph-calendar-blank"></i> Planner</div>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 24px 0 8px 12px; padding-right: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px;">Favoritos</div>
          </div>
          <div id="sidebar-favorites-container"></div>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 24px 0 8px 12px; padding-right: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px;">Workspaces</div>
            <button class="btn-icon" id="btn-add-board" style="padding: 2px;"><i class="ph ph-plus"></i></button>
          </div>
          <div id="sidebar-boards-container"></div>
        </div>
      </aside>
      
      <div class="main-wrapper">
        <header class="topbar">
          <h2 class="topbar-title" id="topbar-title">Carregando...</h2>
          
          <div class="search-container">
            <i class="ph ph-magnifying-glass search-icon"></i>
            <input type="text" class="search-input" id="global-search" placeholder="Pesquisar cards..." autocomplete="off">
          </div>

          <div class="topbar-actions">
            <div class="view-switcher">
              <button class="view-btn active" id="btn-view-board" data-view="board">
                <i class="ph ph-kanban"></i> Board
              </button>
              <button class="view-btn" id="btn-view-table" data-view="table">
                <i class="ph ph-table"></i> Table
              </button>
              <button class="view-btn" id="btn-view-dashboard" data-view="dashboard">
                <i class="ph ph-chart-pie-slice"></i> Dash
              </button>
              <button class="view-btn" id="btn-view-calendar" data-view="calendar">
                <i class="ph ph-calendar-blank"></i> Calendar
              </button>
            </div>

            <button class="btn-icon" id="btn-import" title="Importar Backup"><i class="ph ph-upload-simple"></i></button>
            <button class="btn-icon" id="btn-export" title="Exportar Backup"><i class="ph ph-download-simple"></i></button>
            <button class="btn-primary" id="btn-global-add"><i class="ph ph-plus"></i> Novo Card</button>
          </div>
        </header>
        
        <main class="content-area" id="content-area"></main>
      </div>
      <input type="file" id="import-file" accept=".json" style="display: none;">
    `;

    document.getElementById('btn-view-board')?.addEventListener('click', () => {
      appState.updateState({ currentView: 'board' });
      updateViewButtons();
    });
    
    document.getElementById('btn-view-table')?.addEventListener('click', () => {
      appState.updateState({ currentView: 'table' });
      updateViewButtons();
    });

    document.getElementById('btn-view-dashboard')?.addEventListener('click', () => {
      appState.updateState({ currentView: 'dashboard' });
      updateViewButtons();
    });

    document.getElementById('btn-view-calendar')?.addEventListener('click', () => {
      appState.updateState({ currentView: 'calendar' });
      updateViewButtons();
    });

    document.getElementById('global-search')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      appState.updateState({ search: val });
    });

    document.getElementById('btn-export')?.addEventListener('click', handleExportData);
    document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', handleImportData);
    
    document.getElementById('btn-add-board')?.addEventListener('click', handleAddBoard);
    document.getElementById('btn-global-add')?.addEventListener('click', handleGlobalAddCard);
  }
}

async function renderSidebar() {
  const boards = await boardRepo.getAll();
  const favContainer = document.getElementById('sidebar-favorites-container');
  const boardContainer = document.getElementById('sidebar-boards-container');
  if (!favContainer || !boardContainer) return;

  let favHtml = '';
  let boardHtml = '';

  const renderBoardItem = (board: any) => `
      <div class="nav-item ${board.id === currentBoardId ? 'active' : ''}" data-board-id="${board.id}">
        <i class="ph ph-kanban"></i> <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${board.name}</span>
        <div style="display:flex;">
          <button class="btn-icon star-board-btn" data-board-id="${board.id}" style="padding: 2px; opacity: ${board.starred ? '1' : '0.5'}; color: ${board.starred ? 'var(--accent-primary)' : 'inherit'};" title="Favoritar"><i class="${board.starred ? 'ph-fill' : 'ph'} ph-star"></i></button>
          <button class="btn-icon edit-board-btn" data-board-id="${board.id}" style="padding: 2px; opacity: 0.5;" title="Renomear"><i class="ph ph-pencil"></i></button>
          <button class="btn-icon delete-board-btn" data-board-id="${board.id}" style="padding: 2px; opacity: 0.5;" title="Deletar"><i class="ph ph-trash"></i></button>
        </div>
      </div>
  `;

  boards.forEach(board => {
    if (board.starred) {
      favHtml += renderBoardItem(board);
    } else {
      boardHtml += renderBoardItem(board);
    }
  });

  favContainer.innerHTML = favHtml || '<div style="padding: 0 12px; font-size: 12px; color: var(--text-muted);">Nenhum favorito</div>';
  boardContainer.innerHTML = boardHtml;

  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Cleanup old listeners if any by relying on event delegation or just attaching directly.
  // We re-render innerHTML so old children listeners are gone.
  
  sidebar.querySelectorAll('.nav-item[data-board-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const id = (e.currentTarget as HTMLElement).getAttribute('data-board-id');
      if (id) {
        currentBoardId = id;
        renderSidebar();
        renderBoard();
      }
    });
  });

  sidebar.querySelectorAll('.star-board-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-board-id');
      if (!id) return;
      const board = await boardRepo.get(id);
      if (board) {
        board.starred = !board.starred;
        await boardRepo.update(board);
        renderSidebar();
      }
    });
  });

  sidebar.querySelectorAll('.delete-board-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-board-id');
      if (!id) return;
      if (confirm("Deletar este Board e tudo que há nele?")) {
        await boardRepo.delete(id);
        const remaining = await boardRepo.getAll();
        if (remaining.length > 0) {
          if (currentBoardId === id) currentBoardId = remaining[0].id;
        } else {
          currentBoardId = null;
        }
        renderSidebar();
        renderBoard();
      }
    });
  });

  sidebar.querySelectorAll('.edit-board-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-board-id');
      if (!id) return;
      const board = await boardRepo.get(id);
      if (!board) return;
      const newName = prompt("Renomear Board:", board.name);
      if (newName && newName.trim() !== '') {
        board.name = newName.trim();
        await boardRepo.update(board);
        renderSidebar();
        if (currentBoardId === id) renderBoard();
      }
    });
  });
}

async function handleAddBoard() {
  const name = prompt("Nome do novo Board:");
  if (!name || name.trim() === '') return;

  const newBoardId = uuidv4();
  await boardRepo.create({
    id: newBoardId,
    workspaceId: '1',
    name: name.trim(),
    description: '',
    background: '#0f172a',
    backgroundType: 'color',
    visibility: 'private',
    starred: false,
    archived: false,
    template: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // Criar listas default
  await listRepo.create({ id: uuidv4(), boardId: newBoardId, name: 'To Do', position: 0, color: '#3b82f6', collapsed: false, archived: false });
  await listRepo.create({ id: uuidv4(), boardId: newBoardId, name: 'Doing', position: 1, color: '#10b981', collapsed: false, archived: false });
  await listRepo.create({ id: uuidv4(), boardId: newBoardId, name: 'Done', position: 2, color: '#ef4444', collapsed: false, archived: false });

  currentBoardId = newBoardId;
  renderSidebar();
  renderBoard();
}

async function handleGlobalAddCard() {
  if (!currentBoardId) {
    alert("Selecione ou crie um Board primeiro.");
    return;
  }
  const allLists = await listRepo.getAll();
  const boardLists = allLists.filter(l => l.boardId === currentBoardId).sort((a, b) => a.position - b.position);
  if (boardLists.length === 0) {
    alert("Este Board não possui listas. Crie uma lista primeiro.");
    return;
  }
  
  const title = prompt("Título do novo Card:");
  if (!title || title.trim() === '') return;

  const newCardId = uuidv4();
  await cardRepo.create({
    id: newCardId,
    boardId: currentBoardId,
    listId: boardLists[0].id,
    title: title.trim(),
    description: '',
    position: Date.now(), // colocar no final
    members: [],
    labels: [],
    startDate: null,
    dueDate: null,
    dueTime: null,
    completed: false,
    cover: {},
    checklists: [],
    attachments: [],
    customFields: { tasks: [], labels: [] },
    comments: [],
    watchers: [],
    dependencies: [],
    location: null,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  renderBoard();
}

function updateViewButtons() {
  const currentView = appState.getState.currentView;
  document.getElementById('btn-view-board')?.classList.toggle('active', currentView === 'board');
  document.getElementById('btn-view-table')?.classList.toggle('active', currentView === 'table');
  document.getElementById('btn-view-dashboard')?.classList.toggle('active', currentView === 'dashboard');
  document.getElementById('btn-view-calendar')?.classList.toggle('active', currentView === 'calendar');
}

async function renderBoard() {
  if (!currentBoardId) {
    document.getElementById('topbar-title')!.innerText = "Nenhum Board selecionado";
    document.getElementById('content-area')!.innerHTML = '<div style="padding: 24px;">Crie um Board para começar.</div>';
    return;
  }

  const currentBoard = await boardRepo.get(currentBoardId);
  if (currentBoard) {
    document.getElementById('topbar-title')!.innerText = currentBoard.name;
  }

  renderSidebar();

  const allLists = await listRepo.getAll();
  const lists = allLists.filter(l => l.boardId === currentBoardId).sort((a, b) => a.position - b.position);

  let allCards = await cardRepo.getAll();
  
  const searchQuery = appState.getState.search.toLowerCase();
  if (searchQuery) {
    allCards = allCards.filter(c => 
      c.title.toLowerCase().includes(searchQuery) || 
      c.description.toLowerCase().includes(searchQuery)
    );
  }

  const boardCards = allCards.filter(c => c.boardId === currentBoardId);

  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;

  const currentView = appState.getState.currentView;

  if (currentView === 'board') {
    renderKanbanView(contentArea, lists, allCards);
  } else if (currentView === 'table') {
    renderTableView(contentArea, lists, allCards);
  } else if (currentView === 'dashboard') {
    renderDashboardView(contentArea, lists, boardCards);
  } else if (currentView === 'calendar') {
    renderCalendarView(contentArea, boardCards);
  }
}

function renderKanbanView(container: HTMLElement, lists: List[], allCards: Card[]) {
  let html = '<div class="kanban-board" id="board-container">';

  lists.forEach((list: List) => {
    const listCards = allCards.filter(c => c.listId === list.id).sort((a, b) => a.position - b.position);
    
    let cardsHtml = '';
    listCards.forEach((card: Card) => {
      let labelsFooterHtml = '';
      if (card.customFields?.labels?.length) {
        card.customFields.labels.forEach((lbl: any) => {
          if (typeof lbl === 'string') {
             labelsFooterHtml += `<div style="width:16px; height:16px; border-radius:4px; background:${lbl};" title="Etiqueta Antiga"></div>`;
          } else {
             labelsFooterHtml += `<span title="${lbl.name}" style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; background:${lbl.color}; color:#fff; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;"><i class="ph ${lbl.icon}"></i> ${lbl.name}</span>`;
          }
        });
      }

      const tasks = card.customFields?.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.done).length;
      let tasksHtml = '';
      if (totalTasks > 0) {
        tasksHtml = `<span style="display:flex; align-items:center; gap:2px; font-size:11px; color:${completedTasks === totalTasks ? '#10b981' : 'var(--text-muted)'}"><i class="ph ph-check-square"></i> ${completedTasks}/${totalTasks}</span>`;
      }

      cardsHtml += `
        <div class="kanban-card ${card.completed ? 'completed' : ''}" draggable="true" data-card-id="${card.id}" style="${card.completed ? 'opacity: 0.7;' : ''} ${card.cover?.color ? `background:${card.cover.color}; border:none; box-shadow:0 4px 6px rgba(0,0,0,0.3);` : ''}">
          <div class="card-title-wrapper">
            <button class="card-complete-btn" data-card-id="${card.id}" title="Marcar como concluído">
               <i class="ph ${card.completed ? 'ph-check-circle' : 'ph-circle'}"></i>
            </button>
            <p class="card-title" style="${card.cover?.color ? 'color:#fff;' : ''}">${card.title}</p>
          </div>
          ${card.description ? (() => {
            const strippedDesc = card.description.replace(/<[^>]*>?/gm, '').trim();
            if (!strippedDesc) return '';
            return `<p style="font-size: 12px; color: ${card.cover?.color ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'}; margin: 0 0 12px 0; word-break: break-word;">${strippedDesc.length > 60 ? strippedDesc.substring(0, 60) + '...' : strippedDesc}</p>`;
          })() : ''}
          <div class="card-footer">
            <div class="card-icons" style="display:flex; gap:8px; color:var(--text-muted); font-size:14px; align-items:center;">
              ${labelsFooterHtml}
              ${tasksHtml}
              ${card.attachments.length > 0 ? `<i class="ph ph-paperclip"></i> ${card.attachments.length}` : ''}
              ${card.dueDate ? `<span><i class="ph ph-clock"></i> ${new Date(card.dueDate).toLocaleDateString()}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `
      <div class="kanban-list" data-list-id="${list.id}" draggable="true" style="border-top: 4px solid ${list.color || '#3b82f6'};">
        <div class="list-header">
          <input type="color" class="list-color-picker" data-list-id="${list.id}" value="${list.color || '#3b82f6'}" style="width: 16px; height: 16px; border: none; padding: 0; background: transparent; cursor: pointer; margin-right: 8px;">
          <span style="flex:1;">${list.name}</span>
          <button class="btn-icon edit-list-btn" data-list-id="${list.id}" style="padding:2px; font-size:14px;"><i class="ph ph-pencil"></i></button>
        </div>
        <div class="list-cards-container" data-list-id="${list.id}" style="min-height: 50px;">
          ${cardsHtml}
        </div>
        <button class="add-card-btn" data-list-id="${list.id}">
          <i class="ph ph-plus"></i> Adicionar Card
        </button>
      </div>
    `;
  });

  html += `
    <button class="add-new-list-btn" id="btn-add-new-list">
      <i class="ph ph-plus"></i> Adicionar Nova Lista
    </button>
  </div>`;
  container.innerHTML = html;

  setupKanbanEvents();
}

function renderTableView(container: HTMLElement, lists: List[], allCards: Card[]) {
  const listMap = new Map(lists.map(l => [l.id, l.name]));
  const cardsToShow = allCards.filter(c => c.boardId === currentBoardId);

  let rowsHtml = '';
  cardsToShow.forEach(card => {
    const listName = listMap.get(card.listId) || 'Unknown';
    const labelsStr = card.labels.join(', ') || '-';
    
    rowsHtml += `
      <tr>
        <td class="table-card-title" data-card-id="${card.id}">${card.title}</td>
        <td><span style="background: var(--bg-surface-hover); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${listName}</span></td>
        <td>${card.members.join(', ') || '-'}</td>
        <td>${labelsStr}</td>
      </tr>
    `;
  });

  if (cardsToShow.length === 0) {
    rowsHtml = `<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum card encontrado.</td></tr>`;
  }

  container.innerHTML = `
    <div class="table-view-container">
      <table class="localflow-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Lista</th>
            <th>Membros</th>
            <th>Labels</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  const titles = container.querySelectorAll('.table-card-title');
  titles.forEach(t => {
    t.addEventListener('click', (e) => {
      const cardId = (e.currentTarget as HTMLElement).getAttribute('data-card-id');
      if (cardId) openCardModal(cardId);
    });
  });
}

function renderDashboardView(container: HTMLElement, lists: List[], cards: Card[]) {
  const totalCards = cards.length;
  
  let listCountsHtml = '';
  lists.forEach(list => {
    const count = cards.filter(c => c.listId === list.id).length;
    const percentage = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;
    
    listCountsHtml += `
      <div class="dash-bar-row">
        <div class="dash-bar-label">${list.name}</div>
        <div class="dash-bar-track">
          <div class="dash-bar-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="dash-bar-value">${count}</div>
      </div>
    `;
  });

  if (totalCards === 0) {
    listCountsHtml = `<div style="color: var(--text-muted); font-size: 14px;">Nenhum card para contabilizar.</div>`;
  }

  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dash-widget">
        <h3 class="dash-widget-title">Total de Cards (Filtro)</h3>
        <p class="dash-widget-value">${totalCards}</p>
      </div>

      <div class="dash-widget" style="grid-column: span 2;">
        <h3 class="dash-widget-title">Cards por Lista</h3>
        <div class="dash-chart-bar">
          ${listCountsHtml}
        </div>
      </div>
    </div>
  `;
}

function renderCalendarView(container: HTMLElement, cards: Card[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let headerHtml = dayNames.map(d => `<div class="calendar-header-day">${d}</div>`).join('');

  let gridHtml = '';
  
  // Caixas vazias antes do dia 1
  for (let i = 0; i < firstDay; i++) {
    gridHtml += `<div class="calendar-cell other-month"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === todayDate;
    
    // Filtra cards que têm vencimento neste dia (ano, mes, dia conferem)
    const dayCards = cards.filter(c => {
      if (!c.dueDate) return false;
      const d = new Date(c.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    let cardsHtml = '';
    dayCards.forEach(c => {
      cardsHtml += `<div class="calendar-card" data-card-id="${c.id}">${c.title}</div>`;
    });

    gridHtml += `
      <div class="calendar-cell ${isToday ? 'today' : ''}">
        <div class="calendar-date-number">${day}</div>
        ${cardsHtml}
      </div>
    `;
  }

  // Preencher resto da grid
  const totalCells = firstDay + daysInMonth;
  const trailingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailingCells; i++) {
    gridHtml += `<div class="calendar-cell other-month"></div>`;
  }

  container.innerHTML = `
    <div class="calendar-container">
      <div class="calendar-header">
        ${headerHtml}
      </div>
      <div class="calendar-grid">
        ${gridHtml}
      </div>
    </div>
  `;

  const calendarCards = container.querySelectorAll('.calendar-card');
  calendarCards.forEach(c => {
    c.addEventListener('click', (e) => {
      const cardId = (e.currentTarget as HTMLElement).getAttribute('data-card-id');
      if (cardId) openCardModal(cardId);
    });
  });
}

function setupModalHtml() {
  if (document.getElementById('card-modal')) return;
  const modalHtml = `
    <div class="modal-overlay" id="card-modal">
      <div class="modal" style="flex-direction: row; max-width: 900px;">
        
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border-subtle);">
          <div class="modal-header">
            <input type="text" class="modal-title-input" id="modal-card-title" value="" />
          </div>
          <div class="modal-body" style="padding: 24px; overflow-y: auto;">
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <div id="modal-card-desc" style="height: 200px; background: var(--bg-base); color: var(--text-primary); border-radius: 0 0 6px 6px; font-family: var(--font-sans);"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Data de Entrega</label>
            <input type="text" class="form-input" id="modal-card-date" placeholder="Selecione a data..." />
          </div>
          <div class="form-group">
            <label class="form-label">Etiquetas Rápidas</label>
            <div id="modal-labels-container" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>
            <button class="btn-icon" id="btn-create-label" style="margin-top:8px; font-size:12px; padding:4px 8px; border:1px solid var(--border-subtle);"><i class="ph ph-plus"></i> Criar Nova Etiqueta</button>
            <div id="label-creator-section" style="display:none; margin-top:16px; padding:12px; border:1px solid var(--border-subtle); border-radius:8px; background:var(--bg-surface-hover);">
              <h4 style="font-size:12px; margin-bottom:8px;">Nova Etiqueta</h4>
              <input type="text" id="new-label-name" class="form-input" placeholder="Nome (ex: Urgente)" style="margin-bottom:8px; padding:6px; font-size:12px;" />
              <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
                <div style="width: 48px;">
                  <label style="font-size:10px; display:block; margin-bottom:4px; color:var(--text-muted);">Cor</label>
                  <input type="color" id="new-label-color" value="#ef4444" style="width:100%; height:28px; border:none; cursor:pointer; background:transparent;" />
                </div>
                <div style="flex:1;">
                  <label style="font-size:10px; display:block; margin-bottom:4px; color:var(--text-muted);">Símbolo</label>
                  <div id="label-icon-grid" style="display:flex; gap:4px; flex-wrap:wrap; font-size:16px;">
                    <i class="ph ph-warning icon-choice active" data-icon="ph-warning"></i>
                    <i class="ph ph-check-circle icon-choice" data-icon="ph-check-circle"></i>
                    <i class="ph ph-star icon-choice" data-icon="ph-star"></i>
                    <i class="ph ph-bug icon-choice" data-icon="ph-bug"></i>
                    <i class="ph ph-rocket icon-choice" data-icon="ph-rocket"></i>
                    <i class="ph ph-fire icon-choice" data-icon="ph-fire"></i>
                    <i class="ph ph-clock icon-choice" data-icon="ph-clock"></i>
                    <i class="ph ph-lightning icon-choice" data-icon="ph-lightning"></i>
                    <i class="ph ph-users icon-choice" data-icon="ph-users"></i>
                  </div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; gap:8px;">
                <button class="btn-icon" id="btn-delete-label" style="font-size:11px; color:#ef4444; display:none;"><i class="ph ph-trash"></i></button>
                <div style="display:flex; gap:8px;">
                  <button class="btn-icon" id="btn-cancel-label" style="font-size:11px;">Cancelar</button>
                  <button class="btn-primary" id="btn-save-label" style="padding:4px 12px; font-size:11px;">Salvar</button>
                </div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Capa do Card</label>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="cover-btn" data-bg="transparent" style="width:32px; height:32px; border-radius:4px; border:1px solid var(--border-subtle); background:transparent; cursor:pointer;" title="Remover Capa"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #3b82f6, #8b5cf6)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #3b82f6, #8b5cf6); cursor:pointer;" title="Azul e Roxo"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #10b981, #059669)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #10b981, #059669); cursor:pointer;" title="Esmeralda"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #f59e0b, #ea580c)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #f59e0b, #ea580c); cursor:pointer;" title="Laranja"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #ec4899, #e11d48)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #ec4899, #e11d48); cursor:pointer;" title="Rosa"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #64748b, #334155)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #64748b, #334155); cursor:pointer;" title="Slate"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #14b8a6, #0f766e)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #14b8a6, #0f766e); cursor:pointer;" title="Teal"></button>
              <button class="cover-btn" data-bg="linear-gradient(135deg, #111827, #000000)" style="width:32px; height:32px; border-radius:4px; border:none; background:linear-gradient(135deg, #111827, #000000); cursor:pointer;" title="Preto Premium"></button>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:12px; padding: 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--bg-surface-hover); width: fit-content;">
              <span style="font-size: 11px; color: var(--text-muted);">Novo Gradiente:</span>
              <input type="color" id="gradient-color-1" value="#3b82f6" style="width:24px; height:24px; border:none; background:transparent; cursor:pointer;">
              <input type="color" id="gradient-color-2" value="#8b5cf6" style="width:24px; height:24px; border:none; background:transparent; cursor:pointer;">
              <button class="btn-primary" id="btn-apply-custom-gradient" style="padding:4px 8px; font-size:11px;">Aplicar</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Links Anexados</label>
            <div id="modal-links-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;"></div>
            <div style="display:flex; gap:8px;">
              <input type="text" id="new-link-alias" class="form-input" placeholder="Alias (ex: Docs)" style="width: 30%;" />
              <input type="text" id="new-link-url" class="form-input" placeholder="URL (ex: https://...)" style="flex:1;" />
              <button class="btn-primary" id="btn-add-link" style="padding: 0 16px;"><i class="ph ph-plus"></i></button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Subtarefas (Checklist)</label>
            <div class="checklist-container" id="modal-checklist-container"></div>
            <button class="add-checklist-btn" id="btn-add-task"><i class="ph ph-plus"></i> Adicionar Item</button>
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; margin-top: 24px; align-items: center;">
            <button class="btn-icon" id="btn-delete-card" style="color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px 12px; font-size: 13px; border-radius: 4px;" title="Deletar Card"><i class="ph ph-trash"></i> <span style="margin-left: 4px;">Deletar</span></button>
            <button class="btn-primary" id="modal-save-btn">Salvar Alterações</button>
          </div>
        </div>
        </div>
        
        <div style="width: 350px; display: flex; flex-direction: column; background: var(--bg-surface-hover); border-radius: 0 var(--radius-lg) var(--radius-lg) 0;">
           <div class="modal-header" style="justify-content: flex-end; border-bottom: none; padding-bottom: 0;">
             <button class="modal-close" id="modal-close-btn"><i class="ph ph-x"></i></button>
           </div>
           <div style="padding: 0 24px 24px 24px; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
             <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 16px 0; color: var(--text-secondary); text-transform: uppercase;">Comentários</h3>
             <div id="modal-comments-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding-right: 4px;"></div>
             <div style="display:flex; flex-direction: column; gap:8px;">
               <div id="new-comment-text" style="height: 100px; background: var(--bg-base); color: var(--text-primary); border-radius: 0 0 6px 6px; font-family: var(--font-sans);"></div>
               <button class="btn-primary" id="btn-add-comment" style="justify-content: center;"><i class="ph ph-paper-plane-right"></i> Salvar Comentário</button>
             </div>
           </div>
        </div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('modal-close-btn')?.addEventListener('click', closeCardModal);
  document.getElementById('card-modal')?.addEventListener('mousedown', (e) => {
    if (e.target === document.getElementById('card-modal')) closeCardModal();
  });
  document.getElementById('modal-save-btn')?.addEventListener('click', saveCardModal);
  
  document.getElementById('btn-delete-card')?.addEventListener('click', async () => {
    if (!currentOpenedCard) return;
    if (confirm("Tem certeza que deseja deletar este card?")) {
      await cardRepo.delete(currentOpenedCard.id);
      closeCardModal();
      renderBoard();
    }
  });

  document.getElementById('btn-apply-custom-gradient')?.addEventListener('click', () => {
    if (!currentOpenedCard) return;
    const c1 = (document.getElementById('gradient-color-1') as HTMLInputElement).value;
    const c2 = (document.getElementById('gradient-color-2') as HTMLInputElement).value;
    currentOpenedCard.cover = { color: `linear-gradient(135deg, ${c1}, ${c2})` };
    
    document.querySelectorAll('.cover-btn').forEach(b => b.classList.remove('active'));
    renderBoard();
  });
  document.getElementById('btn-add-task')?.addEventListener('click', handleAddTask);
  
  document.getElementById('btn-create-label')?.addEventListener('click', () => {
    document.getElementById('btn-save-label')!.dataset.editingId = '';
    (document.getElementById('new-label-name') as HTMLInputElement).value = '';
    document.getElementById('btn-delete-label')!.style.display = 'none';
    document.getElementById('label-creator-section')!.style.display = 'block';
    document.getElementById('btn-create-label')!.style.display = 'none';
  });

  document.getElementById('btn-cancel-label')?.addEventListener('click', () => {
    document.getElementById('label-creator-section')!.style.display = 'none';
    document.getElementById('btn-create-label')!.style.display = 'inline-flex';
  });

  document.querySelectorAll('.icon-choice').forEach(iconEl => {
    iconEl.addEventListener('click', (e) => {
      document.querySelectorAll('.icon-choice').forEach(i => i.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
    });
  });

  document.getElementById('btn-save-label')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('new-label-name') as HTMLInputElement;
    const colorInput = document.getElementById('new-label-color') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return alert('Digite um nome para a etiqueta.');
    
    let icon = 'ph-warning';
    document.querySelectorAll('.icon-choice').forEach(i => {
      if (i.classList.contains('active')) {
        icon = i.getAttribute('data-icon') || 'ph-warning';
      }
    });

    const color = colorInput.value;

    if (!currentBoardId) return;
    const board = await boardRepo.get(currentBoardId);
    if (board) {
      if (!board.labels) board.labels = [];
      const editingId = document.getElementById('btn-save-label')!.dataset.editingId;
      
      if (editingId) {
        const lbl = board.labels.find(l => l.id === editingId);
        if (lbl) {
          lbl.name = name;
          lbl.color = color;
          lbl.icon = icon;
        }
      } else {
        board.labels.push({ id: uuidv4(), name, color, icon });
      }
      
      await boardRepo.update(board);
      renderModalLabels();
      renderBoard();
      
      nameInput.value = '';
      document.getElementById('label-creator-section')!.style.display = 'none';
      document.getElementById('btn-create-label')!.style.display = 'inline-flex';
    }
  });

  document.getElementById('btn-delete-label')?.addEventListener('click', async () => {
    const editingId = document.getElementById('btn-save-label')!.dataset.editingId;
    if (!editingId || !currentBoardId) return;

    if (!confirm('Tem certeza que deseja deletar esta etiqueta? Ela será removida do Board.')) return;

    const board = await boardRepo.get(currentBoardId);
    if (board && board.labels) {
      board.labels = board.labels.filter(l => l.id !== editingId);
      await boardRepo.update(board);
      
      if (currentOpenedCard && currentOpenedCard.customFields.labels) {
        currentOpenedCard.customFields.labels = currentOpenedCard.customFields.labels.filter((l:any) => l.id !== editingId);
        await cardRepo.update(currentOpenedCard);
      }

      renderModalLabels();
      renderBoard();
      document.getElementById('label-creator-section')!.style.display = 'none';
      document.getElementById('btn-create-label')!.style.display = 'inline-flex';
    }
  });

  document.querySelectorAll('.cover-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!currentOpenedCard) return;
      const bg = (e.currentTarget as HTMLElement).getAttribute('data-bg');
      if (bg === 'transparent') {
        currentOpenedCard.cover = {};
      } else {
        currentOpenedCard.cover = { color: bg || undefined };
      }
      
      document.querySelectorAll('.cover-btn').forEach(b => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      
      renderBoard();
    });
  });

  flatpickr('#modal-card-date', {
    locale: Portuguese,
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: true
  });

  quillCommentInstance = new Quill('#new-comment-text', {
    theme: 'snow',
    placeholder: 'Adicione um comentário ou nota...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'strike'],
        ['image']
      ]
    }
  });

  quillInstance = new Quill('#modal-card-desc', {
    theme: 'snow',
    placeholder: 'Adicione uma descrição mais detalhada...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'strike'],
        ['code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['image']
      ]
    }
  });

  document.getElementById('btn-add-link')?.addEventListener('click', async () => {
    if (!currentOpenedCard) return;
    const aliasInput = document.getElementById('new-link-alias') as HTMLInputElement;
    const urlInput = document.getElementById('new-link-url') as HTMLInputElement;
    const alias = aliasInput.value.trim();
    let url = urlInput.value.trim();
    if (!alias || !url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!currentOpenedCard.customFields.links) {
      currentOpenedCard.customFields.links = [];
    }
    
    currentOpenedCard.customFields.links.push({ id: uuidv4(), alias, url });
    await cardRepo.update(currentOpenedCard);
    
    aliasInput.value = '';
    urlInput.value = '';
    renderLinks();
    renderBoard();
  });

  document.getElementById('btn-add-comment')?.addEventListener('click', async () => {
    if (!currentOpenedCard) return;
    const text = quillCommentInstance.root.innerHTML;
    const plainText = quillCommentInstance.getText().trim();
    if (!plainText && !text.includes('<img')) return;
    
    if (!currentOpenedCard.customFields.commentsList) {
      currentOpenedCard.customFields.commentsList = [];
    }
    
    currentOpenedCard.customFields.commentsList.push({ id: uuidv4(), text, createdAt: Date.now() });
    await cardRepo.update(currentOpenedCard);
    
    quillCommentInstance.setContents([]);
    renderComments();
  });
}

async function renderModalLabels() {
  if (!currentOpenedCard || !currentBoardId) return;
  const board = await boardRepo.get(currentBoardId);
  const boardLabels = board?.labels || [];
  const activeLabels = currentOpenedCard.customFields.labels || [];
  
  const container = document.getElementById('modal-labels-container');
  if (!container) return;

  if (boardLabels.length === 0) {
    container.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">Nenhuma etiqueta no board.</span>';
    return;
  }

  let html = '';
  boardLabels.forEach(lbl => {
    const isActive = activeLabels.some((activeLbl: any) => activeLbl.id === lbl.id || activeLbl === lbl.color);
    html += `
      <div style="display:flex; align-items:center; gap:4px; width:100%;">
        <button class="label-badge-btn" data-id="${lbl.id}" title="${lbl.name}" style="flex:1; display:flex; align-items:center; gap:4px; padding:4px 8px; border-radius:4px; border:${isActive ? '2px solid white' : '1px solid transparent'}; background:${lbl.color}; color:#fff; cursor:pointer; opacity:${isActive ? '1' : '0.5'};">
          <i class="ph ${lbl.icon}"></i> <span style="font-size:11px;">${lbl.name}</span>
        </button>
        <button class="btn-icon edit-label-btn" data-id="${lbl.id}" style="padding:4px; font-size:12px;" title="Editar"><i class="ph ph-pencil"></i></button>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.label-badge-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!currentOpenedCard) return;
      const lblId = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const lblObj = boardLabels.find(l => l.id === lblId);
      if (!lblObj) return;

      if (!currentOpenedCard.customFields.labels) currentOpenedCard.customFields.labels = [];
      const isAlreadyActive = currentOpenedCard.customFields.labels.some((l:any) => l.id === lblId);
      
      if (isAlreadyActive) {
        currentOpenedCard.customFields.labels = currentOpenedCard.customFields.labels.filter((l:any) => l.id !== lblId);
      } else {
        currentOpenedCard.customFields.labels.push(lblObj);
      }
      renderModalLabels();
    });
  });

  container.querySelectorAll('.edit-label-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lblId = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const lblObj = boardLabels.find(l => l.id === lblId);
      if (!lblObj) return;

      const nameInput = document.getElementById('new-label-name') as HTMLInputElement;
      const colorInput = document.getElementById('new-label-color') as HTMLInputElement;
      
      nameInput.value = lblObj.name;
      colorInput.value = lblObj.color;
      
      document.querySelectorAll('.icon-choice').forEach(i => i.classList.remove('active'));
      const iconChoice = document.querySelector(`.icon-choice[data-icon="${lblObj.icon}"]`);
      if (iconChoice) iconChoice.classList.add('active');

      document.getElementById('label-creator-section')!.style.display = 'block';
      document.getElementById('btn-create-label')!.style.display = 'none';
      document.getElementById('btn-delete-label')!.style.display = 'inline-block';
      
      document.getElementById('btn-save-label')!.dataset.editingId = lblId || '';
    });
  });
}

async function openCardModal(cardId: string) {
  const card = await cardRepo.get(cardId);
  if (!card) return;
  currentOpenedCard = card;

  (document.getElementById('modal-card-title') as HTMLInputElement).value = card.title;
  quillInstance.root.innerHTML = card.description || '';
  
  const dateInput = document.getElementById('modal-card-date') as any;
  if (card.dueDate) {
    const d = new Date(card.dueDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (dateInput._flatpickr) {
      dateInput._flatpickr.setDate(`${yyyy}-${mm}-${dd}`);
    } else {
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  } else {
    if (dateInput._flatpickr) {
      dateInput._flatpickr.clear();
    } else {
      dateInput.value = '';
    }
  }

  document.querySelectorAll('.cover-btn').forEach(btn => {
    btn.classList.remove('active');
    const bg = btn.getAttribute('data-bg');
    if (!card.cover?.color && bg === 'transparent') {
      btn.classList.add('active');
    } else if (card.cover?.color === bg) {
      btn.classList.add('active');
    }
  });

  renderChecklist();
  renderLinks();
  renderComments();
  document.getElementById('card-modal')?.classList.add('active');
}

function renderLinks() {
  const container = document.getElementById('modal-links-container');
  if (!container || !currentOpenedCard) return;

  const links = currentOpenedCard.customFields.links || [];
  
  let html = '';
  links.forEach((link: any, index: number) => {
    html += `
      <div class="checklist-item" style="justify-content: space-between;">
        <a href="${link.url}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-size: 14px; font-weight: 500; display:flex; align-items:center; gap:8px;"><i class="ph ph-link"></i> ${link.alias}</a>
        <button class="link-delete btn-icon" data-index="${index}" style="padding:4px;"><i class="ph ph-trash" style="color: var(--text-muted);"></i></button>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.link-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-index'));
      if (currentOpenedCard && currentOpenedCard.customFields.links) {
        currentOpenedCard.customFields.links.splice(idx, 1);
        await cardRepo.update(currentOpenedCard);
        renderLinks();
        renderBoard();
      }
    });
  });
}

function renderComments() {
  const container = document.getElementById('modal-comments-list');
  if (!container || !currentOpenedCard) return;

  const comments = currentOpenedCard.customFields.commentsList || [];
  
  let html = '';
  comments.forEach((comment: any, index: number) => {
    const dateStr = new Date(comment.createdAt).toLocaleString();
    html += `
      <div class="comment-item" style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); position: relative;">
        <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">${dateStr}</div>
        <div class="ql-editor" style="font-size: 13px; color: var(--text-primary); word-break: break-word; padding: 0; min-height: auto;">${comment.text}</div>
        <div style="display:flex; gap: 4px; margin-top: 8px; justify-content: flex-end;">
          <button class="comment-edit btn-icon" data-index="${index}" style="padding:4px; font-size:12px;"><i class="ph ph-pencil"></i></button>
          <button class="comment-delete btn-icon" data-index="${index}" style="padding:4px; font-size:12px;"><i class="ph ph-trash" style="color: var(--text-muted);"></i></button>
        </div>
      </div>
    `;
  });
  
  if (comments.length === 0) {
    html = `<div style="color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 20px;">Nenhum comentário ainda.</div>`;
  }
  
  container.innerHTML = html;

  container.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm("Deletar este comentário?")) return;
      const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-index'));
      if (currentOpenedCard && currentOpenedCard.customFields.commentsList) {
        currentOpenedCard.customFields.commentsList.splice(idx, 1);
        await cardRepo.update(currentOpenedCard);
        renderComments();
      }
    });
  });

  container.querySelectorAll('.comment-edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-index'));
      if (currentOpenedCard && currentOpenedCard.customFields.commentsList) {
        const comment = currentOpenedCard.customFields.commentsList[idx];
        quillCommentInstance.clipboard.dangerouslyPasteHTML(comment.text);
        
        // Remove from list so user can re-save it
        currentOpenedCard.customFields.commentsList.splice(idx, 1);
        await cardRepo.update(currentOpenedCard);
        renderComments();
      }
    });
  });
}

function renderChecklist() {
  const container = document.getElementById('modal-checklist-container');
  if (!container || !currentOpenedCard) return;

  const tasks = currentOpenedCard.customFields.tasks || [];
  
  let html = '';
  tasks.forEach((task: any, index: number) => {
    html += `
      <div class="checklist-item">
        <input type="checkbox" class="checklist-checkbox" data-index="${index}" ${task.done ? 'checked' : ''} />
        <span class="checklist-title ${task.done ? 'done' : ''}">${task.title}</span>
        <button class="checklist-delete" data-index="${index}"><i class="ph ph-trash"></i></button>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.checklist-checkbox').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const idx = Number((e.target as HTMLElement).getAttribute('data-index'));
      const isChecked = (e.target as HTMLInputElement).checked;
      if (currentOpenedCard && currentOpenedCard.customFields.tasks) {
        currentOpenedCard.customFields.tasks[idx].done = isChecked;
        await cardRepo.update(currentOpenedCard);
        renderChecklist();
      }
    });
  });

  container.querySelectorAll('.checklist-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-index'));
      if (currentOpenedCard && currentOpenedCard.customFields.tasks) {
        currentOpenedCard.customFields.tasks.splice(idx, 1);
        await cardRepo.update(currentOpenedCard);
        renderChecklist();
      }
    });
  });
}

async function handleAddTask() {
  if (!currentOpenedCard) return;
  const title = prompt("Digite o item do checklist:");
  if (!title || title.trim() === '') return;

  if (!currentOpenedCard.customFields.tasks) {
    currentOpenedCard.customFields.tasks = [];
  }
  
  currentOpenedCard.customFields.tasks.push({ id: uuidv4(), title: title.trim(), done: false });
  await cardRepo.update(currentOpenedCard);
  renderChecklist();
}

function closeCardModal() {
  document.getElementById('card-modal')?.classList.remove('active');
  currentOpenedCard = null;
}

async function saveCardModal() {
  if (!currentOpenedCard) return;
  const newTitle = (document.getElementById('modal-card-title') as HTMLInputElement).value;
  const newDesc = quillInstance.root.innerHTML;
  const newDate = (document.getElementById('modal-card-date') as HTMLInputElement).value;

  currentOpenedCard.title = newTitle;
  currentOpenedCard.description = newDesc;
  
  if (newDate) {
    // Forçar parse considerando a zona local para não virar o dia anterior.
    const [yyyy, mm, dd] = newDate.split('-').map(Number);
    currentOpenedCard.dueDate = new Date(yyyy, mm - 1, dd).getTime();
  } else {
    currentOpenedCard.dueDate = null;
  }

  currentOpenedCard.updatedAt = Date.now();

  await cardRepo.update(currentOpenedCard);
  closeCardModal();
  await renderBoard();
}

async function handleAddCard(listId: string) {
  const title = prompt("Digite o título do novo card:");
  if (!title || title.trim() === '') return;

  const now = Date.now();
  const allCards = await cardRepo.getAll();
  const listCards = allCards.filter(c => c.listId === listId);
  const nextPos = listCards.length > 0 ? Math.max(...listCards.map(c => c.position)) + 1 : 0;

  await cardRepo.create({
    id: uuidv4(),
    boardId: currentBoardId!,
    listId: listId,
    title: title.trim(),
    description: '',
    position: nextPos,
    members: [],
    labels: [],
    startDate: null,
    dueDate: null,
    dueTime: null,
    completed: false,
    cover: {},
    checklists: [],
    attachments: [],
    customFields: { tasks: [] },
    comments: [],
    watchers: [],
    dependencies: [],
    location: null,
    archived: false,
    createdAt: now,
    updatedAt: now
  });

  await renderBoard();
}

function setupKanbanEvents() {
  const cards = document.querySelectorAll('.kanban-card');
  const containers = document.querySelectorAll('.list-cards-container');
  const addBtns = document.querySelectorAll('.add-card-btn');

  addBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const listId = (e.currentTarget as HTMLElement).getAttribute('data-list-id');
      if (listId) handleAddCard(listId);
    });
  });

  document.querySelectorAll('.card-complete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cardId = (e.currentTarget as HTMLElement).getAttribute('data-card-id');
      if (!cardId) return;
      const dbCard = await cardRepo.get(cardId);
      if (dbCard) {
        dbCard.completed = !dbCard.completed;
        await cardRepo.update(dbCard);
        renderBoard();
      }
    });
  });

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('dragging')) return;
      const cardId = card.getAttribute('data-card-id');
      if (cardId) openCardModal(cardId);
    });

    card.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      card.classList.add('dragging');
      (card as HTMLElement).style.opacity = '0.5';
    });

    card.addEventListener('dragend', async () => {
      card.classList.remove('dragging');
      (card as HTMLElement).style.opacity = '1';

      const cardElement = card as HTMLElement;
      const cardId = cardElement.getAttribute('data-card-id');
      const container = cardElement.closest('.list-cards-container');
      if (!cardId || !container) return;

      const newListId = container.getAttribute('data-list-id');
      if (!newListId) return;

      const allCardNodes = [...container.querySelectorAll('.kanban-card')];
      const newIndex = allCardNodes.indexOf(cardElement);

      const dbCard = await cardRepo.get(cardId);
      if (dbCard) {
        const oldListId = dbCard.listId;
        dbCard.listId = newListId;
        dbCard.position = newIndex;
        await cardRepo.update(dbCard);
        
        const allCardsInDb = await cardRepo.getAll();
        const listCardsInDb = allCardsInDb.filter(c => c.listId === newListId && c.id !== cardId).sort((a,b) => a.position - b.position);
        
        for (let i = 0; i < allCardNodes.length; i++) {
          const id = allCardNodes[i].getAttribute('data-card-id');
          if (id === cardId) continue;
          const matchingDbCard = listCardsInDb.find(c => c.id === id);
          if (matchingDbCard) {
            matchingDbCard.position = i;
            await cardRepo.update(matchingDbCard);
          }
        }

        // Emitir evento para o motor de automação
        eventBus.publish('CARD_MOVED', { cardId, newListId, oldListId });
      }
    });
  });

  containers.forEach(container => {
    container.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container as HTMLElement, (e as DragEvent).clientY);
      const draggable = document.querySelector('.dragging');
      if (draggable) {
        if (afterElement == null) {
          container.appendChild(draggable);
        } else {
          container.insertBefore(draggable, afterElement);
        }
      }
    });
  });

  const listsContainers = document.querySelectorAll('.kanban-list');
  const boardContainer = document.getElementById('board-container');

  listsContainers.forEach(listEl => {
    listEl.addEventListener('dragstart', (e) => {
      if (e.target !== listEl) return;
      e.stopPropagation();
      listEl.classList.add('dragging-list');
      (listEl as HTMLElement).style.opacity = '0.5';
    });

    listEl.addEventListener('dragend', async (e) => {
      if (e.target !== listEl) return;
      e.stopPropagation();
      listEl.classList.remove('dragging-list');
      (listEl as HTMLElement).style.opacity = '1';

      if (!boardContainer) return;

      const allListNodes = [...boardContainer.querySelectorAll('.kanban-list')];
      const listId = (listEl as HTMLElement).getAttribute('data-list-id');
      if (!listId) return;

      const newIndex = allListNodes.indexOf(listEl as HTMLElement);
      const dbList = await listRepo.get(listId);
      if (dbList) {
        dbList.position = newIndex;
        await listRepo.update(dbList);

        const allListsInDb = await listRepo.getAll();
        const boardListsInDb = allListsInDb.filter(l => l.boardId === currentBoardId && l.id !== listId).sort((a,b) => a.position - b.position);

        for (let i = 0; i < allListNodes.length; i++) {
          const id = allListNodes[i].getAttribute('data-list-id');
          if (id === listId) continue;
          const matchingDbList = boardListsInDb.find(l => l.id === id);
          if (matchingDbList) {
            matchingDbList.position = i;
            await listRepo.update(matchingDbList);
          }
        }
      }
    });
  });

  if (boardContainer) {
    boardContainer.addEventListener('dragover', e => {
      const draggableList = document.querySelector('.dragging-list');
      if (!draggableList) return;
      e.preventDefault();
      
      const afterElement = getDragAfterListElement(boardContainer, (e as DragEvent).clientX);
      const btnAddList = document.getElementById('btn-add-new-list');
      
      if (afterElement == null) {
        if (btnAddList) boardContainer.insertBefore(draggableList, btnAddList);
        else boardContainer.appendChild(draggableList);
      } else {
        boardContainer.insertBefore(draggableList, afterElement);
      }
    });
  }

  document.getElementById('btn-add-new-list')?.addEventListener('click', async () => {
    const name = prompt("Nome da nova Lista:");
    if (!name || name.trim() === '') return;
    const allLists = await listRepo.getAll();
    const boardLists = allLists.filter(l => l.boardId === currentBoardId);
    const nextPos = boardLists.length > 0 ? Math.max(...boardLists.map(l => l.position)) + 1 : 0;
    
    await listRepo.create({
      id: uuidv4(),
      boardId: currentBoardId!,
      name: name.trim(),
      position: nextPos,
      color: '#3b82f6',
      collapsed: false,
      archived: false
    });
    renderBoard();
  });

  document.querySelectorAll('.edit-list-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-list-id');
      if (!id) return;
      const list = await listRepo.get(id);
      if (!list) return;
      const newName = prompt("Renomear Lista:", list.name);
      if (newName && newName.trim() !== '') {
        list.name = newName.trim();
        await listRepo.update(list);
        renderBoard();
      }
    });
  });

  document.querySelectorAll('.list-color-picker').forEach(picker => {
    picker.addEventListener('change', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-list-id');
      const newColor = (e.currentTarget as HTMLInputElement).value;
      if (!id) return;
      const list = await listRepo.get(id);
      if (list) {
        list.color = newColor;
        await listRepo.update(list);
        renderBoard();
      }
    });
  });
}

function getDragAfterElement(container: HTMLElement, y: number) {
  const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null as any }).element;
}

function getDragAfterListElement(container: HTMLElement, x: number) {
  const draggableElements = [...container.querySelectorAll('.kanban-list:not(.dragging-list)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY, element: null as any }).element;
}

async function handleExportData() {
  try {
    const boards = await boardRepo.getAll();
    const lists = await listRepo.getAll();
    const cards = await cardRepo.getAll();
    
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      boards,
      lists,
      cards
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `localflow_backup_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export error:", err);
    alert("Erro ao exportar dados.");
  }
}

async function handleImportData(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const text = evt.target?.result as string;
      const data = JSON.parse(text);

      if (!data.boards || !data.lists || !data.cards) {
        throw new Error("Arquivo JSON inválido para o LocalFlow.");
      }

      if (!confirm("Isso irá sobrescrever TODOS os dados atuais. Deseja continuar?")) {
        (e.target as HTMLInputElement).value = '';
        return;
      }

      // Limpar todos os dados e inserir novos (uma forma simples iterando ou recriando)
      // Como o indexedDB não tem método truncate nativo no repo, vamos apagar individualmente:
      const oldBoards = await boardRepo.getAll();
      for (const b of oldBoards) await boardRepo.delete(b.id);
      const oldLists = await listRepo.getAll();
      for (const l of oldLists) await listRepo.delete(l.id);
      const oldCards = await cardRepo.getAll();
      for (const c of oldCards) await cardRepo.delete(c.id);

      for (const b of data.boards) await boardRepo.create(b);
      for (const l of data.lists) await listRepo.create(l);
      for (const c of data.cards) await cardRepo.create(c);

      alert("Dados restaurados com sucesso! A página será recarregada.");
      window.location.reload();
    } catch (err: any) {
      console.error("Import error:", err);
      alert("Falha ao importar: " + err.message);
    }
    
    (e.target as HTMLInputElement).value = '';
  };
  reader.readAsText(file);
}

initApp();

