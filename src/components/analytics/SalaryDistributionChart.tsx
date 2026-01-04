import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { DollarSign } from 'lucide-react'

interface SalaryRange {
  range: string
  count: number
  minSalary: number
  maxSalary: number
}

interface SalaryDistributionChartProps {
  data: SalaryRange[]
  title?: string
}

const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']

export function SalaryDistributionChart({
  data,
  title = 'Salary Distribution',
}: SalaryDistributionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <p className="text-gray-500 text-center py-8">
          Not enough salary data available
        </p>
      </Card>
    )
  }

  const totalJobs = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <span className="text-sm text-gray-500">{totalJobs} jobs with salary data</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              type="category"
              dataKey="range"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} jobs`, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Most common range:</span>
          <span className="font-semibold text-gray-900">
            {data.length > 0 ? data.reduce((max, d) => (d.count > max.count ? d : max), data[0]).range : 'N/A'}
          </span>
        </div>
      </div>
    </Card>
  )
}
