export interface CardLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  position: number;
  members: string[]; // array of member IDs
  labels: string[]; // array of label IDs
  startDate: number | null;
  dueDate: number | null;
  dueTime: string | null;
  completed: boolean;
  cover: {
    color?: string;
    image?: string;
    type?: 'half' | 'full';
  };
  checklists: string[]; // array of checklist IDs
  attachments: string[]; // array of attachment IDs
  customFields: Record<string, any>;
  comments: string[]; // array of comment IDs
  watchers: string[]; // array of watcher IDs
  dependencies: string[]; // array of dependency IDs
  location: CardLocation | null;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}
