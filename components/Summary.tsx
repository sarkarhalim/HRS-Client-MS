
import React, { useMemo } from 'react';
import { Client } from '../types';

interface SummaryProps {
  clients: Client[];
  agencyName: string;
}

const Summary: React.FC<SummaryProps> = ({ clients, agencyName }) => {
  const aggregatedData = useMemo(() => {
    const countries: Record<string, number> = {};
    const agencies: Record<string, number> = {};
    const references: Record<string, number> = {};

    clients.forEach(client => {
      const c = client.country || 'Unknown';
      const a = client.agencyName || 'Direct';
      const r = client.reference || 'None';

      countries[c] = (countries[c] || 0) + 1;
      agencies[a] = (agencies[a] || 0) + 1;
      references[r] = (references[r] || 0) + 1;
    });

    return {
      countries: Object.entries(countries).sort((a, b) => b[1] - a[1]),
      agencies: Object.entries(agencies).sort((a, b) => b[1] - a[1]),
      references: Object.entries(references).sort((a, b) => b[1] - a[1]),
    };
  }, [clients]);

  const handlePrint = () => {
    window.print();
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Report for ${agencyName}\n\n`;
    
    csvContent += "COUNTRY SUMMARY\nCountry,Count\n";
    aggregatedData.countries.forEach(row => csvContent += `"${row[0]}",${row[1]}\n`);
    
    csvContent += "\nAGENCY SUMMARY\nAgency,Count\n";
    aggregatedData.agencies.forEach(row => csvContent += `"${row[0]}",${row[1]}\n`);
    
    csvContent += "\nREFERENCE SUMMARY\nReference,Count\n";
    aggregatedData.references.forEach(row => csvContent += `"${row[0]}",${row[1]}\n`);

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HRS_Database_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:p-0">
      {/* Action Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Database Analytics Summary</h3>
          <p className="text-sm text-slate-500">Aggregated statistics for all registered applications.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition-all text-sm shadow-md"
          >
            <span>🖨️</span> Preview / Save as PDF
          </button>
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm shadow-md"
          >
            <span>📥</span> Download CSV
          </button>
        </div>
      </div>

      {/* Printable Report Content */}
      <div id="summary-report" className="space-y-8 print:block">
        {/* Print Only Header */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 uppercase">{agencyName}</h1>
          <p className="text-slate-600 font-bold">DATABASE SUMMARY REPORT</p>
          <p className="text-slate-400 text-xs">Generated on: {new Date().toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4">
          
          {/* Country Wise */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col print:shadow-none">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-xs flex justify-between">
              <span>Country Wise Application</span>
              <span className="text-blue-600">Total: {clients.length}</span>
            </div>
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-5 py-2 text-left">Country</th>
                    <th className="px-5 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedData.countries.map(([name, count]) => (
                    <tr key={name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-700 font-medium">{name}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{count}</td>
                    </tr>
                  ))}
                  {aggregatedData.countries.length === 0 && (
                    <tr><td colSpan={2} className="px-5 py-10 text-center text-slate-400 italic">No country data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Agency Wise */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col print:shadow-none">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-xs">
              Agency Wise Application
            </div>
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-5 py-2 text-left">Agency Name</th>
                    <th className="px-5 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedData.agencies.map(([name, count]) => (
                    <tr key={name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-700 font-medium">{name}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{count}</td>
                    </tr>
                  ))}
                  {aggregatedData.agencies.length === 0 && (
                    <tr><td colSpan={2} className="px-5 py-10 text-center text-slate-400 italic">No agency data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Reference Wise */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col print:shadow-none print:col-span-2 lg:print:col-span-1">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-xs">
              Reference Wise Application
            </div>
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-5 py-2 text-left">Source / Person</th>
                    <th className="px-5 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedData.references.map(([name, count]) => (
                    <tr key={name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-700 font-medium">{name}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{count}</td>
                    </tr>
                  ))}
                  {aggregatedData.references.length === 0 && (
                    <tr><td colSpan={2} className="px-5 py-10 text-center text-slate-400 italic">No reference data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Professional Footer for PDF */}
        <div className="hidden print:flex justify-between items-center mt-12 border-t pt-4 text-[10px] text-slate-400">
          <p>This report is for internal consultancy use only. {agencyName}</p>
          <p>Generated via HRS Client MS Cloud Portal</p>
        </div>
      </div>

      <style>{`
        @media print {
          /* Reset common layout containers that might have overflow or height restrictions */
          html, body, #root, main {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide UI Chrome (Sidebar, Header, Buttons) */
          aside, header, nav, button, .print\\:hidden {
            display: none !important;
          }

          /* Ensure the content area takes full space */
          .flex, .flex-1, main {
            display: block !important;
            width: 100% !important;
          }

          /* Target the summary report specifically */
          #summary-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2cm !important;
          }

          /* Reset shadows and borders for cleaner print */
          .shadow-sm, .shadow-md, .shadow-xl {
            box-shadow: none !important;
          }
          
          /* Force colors for printing if browser defaults try to hide them */
          .text-slate-900 { color: #0f172a !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-700 { color: #334155 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }

          /* Manual Grid adjustment for print layout */
          .grid {
            display: block !important;
          }
          .grid > section {
            margin-bottom: 1.5rem !important;
            page-break-inside: avoid;
          }
          
          /* Custom 2-column grid for print if preferred over stacked */
          .print\\:grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Summary;
