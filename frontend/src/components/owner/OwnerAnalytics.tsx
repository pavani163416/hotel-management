import { useState, useEffect } from "react";
import { Loader2, TrendingUp, DollarSign, CalendarCheck, Percent, Star } from "lucide-react";
import { API } from "@/services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from "recharts";

interface WeeklyData { date: string; day: string; revenue: number; bookings: number; }
interface MonthlyData { month: string; revenue: number; bookings: number; }
interface OccupancyData { rate: number; totalRooms: number; bookedRooms: number; }
interface ReviewData { average: number; count: number; distribution: {stars: number, count: number}[] }

export default function OwnerAnalytics() {
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyData>({ rate: 0, totalRooms: 0, bookedRooms: 0 });
  const [reviews, setReviews] = useState<ReviewData>({ average: 0, count: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [wRes, mRes, oRes, rRes] = await Promise.all([
          API.get("/owners/analytics/weekly"),
          API.get("/owners/analytics/monthly"),
          API.get("/owners/analytics/occupancy"),
          API.get("/owners/analytics/reviews")
        ]);

        if (wRes.data.success) setWeekly(wRes.data.data);
        if (mRes.data.success) setMonthly(mRes.data.data);
        if (oRes.data.success) setOccupancy(oRes.data.data);
        if (rRes.data.success) setReviews(rRes.data.data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const chartData = timeRange === "weekly" ? weekly : monthly;
  const xAxisKey = timeRange === "weekly" ? "day" : "month";
  const totalRev = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalBks = chartData.reduce((acc, curr) => acc + curr.bookings, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" />
            Performance Analytics
          </h2>
          <p className="text-muted-foreground text-sm">Monitor your property's revenue, occupancy, and reviews.</p>
        </div>
        
        <div className="flex bg-surface-2 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setTimeRange("weekly")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeRange === "weekly" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            Last 7 Days
          </button>
          <button 
            onClick={() => setTimeRange("monthly")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeRange === "monthly" ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            Last 12 Months
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Total Revenue</p>
          <h3 className="text-2xl font-bold text-primary">${totalRev.toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mt-1">In selected period</p>
        </div>
        
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Total Bookings</p>
          <h3 className="text-2xl font-bold text-primary">{totalBks.toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mt-1">In selected period</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-3">
            <Percent className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Current Occupancy</p>
          <h3 className="text-2xl font-bold text-primary">{occupancy.rate}%</h3>
          <p className="text-xs text-muted-foreground mt-1">{occupancy.bookedRooms} / {occupancy.totalRooms} rooms booked</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Average Rating</p>
          <h3 className="text-2xl font-bold text-primary">{reviews.average} / 5</h3>
          <p className="text-xs text-muted-foreground mt-1">Based on {reviews.count} reviews</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-6">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings Chart */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-6">Booking Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [value, 'Bookings']}
                />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Review Distribution */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-primary mb-6">Review Distribution</h3>
          <div className="max-w-xl mx-auto space-y-3">
            {reviews.distribution.map(item => {
              const percentage = reviews.count > 0 ? (item.count / reviews.count) * 100 : 0;
              return (
                <div key={item.stars} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-12 shrink-0">
                    <span className="font-medium text-sm">{item.stars}</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-muted-foreground font-medium shrink-0">
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
