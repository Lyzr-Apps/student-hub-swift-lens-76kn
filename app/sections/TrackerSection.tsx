'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineBeaker,
  HiOutlineCalendar,
  HiOutlineMagnifyingGlass,
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

interface TrackerSectionProps {
  trackedItems: TrackedItem[]
  researchItems: ResearchItem[]
  showSample: boolean
  onNavigateChat: () => void
}

const SAMPLE_TRACKED: TrackedItem[] = [
  { title: 'Physics Lab Report', category: 'Assignment', date: '2026-02-27', description: 'Lab report for experiment #5', status: 'upcoming' },
  { title: 'Calculus Quiz', category: 'Exam', date: '2026-02-28', description: 'Chapter 5-7 quiz', status: 'upcoming' },
  { title: 'CS Project Milestone 2', category: 'Project', date: '2026-03-02', description: 'Submit database schema and API design', status: 'upcoming' },
  { title: 'Literature Essay Draft', category: 'Assignment', date: '2026-03-04', description: 'First draft of comparative analysis', status: 'upcoming' },
  { title: 'Linear Algebra Homework', category: 'Assignment', date: '2026-02-20', description: 'Problem set 6', status: 'completed' },
]

const SAMPLE_RESEARCH: ResearchItem[] = [
  { title: 'MIT', category: 'College', summary: 'World-leading CS program with strengths in AI and robotics.', key_facts: ['#1 ranked CS globally', 'Strong startup ecosystem'], source: 'US News Rankings' },
  { title: 'Stanford University', category: 'College', summary: 'Silicon Valley location with unparalleled industry access.', key_facts: ['Top 3 CS program', 'Close ties to tech industry'], source: 'QS World Rankings' },
  { title: 'Software Engineering Internships', category: 'Internship', summary: 'Overview of top SWE internship programs for undergrads.', key_facts: ['Apply by October', 'Focus on data structures prep'], source: 'Career Services' },
]

function getCategoryIcon(category: string) {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('exam') || cat.includes('academic') || cat.includes('assignment') || cat.includes('project') || cat.includes('deadline')) {
    return <HiOutlineAcademicCap className="h-4 w-4" />
  }
  if (cat.includes('career') || cat.includes('internship') || cat.includes('job')) {
    return <HiOutlineBriefcase className="h-4 w-4" />
  }
  if (cat.includes('research') || cat.includes('college')) {
    return <HiOutlineBeaker className="h-4 w-4" />
  }
  return <HiOutlineCalendar className="h-4 w-4" />
}

function getCategoryStyle(category: string) {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('exam') || cat.includes('academic') || cat.includes('assignment') || cat.includes('project') || cat.includes('deadline')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }
  if (cat.includes('career') || cat.includes('internship') || cat.includes('job')) {
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }
  if (cat.includes('research') || cat.includes('college')) {
    return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
  }
  return 'bg-lime-500/20 text-lime-400 border-lime-500/30'
}

function getStatusDot(status: string) {
  const s = status?.toLowerCase() || ''
  if (s === 'overdue') return 'bg-red-400'
  if (s === 'completed') return 'bg-muted-foreground'
  return 'bg-emerald-400'
}

function getStatusLabel(status: string) {
  const s = status?.toLowerCase() || ''
  if (s === 'overdue') return 'Overdue'
  if (s === 'completed') return 'Completed'
  return 'Upcoming'
}

export default function TrackerSection({
  trackedItems,
  researchItems,
  showSample,
  onNavigateChat,
}: TrackerSectionProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const displayTracked = showSample && trackedItems.length === 0 ? SAMPLE_TRACKED : trackedItems
  const displayResearch = showSample && researchItems.length === 0 ? SAMPLE_RESEARCH : researchItems

  // Merge all items for unified filtering
  const allItems = useMemo(() => {
    const tracked = displayTracked.map((t) => ({
      type: 'tracked' as const,
      title: t.title ?? '',
      category: t.category ?? '',
      date: t.date ?? '',
      description: t.description ?? '',
      status: t.status ?? 'upcoming',
      key_facts: [] as string[],
      summary: '',
      source: '',
    }))
    const research = displayResearch.map((r) => ({
      type: 'research' as const,
      title: r.title ?? '',
      category: r.category ?? '',
      date: '',
      description: r.summary ?? '',
      status: '',
      key_facts: Array.isArray(r.key_facts) ? r.key_facts : [],
      summary: r.summary ?? '',
      source: r.source ?? '',
    }))
    return [...tracked, ...research]
  }, [displayTracked, displayResearch])

  const filteredItems = useMemo(() => {
    let items = allItems

    // Filter by tab
    if (activeTab === 'academics') {
      items = items.filter((i) => {
        const cat = i.category?.toLowerCase() || ''
        return cat.includes('assignment') || cat.includes('exam') || cat.includes('project') || cat.includes('academic') || cat.includes('deadline') || cat.includes('event') || cat.includes('extracurricular')
      })
    } else if (activeTab === 'career') {
      items = items.filter((i) => {
        const cat = i.category?.toLowerCase() || ''
        return cat.includes('career') || cat.includes('internship') || cat.includes('job')
      })
    } else if (activeTab === 'research') {
      items = items.filter((i) => {
        const cat = i.category?.toLowerCase() || ''
        return cat.includes('research') || cat.includes('college') || i.type === 'research'
      })
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      )
    }

    return items
  }, [allItems, activeTab, searchQuery])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HiOutlineClipboardDocumentList className="h-5 w-5 text-emerald-400" />
          My Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your tracked academic items and research in one place
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-secondary/50 border border-border/50">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="academics" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Academics</TabsTrigger>
            <TabsTrigger value="career" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Career</TabsTrigger>
            <TabsTrigger value="research" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Research</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="pl-9 bg-secondary/50 border-border/50 text-sm"
          />
        </div>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineClipboardDocumentList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {allItems.length === 0 ? 'Nothing tracked yet!' : 'No matching items'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {allItems.length === 0
              ? 'Head to Chat and start telling me about your assignments, exams, or research interests.'
              : 'Try adjusting your filters or search query.'}
          </p>
          {allItems.length === 0 && (
            <button
              onClick={onNavigateChat}
              className="mt-4 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Go to Chat
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item, i) => (
            <Card
              key={`item-${i}`}
              className="bg-card/85 backdrop-blur-sm border border-white/[0.18] hover:border-emerald-500/20 transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 text-muted-foreground">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>

                      {/* Key facts for research items */}
                      {item.type === 'research' && Array.isArray(item.key_facts) && item.key_facts.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {item.key_facts.slice(0, 3).map((fact, fi) => (
                            <li key={fi} className="text-[10px] text-foreground/70 flex items-start gap-1">
                              <span className="text-emerald-400">-</span>
                              {fact}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Date */}
                      {item.date && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <HiOutlineCalendar className="h-3 w-3" />
                          {item.date}
                        </p>
                      )}

                      {/* Source for research */}
                      {item.source && (
                        <p className="text-[10px] text-muted-foreground mt-1">Source: {item.source}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge className={`text-[9px] px-2 py-0.5 border ${getCategoryStyle(item.category)}`}>
                      {item.category || 'General'}
                    </Badge>
                    {item.type === 'tracked' && item.status && (
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(item.status)}`} />
                        <span className="text-[10px] text-muted-foreground">{getStatusLabel(item.status)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {filteredItems.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredItems.length} of {allItems.length} items
        </p>
      )}
    </div>
  )
}
