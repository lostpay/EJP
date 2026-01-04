import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { Layers } from 'lucide-react'

interface SkillCategory {
  category: string
  count: number
  percentage: number
}

interface SkillCategoryChartProps {
  data: SkillCategory[]
  title?: string
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

export function SkillCategoryChart({
  data,
  title = 'Skills by Category',
}: SkillCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-purple-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <p className="text-gray-500 text-center py-8">No category data available</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <span className="text-sm text-gray-500">{data.length} categories</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as unknown as Record<string, unknown>[]}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="category"
              label={({ name, percent }) =>
                (percent || 0) > 0.05 ? `${name} (${Math.round((percent || 0) * 100)}%)` : ''
              }
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} skills`, 'Count']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category List */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-2">
          {data.slice(0, 4).map((cat, index) => (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-600 truncate">{cat.category}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
