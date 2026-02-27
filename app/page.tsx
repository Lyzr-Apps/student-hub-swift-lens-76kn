'use client'

import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  HiOutlineHome,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineAcademicCap,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2'
import DashboardSection from './sections/DashboardSection'
import ChatSection from './sections/ChatSection'
import TrackerSection from './sections/TrackerSection'

// ---------- ErrorBoundary ----------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------- Types ----------
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

type PageView = 'dashboard' | 'chat' | 'tracker'

// ---------- Constants ----------
const AGENT_INFO = [
  { id: '69a15d2b6bd1afebfd1b9deb', name: 'Student Life Manager', desc: 'Primary chat & coordination' },
  { id: '69a15d1402d3bc2aa3ecac16', name: 'Academic Tracker', desc: 'Track assignments, exams & deadlines' },
  { id: '69a15d14c630aea0386ccc15', name: 'Career & Research', desc: 'College research & career guidance' },
  { id: '69a15d3ee64a6ab5efd55bc0', name: 'Daily Digest', desc: 'Scheduled daily summary (7 AM ET)' },
]

// ---------- Sidebar Component ----------
function Sidebar({
  activePage,
  setActivePage,
  showSample,
  setShowSample,
  activeAgentId,
}: {
  activePage: PageView
  setActivePage: (page: PageView) => void
  showSample: boolean
  setShowSample: (v: boolean) => void
  activeAgentId: string | null
}) {
  const [showAgents, setShowAgents] = useState(false)

  const navItems: { key: PageView; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome className="h-5 w-5" /> },
    { key: 'chat', label: 'Chat', icon: <HiOutlineChatBubbleLeftRight className="h-5 w-5" /> },
    { key: 'tracker', label: 'My Tracker', icon: <HiOutlineClipboardDocumentList className="h-5 w-5" /> },
  ]

  return (
    <div className="w-64 h-screen flex flex-col bg-card/50 backdrop-blur-sm border-r border-border/50 flex-shrink-0">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
          <HiOutlineAcademicCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground font-sans tracking-tight">StudyHub</h1>
          <p className="text-[10px] text-muted-foreground -mt-0.5">Student Life Assistant</p>
        </div>
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActivePage(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${activePage === item.key ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Sample Data Toggle */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sample Data</span>
          <Switch checked={showSample} onCheckedChange={setShowSample} />
        </div>
      </div>

      {/* Agent Status */}
      <div className="px-4 py-3 border-t border-border/30">
        <button
          onClick={() => setShowAgents(!showAgents)}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <HiOutlineCog6Tooth className="h-4 w-4" />
          <span>Agent Status</span>
          {activeAgentId && (
            <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
        {showAgents && (
          <div className="mt-3 space-y-2">
            {AGENT_INFO.map((agent) => (
              <div key={agent.id} className="flex items-start gap-2">
                <span className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${activeAgentId === agent.id ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/50'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-foreground truncate">{agent.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Mobile Bottom Nav ----------
function MobileNav({
  activePage,
  setActivePage,
}: {
  activePage: PageView
  setActivePage: (page: PageView) => void
}) {
  const navItems: { key: PageView; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome className="h-5 w-5" /> },
    { key: 'chat', label: 'Chat', icon: <HiOutlineChatBubbleLeftRight className="h-5 w-5" /> },
    { key: 'tracker', label: 'Tracker', icon: <HiOutlineClipboardDocumentList className="h-5 w-5" /> },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border/50 flex items-center justify-around py-2 px-4">
      {navItems.map((item) => (
        <button
          key={item.key}
          onClick={() => setActivePage(item.key)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${activePage === item.key ? 'text-emerald-400' : 'text-muted-foreground'}`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ---------- Main Page ----------
export default function Page() {
  const [activePage, setActivePage] = useState<PageView>('dashboard')
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Shared state
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([])
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState('')

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            showSample={showSample}
            setShowSample={setShowSample}
            activeAgentId={activeAgentId}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <HiOutlineAcademicCap className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-base font-semibold text-foreground">StudyHub</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Sample</span>
              <Switch checked={showSample} onCheckedChange={setShowSample} />
            </div>
          </div>

          {/* Page Content */}
          {activePage === 'dashboard' && (
            <DashboardSection
              trackedItems={trackedItems}
              researchItems={researchItems}
              chatMessages={chatMessages}
              sessionId={sessionId}
              onNavigateChat={() => setActivePage('chat')}
              showSample={showSample}
            />
          )}
          {activePage === 'chat' && (
            <ChatSection
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              trackedItems={trackedItems}
              setTrackedItems={setTrackedItems}
              researchItems={researchItems}
              setResearchItems={setResearchItems}
              sessionId={sessionId}
              showSample={showSample}
              setActiveAgentId={setActiveAgentId}
            />
          )}
          {activePage === 'tracker' && (
            <TrackerSection
              trackedItems={trackedItems}
              researchItems={researchItems}
              showSample={showSample}
              onNavigateChat={() => setActivePage('chat')}
            />
          )}

          {/* Mobile bottom padding for nav */}
          <div className="lg:hidden h-16" />
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav activePage={activePage} setActivePage={setActivePage} />
      </div>
    </ErrorBoundary>
  )
}
