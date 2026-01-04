import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card } from '@/components/ui'
import type { ApplicationVolumeData } from '@/services/pipelineAnalyticsService'

interface ApplicationVolumeChartProps {
  data: ApplicationVolumeData[]
  title?: string
  showHired?: boolean
}

export function ApplicationVolumeChart({
  data,
  title = 'Application Volume',
  showHired = true,
}: ApplicationVolumeChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </Card>
    )
  }

  // Format dates for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  // Calculate totals
  const totalApplications = data.reduce((sum, d) => sum + d.count, 0)
  const totalHired = data.reduce((sum, d) => sum + d.hiredCount, 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total: </span>
            <span className="font-semibold">{totalApplications}</span>
          </div>
          {showHired && (
            <div>
              <span className="text-gray-500">Hired: </span>
              <span className="font-semibold text-green-600">{totalHired}</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="count"
              name="Applications"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorApplications)"
              strokeWidth={2}
            />
            {showHired && (
              <Area
                type="monotone"
                dataKey="hiredCount"
                name="Hired"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorHired)"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
