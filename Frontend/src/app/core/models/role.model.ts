export interface Permission {
  id?: string;
  name: string;
  description: string;
}

export interface Role {
  id?: string;
  name: string;
  description: string;
  permissions: Permission[];
}
