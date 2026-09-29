export interface WorkspaceSettings {
  [key: string]: any;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  settings: WorkspaceSettings;
}
