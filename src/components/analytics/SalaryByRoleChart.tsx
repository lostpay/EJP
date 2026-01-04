import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { DollarSign, Info, TrendingUp, Users, RefreshCw } from 'lucide-react'
import { Card, CardTitle, Button, Spinner, Select } from '@/components/ui'
import {
  analyticsService,
  type RoleSalaryInsight,
} from '@/services/analyticsService'

interface SalaryByRoleChartProps {
  initialRoles?: string[]
  showFilters?: boolean
  maxRoles?: number
}

export function SalaryByRoleChart({
  initialRoles,
  showFilters = true,
  maxRoles = 10,
}: SalaryByRoleChartProps) {
  const [data, setData] = useState<RoleSalaryInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [location, setLocation] = useState('')
  const [days, setDays] = useState(90)
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [location, days, initialRoles])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const result = await analyticsService.getSalaryByRole({
        days,
        location: location || undefined,
        roles: initialRoles,
        minSampleSize: 2,
      })
      setData(result.slice(0, maxRoles))
    } catch (error) {
      console.error('Error fetching salary by role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleRoleSelection = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) {
        next.delete(role)
      } else if (next.size < 5) {
        // Max 5 selections for comparison
        next.add(role)
      }
      return next
    })
  }

  const formatSalary = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${Math.round(value / 1000)}K`
    }
    return `$${value}`
  }

  const formatSalaryFull = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Prepare chart data with error bars for range visualization
  const chartData = data.map((role) => ({
    ...role,
    shortRole: role.role.length > 20 ? role.role.substring(0, 20) + '...' : role.role,
    rangeWidth: role.p75 - role.p25, // IQR for error bar
  }))

  // Selected roles for comparison
  const comparisonData = data.filter((d) => selectedRoles.has(d.role))

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-500" />
          <CardTitle>Salary Insights by Role</CardTitle>
        </div>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-500" />
          <CardTitle>Salary Insights by Role</CardTitle>
        </div>
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Not enough salary data available</p>
          <p className="text-sm text-gray-500">
            Try adjusting filters or check back later
          </p>
        </div>
      </Card>
    )
  }

  // Calculate overall market statistics
  const allMedians = data.map((d) => d.median)
  const marketMedian = allMedians.length > 0
    ? allMedians.reduce((a, b) => a + b, 0) / allMedians.length
    : 0
  const totalSampleSize = data.reduce((sum, d) => sum + d.sampleSize, 0)

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          <CardTitle>Salary Insights by Role</CardTitle>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          {totalSampleSize} jobs analyzed
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="w-32">
            <Select
              label="Period"
              value={days.toString()}
              onChange={(e) => setDays(parseInt(e.target.value))}
              options={[
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
                { value: '180', label: '6 months' },
              ]}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Median salary</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-1.5 bg-green-200 rounded" />
          <span>25th - 75th percentile</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 border-t-2 border-dashed border-amber-500" />
          <span>Market average</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal />
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatSalary}
            />
            <YAxis
              type="category"
              dataKey="shortRole"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload as RoleSalaryInsight & { shortRole: string }
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
                    <p className="font-semibold text-gray-900 mb-2">{data.role}</p>
                    <div className="space-y-1 text-gray-600">
                      <p>
                        <span className="text-gray-500">Median:</span>{' '}
                        <span className="font-medium">{formatSalaryFull(data.median)}</span>
                      </p>
                      <p>
                        <span className="text-gray-500">25th percentile:</span>{' '}
                        {formatSalaryFull(data.p25)}
                      </p>
                      <p>
                        <span className="text-gray-500">75th percentile:</span>{' '}
                        {formatSalaryFull(data.p75)}
                      </p>
                      <p>
                        <span className="text-gray-500">Range:</span>{' '}
                        {formatSalaryFull(data.min)} - {formatSalaryFull(data.max)}
                      </p>
                      <p className="pt-1 border-t mt-1">
                        <span className="text-gray-500">Sample size:</span>{' '}
                        <span className="font-medium">{data.sampleSize} jobs</span>
                      </p>
                    </div>
                  </div>
                )
              }}
            />
            <ReferenceLine
              x={marketMedian}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            {/* Background bar for range */}
            <Bar dataKey="p75" fill="#BBF7D0" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`range-${index}`}
                  fill={selectedRoles.has(entry.role) ? '#86EFAC' : '#BBF7D0'}
                  cursor="pointer"
                  onClick={() => toggleRoleSelection(entry.role)}
                />
              ))}
            </Bar>
            {/* Median bar overlay */}
            <Bar dataKey="median" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`median-${index}`}
                  fill={selectedRoles.has(entry.role) ? '#16A34A' : '#22C55E'}
                  cursor="pointer"
                  onClick={() => toggleRoleSelection(entry.role)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Role Comparison */}
      {selectedRoles.size > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              Role Comparison
            </h4>
            <button
              onClick={() => setSelectedRoles(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Role</th>
                  <th className="text-right py-2 font-medium text-gray-600">Median</th>
                  <th className="text-right py-2 font-medium text-gray-600">25th</th>
                  <th className="text-right py-2 font-medium text-gray-600">75th</th>
                  <th className="text-right py-2 font-medium text-gray-600">Sample</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((role) => (
                  <tr key={role.role} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{role.role}</td>
                    <td className="text-right py-2 text-green-600 font-semibold">
                      {formatSalaryFull(role.median)}
                    </td>
                    <td className="text-right py-2 text-gray-600">
                      {formatSalaryFull(role.p25)}
                    </td>
                    <td className="text-right py-2 text-gray-600">
                      {formatSalaryFull(role.p75)}
                    </td>
                    <td className="text-right py-2 text-gray-500">{role.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t flex items-start gap-2 text-xs text-gray-500">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Salary data is based on {totalSampleSize} job postings from the last {days} days.
          Click on bars to compare roles. Percentiles show salary distribution - 25th percentile means
          25% of jobs pay less than this amount.
        </p>
      </div>
    </Card>
  )
}
