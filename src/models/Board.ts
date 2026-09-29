export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  background: string;
  backgroundType: 'color' | 'image' | 'gradient';
  visibility: 'private' | 'workspace' | 'public';
  starred: boolean;
  archived: boolean;
  template: boolean;
  labels?: Array<{ id: string, name: string, color: string, icon: string }>;
  createdAt: number;
  updatedAt: number;
}
