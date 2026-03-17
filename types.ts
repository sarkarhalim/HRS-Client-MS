
export enum ClientStatus {
  PROCESSING = 'Processing',
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded string
}

export interface Client {
  id: string;
  name: string;
  address: string;
  country: string;
  contact: string;
  email: string;
  reference: string;
  passportNumber: string;
  projectName?: string;
  agencyName: string;
  status: ClientStatus;
  payments: PaymentRecord[];
  documents: DocumentRecord[];
  createdAt: string;
}

export interface Disbursement {
  id: string;
  purpose: string;
  amount: number;
  date: string;
  sourceFund: string;
  modeOfPayment?: string;
  document?: DocumentRecord;
  createdAt: string;
}

export interface AgentPayment {
  id: string;
  agentName: string;
  projectName: string;
  amount: number;
  purpose: string;
  date: string;
  documents: DocumentRecord[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export type AuthMode = 'login' | 'signup' | 'authenticated';

export interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  totalPayment: number;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
