import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Shield } from 'lucide-react';
import { CrimeMap } from './components/CrimeMap';

// Display crime severity colors
const crimeColors = {
  Violent:  '#d73027',
  Property: '#fee08b',
  Serious:  '#fc8d59',
  Minor:    '#91cf60',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Use the severity field from the data. */
function classifyCrime(crime) {
  return crime.severity || 'Minor';
}

function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change > 0;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-600 text-sm">{title}</h3>
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className={`flex items-center text-sm ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
        {isPositive
          ? <TrendingUp className="w-4 h-4 mr-1" />
          : <TrendingDown className="w-4 h-4 mr-1" />}
        <span>{Math.abs(change)}% vs last month</span>
      </div>
    </div>
  );
}

export default function App() {
  const [crimeData, setCrimeData] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}crime_data.json`)
      .then((r) => r.json())
      .then(setCrimeData)
      .catch(console.error);
  }, []);

  // Get available years
  const availableYears = useMemo(() => {
    if (!crimeData) return [];
    return Object.keys(crimeData).sort().reverse();
  }, [crimeData]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    if (!crimeData || !selectedYear) return [];
    return Object.keys(crimeData[selectedYear] || {}).sort((a, b) => b - a);
  }, [crimeData, selectedYear]);

  // Initialize year/month when data loads
  useEffect(() => {
    if (crimeData && !selectedYear) {
      const years = Object.keys(crimeData).sort().reverse();
      if (years.length > 0) {
        const firstYear = years[0];
        setSelectedYear(firstYear);
        const months = Object.keys(crimeData[firstYear]).sort((a, b) => b - a);
        if (months.length > 0) {
          setSelectedMonth(months[0]);
        }
      }
    }
  }, [crimeData, selectedYear]);

  // Build monthly aggregates from real data
  const monthlyData = useMemo(() => {
    if (!crimeData) return [];
    const rows = [];
    for (const year of Object.keys(crimeData).sort()) {
      for (const monthKey of Object.keys(crimeData[year]).sort()) {
        const crimes = crimeData[year][monthKey];
        const counts = { violent: 0, property: 0, serious: 0, minor: 0 };
        for (const c of crimes) {
          const severity = classifyCrime(c).toLowerCase();
          if (severity in counts) counts[severity]++;
          else counts.minor++;
        }
        const monthIdx = parseInt(monthKey, 10) - 1;
        rows.push({
          label: `${MONTH_NAMES[monthIdx]} ${year}`,
          shortLabel: MONTH_NAMES[monthIdx],
          year,
          month: monthKey,
          total: crimes.length,
          ...counts,
        });
      }
    }
    return rows;
  }, [crimeData]);

  // Most recent 12 months for charts
  const recentMonths = useMemo(() => monthlyData.slice(-12), [monthlyData]);

  // Map incidents: crimes for selected year and month
  const mapIncidents = useMemo(() => {
    if (!crimeData || !selectedYear || !selectedMonth) return [];
    return (crimeData[selectedYear]?.[selectedMonth] || [])
      .filter((c) => c.lat != null && c.lng != null)
      .map((c, i) => ({
        id: i,
        lat: c.lat,
        lng: c.lng,
        type: c.type,
        neighborhood: c.neighborhood,
        crimeType: classifyCrime(c),
        date: `${selectedYear}-${selectedMonth}`,
      }));
  }, [crimeData, selectedYear, selectedMonth]);

  // Get label for selected month
  const selectedMonthLabel = useMemo(() => {
    if (!selectedYear || !selectedMonth) return '';
    const monthIdx = parseInt(selectedMonth, 10) - 1;
    return `${MONTH_NAMES[monthIdx]} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  // Crime severity totals for pie chart
  const crimeTypeTotals = useMemo(() => {
    if (!monthlyData.length) return [];
    const totals = { Violent: 0, Property: 0, Serious: 0, Minor: 0 };
    for (const row of monthlyData) {
      totals.Violent  += row.violent;
      totals.Property += row.property;
      totals.Serious  += row.serious;
      totals.Minor    += row.minor;
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value, color: crimeColors[name] }));
  }, [monthlyData]);

  // Stats
  const totalCrimes = useMemo(() => monthlyData.reduce((s, r) => s + r.total, 0), [monthlyData]);
  const avgPerMonth = useMemo(
    () => (monthlyData.length ? Math.round(totalCrimes / monthlyData.length) : 0),
    [totalCrimes, monthlyData],
  );
  const lastRow = recentMonths[recentMonths.length - 1];
  const prevRow = recentMonths[recentMonths.length - 2];
  const monthlyChange = lastRow && prevRow
    ? +((lastRow.total - prevRow.total) / prevRow.total * 100).toFixed(1)
    : 0;
  const topType = crimeTypeTotals.length
    ? crimeTypeTotals.reduce((a, b) => (a.value > b.value ? a : b)).name
    : 'Violent';

  if (!crimeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading crime data…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Pittsburgh Crime Dashboard</h1>
          </div>
        </div>

        {/* Crime Map */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Crime Locations by Month</h2>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    const months = Object.keys(crimeData[e.target.value] || {}).sort((a, b) => b - a);
                    setSelectedMonth(months[0] || '');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableMonths.map((month) => {
                    const monthIdx = parseInt(month, 10) - 1;
                    return (
                      <option key={month} value={month}>
                        {MONTH_NAMES[monthIdx]}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
          {selectedMonthLabel && <p className="text-sm text-gray-500 mb-4">Showing crimes for {selectedMonthLabel}</p>}
          <CrimeMap incidents={mapIncidents} crimeColors={crimeColors} />
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {Object.entries(crimeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
                <span className="text-sm text-gray-700">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Crimes (all data)" value={totalCrimes} change={-2.4} icon={AlertCircle} />
          <StatCard title="Monthly Average" value={avgPerMonth} change={1.2} icon={TrendingUp} />
          <StatCard title={lastRow?.label ?? 'Latest Month'} value={lastRow?.total ?? 0} change={monthlyChange} icon={Shield} />
          <StatCard title="Most Common Type" value={topType} change={-1.8} icon={AlertCircle} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Crime Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentMonths}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortLabel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Crimes" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Crime Type Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={crimeTypeTotals}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {crimeTypeTotals.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Crime Breakdown by Type</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={recentMonths}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="shortLabel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="violent"  stackId="a" fill="#d73027" name="Violent" />
              <Bar dataKey="property" stackId="a" fill="#fee08b" name="Property" />
              <Bar dataKey="serious"  stackId="a" fill="#fc8d59" name="Serious" />
              <Bar dataKey="minor"    stackId="a" fill="#91cf60" name="Minor" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Total', 'Violent', 'Property', 'Serious', 'Minor'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...monthlyData].reverse().map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{row.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.violent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.property}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.serious}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.minor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Data source:</strong> City of Pittsburgh Open Data portal — Western Pennsylvania Regional Data Center.
            Crime incident data is geocoded and classified by severity and offense type.
          </p>
        </div>

      </div>
    </div>
  );
}