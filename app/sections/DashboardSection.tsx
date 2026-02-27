'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { callAIAgent } from '@/lib/aiAgent'
import {
  listSchedules,
  getScheduleLogs,
  pauseSchedule,
  resumeSchedule,
  triggerScheduleNow,
  cronToHuman,
  type Schedule,
  type ExecutionLog,
} from '@/lib/scheduler'
import {
  HiOutlineCalendar,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineBeaker,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowRight,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2'

// Types
interface TrackedItem {
  title: string
  category: string
  date: string
  description: string
  status: string
}

interface ResearchItem {
  title: string
  category: string
  summary: string
  key_facts: string[]
  source: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  content: string
  timestamp: string
  category?: string
  trackedItems?: TrackedItem[]
  researchItems?: ResearchItem[]
  recommendations?: string[]
}

interface DigestData {
  greeting: string
  date: string
  urgent_items: { title: string; category: string; date: string; urgency: string }[]
  upcoming_items: { title: string; category: string; date: string; description: string }[]
  stats: { total_upcoming: number; exams_count: number; assignments_count: number; events_count: number }
  tip_of_the_day: string
  summary: string
}

interface DashboardSectionProps {
  trackedItems: TrackedItem[]
  researchItems: ResearchItem[]
  chatMessages: ChatMessage[]
  sessionId: string
  onNavigateChat: () => void
  showSample: boolean
  onRefreshItems: () => void
}

const DIGEST_AGENT_ID = '69a15d3ee64a6ab5efd55bc0'
const SCHEDULE_ID_INITIAL = '69a15d4325d4d77f732eb773'

const SAMPLE_DIGEST: DigestData = {
  greeting: 'Good morning! Here is your daily study digest.',
  date: 'Thursday, February 27, 2026',
  urgent_items: [
    { title: 'Physics Lab Report', category: 'Assignment', date: '2026-02-27', urgency: 'today' },
    { title: 'Calculus Quiz', category: 'Exam', date: '2026-02-28', urgency: 'tomorrow' },
  ],
  upcoming_items: [
    { title: 'CS Project Milestone 2', category: 'Project', date: '2026-03-02', description: 'Submit database schema and API design' },
    { title: 'Literature Essay Draft', category: 'Assignment', date: '2026-03-04', description: 'First draft of comparative analysis' },
    { title: 'Study Group Meeting', category: 'Event', date: '2026-03-01', description: 'Weekly stats review session' },
  ],
  stats: { total_upcoming: 8, exams_count: 2, assignments_count: 4, events_count: 2 },
  tip_of_the_day: 'Try the Pomodoro technique: 25 minutes of focused study followed by a 5-minute break. It helps maintain concentration over long study sessions.',
  summary: 'You have 2 urgent items due today and tomorrow, plus 3 more coming up this week.',
}

const SAMPLE_TRACKED: TrackedItem[] = [
  { title: 'Physics Lab Report', category: 'Assignment', date: '2026-02-27', description: 'Lab report for experiment #5', status: 'upcoming' },
  { title: 'Calculus Quiz', category: 'Exam', date: '2026-02-28', description: 'Chapter 5-7 quiz', status: 'upcoming' },
  { title: 'CS Project Milestone 2', category: 'Project', date: '2026-03-02', description: 'Submit database schema and API design', status: 'upcoming' },
]

function getCategoryIcon(category: string) {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('exam') || cat.includes('academic') || cat.includes('assignment') || cat.includes('project')) {
    return <HiOutlineAcademicCap className="h-3.5 w-3.5" />
  }
  if (cat.includes('career') || cat.includes('internship') || cat.includes('job')) {
    return <HiOutlineBriefcase className="h-3.5 w-3.5" />
  }
  if (cat.includes('research') || cat.includes('college')) {
    return <HiOutlineBeaker className="h-3.5 w-3.5" />
  }
  return <HiOutlineCalendar className="h-3.5 w-3.5" />
}

function getCategoryStyle(category: string) {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('exam') || cat.includes('academic') || cat.includes('assignment') || cat.includes('project')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (cat.includes('career') || cat.includes('internship') || cat.includes('job')) {
    return 'bg-sky-100 text-sky-700 border-sky-200'
  }
  if (cat.includes('research') || cat.includes('college')) {
    return 'bg-teal-100 text-teal-700 border-teal-200'
  }
  return 'bg-lime-100 text-lime-700 border-lime-200'
}

