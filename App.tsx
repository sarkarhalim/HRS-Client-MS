
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import ClientForm from './components/ClientForm';
import ClientDetails from './components/ClientDetails';
import DisbursementTab from './components/DisbursementTab';
import AgentPaymentTab from './components/AgentPaymentTab';
import Settings from './components/Settings';
import Summary from './components/Summary';
import { StatusDistribution, RevenueChart } from './components/Charts';
import { Client, ClientStatus, AuthMode, User, Disbursement, DocumentRecord, AgentPayment } from './types';
import { generateSmartReport } from './services/geminiService';
import { supabase } from './lib/supabase';
import { NAVIGATION_ITEMS } from './constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StatCard: React.FC<{ label: string, value: string | number, icon: string, color: string, onClick?: () => void, isActive?: boolean }> = ({ label, value, icon, color, onClick, isActive }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border transition-all duration-300 transform ${isActive ? 'ring-2 ring-blue-500 border-blue-200 scale-[1.01]' : 'border-slate-100 hover:shadow-md hover:border-slate-300'} flex items-center gap-6 active:scale-95`}
  >
    <div className={`${color} w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl shadow-inner shrink-0`}>{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <h4 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 truncate tracking-tight">{value}</h4>
    </div>
    {isActive && <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>}
  </button>
);

