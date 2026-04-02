import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
}

interface ReportPreviewModalProps<T> {
  title: string;
  columns: ColumnDef<T>[];
  data: T[];
  onClose: () => void;
}

export function ReportPreviewModal<T>({ title, columns, data, onClose }: ReportPreviewModalProps<T>) {
  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${data.length}`, 14, 36);

    const tableColumn = columns.map(col => col.header);
    const tableRows = data.map(row => {
      return columns.map(col => {
        if (typeof col.accessor === 'function') {
          return col.accessor(row);
        }
        return row[col.accessor];
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] }, // blue-600
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      margin: { top: 40 }
    });

    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Report Preview • {data.length} Records</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleDownloadPDF}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              <span>📥</span> Download PDF
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-2xl transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {columns.map((col, i) => (
                      <th key={i} className="px-6 py-4 whitespace-nowrap">{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      {columns.map((col, j) => {
                        let val;
                        if (typeof col.accessor === 'function') {
                          val = col.accessor(row);
                        } else {
                          val = row[col.accessor];
                        }
                        return (
                          <td key={j} className="px-6 py-4 text-slate-700 text-xs whitespace-nowrap">
                            {val !== null && val !== undefined ? String(val) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">
                        No data available for report
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
