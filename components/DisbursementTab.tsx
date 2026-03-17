
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Disbursement, DocumentRecord, Client } from '../types';
import { supabase } from '../lib/supabase';

interface DisbursementTabProps {
  disbursements: Disbursement[];
  clients: Client[];
  onSave: (data: Partial<Disbursement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type SortKey = 'date' | 'purpose' | 'sourceFund' | 'amount' | 'modeOfPayment';

const DisbursementTab: React.FC<DisbursementTabProps> = ({ disbursements, clients, onSave, onDelete }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'history'>('overview');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Disbursement | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFetchingBlob, setIsFetchingBlob] = useState<string | null>(null);
  
  // Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Disbursement>>({
    purpose: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    sourceFund: '',
    modeOfPayment: 'Cash',
    document: undefined
  });

  // Sync form data when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setFormData({
        id: editingItem.id,
        purpose: editingItem.purpose,
        amount: editingItem.amount,
        date: editingItem.date,
        sourceFund: editingItem.sourceFund,
        modeOfPayment: editingItem.modeOfPayment || 'Cash',
        document: editingItem.document
      });
      setIsFormOpen(true);
    }
  }, [editingItem]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSorted = useMemo(() => {
    let result = disbursements.filter(d => 
      d.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.sourceFund.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.modeOfPayment || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [disbursements, sortConfig, searchQuery]);

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredAndSorted.reduce((sum, d) => sum + Number(d.amount), 0);
  }, [filteredAndSorted]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Please upload PDF, JPG, or PNG only.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        document: {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({
      purpose: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      sourceFund: '',
      modeOfPayment: 'Cash',
      document: undefined
    });
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const base64ToBlob = (base64: string) => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const getDocData = async (docId: string) => {
    setIsFetchingBlob(docId);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('data')
        .eq('id', docId)
        .single();
      
      if (error) {
        // Fallback for disbursements where document might be stored directly in the disbursement record
        // depending on how the schema was set up. But based on ClientDetails, it's in documents table.
        throw error;
      }
      return data.data;
    } catch (e) {
      console.error("Failed to fetch document data", e);
      console.error("Failed to load document content.");
      return null;
    } finally {
      setIsFetchingBlob(null);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    // If doc has data (newly uploaded), use it. Otherwise fetch.
    const data = doc.data || await getDocData(doc.id);
    if (!data) return;

    try {
      const blob = base64ToBlob(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error("Download failed", e);
      console.error("Failed to download document.");
    }
  };

  const handlePreview = async (doc: DocumentRecord) => {
    const data = doc.data || await getDocData(doc.id);
    if (!data) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    try {
      const blob = base64ToBlob(data);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch (e) {
      console.error("Preview failed", e);
      console.error("Failed to generate preview.");
    }
  };

  const totalExpense = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-Tabs Navigation */}
      <div className="flex bg-slate-200 p-1.5 rounded-2xl w-fit shadow-inner">
        <button 
          onClick={() => setActiveSubTab('overview')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'overview' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Ledger Overview
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          History ({disbursements.length})
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Summary Card */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[350px]">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Financial Summary</h2>
              <p className="text-slate-700 text-sm mt-2 font-semibold leading-relaxed">Overall operational fund utilization across all projects.</p>
              
              <div className="mt-12">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Disbursed Volume</span>
                <div className="text-4xl sm:text-6xl font-bold text-rose-600 mt-3 drop-shadow-sm">৳{totalExpense.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setIsFormOpen(true)}
                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
              >
                + Record New Expense
              </button>
              <button 
                onClick={() => setActiveSubTab('history')}
                className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl"
              >
                View Audit Trail ❯
              </button>
            </div>
          </div>

          {/* Recent Activity Mini-List */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">Recent Transactions</h3>
            <div className="space-y-4 flex-1">
              {disbursements.slice(0, 5).map(d => (
                <div key={d.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-200 transition-all group">
                  <div className="overflow-hidden mr-4">
                    <p className="font-bold text-slate-900 truncate text-sm tracking-tight group-hover:text-blue-700">{d.purpose}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{d.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {d.document && <span className="text-blue-500 text-lg" title="Attachment Secure">📎</span>}
                    <span className="text-rose-600 font-bold text-base whitespace-nowrap">৳{Number(d.amount).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {disbursements.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30">
                   <span className="text-5xl mb-4">💸</span>
                   <p className="font-bold text-slate-900 uppercase tracking-widest text-[10px]">No records found</p>
                </div>
              )}
            </div>
            {disbursements.length > 5 && (
                <button 
                  onClick={() => setActiveSubTab('history')}
                  className="w-full py-4 text-blue-600 text-[10px] font-bold uppercase hover:underline mt-6 tracking-widest border-t border-slate-50"
                >
                  Inspect full history...
                </button>
              )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          {/* History Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Registry</h2>
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest mt-2">Filter and search through global expenditures</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <input 
                  type="text" 
                  placeholder="Deep search by purpose or mode..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder-slate-500"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔍</span>
              </div>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 whitespace-nowrap active:scale-95"
              >
                <span>+</span> New Entry
              </button>
            </div>
          </div>

          {/* Prominent Result Summary Strip */}
          <div className="bg-slate-900 text-white px-10 py-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all"></div>
             <div className="flex items-center gap-4 z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Query Results</span>
                <span className="bg-slate-800 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700">{filteredAndSorted.length} Transactions Found</span>
             </div>
             <div className="flex items-center gap-6 mt-4 md:mt-0 z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregated Total</span>
                <div className="text-2xl md:text-3xl font-bold text-rose-500 drop-shadow-lg">৳{filteredTotal.toLocaleString()}</div>
             </div>
          </div>

          {/* Desktop View Table with Enhanced Contrast */}
          <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('purpose')}>Purpose {sortConfig.key === 'purpose' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-8 py-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sourceFund')}>Fund Source {sortConfig.key === 'sourceFund' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-8 py-5 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('amount')}>Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-8 py-5 text-center">Documentation</th>
                    <th className="px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSorted.map((d, idx) => (
                    <tr key={d.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/50 transition-all group`}>
                      <td className="px-8 py-6 font-bold text-[11px] text-slate-700 whitespace-nowrap uppercase tracking-tight">{d.date}</td>
                      <td className="px-8 py-6 font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-base tracking-tight">{d.purpose}</td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-800 uppercase tracking-tight truncate max-w-[200px] inline-block border border-slate-200">
                          {d.sourceFund || 'General Ledger'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right font-bold text-rose-600 text-base">৳{Number(d.amount).toLocaleString()}</td>
                      <td className="px-8 py-6 text-center">
                        {d.document ? (
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handlePreview(d.document!)} 
                              disabled={!!isFetchingBlob}
                              className="p-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 disabled:opacity-50" 
                              title="Inspect"
                            >
                              {isFetchingBlob === d.document.id ? '⏳' : '👁️'}
                            </button>
                            <button 
                              onClick={() => handleDownload(d.document!)} 
                              disabled={!!isFetchingBlob}
                              className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50" 
                              title="Download"
                            >
                              {isFetchingBlob === d.document.id ? '⏳' : '📥'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">No Paper</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditingItem(d)} className="text-slate-600 hover:text-blue-600 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all" title="Modify Entry">✏️</button>
                          <button onClick={() => onDelete(d.id)} className="text-slate-600 hover:text-rose-600 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all" title="Remove Entry">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Table Footer Total */}
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-8 py-6 text-right font-bold text-slate-700 uppercase tracking-widest text-[10px]">Registry Total Volume:</td>
                    <td className="px-8 py-6 text-right font-bold text-rose-600 text-lg">৳{filteredTotal.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile/Tablet View Enhanced Contrast Cards */}
          <div className="lg:hidden space-y-5 pb-10">
            {filteredAndSorted.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col overflow-hidden flex-1 mr-4">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">{d.date}</span>
                    <h4 className="font-bold text-slate-900 leading-tight truncate text-lg tracking-tight">{d.purpose}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-600 font-bold whitespace-nowrap text-xl block">৳{Number(d.amount).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-[10px] font-bold text-slate-800 uppercase bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                    {d.sourceFund || 'Operating Capital'}
                  </span>
                  {d.document && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
                      <span className="text-[9px] font-bold text-blue-900 uppercase tracking-widest">Doc Verified</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePreview(d.document!)} 
                          disabled={!!isFetchingBlob}
                          className="text-[10px] font-bold text-blue-600 hover:underline px-1 uppercase tracking-widest disabled:opacity-50"
                        >
                          {isFetchingBlob === d.document.id ? 'Loading...' : 'Open'}
                        </button>
                        <button 
                          onClick={() => handleDownload(d.document!)} 
                          disabled={!!isFetchingBlob}
                          className="text-[10px] font-bold text-blue-600 hover:underline px-1 uppercase tracking-widest disabled:opacity-50"
                        >
                          {isFetchingBlob === d.document.id ? 'Loading...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-3 pt-6 border-t border-slate-100 items-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{d.modeOfPayment || 'CASH'}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingItem(d)} className="px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-blue-200 transition-all active:scale-95 shadow-sm">Edit ✏️</button>
                    <button onClick={() => onDelete(d.id)} className="px-6 py-3 bg-rose-50 text-rose-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-rose-200 transition-all active:scale-95 shadow-sm">Delete 🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {/* Mobile Footer Total */}
            {filteredAndSorted.length > 0 && (
              <div className="bg-slate-900 text-white p-8 rounded-[2rem] text-center shadow-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Result Volume</p>
                <p className="text-3xl font-bold text-rose-500">৳{filteredTotal.toLocaleString()}</p>
              </div>
            )}
            {filteredAndSorted.length === 0 && (
              <div className="text-center py-28 bg-white rounded-[2rem] border border-dashed border-slate-300 text-slate-700 font-bold uppercase tracking-widest text-[10px] px-10">
                Search query returned zero matching records.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Modal with Enhanced Contrast Fields */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-xl max-h-[90vh] animate-in zoom-in duration-300 overflow-hidden flex flex-col border border-slate-200 my-auto">
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-widest">{editingItem ? 'Update Financial Record' : 'Create Disbursement Entry'}</h3>
              <button onClick={resetForm} className="text-3xl leading-none font-bold hover:text-blue-400 transition-colors">&times;</button>
            </div>
            
            <form 
              id="disbursement-form"
              className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!formData.purpose || formData.amount === undefined || formData.amount === null || !formData.date) {
                  console.error('Please fill required fields');
                  return;
                }
                await onSave(formData);
                resetForm();
              }}
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Transaction Description</label>
                  <input 
                    required
                    type="text"
                    value={formData.purpose || ''}
                    onChange={e => setFormData({...formData, purpose: e.target.value})}
                    placeholder="e.g., Global Marketing Fee, Office Rent..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Amount (৳)</label>
                    <input 
                      required
                      type="number"
                      value={isNaN(formData.amount as number) ? '' : formData.amount}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setFormData({...formData, amount: isNaN(val) ? 0 : val});
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-semibold text-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Effective Date</label>
                    <input 
                      required
                      type="date"
                      value={formData.date || ''}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-semibold text-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Allocated Fund / Account</label>
                  <input 
                    type="text"
                    list="client-funds"
                    value={formData.sourceFund || ''}
                    onChange={e => setFormData({...formData, sourceFund: e.target.value})}
                    placeholder="Search client account or type fund name..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all"
                  />
                  <datalist id="client-funds">
                    <option value="Operational Capital" />
                    <option value="Petty Cash" />
                    {clients.map(c => (
                      <option key={c.id} value={`${c.name} (${c.passportNumber})`} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Payment Channel</label>
                  <input 
                    type="text"
                    list="payment-modes"
                    value={formData.modeOfPayment || ''}
                    onChange={e => setFormData({...formData, modeOfPayment: e.target.value})}
                    placeholder="Cash, Bank, Mobile..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all"
                  />
                  <datalist id="payment-modes">
                    <option value="Cash" />
                    <option value="Bank Transfer" />
                    <option value="Rocket / bKash" />
                    <option value="Company Cheque" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Supporting Evidence (PDF/IMG)</label>
                  <div className="mt-1">
                    {formData.document ? (
                      <div className="flex items-center justify-between p-5 bg-blue-50 border border-blue-200 rounded-[1.5rem] shadow-inner">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className="text-2xl">📄</span>
                          <span className="text-xs font-bold text-blue-900 truncate">{formData.document.name}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, document: undefined})}
                          className="text-rose-600 bg-white hover:bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold transition-all shadow-sm active:scale-90"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-6 py-10 border-4 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all flex flex-col items-center gap-4 group"
                      >
                        <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
                        Attach Official Receipt
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </form>

            <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
              <button 
                type="button"
                onClick={resetForm}
                className="flex-1 py-5 px-6 border border-slate-300 rounded-2xl font-bold text-slate-700 uppercase tracking-widest hover:bg-slate-50 transition-all text-[10px] active:scale-95"
              >
                Discard
              </button>
              <button 
                type="submit"
                form="disbursement-form"
                className="flex-[2] py-5 px-10 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all text-[10px] active:scale-95"
              >
                {editingItem ? 'Update Audit Entry' : 'Seal Transaction Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEWER OVERLAY */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col animate-in fade-in duration-300">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">{previewDoc.type.includes('pdf') ? '📄' : '🖼️'}</span>
              <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{previewDoc.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDownload(previewDoc)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                DOWNLOAD
              </button>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-white/10 rounded-full text-2xl"
              >
                &times;
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {previewDoc.type.includes('pdf') ? (
              <iframe 
                src={previewUrl || ''} 
                className="w-full h-full bg-white rounded-lg"
                title="PDF Preview"
              />
            ) : (
              <img 
                src={previewUrl || ''} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisbursementTab;
