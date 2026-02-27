'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { callAIAgent, extractText } from '@/lib/aiAgent'
import {
  HiOutlinePaperAirplane,
  HiOutlineBeaker,
  HiOutlineSparkles,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
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

interface ChatSectionProps {
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  trackedItems: TrackedItem[]
  setTrackedItems: React.Dispatch<React.SetStateAction<TrackedItem[]>>
  researchItems: ResearchItem[]
  setResearchItems: React.Dispatch<React.SetStateAction<ResearchItem[]>>
  sessionId: string
  showSample: boolean
  setActiveAgentId: (id: string | null) => void
}

const MANAGER_AGENT_ID = '69a15d2b6bd1afebfd1b9deb'

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    sender: 'user',
    content: 'I have a Physics Lab Report due on February 27th and a Calculus Quiz on the 28th.',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    sender: 'assistant',
    content: 'Got it! I have tracked both items for you. Your Physics Lab Report is due tomorrow (Feb 27) and the Calculus Quiz is on Feb 28. Would you like me to help you create a study plan for the quiz?',
    timestamp: new Date().toISOString(),
    category: 'academic',
    trackedItems: [
      { title: 'Physics Lab Report', category: 'Assignment', date: '2026-02-27', description: 'Lab report submission', status: 'upcoming' },
      { title: 'Calculus Quiz', category: 'Exam', date: '2026-02-28', description: 'Chapter 5-7 quiz', status: 'upcoming' },
    ],
    recommendations: ['Start reviewing Chapter 5 formulas tonight', 'Complete lab report before noon tomorrow'],
  },
  {
    id: 'sample-3',
    sender: 'user',
    content: 'Research top engineering colleges with strong CS programs',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'sample-4',
    sender: 'assistant',
    content: 'Here are some of the top engineering schools with renowned Computer Science programs. Each offers unique strengths in research areas, industry connections, and campus culture.',
    timestamp: new Date().toISOString(),
    category: 'career',
    researchItems: [
      { title: 'MIT', category: 'College', summary: 'World-leading CS program with strengths in AI, robotics, and systems.', key_facts: ['#1 ranked CS globally', 'Strong startup ecosystem', 'Need-blind admissions'], source: 'US News Rankings' },
      { title: 'Stanford University', category: 'College', summary: 'Silicon Valley location provides unparalleled industry access.', key_facts: ['Top 3 CS program', 'Close ties to tech industry', 'Excellent research funding'], source: 'QS World Rankings' },
    ],
    recommendations: ['Research each school scholarship programs', 'Check application deadlines for Fall 2027'],
  },
]

const SUGGESTION_CHIPS = [
  'Add an assignment',
  'What exams do I have this month?',
  'Research top engineering colleges',
  'Summarize my week',
]

