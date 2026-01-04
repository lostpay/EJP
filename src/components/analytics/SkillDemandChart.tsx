import { Link } from 'react-router-dom'
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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { SkillDemand } from '@/services/analyticsService'

interface SkillDemandChartProps {
  skills: SkillDemand[]
  showTrend?: boolean
}

export function SkillDemandChart({ skills, showTrend = true }: SkillDemandChartProps) {
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No skill demand data available
      </div>
    )
  }

  // Take top 10 for the chart
  const chartData = skills.slice(0, 10)

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis
            type="category"
            dataKey="skill_name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#374151' }}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} job postings`, 'Demand']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.skill_id}
                fill={index < 3 ? '#3B82F6' : index < 6 ? '#60A5FA' : '#93C5FD'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {showTrend && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">All Skills with Trends</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {skills.map((skill) => (
              <Link
                key={skill.skill_id}
                to={`/jobs?skill=${encodeURIComponent(skill.skill_name)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700 group-hover:text-primary-600 truncate">
                  {skill.skill_name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">{skill.count}</span>
                  <TrendIcon trend={skill.trend} />
                  <span
                    className={`text-xs ${
                      skill.trend === 'up'
                        ? 'text-green-600'
                        : skill.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {skill.change_percentage > 0 ? '+' : ''}
                    {skill.change_percentage}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
