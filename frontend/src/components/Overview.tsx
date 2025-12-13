import { useEffect, useState } from 'react';
import { Users, CheckCircle, Activity, TrendingUp, XCircle } from 'lucide-react';
import { StatsResponse, EventLog } from '../types';
import { apiService } from '../services/api';

export default function Overview() {
  const [stats, setStats] = useState<StatsResponse>({
    totalStudents: 0,
    todayAccess: 0,
    todayCafeteriaAccess: 0,
    successRate: 0,
    activePoints: 0,
    recentTrend: 0,
    recentHistory: [],
  } as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const statsData = await apiService.getOverviewStats();
        if (!mounted) return;
        setStats((prev) => ({ ...prev, ...(statsData as any) }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      trend: '+8.2%',
    },
    {
      title: 'Today\'s Main Gate Access',
      value: (stats as any).todayAccess,
      icon: CheckCircle,
      color: 'green',
      trend: '+12.5%',
    },
    {
      title: "Today's Cafeteria Access",
      value: (stats as any).todayCafeteriaAccess ?? 0,
      icon: Activity,
      color: 'teal',
      trend: '+0.0%',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: Activity,
      color: 'orange',
      trend: '+3.1%',
    },
    {
      title: 'Active Points',
      value: (stats as any).activePoints,
      icon: TrendingUp,
      color: 'purple',
      trend: '100%',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="mt-2 text-gray-600">Monitor your student recognition system performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
            green: { bg: 'bg-green-50', text: 'text-green-600' },
            orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
            teal: { bg: 'bg-teal-50', text: 'text-teal-600' },
          }[stat.color]!;

          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses.bg}`}>
                  <Icon className={`h-6 w-6 ${colorClasses.text}`} />
                </div>
                <span className="text-sm font-medium text-green-600 flex items-center">
                  {stat.trend}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {(stats.recentHistory && stats.recentHistory.length > 0 ? stats.recentHistory : []).slice(0, 6).map((item: EventLog, idx: number) => (
              <div key={item.LogID ?? idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${item.Decision ? 'bg-green-100' : 'bg-red-100'}`}>
                  {item.Decision ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.FirstName || item.StudentID ? `${item.FirstName ?? ''} ${item.LastName ?? ''}`.trim() : 'Unknown student'}</p>
                  <p className="text-xs text-gray-500">{new Date(item.EventTime || (item as any).AccessTime || Date.now()).toLocaleString()}</p>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {item.Decision ? 'Success' : 'Failed'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Recognition Service</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">API Gateway</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}