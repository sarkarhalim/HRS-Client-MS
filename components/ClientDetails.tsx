
import React, { useState, useEffect } from 'react';
import { Client, DocumentRecord, ClientStatus } from '../types';
import { supabase } from '../lib/supabase';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, onClose }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFetchingBlob, setIsFetchingBlob] = useState<string | null>(null);

  useEffect(() => {
    // Fetch metadata only (already done in App.tsx, but we refresh here to be sure)
    const fetchDocMetadata = async () => {
      try {
        setLoadingDocs(true);
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, type, size, client_id')
          .eq('client_id', client.id);
        
        if (error) throw error;
        setDocuments(data || []);
      } catch (e) {
        console.error("Failed to load document metadata", e);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocMetadata();
  }, [client.id]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    const data = await getDocData(doc.id);
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
    const data = await getDocData(doc.id);
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

  const totalPaid = (client.payments || []).reduce((sum, p) => sum + p.amount, 0);

  const InfoRow = ({ label, value, mono = false }: { label: string, value: string | number, mono?: boolean }) => (
    <div className="flex flex-col border-b border-slate-100 py-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm text-slate-900 font-semibold ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
        <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Passport: <span className="text-blue-400">{client.passportNumber}</span> • {client.status}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-2xl font-bold">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section>
              <h4 className="text-xs font-bold text-blue-600 uppercase mb-4 pb-2 border-b-2 border-blue-50">Identity & Contact</h4>
              <InfoRow label="Email Address" value={client.email} />
              <InfoRow label="Phone Number" value={client.contact} />
              <InfoRow label="Nationality/Country" value={client.country} />
              <InfoRow label="Residential Address" value={client.address} />
            </section>

            <section>
              <h4 className="text-xs font-bold text-blue-600 uppercase mb-4 pb-2 border-b-2 border-blue-50">Agency & Reference</h4>
              <InfoRow label="Project Name" value={client.projectName || 'N/A'} />
              <InfoRow label="Agent Name" value={client.agencyName} />
              <InfoRow label="Lead Reference" value={client.reference} />
              <InfoRow label="Created Date" value={new Date(client.createdAt).toLocaleDateString()} />
            </section>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Payment Ledger</h4>
                <div className="flex flex-wrap gap-2">
                   <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">Total Paid: ৳{totalPaid.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {client.payments && client.payments.length > 0 ? (
                  client.payments.map((p) => (
                    <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">৳{p.amount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.date}</span>
                      </div>
                      <span className="text-xs text-slate-600 italic">{p.note}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-slate-400 text-xs font-bold italic">No payments recorded</p>
                )}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 pb-2 border-b-2 border-slate-100 flex items-center gap-2">
                <span>📁</span> Uploaded Documents & Files
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingDocs ? (
                  <div className="col-span-2 py-10 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading encrypted files...</p>
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-blue-300 transition-all flex flex-col gap-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-3xl shrink-0">{doc.type.includes('pdf') ? '📄' : '🖼️'}</span>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{(doc.size / 1024).toFixed(0)} KB • {doc.type.split('/')[1]}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 border-t border-slate-50 pt-4">
                        <button 
                          onClick={() => handlePreview(doc)}
                          disabled={!!isFetchingBlob}
                          className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isFetchingBlob === doc.id ? '⏳...' : '👁️ PREVIEW'}
                        </button>
                        <button 
                          onClick={() => handleDownload(doc)}
                          disabled={!!isFetchingBlob}
                          className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isFetchingBlob === doc.id ? '⏳...' : '📥 DOWNLOAD'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-4xl grayscale opacity-20">📂</span>
                    <p className="mt-2 text-slate-400 text-sm font-bold">No documents attached to this record</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all"
          >
            CLOSE PROFILE
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEWER OVERLAY */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col animate-in fade-in duration-300">
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

export default ClientDetails;
