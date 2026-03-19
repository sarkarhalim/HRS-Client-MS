
import React, { useState, useRef, useMemo } from 'react';
import { Client, ClientStatus, PaymentRecord, DocumentRecord } from '../types';
import { supabase } from '../lib/supabase';

interface ClientFormProps {
  initialData?: Client;
  existingClients: Client[];
  onSubmit: (data: Partial<Client>) => Promise<void> | void;
  onClose: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ initialData, existingClients, onSubmit, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Client>>(
    initialData || {
      name: '',
      email: '',
      contact: '',
      address: '',
      country: '',
      reference: '',
      passportNumber: '',
      projectName: '',
      agencyName: '',
      status: ClientStatus.PENDING,
      payments: [],
      documents: []
    }
  );

  const [newInstallment, setNewInstallment] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFetchingBlob, setIsFetchingBlob] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Duplicate Check Logic
  const duplicates = useMemo(() => {
    const name = formData.name?.trim().toLowerCase();
    const passport = formData.passportNumber?.trim().toLowerCase();
    
    if (!name && !passport) return { name: null, passport: null };

    const others = existingClients.filter(c => c.id !== initialData?.id);
    
    return {
      name: name ? others.find(c => c.name.toLowerCase() === name) : null,
      passport: passport ? others.find(c => c.passportNumber.toLowerCase() === passport) : null
    };
  }, [formData.name, formData.passportNumber, existingClients, initialData]);

  const handleAddInstallment = () => {
    if (!newInstallment.amount || parseFloat(newInstallment.amount) <= 0) return;
    
    const installment: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(newInstallment.amount),
      date: newInstallment.date,
      note: newInstallment.note
    };

    setFormData({
      ...formData,
      payments: [...(formData.payments || []), installment]
    });
    setNewInstallment({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleRemoveInstallment = (id: string) => {
    setFormData({
      ...formData,
      payments: (formData.payments || []).filter(p => p.id !== id)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        console.error(`${file.name} is not a supported format. Please use PDF, JPG, or PNG.`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        console.error(`${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const doc: DocumentRecord = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string
        };
        setFormData(prev => ({
          ...prev,
          documents: [...(prev.documents || []), doc]
        }));
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const base64ToBlob = async (base64: string, fallbackMimeType?: string) => {
    try {
      if (!base64 || typeof base64 !== 'string') {
        throw new Error("Invalid base64 data");
      }
      
      if (base64.startsWith('http')) {
        const response = await fetch(base64);
        return await response.blob();
      }

      const safeAtob = (str: string) => {
        let b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
        while (b64.length % 4) b64 += '=';
        return window.atob(b64);
      };

      if (base64.startsWith('data:')) {
        const arr = base64.split(',');
        if (arr.length < 2) throw new Error("Invalid data URI");
        
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (fallbackMimeType || 'application/octet-stream');
        
        const bstr = safeAtob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new Blob([u8arr], { type: mime });
      }
      
      const bstr = safeAtob(base64);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: fallbackMimeType || 'application/octet-stream' });
      
    } catch (e) {
      console.error("base64ToBlob error:", e);
      throw e;
    }
  };

  const getDocData = async (docId: string) => {
    setIsFetchingBlob(docId);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('data')
        .eq('id', docId)
        .single();
      
      if (error) throw error;
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
    const data = doc.data || await getDocData(doc.id);
    if (!data) return;

    try {
      const blob = await base64ToBlob(data, doc.type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("Download failed", e);
      console.error("Failed to download document.");
    }
  };

  const handlePreview = async (doc: DocumentRecord) => {
    setPreviewDoc(doc);
    
    const data = doc.data || await getDocData(doc.id);
    if (!data) {
      setPreviewDoc(null);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    
    try {
      const blob = await base64ToBlob(data, doc.type);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      console.error("Preview failed", e);
      console.error("Failed to generate preview.");
      setPreviewDoc(null);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setFormData({
      ...formData,
      documents: (formData.documents || []).filter(d => d.id !== id)
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicates.passport) {
      console.warn(`Warning: Passport ${formData.passportNumber} is already registered to ${duplicates.passport.name}. Proceeding anyway.`);
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPaid = (formData.payments || []).reduce((sum, p) => sum + p.amount, 0);

  const inputClass = "w-full px-4 py-2 bg-white border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-950 font-medium placeholder-slate-400";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Client Record' : 'Add New Client'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-2">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-6 pb-20">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 mb-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`${inputClass} ${duplicates.name ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}
                    placeholder="John Doe"
                  />
                  {duplicates.name && (
                    <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span> Notice: A client with this name already exists in the system.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={inputClass}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Contact Number</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.contact || ''}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className={inputClass}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Country</label>
                  <input 
                    required
                    type="text" 
                    value={formData.country || ''}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className={inputClass}
                    placeholder="e.g. Bangladesh"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-800 mb-1">Residence Address</label>
                  <input 
                    required
                    type="text" 
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className={inputClass}
                    placeholder="Street, City, Postcode"
                  />
                </div>
              </div>
            </div>

            {/* Consultancy Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Consultancy Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Passport Number</label>
                  <input 
                    required
                    type="text" 
                    value={formData.passportNumber || ''}
                    onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
                    className={`${inputClass} ${duplicates.passport ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                    placeholder="A12345678"
                  />
                  {duplicates.passport && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span>🚫</span> Error: This passport is already registered to {duplicates.passport.name}.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Project Name</label>
                  <input 
                    type="text" 
                    value={formData.projectName || ''}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    className={inputClass}
                    placeholder="e.g. Winter Intake 2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Agency Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.agencyName || ''}
                    onChange={(e) => setFormData({...formData, agencyName: e.target.value})}
                    className={inputClass}
                    placeholder="Associated Agency"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Lead Reference</label>
                  <input 
                    type="text" 
                    value={formData.reference || ''}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className={inputClass}
                    placeholder="Source of Client"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Application Status</label>
                  <select 
                    value={formData.status || ClientStatus.PENDING}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ClientStatus})}
                    className={inputClass}
                  >
                    {Object.values(ClientStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Attached Documents</h4>
              <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 text-center">
                <input 
                  type="file" 
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white px-6 py-2 border border-slate-400 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                >
                  📁 Upload PDF/Images
                </button>
                <p className="text-xs text-slate-500 mt-2 font-medium">Clear copies only (Max 5MB each)</p>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(formData.documents || []).map(doc => (
                    <div key={doc.id} className="bg-white p-2 rounded-lg border border-slate-300 flex flex-col gap-2 shadow-sm relative group overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <span className="text-lg shrink-0">{doc.type.includes('pdf') ? '📄' : '🖼️'}</span>
                            <div className="overflow-hidden text-left">
                              <p className="text-[10px] font-bold text-slate-900 truncate">{doc.name}</p>
                              <p className="text-[9px] text-slate-500 uppercase font-bold">{(doc.size / 1024).toFixed(0)} KB</p>
                            </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 font-bold text-lg"
                          title="Remove"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="flex border-t border-slate-100 pt-2 gap-2 justify-center">
                        <button 
                          type="button"
                          onClick={() => handlePreview(doc)}
                          disabled={isFetchingBlob === doc.id}
                          className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isFetchingBlob === doc.id ? '⏳...' : '👁️ View'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownload(doc)}
                          disabled={isFetchingBlob === doc.id}
                          className="text-[10px] bg-slate-100 text-slate-700 px-3 py-1 rounded font-bold hover:bg-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isFetchingBlob === doc.id ? '⏳...' : '📥 Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Financial Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Total Fees (৳)</label>
                  <input 
                    type="number" 
                    value={formData.totalFees || ''}
                    onChange={(e) => setFormData({...formData, totalFees: parseFloat(e.target.value) || undefined})}
                    className={inputClass}
                    placeholder="e.g. 500000"
                  />
                </div>
              </div>
            </div>

            {/* Payment Installments */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Ledger</h4>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">Paid: ৳{totalPaid.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-slate-100 p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input 
                    type="number" 
                    placeholder="Amount" 
                    value={newInstallment.amount}
                    onChange={(e) => setNewInstallment({...newInstallment, amount: e.target.value})}
                    className="px-3 py-2 bg-white border border-slate-400 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-blue-500 text-slate-950"
                  />
                  <input 
                    type="date" 
                    value={newInstallment.date}
                    onChange={(e) => setNewInstallment({...newInstallment, date: e.target.value})}
                    className="px-3 py-2 bg-white border border-slate-400 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-blue-500 text-slate-950"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Note (e.g. Booking)" 
                      value={newInstallment.note}
                      onChange={(e) => setNewInstallment({...newInstallment, note: e.target.value})}
                      className="flex-1 px-3 py-2 bg-white border border-slate-400 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-blue-500 text-slate-950"
                    />
                    <button 
                      type="button"
                      onClick={handleAddInstallment}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {(formData.payments || []).length > 0 ? (
                    (formData.payments || []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-300 text-sm shadow-sm">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-blue-700">৳{p.amount.toLocaleString()}</span>
                          <span className="text-slate-500 font-bold text-xs">{p.date}</span>
                          <span className="text-slate-900 font-medium border-l border-slate-200 pl-3">{p.note || 'No Note'}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveInstallment(p.id)}
                          className="text-rose-500 hover:text-rose-700 px-2 font-bold text-xl"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2 font-bold italic">No financial records yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e as any)}
            className="flex-1 py-3 px-4 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Record' : 'Save New Client')}
          </button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}></div>
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-100 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{previewDoc.name}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {previewDoc.type.toUpperCase()} • {(previewDoc.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleDownload(previewDoc)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <span>⬇️</span> Download
                </button>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100/50">
              {isFetchingBlob === previewDoc.id ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold animate-pulse">Loading secure document...</p>
                </div>
              ) : previewDoc.type.includes('pdf') ? (
                <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                  <span className="text-6xl mb-4">📄</span>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">PDF Document</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm">
                    Browser security restricts direct PDF preview in this environment. 
                    Please download the file or open it in a new tab to view its contents.
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => window.open(previewUrl || '', '_blank')}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      Open in New Tab
                    </button>
                    <button 
                      onClick={() => handleDownload(previewDoc)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <img 
                  src={previewUrl || ''} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientForm;