function getCategoryStyle(category: string) {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('academic') || cat.includes('assignment') || cat.includes('exam')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }
  if (cat.includes('career') || cat.includes('internship')) {
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }
  if (cat.includes('research') || cat.includes('college') || cat.includes('mixed')) {
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

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function ExpandableResearch({ item }: { item: ResearchItem }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HiOutlineBeaker className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</span>
        </div>
        {expanded ? <HiOutlineChevronUp className="h-3.5 w-3.5 flex-shrink-0" /> : <HiOutlineChevronDown className="h-3.5 w-3.5 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 pl-5">
          <p className="text-xs text-muted-foreground">{item?.summary ?? ''}</p>
          {Array.isArray(item?.key_facts) && item.key_facts.length > 0 && (
            <ul className="space-y-0.5">
              {item.key_facts.map((fact, fi) => (
                <li key={fi} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">-</span>
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {item?.source && (
            <p className="text-[10px] text-muted-foreground">Source: {item.source}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ChatSection({
  chatMessages,
  setChatMessages,
  trackedItems,
  setTrackedItems,
  researchItems,
  setResearchItems,
  sessionId,
  showSample,
  setActiveAgentId,
}: ChatSectionProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const displayMessages = showSample && chatMessages.length === 0 ? SAMPLE_MESSAGES : chatMessages

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayMessages.length])

  const handleSend = async (message?: string) => {
    const text = message || input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setChatMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      const result = await callAIAgent(text, MANAGER_AGENT_ID, { session_id: sessionId })

      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try { data = JSON.parse(data) } catch { data = { message: data } }
        }

        const responseMessage = data?.message || data?.text || extractText(result.response) || 'I received your message.'
        const newTracked = Array.isArray(data?.tracked_items) ? data.tracked_items : []
        const newResearch = Array.isArray(data?.research_items) ? data.research_items : []
        const recs = Array.isArray(data?.recommendations) ? data.recommendations : []
        const category = data?.category || 'general'

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: responseMessage,
          timestamp: new Date().toISOString(),
          category,
          trackedItems: newTracked,
          researchItems: newResearch,
          recommendations: recs,
        }

        setChatMessages((prev) => [...prev, assistantMsg])

        // Append to global tracked/research items
        if (newTracked.length > 0) {
          setTrackedItems((prev) => {
            const existing = new Set(prev.map((t) => t.title?.toLowerCase()))
            const unique = newTracked.filter((t: TrackedItem) => !existing.has(t.title?.toLowerCase()))
            return [...prev, ...unique]
          })
        }
        if (newResearch.length > 0) {
          setResearchItems((prev) => {
            const existing = new Set(prev.map((r) => r.title?.toLowerCase()))
            const unique = newResearch.filter((r: ResearchItem) => !existing.has(r.title?.toLowerCase()))
            return [...prev, ...unique]
          })
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          content: result?.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setChatMessages((prev) => [...prev, errorMsg])
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, errorMsg])
    }

    setLoading(false)
    setActiveAgentId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chat Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {displayMessages.length === 0 && !showSample && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <HiOutlineSparkles className="h-12 w-12 text-emerald-400/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">How can I help you today?</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Ask me anything -- track an assignment, explore a career path, plan your study week, or research colleges.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="p-3 text-left text-sm rounded-lg bg-card/85 backdrop-blur-sm border border-white/[0.18] text-foreground/80 hover:text-foreground hover:border-emerald-500/30 transition-all duration-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-card/85 backdrop-blur-sm border border-white/[0.18] rounded-bl-sm'
              }`}
            >
              {/* Category badge for assistant */}
              {msg.sender === 'assistant' && msg.category && msg.category !== 'general' && (
                <Badge className={`text-[9px] px-1.5 py-0 mb-2 border ${getCategoryStyle(msg.category)}`}>
                  {msg.category}
                </Badge>
              )}

              {/* Message content */}
              <div className={msg.sender === 'user' ? 'text-sm' : ''}>
                {msg.sender === 'assistant' ? renderMarkdown(msg.content) : <p className="text-sm">{msg.content}</p>}
              </div>

              {/* Tracked Items */}
              {msg.sender === 'assistant' && Array.isArray(msg.trackedItems) && msg.trackedItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tracked Items</p>
                  {msg.trackedItems.map((item, ti) => (
                    <div
                      key={`tracked-${ti}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border/40"
                    >
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${getStatusDot(item?.status ?? '')}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</p>
                        <p className="text-[10px] text-muted-foreground">{item?.date ?? ''}</p>
                      </div>
                      <Badge className={`text-[9px] px-1.5 py-0 border flex-shrink-0 ${getCategoryStyle(item?.category ?? '')}`}>
                        {item?.category ?? 'General'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Research Items */}
              {msg.sender === 'assistant' && Array.isArray(msg.researchItems) && msg.researchItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Research</p>
                  {msg.researchItems.map((item, ri) => (
                    <ExpandableResearch key={`research-${ri}`} item={item} />
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {msg.sender === 'assistant' && Array.isArray(msg.recommendations) && msg.recommendations.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Recommendations</p>
                  <ul className="space-y-0.5">
                    {msg.recommendations.map((rec, ri) => (
                      <li key={ri} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <HiOutlineSparkles className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamp */}
              <p className={`text-[9px] mt-2 ${msg.sender === 'user' ? 'text-white/60' : 'text-muted-foreground'}`}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card/85 backdrop-blur-sm border border-white/[0.18] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border/50 p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything -- track an assignment, explore a career, plan your week..."
            disabled={loading}
            className="flex-1 bg-secondary/50 border-border/50 focus:border-emerald-500/50 text-sm"
          />
          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 w-10 rounded-full flex-shrink-0"
          >
            <HiOutlinePaperAirplane className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
