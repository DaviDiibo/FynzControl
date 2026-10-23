export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt?: string;
};

export type AuthResponse = {
  error: string | null;
};
