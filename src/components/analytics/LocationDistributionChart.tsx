import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardTitle, Badge } from '@/components/ui'
import { MapPin } from 'lucide-react'

interface LocationData {
  location: string
  count: number
  percentage: number
}

interface LocationDistributionChartProps {
  data: LocationData[]
  title?: string
  showRemote?: boolean
  remoteCount?: number
}

export function LocationDistributionChart({
  data,
  title = 'Top Locations',
  showRemote = true,
  remoteCount = 0,
}: LocationDistributionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <p className="text-gray-500 text-center py-8">No location data available</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        {showRemote && remoteCount > 0 && (
          <Badge variant="primary" size="sm">
            {remoteCount} Remote
          </Badge>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.slice(0, 8)}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="location"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              angle={-30}
              textAnchor="end"
              height={60}
              interval={0}
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
              formatter={(value, _name, props) => [
                `${value} jobs (${(props.payload as LocationData).percentage}%)`,
                'Count',
              ]}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Location Summary */}
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Top Location:</span>
          <p className="font-semibold text-gray-900">
            {data[0]?.location || 'N/A'}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Total Locations:</span>
          <p className="font-semibold text-gray-900">{data.length}</p>
        </div>
      </div>
    </Card>
  )
}
