import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, Download, RefreshCw } from 'lucide-react'
import { Card, Button, Select, Spinner } from '@/components/ui'
import {
  PipelineFunnelChart,
  ConversionRatesCard,
  PipelineMetricsCard,
  ApplicationVolumeChart,
  JobComparisonTable,
} from '@/components/analytics'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'
import {
  pipelineAnalyticsService,
  type PipelineFunnelData,
  type StageConversion,
  type PipelineMetrics,
  type ApplicationVolumeData,
  type JobPipelineComparison,
} from '@/services/pipelineAnalyticsService'
import toast from 'react-hot-toast'

interface JobOption {
  id: string
  title: string
}

export function PipelineAnalytics() {
  const { company } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('30')
  const [jobs, setJobs] = useState<JobOption[]>([])

  // Analytics data
  const [funnelData, setFunnelData] = useState<PipelineFunnelData[]>([])
  const [conversions, setConversions] = useState<StageConversion[]>([])
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null)
  const [volumeData, setVolumeData] = useState<ApplicationVolumeData[]>([])
  const [jobComparison, setJobComparison] = useState<JobPipelineComparison[]>([])

  useEffect(() => {
    if (company) {
      fetchJobs()
    }
  }, [company])

  useEffect(() => {
    if (company) {
      fetchAnalytics()
    }
  }, [company, selectedJobId, timeRange])

  const fetchJobs = async () => {
    if (!company) return

    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
      return
    }

    setJobs(data || [])
  }

  const fetchAnalytics = async () => {
    if (!company) return

    setIsLoading(true)

    try {
      const [funnel, convs, mets, volume, comparison] = await Promise.all([
        pipelineAnalyticsService.getPipelineFunnel(
          company.id,
          selectedJobId || undefined
        ),
        pipelineAnalyticsService.getStageConversions(
          company.id,
          selectedJobId || undefined
        ),
        pipelineAnalyticsService.getPipelineMetrics(
          company.id,
          selectedJobId || undefined
        ),
        pipelineAnalyticsService.getApplicationVolume(
          company.id,
          parseInt(timeRange),
          selectedJobId || undefined
        ),
        pipelineAnalyticsService.compareJobPipelines(
          company.id,
          jobs.map((j) => j.id)
        ),
      ])

      setFunnelData(funnel)
      setConversions(convs)
      setMetrics(mets)
      setVolumeData(volume)
      setJobComparison(comparison)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAnalytics()
    setIsRefreshing(false)
    toast.success('Analytics refreshed')
  }

  const handleExportCSV = () => {
    // Create CSV content from metrics
    const csvContent = [
      ['Pipeline Analytics Export', new Date().toISOString()],
      [],
      ['Metric', 'Value'],
      ['Total Applicants', metrics?.totalApplicants || 0],
      ['Active Applicants', metrics?.activeApplicants || 0],
      ['Conversion Rate', `${metrics?.conversionRate || 0}%`],
      ['Average Time to Hire', metrics?.averageTimeToHire || 'N/A'],
      [],
      ['Funnel Stage', 'Count', 'Percentage', 'Drop-off Rate'],
      ...funnelData.map((f) => [f.label, f.count, `${f.percentage}%`, `${f.dropOffRate}%`]),
      [],
      ['Conversion', 'Rate', 'Avg. Days'],
      ...conversions.map((c) => [
        `${c.fromStage} → ${c.toStage}`,
        `${c.conversionRate}%`,
        c.averageTimeInDays,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pipeline-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics exported')
  }

  const jobOptions = [
    { value: '', label: 'All Jobs' },
    ...jobs.map((job) => ({ value: job.id, label: job.title })),
  ]

  const timeRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
  ]

  if (isLoading && !metrics) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/company"
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary-600" />
            Pipeline Analytics
          </h1>
          <p className="text-gray-600">
            Analyze your hiring funnel and optimize recruitment
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Job Posting"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              options={jobOptions}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Time Range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={timeRangeOptions}
            />
          </div>
        </div>
      </Card>

      {/* Metrics Overview */}
      {metrics && <PipelineMetricsCard metrics={metrics} />}

      {/* Funnel and Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineFunnelChart data={funnelData} />
        <ConversionRatesCard conversions={conversions} />
      </div>

      {/* Application Volume */}
      <ApplicationVolumeChart data={volumeData} />

      {/* Job Comparison */}
      {!selectedJobId && jobComparison.length > 0 && (
        <JobComparisonTable data={jobComparison} />
      )}

      {/* Insights */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bottleneck Detection */}
          {funnelData.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">
                Potential Bottleneck
              </h4>
              <p className="text-sm text-amber-700">
                {(() => {
                  const maxDropOff = funnelData.reduce(
                    (max, f) => (f.dropOffRate > max.dropOffRate ? f : max),
                    funnelData[0]
                  )
                  return `Highest drop-off (${maxDropOff.dropOffRate}%) occurs at the ${maxDropOff.label} stage.`
                })()}
              </p>
            </div>
          )}

          {/* Conversion Insight */}
          {metrics && (
            <div
              className={`p-4 rounded-lg border ${
                metrics.conversionRate >= 5
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  metrics.conversionRate >= 5 ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {metrics.conversionRate >= 5
                  ? 'Good Conversion'
                  : 'Low Conversion'}
              </h4>
              <p
                className={`text-sm ${
                  metrics.conversionRate >= 5 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {metrics.conversionRate >= 5
                  ? `Your ${metrics.conversionRate}% conversion rate is above industry average.`
                  : `Consider improving your screening process to boost the ${metrics.conversionRate}% conversion rate.`}
              </p>
            </div>
          )}

          {/* Time to Hire Insight */}
          {metrics?.averageTimeToHire && (
            <div
              className={`p-4 rounded-lg border ${
                metrics.averageTimeToHire <= 21
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  metrics.averageTimeToHire <= 21
                    ? 'text-green-800'
                    : 'text-amber-800'
                }`}
              >
                Time to Hire
              </h4>
              <p
                className={`text-sm ${
                  metrics.averageTimeToHire <= 21
                    ? 'text-green-700'
                    : 'text-amber-700'
                }`}
              >
                {metrics.averageTimeToHire <= 21
                  ? `${metrics.averageTimeToHire} days average is competitive.`
                  : `Consider streamlining your process to reduce the ${metrics.averageTimeToHire} day average.`}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
