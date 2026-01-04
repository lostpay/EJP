import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui'
import type { JobPipelineComparison } from '@/services/pipelineAnalyticsService'

interface JobComparisonTableProps {
  data: JobPipelineComparison[]
  title?: string
}

export function JobComparisonTable({
  data,
  title = 'Job Pipeline Comparison',
}: JobComparisonTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No jobs to compare</p>
      </Card>
    )
  }

  // Calculate averages for comparison
  const avgApplicants =
    data.reduce((sum, j) => sum + j.totalApplicants, 0) / data.length
  const avgConversion =
    data.reduce((sum, j) => sum + j.conversionRate, 0) / data.length
  const avgTimeToHire =
    data.filter((j) => j.averageTimeToHire !== null).reduce(
      (sum, j) => sum + (j.averageTimeToHire || 0),
      0
    ) / data.filter((j) => j.averageTimeToHire !== null).length || 0

  const getComparisonIcon = (value: number, average: number, inverse = false) => {
    const diff = value - average
    const isGood = inverse ? diff < 0 : diff > 0

    if (Math.abs(diff) < average * 0.1) {
      return <Minus className="h-4 w-4 text-gray-400" />
    }

    if (isGood) {
      return <ArrowUp className="h-4 w-4 text-green-500" />
    }

    return <ArrowDown className="h-4 w-4 text-red-500" />
  }

  const getConversionBadgeColor = (rate: number) => {
    if (rate >= 10) return 'bg-green-100 text-green-700'
    if (rate >= 5) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Job Title
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                Applicants
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                Conversion Rate
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                Avg. Time to Hire
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                vs Average
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((job) => (
              <tr key={job.jobId} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <span className="font-medium text-gray-900">{job.jobTitle}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-semibold">{job.totalApplicants}</span>
                    {getComparisonIcon(job.totalApplicants, avgApplicants)}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getConversionBadgeColor(
                      job.conversionRate
                    )}`}
                  >
                    {job.conversionRate}%
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-gray-600">
                  {job.averageTimeToHire !== null ? (
                    <div className="flex items-center justify-center gap-1">
                      <span>{job.averageTimeToHire} days</span>
                      {getComparisonIcon(job.averageTimeToHire, avgTimeToHire, true)}
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  {job.conversionRate > avgConversion ? (
                    <span className="text-green-600 text-sm font-medium">
                      Above avg
                    </span>
                  ) : job.conversionRate < avgConversion ? (
                    <span className="text-red-600 text-sm font-medium">
                      Below avg
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Average</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-700">
                Average
              </td>
              <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                {Math.round(avgApplicants)}
              </td>
              <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                {avgConversion.toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                {avgTimeToHire > 0 ? `${Math.round(avgTimeToHire)} days` : 'N/A'}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
