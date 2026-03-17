
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Client, ClientStatus } from '../types';

interface ChartProps {
  clients: Client[];
}

export const StatusDistribution: React.FC<ChartProps> = ({ clients }) => {
  const data = Object.values(ClientStatus).map(status => ({
    name: status,
    count: clients.filter(c => c.status === status).length
  }));

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="h-[300px] w-full relative min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RevenueChart: React.FC<ChartProps> = ({ clients }) => {
  const getMonthlyRevenue = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueMap: Record<string, number> = {};
    
    months.forEach(m => revenueMap[m] = 0);

    clients.forEach(client => {
      (client.payments || []).forEach(p => {
        const date = new Date(p.date);
        const monthName = months[date.getMonth()];
        revenueMap[monthName] += p.amount;
      });
    });

    return months.map(m => ({
      name: m,
      revenue: revenueMap[m]
    }));
  };

  const data = getMonthlyRevenue();

  return (
    <div className="h-[300px] w-full relative min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#94a3b8', fontSize: 12}} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#94a3b8', fontSize: 12}} 
            tickFormatter={(value) => `৳${value >= 1000 ? (value / 1000) + 'k' : value}`}
          />
          <Tooltip 
            cursor={{fill: '#f8fafc'}} 
            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
            formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
