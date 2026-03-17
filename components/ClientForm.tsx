
import React, { useState, useRef, useMemo } from 'react';
import { Client, ClientStatus, PaymentRecord, DocumentRecord } from '../types';

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

  const handleDownload = (doc: DocumentRecord) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (doc: DocumentRecord) => {
    const win = window.open();
    if (win) {
      win.document.write(`<title>${doc.name}</title><iframe src="${doc.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
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
                          className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          👁️ View
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="text-[10px] bg-slate-100 text-slate-700 px-3 py-1 rounded font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                          📥 Save
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
    </div>
  );
};

export default ClientForm;
