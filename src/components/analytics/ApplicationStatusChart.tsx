import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { ApplicationStats } from '@/services/analyticsService'
import { STATUS_LABELS } from '@/types'

interface ApplicationStatusChartProps {
  stats: ApplicationStats
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#3B82F6',     // blue-500
  reviewing: '#F59E0B',   // amber-500
  interview: '#8B5CF6',   // violet-500
  offered: '#10B981',     // emerald-500
  rejected: '#EF4444',    // red-500
  withdrawn: '#6B7280',   // gray-500
}

export function ApplicationStatusChart({ stats }: ApplicationStatusChartProps) {
  const data = [
    { name: STATUS_LABELS.pending, value: stats.pending, key: 'pending' },
    { name: STATUS_LABELS.reviewing, value: stats.reviewing, key: 'reviewing' },
    { name: STATUS_LABELS.interview, value: stats.interview, key: 'interview' },
    { name: STATUS_LABELS.offered, value: stats.offered, key: 'offered' },
    { name: STATUS_LABELS.rejected, value: stats.rejected, key: 'rejected' },
    { name: STATUS_LABELS.withdrawn, value: stats.withdrawn, key: 'withdrawn' },
  ].filter((item) => item.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No application data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={STATUS_COLORS[entry.key]}
              stroke={STATUS_COLORS[entry.key]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} applications`, 'Count']}
        />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