function getUrgencyStyle(urgency: string) {
  const u = urgency?.toLowerCase() || ''
  if (u === 'overdue') return 'bg-red-100 text-red-700 border-red-200'
  if (u === 'today') return 'bg-orange-100 text-orange-700 border-orange-200'
  if (u === 'tomorrow') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function getStatusDot(status: string) {
  const s = status?.toLowerCase() || ''
  if (s === 'overdue') return 'bg-red-500'
  if (s === 'completed') return 'bg-muted-foreground'
  return 'bg-emerald-500'
}

export default function DashboardSection({
  trackedItems,
  researchItems,
  chatMessages,
  sessionId,
  onNavigateChat,
  showSample,
  onRefreshItems,
}: DashboardSectionProps) {
  const [digestData, setDigestData] = useState<DigestData | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestError, setDigestError] = useState<string | null>(null)

  // Schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleId, setScheduleId] = useState(SCHEDULE_ID_INITIAL)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [triggering, setTriggering] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const result = await listSchedules()
      if (result.success && Array.isArray(result.schedules)) {
        const found = result.schedules.find((s) => s.id === scheduleId)
        if (found) {
          setSchedule(found)
        } else if (result.schedules.length > 0) {
          setSchedule(result.schedules[0])
          setScheduleId(result.schedules[0].id)
        }
      }
      const logsResult = await getScheduleLogs(scheduleId, { limit: 5 })
      if (logsResult.success && Array.isArray(logsResult.executions)) {
        setLogs(logsResult.executions)
      }
    } catch {
      // ignore
    }
    setScheduleLoading(false)
  }, [scheduleId])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggling(true)
    if (schedule.is_active) {
      await pauseSchedule(schedule.id)
    } else {
      await resumeSchedule(schedule.id)
    }
    await loadSchedule()
    setToggling(false)
  }

  const handleTriggerNow = async () => {
    if (!scheduleId) return
    setTriggering(true)
    await triggerScheduleNow(scheduleId)
    setTriggering(false)
    setTimeout(() => loadSchedule(), 3000)
  }

  const handleLoadDigest = async () => {
    setDigestLoading(true)
    setDigestError(null)
    try {
      const result = await callAIAgent('Generate my daily digest summary for today', DIGEST_AGENT_ID, { session_id: sessionId })
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try { data = JSON.parse(data) } catch { data = { summary: data } }
        }
        if (data) {
          setDigestData({
            greeting: data?.greeting ?? '',
            date: data?.date ?? currentDate,
            urgent_items: Array.isArray(data?.urgent_items) ? data.urgent_items : [],
            upcoming_items: Array.isArray(data?.upcoming_items) ? data.upcoming_items : [],
            stats: {
              total_upcoming: data?.stats?.total_upcoming ?? 0,
              exams_count: data?.stats?.exams_count ?? 0,
              assignments_count: data?.stats?.assignments_count ?? 0,
              events_count: data?.stats?.events_count ?? 0,
            },
            tip_of_the_day: data?.tip_of_the_day ?? '',
            summary: data?.summary ?? '',
          })
        }
      } else {
        setDigestError(result?.error ?? 'Failed to load digest')
      }
    } catch (e) {
      setDigestError('Failed to fetch digest')
    }
    setDigestLoading(false)
  }

  const displayDigest = showSample ? SAMPLE_DIGEST : digestData

  // Compute stats from ACTUAL tracked items (the real data source)
  const displayTracked = showSample && trackedItems.length === 0 ? SAMPLE_TRACKED : trackedItems
  const liveStats = useMemo(() => {
    const assignments = displayTracked.filter(t => {
      const c = t.category?.toLowerCase() || ''
      return c.includes('assignment')
    }).length
    const exams = displayTracked.filter(t => {
      const c = t.category?.toLowerCase() || ''
      return c.includes('exam')
    }).length
    const events = displayTracked.filter(t => {
      const c = t.category?.toLowerCase() || ''
      return c.includes('event') || c.includes('extracurricular')
    }).length
    const projects = displayTracked.filter(t => {
      const c = t.category?.toLowerCase() || ''
      return c.includes('project')
    }).length
    return {
      assignments: assignments + projects,
      exams,
      events,
      research: researchItems.length,
      total: displayTracked.length + researchItems.length,
    }
  }, [displayTracked, researchItems])

  const recentChats = chatMessages.filter((m) => m.sender === 'assistant').slice(-3)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Greeting Banner */}
      <div className="bg-card rounded-[0.625rem] border border-border p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground font-sans">
              Welcome to StudentLife
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <HiOutlineCalendar className="h-4 w-4" />
              {currentDate || 'Loading...'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshItems}
            className="text-xs flex items-center gap-1.5"
          >
            <HiOutlineArrowRight className="h-3.5 w-3.5 rotate-[225deg]" />
            Sync Items
          </Button>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - 3/5 */}
        <div className="lg:col-span-3 space-y-6">
          {/* YOUR TRACKED ITEMS - directly from shared state */}
          {displayTracked.length > 0 && (
            <Card className="bg-card border border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <HiOutlineClipboardDocumentList className="h-5 w-5 text-primary" />
                    Your Tracked Items
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{displayTracked.length} item{displayTracked.length !== 1 ? 's' : ''}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayTracked.slice(0, 5).map((item, i) => (
                    <div
                      key={`tracked-dash-${i}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${getStatusDot(item?.status ?? '')}`} />
                        {getCategoryIcon(item?.category ?? '')}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground truncate">{item?.description ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <Badge className={`text-[10px] px-2 py-0.5 border ${getCategoryStyle(item?.category ?? '')}`}>
                          {item?.category ?? 'General'}
                        </Badge>
                        {item?.date && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {displayTracked.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{displayTracked.length - 5} more items in My Tracker
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Digest Card */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <HiOutlineSparkles className="h-5 w-5 text-primary" />
                  Daily Digest
                </CardTitle>
                {!showSample && !digestData && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadDigest}
                    disabled={digestLoading}
                    className="text-xs"
                  >
                    {digestLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load Digest'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {digestError && (
                <p className="text-sm text-red-600">{digestError}</p>
              )}
              {!displayDigest && !digestLoading && !digestError && (
                <div className="text-center py-8 text-muted-foreground">
                  <HiOutlineSparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click &quot;Load Digest&quot; to fetch your daily summary</p>
                </div>
              )}
              {digestLoading && !displayDigest && (
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                </div>
              )}
              {displayDigest && (
                <div className="space-y-5">
                  {displayDigest.greeting && (
                    <p className="text-sm text-foreground">{displayDigest.greeting}</p>
                  )}
                  {displayDigest.summary && (
                    <p className="text-sm text-muted-foreground italic">{displayDigest.summary}</p>
                  )}

                  {/* Urgent Items */}
                  {Array.isArray(displayDigest.urgent_items) && displayDigest.urgent_items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-3">
                        <HiOutlineExclamationTriangle className="h-4 w-4" />
                        Urgent Items
                      </h3>
                      <div className="space-y-2">
                        {displayDigest.urgent_items.map((item, i) => (
                          <div
                            key={`urgent-${i}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                          >
                            <div className="flex items-center gap-3">
                              {getCategoryIcon(item?.category ?? '')}
                              <div>
                                <p className="text-sm font-medium text-foreground">{item?.title ?? 'Untitled'}</p>
                                <p className="text-xs text-muted-foreground">{item?.date ?? ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] px-2 py-0.5 border ${getCategoryStyle(item?.category ?? '')}`}>
                                {item?.category ?? 'General'}
                              </Badge>
                              <Badge className={`text-[10px] px-2 py-0.5 border ${getUrgencyStyle(item?.urgency ?? '')}`}>
                                {item?.urgency ?? 'upcoming'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Items */}
                  {Array.isArray(displayDigest.upcoming_items) && displayDigest.upcoming_items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                        <HiOutlineCalendar className="h-4 w-4 text-primary" />
                        Upcoming This Week
                      </h3>
                      <div className="space-y-2">
                        {displayDigest.upcoming_items.map((item, i) => (
                          <div
                            key={`upcoming-${i}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {getCategoryIcon(item?.category ?? '')}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</p>
                                <p className="text-xs text-muted-foreground truncate">{item?.description ?? ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              <Badge className={`text-[10px] px-2 py-0.5 border ${getCategoryStyle(item?.category ?? '')}`}>
                                {item?.category ?? 'General'}
                              </Badge>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{item?.date ?? ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tip of the Day */}
                  {displayDigest.tip_of_the_day && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
                        <HiOutlineSparkles className="h-3.5 w-3.5" />
                        Tip of the Day
                      </p>
                      <p className="text-sm text-foreground/90">{displayDigest.tip_of_the_day}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 2/5 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats - ALWAYS uses live trackedItems data */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Assignments',
                    value: liveStats.assignments,
                    icon: <HiOutlineAcademicCap className="h-4 w-4 text-emerald-600" />,
                  },
                  {
                    label: 'Exams',
                    value: liveStats.exams,
                    icon: <HiOutlineAcademicCap className="h-4 w-4 text-sky-600" />,
                  },
                  {
                    label: 'Events',
                    value: liveStats.events,
                    icon: <HiOutlineCalendar className="h-4 w-4 text-teal-600" />,
                  },
                  {
                    label: 'Research',
                    value: liveStats.research,
                    icon: <HiOutlineBeaker className="h-4 w-4 text-lime-600" />,
                  },
                ].map((stat, i) => (
                  <div
                    key={`stat-${i}`}
                    className="p-3 rounded-lg bg-secondary/50 border border-border text-center"
                  >
                    <div className="flex items-center justify-center mb-1">{stat.icon}</div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Chat Preview */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HiOutlineChatBubbleLeftRight className="h-4 w-4 text-primary" />
                  Recent Chats
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentChats.length === 0 && !showSample ? (
                <p className="text-xs text-muted-foreground text-center py-4">No chats yet. Start a conversation!</p>
              ) : (
                <div className="space-y-2">
                  {(showSample && recentChats.length === 0
                    ? [
                        { id: 's1', sender: 'assistant' as const, content: 'I have added your Physics Lab Report due Feb 27 to your tracker.', timestamp: '', category: 'academic' },
                        { id: 's2', sender: 'assistant' as const, content: 'Here are the top 5 engineering colleges with strong CS programs...', timestamp: '', category: 'career' },
                      ]
                    : recentChats
                  ).map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-lg bg-secondary/30 border border-border"
                    >
                      <p className="text-xs text-foreground/90 line-clamp-2">{msg.content}</p>
                      {msg.category && (
                        <Badge className={`text-[9px] px-1.5 py-0 mt-1.5 border ${getCategoryStyle(msg.category)}`}>
                          {msg.category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Manager */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HiOutlineClock className="h-4 w-4 text-primary" />
                Daily Digest Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleLoading && !schedule ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Every day at 7:00'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Timezone: {schedule?.timezone ?? 'America/New_York'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {schedule?.is_active ? 'Active' : 'Paused'}
                      </span>
                      <Switch
                        checked={schedule?.is_active ?? false}
                        onCheckedChange={handleToggleSchedule}
                        disabled={toggling}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${schedule?.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <span className="text-[10px] text-muted-foreground">
                      {schedule?.is_active ? 'Schedule is active' : 'Schedule is paused'}
                    </span>
                  </div>
                  {schedule?.next_run_time && (
                    <p className="text-[10px] text-muted-foreground">
                      Next run: {new Date(schedule.next_run_time).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTriggerNow}
                      disabled={triggering}
                      className="text-xs flex-1"
                    >
                      {triggering ? (
                        <span className="flex items-center gap-1">
                          <span className="h-3 w-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                          Running...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <HiOutlinePlay className="h-3 w-3" />
                          Run Now
                        </span>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadSchedule}
                      disabled={scheduleLoading}
                      className="text-xs"
                    >
                      Refresh
                    </Button>
                  </div>

                  {/* Recent Logs */}
                  {Array.isArray(logs) && logs.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-[10px] text-muted-foreground font-semibold mb-2">Recent Runs</p>
                      <div className="space-y-1">
                        {logs.slice(0, 3).map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">
                              {log.executed_at ? new Date(log.executed_at).toLocaleString() : 'Unknown'}
                            </span>
                            <span className={log.success ? 'text-emerald-600' : 'text-red-600'}>
                              {log.success ? 'Success' : 'Failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={onNavigateChat}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center transition-all duration-300 hover:scale-105 z-40"
      >
        <HiOutlineChatBubbleLeftRight className="h-6 w-6" />
      </button>
    </div>
  )
}

// end of DashboardSection