const StatusBadge: React.FC<{ status: ClientStatus }> = ({ status }) => {
  const styles = {
    [ClientStatus.PROCESSING]: 'bg-blue-50 text-blue-700 border-blue-100',
    [ClientStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-100',
    [ClientStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    [ClientStatus.CANCELLED]: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border uppercase tracking-wider ${styles[status]}`}>{status}</span>;
};

const formatMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-xl md:text-2xl font-bold mt-8 mb-4 text-slate-900 border-l-4 border-blue-600 pl-4 tracking-tight">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold mt-10 mb-6 border-b-2 border-slate-100 pb-4 text-blue-900 tracking-tight">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl md:text-5xl font-bold mt-10 mb-8 text-slate-900 tracking-tight">$1</h1>')
    .replace(/^\* (.*$)/gim, '<li class="ml-8 list-disc text-sm md:text-base mb-3 font-medium text-slate-800">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950">$1</strong>')
    .replace(/\n/g, '<br />');
};

const App: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [appConfig, setAppConfig] = useState({
    agencyName: 'HRS Client MS',
    primaryColor: 'blue',
    showRevenueChart: true,
    enableAiInsights: true
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [clientViewMode, setClientViewMode] = useState<'overview' | 'directory' | 'projects'>('overview');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState<string | 'All'>('All');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [navHistory, setNavHistory] = useState<string[]>(['dashboard']);
  const [navIndex, setNavIndex] = useState(0);

  const [clients, setClients] = useState<Client[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [agentPayments, setAgentPayments] = useState<AgentPayment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [viewingClient, setViewingClient] = useState<Client | undefined>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'total-clients') {
    } else {
      setStatusFilter('All');
      setProjectFilter('All');
      setClientViewMode('overview');
    }
  }, [activeTab]);

  const navigateToTab = useCallback((tabId: string, isFromHistory = false) => {
    setActiveTab(tabId);
    if (!isFromHistory) {
      const newHistory = navHistory.slice(0, navIndex + 1);
      if (newHistory[newHistory.length - 1] !== tabId) {
        newHistory.push(tabId);
        setNavHistory(newHistory);
        setNavIndex(newHistory.length - 1);
      }
    }
  }, [navIndex, navHistory]);

  const goBack = useCallback(() => {
    if (navIndex > 0) {
      const prevTab = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      setActiveTab(prevTab);
    }
  }, [navIndex, navHistory]);

  const goForward = useCallback(() => {
    if (navIndex < navHistory.length - 1) {
      const nextTab = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      setActiveTab(nextTab);
    }
  }, [navIndex, navHistory]);

  const fetchData = async () => {
    setDbError(null);
    try {
      await Promise.all([fetchClients(), fetchDisbursements(), fetchAgentPayments()]);
    } catch (e: any) {
      console.error("Fetch error", e);
      if (e.message?.includes('Failed to fetch')) {
        setDbError('Cloud sync interrupted. Retrying in 5s...');
        setTimeout(fetchData, 5000);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser({ 
            id: session.user.id, 
            email: session.user.email!, 
            name: session.user.email!.split('@')[0] 
          });
          setAuthMode('authenticated');
        }
      } catch (e: any) {
        console.error("Session error", e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ 
          id: session.user.id, 
          email: session.user.email!, 
          name: session.user.email!.split('@')[0] 
        });
        setAuthMode('authenticated');
      } else {
        setUser(null);
        setAuthMode('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authMode === 'authenticated' && user) {
      fetchData();
    }
  }, [authMode, user]);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          payments (*),
          documents (id, name, type, size, client_id)
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      const mappedClients: Client[] = (clientsData || []).map(c => ({
        ...c,
        passportNumber: c.passport_number,
        projectName: c.project_name,
        agencyName: c.agency_name,
        totalFees: c.total_fees,
        createdAt: c.created_at,
        payments: c.payments || [],
        documents: c.documents || []
      }));

      setClients(mappedClients);
    } catch (err: any) {
      console.error('Error fetching clients:', err.message);
      throw err;
    }
  };

  const fetchDisbursements = async () => {
    try {
      const { data, error } = await supabase
        .from('disbursements')
        .select('id, purpose, amount, date, source_fund, mode_of_payment, created_at, doc_id:document->>id, doc_name:document->>name, doc_type:document->>type, doc_size:document->>size')
        .order('date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) return;
        throw error;
      }

      const mapped: Disbursement[] = (data || []).map(d => {
        let doc: any = undefined;
        if (d.doc_id) {
          doc = {
            id: d.doc_id,
            name: d.doc_name,
            type: d.doc_type,
            size: Number(d.doc_size)
          };
        }
        return {
          ...d,
          id: d.id,
          purpose: d.purpose,
          amount: Number(d.amount),
          date: d.date,
          sourceFund: d.source_fund,
          modeOfPayment: d.mode_of_payment,
          document: doc,
          createdAt: d.created_at
        };
      });
      setDisbursements(mapped);
    } catch (err: any) {
      console.error('Error fetching disbursements:', err.message);
      throw err;
    }
  };

  const fetchAgentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_payments')
        .select('id, agent_name, project_name, description, amount, date, user_id, created_at, document_data')
        .order('date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) return;
        throw error;
      }

      const mapped: AgentPayment[] = (data || []).map(d => {
        let parsedDocuments: any[] = [];
        if (d.document_data) {
          try {
            const parsed = typeof d.document_data === 'string' ? JSON.parse(d.document_data) : d.document_data;
            parsedDocuments = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Failed to parse document_data', e);
          }
        }
        return {
          ...d,
          id: d.id,
          agentName: d.agent_name,
          projectName: d.project_name || '',
          purpose: d.description,
          amount: Number(d.amount),
          date: d.date,
          documents: parsedDocuments,
          createdAt: d.created_at
        };
      });
      setAgentPayments(mapped);
    } catch (err: any) {
      console.error('Error fetching agent payments:', err.message);
      // Don't throw to prevent crashing if table doesn't exist yet
    }
  };

  const stats = useMemo(() => {
    const allPayments = clients.flatMap(c => c.payments || []);
    return {
      total: clients.length,
      pending: clients.filter(c => c.status === ClientStatus.PENDING).length,
      processing: clients.filter(c => c.status === ClientStatus.PROCESSING).length,
      completed: clients.filter(c => c.status === ClientStatus.COMPLETED).length,
      cancelled: clients.filter(c => c.status === ClientStatus.CANCELLED).length,
      active: clients.filter(c => c.status === ClientStatus.PROCESSING || c.status === ClientStatus.PENDING).length,
      totalPayment: allPayments.reduce((sum, p) => sum + p.amount, 0),
      allPaymentsSorted: [...allPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [clients]);

  const handleAuthSubmit = async () => {
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Please provide both email and password.');
      return;
    }
    setIsAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        if (data.session) setAuthMode('authenticated');
        else setAuthError('Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthMode('login');
  };

  const handleSaveClient = async (data: Partial<Client>) => {
    if (!user) return;
    const dbClient: any = {
      name: data.name,
      email: data.email,
      contact: data.contact,
      address: data.address,
      country: data.country,
      reference: data.reference,
      passport_number: data.passportNumber,
      project_name: data.projectName,
      agency_name: data.agencyName,
      status: data.status,
      total_fees: data.totalFees,
      user_id: user.id
    };

    // Remove project_name or total_fees if it's causing issues (temporary safety)
    // In a real app, we'd want the DB to match the code, but this prevents a hard crash
    // if the user hasn't run the SQL yet.
    try {
      let clientId = data.id;
      let savedData;
      
      const safeExecute = async (operation: 'insert' | 'update', clientData: any, id?: string) => {
        let currentData = { ...clientData };
        let result, error;
        
        while (true) {
          if (operation === 'update') {
            ({ data: result, error } = await supabase.from('clients').update(currentData).eq('id', id).select().single());
          } else {
            ({ data: result, error } = await supabase.from('clients').insert(currentData).select().single());
          }
          
          if (error) {
            if (error.message.includes('project_name')) {
              delete currentData.project_name;
              setDbError("Database: 'project_name' column missing. Please run the SQL fix.");
              continue;
            } else if (error.message.includes('total_fees')) {
              delete currentData.total_fees;
              setDbError("Database: 'total_fees' column missing. Please run the SQL fix.");
              continue;
            }
            throw error;
          }
          return result;
        }
      };

      // 1. Save main client record
      if (clientId) {
        savedData = await safeExecute('update', dbClient, clientId);
      } else {
        savedData = await safeExecute('insert', dbClient);
      }
      
      clientId = savedData.id;
      if (!clientId) throw new Error("Critical synchronization error. Please try again.");

      // 2. Parallel updates for speed, but surgical for documents
      const paymentOps = async () => {
        await supabase.from('payments').delete().eq('client_id', clientId);
        if (data.payments?.length) {
          const { error } = await supabase.from('payments').insert(data.payments.map(p => ({ 
            client_id: clientId, 
            amount: p.amount, 
            date: p.date, 
            note: p.note 
          })));
          if (error) throw error;
        }
      };

      const documentOps = async () => {
        // Fetch current document metadata to decide what to delete
        const { data: currentDocs } = await supabase.from('documents').select('id').eq('client_id', clientId);
        const currentIds = (currentDocs || []).map(d => d.id);
        const newIds = (data.documents || []).map(d => d.id);
        
        // Delete documents that are no longer in the form list
        const toDelete = currentIds.filter(id => !newIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('documents').delete().in('id', toDelete);
        }

        // Only insert documents that are actually NEW (have Base64 data)
        const toInsert = (data.documents || []).filter(d => d.data && d.data.startsWith('data:'));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('documents').insert(toInsert.map(d => ({ 
            client_id: clientId, 
            name: d.name, 
            type: d.type, 
            size: d.size, 
            data: d.data 
          })));
          if (error) throw error;
        }
      };

      await Promise.all([paymentOps(), documentOps()]);
      
      // Fetch only the updated client to avoid downloading the entire database
      const { data: updatedClientData, error: fetchError } = await supabase
        .from('clients')
        .select(`
          *,
          payments (*),
          documents (id, name, type, size, client_id)
        `)
        .eq('id', clientId)
        .single();

      if (!fetchError && updatedClientData) {
        const mappedClient: Client = {
          ...updatedClientData,
          passportNumber: updatedClientData.passport_number,
          projectName: updatedClientData.project_name,
          agencyName: updatedClientData.agency_name,
          totalFees: updatedClientData.total_fees,
          createdAt: updatedClientData.created_at,
          payments: updatedClientData.payments || [],
          documents: updatedClientData.documents || []
        };
        
        setClients(prev => {
          const index = prev.findIndex(c => c.id === clientId);
          if (index >= 0) {
            const newList = [...prev];
            newList[index] = mappedClient;
            return newList;
          } else {
            return [mappedClient, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
        });
      } else {
        await fetchClients(); // Fallback
      }
      
      setIsFormOpen(false);
      setEditingClient(undefined);
    } catch (err: any) {
      console.error("Save client failure:", err);
      setDbError(`Critical Update Error: ${err.message}`);
    }
  };

  const handleSaveDisbursement = async (data: Partial<Disbursement>) => {
    if (!user) return;
    const dbDisbursement: any = {
      purpose: data.purpose,
      amount: data.amount,
      date: data.date,
      source_fund: data.sourceFund,
      mode_of_payment: data.modeOfPayment,
      user_id: user.id
    };

    // Only include document if it's new (has data)
    if (data.document && data.document.data && data.document.data.startsWith('data:')) {
      dbDisbursement.document = data.document;
    }

    try {
      let savedId = data.id;
      if (data.id) {
        const { error } = await supabase.from('disbursements').update(dbDisbursement).eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('disbursements').insert(dbDisbursement).select('id').single();
        if (error) throw error;
        savedId = inserted.id;
      }
      
      const { data: newDisbursement, error: fetchError } = await supabase
        .from('disbursements')
        .select('id, purpose, amount, date, source_fund, mode_of_payment, created_at, doc_id:document->>id, doc_name:document->>name, doc_type:document->>type, doc_size:document->>size')
        .eq('id', savedId)
        .single();
        
      if (!fetchError && newDisbursement) {
        const mapped: Disbursement = {
          id: newDisbursement.id,
          purpose: newDisbursement.purpose,
          amount: Number(newDisbursement.amount),
          date: newDisbursement.date,
          sourceFund: newDisbursement.source_fund,
          modeOfPayment: newDisbursement.mode_of_payment,
          createdAt: newDisbursement.created_at,
          document: newDisbursement.doc_id ? {
            id: newDisbursement.doc_id,
            name: newDisbursement.doc_name,
            type: newDisbursement.doc_type,
            size: Number(newDisbursement.doc_size),
            data: ''
          } : undefined
        };
        setDisbursements(prev => {
          const index = prev.findIndex(d => d.id === savedId);
          if (index >= 0) {
            const newList = [...prev];
            newList[index] = mapped;
            return newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          } else {
            return [mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
        });
      } else {
        await fetchDisbursements();
      }
    } catch (err: any) {
      console.error("Disbursement save error", err);
      setDbError(`Failed to save disbursement: ${err.message}`);
    }
  };

  const handleDeleteDisbursement = async (id: string) => {
    try {
      const { error } = await supabase.from('disbursements').delete().eq('id', id);
      if (error) throw error;
      setDisbursements(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      setDbError(`Deletion Error: ${err.message}`);
    }
  };

  const handleSaveAgentPayment = async (data: Partial<AgentPayment>) => {
    if (!user) return;
    const dbAgentPayment: any = {
      agent_name: data.agentName,
      project_name: data.projectName || '',
      description: data.purpose,
      amount: data.amount,
      date: data.date,
      user_id: user.id
    };

    if (data.documents && data.documents.length > 0) {
      dbAgentPayment.document_data = JSON.stringify(data.documents);
    } else {
      dbAgentPayment.document_data = null;
    }

    try {
      let savedId = data.id;
      if (data.id) {
        const { error } = await supabase.from('agent_payments').update(dbAgentPayment).eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('agent_payments').insert(dbAgentPayment).select('id').single();
        if (error) throw error;
        savedId = inserted.id;
      }
      
      const { data: newPayment, error: fetchError } = await supabase
        .from('agent_payments')
        .select('id, agent_name, project_name, description, amount, date, user_id, created_at, document_data')
        .eq('id', savedId)
        .single();

      if (!fetchError && newPayment) {
        let parsedDocuments = [];
        if (newPayment.document_data) {
          try {
            const parsed = typeof newPayment.document_data === 'string' ? JSON.parse(newPayment.document_data) : newPayment.document_data;
            parsedDocuments = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error("Failed to parse document data", e);
          }
        }
        const mapped: AgentPayment = {
          id: newPayment.id,
          agentName: newPayment.agent_name,
          projectName: newPayment.project_name || '',
          purpose: newPayment.description,
          amount: Number(newPayment.amount),
          date: newPayment.date,
          documents: parsedDocuments,
          createdAt: newPayment.created_at
        };
        setAgentPayments(prev => {
          const index = prev.findIndex(p => p.id === savedId);
          if (index >= 0) {
            const newList = [...prev];
            newList[index] = mapped;
            return newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          } else {
            return [mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
        });
      } else {
        await fetchAgentPayments();
      }
    } catch (err: any) {
      console.error("Agent payment save error", err);
      setDbError(`Failed to save agent payment: ${err.message}`);
    }
  };

  const handleDeleteAgentPayment = async (id: string) => {
    try {
      const { error } = await supabase.from('agent_payments').delete().eq('id', id);
      if (error) throw error;
      setAgentPayments(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setDbError(`Deletion Error: ${err.message}`);
    }
  };

  const filteredClients = useMemo(() => {
    let list = [...clients];
    if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
    if (projectFilter !== 'All') list = list.filter(c => c.projectName === projectFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        (c.agencyName || '').toLowerCase().includes(q) ||
        (c.projectName || '').toLowerCase().includes(q) ||
        (c.reference || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, statusFilter, projectFilter, searchQuery]);

  const projects = useMemo(() => {
    const projectNames = Array.from(new Set(clients.map(c => c.projectName).filter(Boolean)));
    return projectNames.sort();
  }, [clients]);

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const q = projectSearchQuery.toLowerCase();
    return projects.filter(p => p!.toLowerCase().includes(q));
  }, [projects, projectSearchQuery]);

  const overviewList = useMemo(() => filteredClients.slice(0, 15), [filteredClients]);
  const dashboardList = useMemo(() => clients.slice(0, 6), [clients]);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-content-preview') || document.getElementById('report-content');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AI_Strategic_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      setDbError("Failed to generate PDF. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Portal Booting...</p>
        </div>
      </div>
    );
  }

  if (authMode !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-800">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center tracking-tight uppercase">{appConfig.agencyName}</h1>
          <p className="text-slate-500 text-center mb-10 font-semibold uppercase tracking-wider text-[10px]">Administrative Access Portal</p>
          {authError && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl mb-6 font-bold uppercase tracking-wider">{authError}</div>}
          <div className="space-y-4">
            <input type="email" placeholder="ADMIN EMAIL" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-semibold" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            <input type="password" placeholder="SECURE PASSWORD" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-semibold" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
            <button onClick={handleAuthSubmit} disabled={isAuthLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black shadow-xl active:scale-95 transition-all">
              {isAuthLoading ? 'Authenticating...' : authMode === 'login' ? 'Secure Login' : 'Register Identity'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors pt-4">
              {authMode === 'login' ? "Request Admin Credentials" : "Return to Log-in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={navigateToTab} user={user!} onLogout={handleLogout} agencyName={appConfig.agencyName}
      onBack={goBack} onForward={goForward} canGoBack={navIndex > 0} canGoForward={navIndex < navHistory.length - 1}
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <StatCard label="Total Registry" value={stats.total} icon="👥" color="bg-blue-600" onClick={() => navigateToTab('total-clients')} />
            <StatCard label="In-Process Cases" value={stats.active} icon="⚙️" color="bg-amber-500" onClick={() => { navigateToTab('total-clients'); setStatusFilter(ClientStatus.PROCESSING); setClientViewMode('directory'); }} />
            <StatCard label="Success Ratio" value={`${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%`} icon="📈" color="bg-emerald-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-500 uppercase tracking-widest text-[10px] mb-8">Status Pipeline</h3>
              <div className="h-[320px]"><StatusDistribution clients={clients} /></div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Most Recent Files</h3>
                  <button onClick={() => navigateToTab('total-clients')} className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:underline">Full Directory ❯</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <tbody className="divide-y divide-slate-50">
                     {dashboardList.map(c => (
                       <tr key={c.id} className="hover:bg-slate-50 transition-all group">
                         <td className="px-8 py-5 font-bold text-slate-900 text-base">{c.name}</td>
                         <td className="px-8 py-5 font-mono text-xs text-slate-500 uppercase">{c.passportNumber}</td>
                         <td className="px-8 py-5"><StatusBadge status={c.status} /></td>
                         <td className="px-8 py-5 text-right">
                            <button onClick={() => setViewingClient(c)} className="p-3 text-slate-400 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100">👁️</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'total-clients') && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-slate-200 p-1.5 rounded-2xl w-fit">
              <button onClick={() => { setClientViewMode('overview'); setProjectFilter('All'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientViewMode === 'overview' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600'}`}>Metrics</button>
              <button onClick={() => { setClientViewMode('directory'); setProjectFilter('All'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientViewMode === 'directory' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600'}`}>Directory</button>
              <button onClick={() => setClientViewMode('projects')} className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${clientViewMode === 'projects' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600'}`}>All Projects</button>
            </div>
            
            <div className="relative flex-1 max-w-md w-full">
              <input 
                type="text" 
                placeholder="Search clients by Name, Passport, Project, Email, Phone..." 
                value={searchQuery} 
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && clientViewMode !== 'directory') {
                    setClientViewMode('directory');
                  }
                }} 
                className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-950 font-semibold text-sm transition-all shadow-sm" 
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          {clientViewMode === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900 p-8 rounded-[2rem] text-white relative overflow-hidden group shadow-xl">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Registry Actions</h3>
                  <h2 className="text-2xl font-bold mb-6 tracking-tight">Database Management</h2>
                  <button onClick={() => { setEditingClient(undefined); setIsFormOpen(true); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">+ Add New Record</button>
                </div>
                <div className="space-y-3">
                  <StatCard label="All Clients" value={stats.total} icon="📂" color="bg-slate-800" isActive={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
                  <StatCard label="Processing" value={stats.processing} icon="⚙️" color="bg-blue-500" isActive={statusFilter === ClientStatus.PROCESSING} onClick={() => setStatusFilter(ClientStatus.PROCESSING)} />
                  <StatCard label="Pending Review" value={stats.pending} icon="⏳" color="bg-amber-500" isActive={statusFilter === ClientStatus.PENDING} onClick={() => setStatusFilter(ClientStatus.PENDING)} />
                  <StatCard label="Completed" value={stats.completed} icon="✅" color="bg-emerald-600" isActive={statusFilter === ClientStatus.COMPLETED} onClick={() => setStatusFilter(ClientStatus.COMPLETED)} />
                  <StatCard label="Cancelled" value={stats.cancelled} icon="🚫" color="bg-rose-500" isActive={statusFilter === ClientStatus.CANCELLED} onClick={() => setStatusFilter(ClientStatus.CANCELLED)} />
                </div>
              </div>

              <div className="lg:col-span-8 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Real-time Directory</h3>
                  <button onClick={() => setClientViewMode('directory')} className="text-blue-600 text-[10px] font-bold uppercase tracking-widest">View All ❯</button>
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                  {overviewList.map(c => (
                    <div key={c.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-900">{c.name.charAt(0)}</div>
                        <div>
                           <h4 className="font-bold text-slate-950 text-sm tracking-tight">{c.name}</h4>
                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{c.passportNumber} • {c.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <StatusBadge status={c.status} />
                         <button onClick={() => setViewingClient(c)} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all">👁️</button>
                      </div>
                    </div>
                  ))}
                  {overviewList.length === 0 && (
                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">
                      No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} entries found
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : clientViewMode === 'projects' ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder="Search Projects..." 
                    value={projectSearchQuery} 
                    onChange={e => setProjectSearchQuery(e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-950 font-bold text-sm" 
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(projectName => {
                  const projectClients = clients.filter(c => c.projectName === projectName);
                  return (
                    <button 
                      key={projectName}
                      onClick={() => {
                        setProjectFilter(projectName!);
                        setClientViewMode('directory');
                      }}
                      className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">📁</div>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {projectClients.length} {projectClients.length === 1 ? 'Entry' : 'Entries'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{projectName}</h3>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Click to view all entries</p>
                    </button>
                  );
                })}
              </div>
              {filteredProjects.length === 0 && (
                <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic bg-white rounded-[2rem] border border-slate-200">
                  No projects found matching your search
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-end">
                {projectFilter !== 'All' && (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Project: {projectFilter}</span>
                    <button onClick={() => setProjectFilter('All')} className="font-semibold hover:text-blue-900">✕</button>
                  </div>
                )}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-[10px] uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto">
                   <option value="All">All Status Levels</option>
                   <option value={ClientStatus.PROCESSING}>Processing Stage</option>
                   <option value={ClientStatus.PENDING}>Review/Pending</option>
                   <option value={ClientStatus.COMPLETED}>Success/Completed</option>
                   <option value={ClientStatus.CANCELLED}>Void/Cancelled</option>
                </select>
                <button onClick={() => { setEditingClient(undefined); setIsFormOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all w-full md:w-auto">+ New File</button>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-800 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                      <tr><th className="px-8 py-5">Full Identity</th><th className="px-8 py-5">Passport ID</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-900 text-base">{c.name}</div>
                            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-1">{c.country} • {c.agencyName || 'Direct'}</div>
                          </td>
                          <td className="px-8 py-6 font-mono text-xs text-slate-600 font-bold">{c.passportNumber}</td>
                          <td className="px-8 py-6"><StatusBadge status={c.status} /></td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setViewingClient(c)} className="p-2.5 text-slate-500 hover:text-slate-900 bg-white rounded-xl border border-slate-200" title="Inspect Profile">👁️</button>
                              <button onClick={() => { setEditingClient(c); setIsFormOpen(true); }} className="p-2.5 text-slate-500 hover:text-blue-600 bg-white rounded-xl border border-slate-200" title="Modify Entry">✏️</button>
                              <button onClick={() => { supabase.from('clients').delete().eq('id', c.id).then(({error}) => { if(!error) setClients(prev => prev.filter(client => client.id !== c.id)); else setDbError(error.message); }); }} className="p-2.5 text-slate-500 hover:text-rose-600 bg-white rounded-xl border border-slate-200" title="Wipe Record">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredClients.length === 0 && <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No database entries matched your query</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'disbursement' && <DisbursementTab disbursements={disbursements} clients={clients} onSave={handleSaveDisbursement} onDelete={handleDeleteDisbursement} />}
      {activeTab === 'agent-payment' && <AgentPaymentTab agentPayments={agentPayments} clients={clients} onSave={handleSaveAgentPayment} onDelete={handleDeleteAgentPayment} />}
      {activeTab === 'revenue' && (
        <div className="space-y-8 animate-in slide-in-from-right-6 duration-700">
          <StatCard label="Lifecycle Revenue Volume" value={`৳${stats.totalPayment.toLocaleString()}`} icon="💰" color="bg-blue-900" />
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm"><h3 className="font-black text-slate-800 mb-10 uppercase tracking-[0.3em] text-[10px]">Monthly Dynamics</h3><div className="h-[400px]"><RevenueChart clients={clients} /></div></div>
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="space-y-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-8">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm text-center">
              <h2 className="text-3xl font-bold text-slate-950 mb-4 tracking-tight">Strategic Intelligence Analysis</h2>
              <p className="text-slate-600 mb-8 font-semibold max-w-2xl mx-auto">Generate high-fidelity reports using <span className="text-blue-600">Google Gemini 3</span> artificial intelligence to identify trends and conversion risks.</p>
              
              <div className="mb-8 max-w-2xl mx-auto">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-left">Custom Analysis Prompt (Optional)</label>
                <textarea 
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Analyze our conversion rate for Bangladesh vs other countries, or suggest a marketing strategy for the next 6 months..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-medium text-sm min-h-[120px] resize-none"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={async () => { 
                    setIsGeneratingReport(true); 
                    const r = await generateSmartReport(clients, customPrompt.trim() || undefined); 
                    setAiReport(r); 
                    setIsGeneratingReport(false); 
                  }} 
                  disabled={isGeneratingReport || clients.length === 0} 
                  className="bg-slate-950 text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isGeneratingReport ? '🤖 AI Core Processing...' : '🚀 Execute Analysis Engine'}
                </button>
                
                {aiReport && (
                  <button 
                    onClick={() => setIsPreviewOpen(true)}
                    className="bg-white text-slate-900 border border-slate-200 px-8 py-5 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    👁️ Preview Report
                  </button>
                )}
              </div>
          </div>

          {aiReport && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Generated Insight</h3>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-[10px] hover:underline"
                >
                  📥 Download PDF Report
                </button>
              </div>
              <div className="bg-white p-12 md:p-16 rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in-95">
                <div id="report-content" ref={reportRef} className="prose prose-slate max-w-none text-slate-900 p-4">
                  <div className="mb-12 border-b-4 border-slate-900 pb-8">
                    <h1 className="text-4xl font-bold tracking-tight uppercase mb-2">{appConfig.agencyName}</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Strategic Intelligence Report • {new Date().toLocaleDateString()}</p>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(aiReport) }} />
                  <div className="mt-20 pt-8 border-t border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                    Confidential Internal Document • Generated by Gemini AI Systems
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isPreviewOpen && aiReport && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in fade-in duration-300">
          <div className="px-6 md:px-10 py-4 md:py-6 bg-slate-900 text-white flex justify-between items-center shrink-0 shadow-xl">
            <div className="flex items-center gap-4 md:gap-6">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
              >
                <span className="text-lg">←</span> Go Back
              </button>
              <div className="hidden sm:block h-8 w-px bg-slate-700"></div>
              <h3 className="font-bold text-xs uppercase tracking-widest hidden md:block">Strategic Intelligence Preview</h3>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={handleDownloadPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-8 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Download PDF
              </button>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-3xl leading-none font-light">&times;</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-12 lg:p-20 custom-scrollbar">
            <div className="bg-white shadow-2xl rounded-[2rem] md:rounded-[3rem] mx-auto max-w-5xl overflow-hidden border border-slate-200">
              <div id="report-content-preview" className="p-8 md:p-16 lg:p-24">
                <div className="mb-12 border-b-4 border-slate-900 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight uppercase mb-2 text-slate-900">{appConfig.agencyName}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Strategic Intelligence Report</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated On</p>
                    <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none text-slate-900" dangerouslySetInnerHTML={{ __html: formatMarkdown(aiReport) }} />
                <div className="mt-24 pt-10 border-t border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                  Confidential Internal Document • Generated by Gemini AI Systems
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'summary' && <Summary clients={clients} agencyName={appConfig.agencyName} />}
      {activeTab === 'settings' && <Settings config={appConfig} onUpdate={setAppConfig} />}
      
      {isFormOpen && <ClientForm initialData={editingClient} existingClients={clients} onSubmit={handleSaveClient} onClose={() => { setIsFormOpen(false); setEditingClient(undefined); }} />}
      {viewingClient && <ClientDetails client={viewingClient} onClose={() => setViewingClient(undefined)} />}

      {dbError && (
        <div className="fixed bottom-6 right-6 bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest z-[100] animate-in slide-in-from-right flex items-center gap-4">
          <span>⚠️ {dbError}</span>
          <button onClick={() => setDbError(null)} className="font-black text-xl hover:scale-125 transition-transform">✕</button>
        </div>
      )}
    </Layout>
  );
};

export default App;
