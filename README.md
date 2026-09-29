# Postponer

* [Versão em Português](#versão-em-português)
* [English Version](#english-version)

---

## Versão em Português

O Postponer é uma aplicação de gerenciamento de tarefas focada na privacidade (offline-first e local-first), inspirada em ferramentas modernas de Kanban. Desenvolvida inteiramente com tecnologias web, ela garante total privacidade e performance imediata ao armazenar todos os dados localmente no navegador do usuário utilizando o IndexedDB.

### Funcionalidades Principais
- Arquitetura Offline-First: Totalmente funcional sem conexão com a internet. Os dados são persistidos de forma local.
- Interface Kanban: Capacidade de drag-and-drop (arrastar e soltar) para listas e cartões.
- Descrições em Rich Text: Editor Quill.js integrado para formatação avançada de texto nas tarefas e comentários.
- Subtarefas e Checklists: Acompanhamento granular de progresso dentro dos cartões.
- Sistema de Comentários: Linha do tempo interativa para notas e atualizações, com suporte a texto rico.
- Workspaces Personalizados: Suporte para múltiplos boards com sistema de favoritismo.
- Gerenciamento de Links: Módulo dedicado para anexar referências externas e links aos cartões.
- Customização Avançada: Gradientes e cores de capa personalizadas para cartões específicos.
- Progressive Web App (PWA): Instalável no desktop e dispositivos móveis para uma experiência nativa.

### Stack Tecnológico
- Ferramenta de Build: Vite
- Linguagem: TypeScript
- Gerenciamento de Estado: Event bus reativo customizado (EventBus.ts)
- Armazenamento: IndexedDB (via wrapper `idb`)
- Editor Rich Text: Quill.js
- Seleção de Data: Flatpickr
- Ícones: Phosphor Icons
- Estilização: Vanilla CSS (Custom properties, Flexbox, Grid)

### Guia de Instalação

#### Pré-requisitos
- Node.js (v18 ou superior recomendado)
- npm ou yarn

#### Instalação
1. Instale as dependências necessárias do projeto:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Para compilar a versão de produção:
   ```bash
   npm run build
   ```

### Estrutura do Projeto
- `/src`: Diretório principal do código-fonte.
  - `/app`: Lógica central da aplicação.
    - `/automation`: Processadores de tarefas em background.
    - `/events`: EventBus (Publish-Subscribe) centralizado para comunicação entre componentes.
    - `/state`: Gerenciamento do estado global da aplicação.
  - `/database`: Configuração do IndexedDB, esquemas e padrões de repositório para as entidades.
  - `/models`: Interfaces TypeScript para os modelos de domínio central (Card, List, Board, etc).
  - `main.ts`: Ponto de entrada da aplicação e inicialização do DOM.
  - `style.css`: Sistema de design global e regras de layout.
- `vite.config.ts`: Configuração do bundler Vite e do plugin PWA.

### Notas de Arquitetura

#### Persistência de Dados
A aplicação utiliza a API nativa IndexedDB do navegador. Todas as alterações de estado são enviadas para o banco de dados local antes de serem refletidas na interface de usuário (UI), garantindo tolerância a falhas e zero perda de dados em caso de recarregamentos inesperados.

#### Renderização Orientada a Eventos
A interface do usuário reage às alterações de estado por meio de um EventBus customizado. As operações disparam mutações de estado que, por sua vez, publicam eventos. Esse modelo desacopla a lógica de renderização e atualização visual da camada de manipulação de dados.

---

## English Version

Postponer is a privacy-focused (offline-first and local-first) task management application, inspired by modern Kanban tools. Built entirely with web technologies, it ensures total privacy and immediate performance by storing all data locally in the user's browser using IndexedDB.

### Core Features
- Offline-First Architecture: Fully functional without an internet connection. Data is persisted locally.
- Kanban Interface: Drag-and-drop capability for lists and cards.
- Rich Text Descriptions: Integrated Quill.js editor for advanced text formatting in tasks and comments.
- Subtasks & Checklists: Granular progress tracking within cards.
- Comment System: Interactive timeline for notes and updates, with rich text support.
- Custom Workspaces: Support for multiple boards with a favorites system.
- Link Management: Dedicated module for attaching external references and links to cards.
- Advanced Customization: Custom gradients and cover colors for specific cards.
- Progressive Web App (PWA): Installable on desktop and mobile devices for a native-like experience.

### Technical Stack
- Build Tool: Vite
- Language: TypeScript
- State Management: Custom reactive event bus (EventBus.ts)
- Storage: IndexedDB (via `idb` wrapper)
- Rich Text Editor: Quill.js
- Date Picker: Flatpickr
- Icons: Phosphor Icons
- Styling: Vanilla CSS (Custom properties, Flexbox, Grid)

### Getting Started

#### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

#### Installation
1. Install the required project dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. To compile the production version:
   ```bash
   npm run build
   ```

### Project Structure
- `/src`: Main source code directory.
  - `/app`: Core application logic.
    - `/automation`: Background task processors.
    - `/events`: Centralized EventBus (Publish-Subscribe) for component communication.
    - `/state`: Global application state management.
  - `/database`: IndexedDB configuration, schemas, and repository patterns for entities.
  - `/models`: TypeScript interfaces for core domain models (Card, List, Board, etc).
  - `main.ts`: Application entry point and DOM initialization.
  - `style.css`: Global design system and layout rules.
- `vite.config.ts`: Vite bundler and PWA plugin configuration.

### Architecture Notes

#### Data Persistence
The application uses the browser's native IndexedDB API. All state changes are committed to the local database before being reflected in the User Interface (UI), ensuring fault tolerance and zero data loss in the event of unexpected reloads.

#### Event-Driven Rendering
The user interface reacts to state changes through a custom EventBus. Operations trigger state mutations which in turn publish events. This pattern decouples rendering and visual update logic from the data manipulation layer.
