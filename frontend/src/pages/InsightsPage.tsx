import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { 
  Target, TrendingUp, AlertTriangle, Clock,
  ChevronRight, ExternalLink, FileText, Download, ArrowLeft,
  MessageCircle, Send, Bot, User, X, Minimize2, Maximize2
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { getActionItems, getExecutiveSummary, getRelatedPosts, chatWithInsights, ActionItem } from '@/lib/api'
import { getPriorityColor, getCategoryColor } from '@/lib/utils'

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']
const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'marketing', label: 'Marketing' },
]

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function InsightsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [isChatFullscreen, setIsChatFullscreen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I can help you understand your analysis results. Ask me anything about the pain points, feature requests, sentiment, or recommendations.' }
  ])
  const [chatInput, setChatInput] = useState('')
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Fetch action items
  const { data: actionItemsData, isLoading } = useQuery({
    queryKey: ['actionItems', jobId, categoryFilter],
    queryFn: () => getActionItems(jobId!, {
      category: categoryFilter !== 'all' ? [categoryFilter] : undefined,
      sort_by: 'impact_score',
      sort_order: 'desc',
    }),
    enabled: !!jobId,
  })

  // Fetch executive summary
  const { data: summary } = useQuery({
    queryKey: ['executiveSummary', jobId],
    queryFn: () => getExecutiveSummary(jobId!),
    enabled: !!jobId,
  })

  const actionItems = actionItemsData?.action_items ?? []
  const itemsSummary = actionItemsData?.summary

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (message: string) => chatWithInsights(jobId!, message),
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    },
    onError: () => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    },
  })

  const handleSendMessage = () => {
    if (!chatInput.trim() || chatMutation.isPending) return
    
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }])
    chatMutation.mutate(chatInput)
    setChatInput('')
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, chatMutation.isPending])

  const handleExportReport = () => {
    if (!summary || !actionItems.length) return
    
    // Create a text report
    let report = `REDDIT SENTIMENT ANALYSIS REPORT
================================
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
-----------------
Total Posts Analyzed: ${summary.total_posts}
Positive Sentiment: ${summary.positive_percentage}%
Negative Sentiment: ${summary.negative_percentage}%
Critical Issues: ${summary.critical_items}
High Priority Items: ${summary.high_priority_items}

Subreddits Analyzed: ${summary.subreddits_analyzed.join(', ')}
Keywords Used: ${summary.keywords_used.join(', ')}

ACTION ITEMS
------------
`
    actionItems.forEach((item, index) => {
      report += `
${index + 1}. [${item.priority.toUpperCase()}] ${item.title}
   Category: ${item.category}
   Impact Score: ${item.impact_score}/100
   Effort: ${item.effort_level || 'N/A'}
   Timeline: ${item.timeline || 'N/A'}
   
   Description: ${item.description}
   
   Recommendations:
${item.recommendations.map(r => `   • ${r}`).join('\n')}
`
    })
    
    // Download file
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sentiment-report-${jobId}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button 
            variant="ghost" 
            className="mb-2 -ml-2"
            onClick={() => navigate(`/browse/${jobId}`)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Posts
          </Button>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Action Items & Insights
          </h1>
          <p className="text-white/60">
            AI-generated recommendations based on {summary?.total_posts ?? 0} analyzed posts
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportReport}>
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Executive Summary */}
      {summary && (
        <Card className="mb-8 bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <CardTitle className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent-lime" />
            Executive Summary
          </CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SummaryMetric
              label="Total Posts Analyzed"
              value={summary.total_posts}
              icon={<FileText className="w-5 h-5" />}
            />
            <SummaryMetric
              label="Positive Sentiment"
              value={`${summary.positive_percentage}%`}
              icon={<span className="text-xl">😄</span>}
              color="text-green-400"
            />
            <SummaryMetric
              label="Negative Sentiment"
              value={`${summary.negative_percentage}%`}
              icon={<span className="text-xl">😠</span>}
              color="text-red-400"
            />
            <SummaryMetric
              label="Critical Issues"
              value={summary.critical_items}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="text-red-400"
            />
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-white/50">Analyzed:</span>
              {summary.subreddits_analyzed.map(sub => (
                <Badge key={sub} variant="default">r/{sub}</Badge>
              ))}
              {summary.keywords_used.map(kw => (
                <Badge key={kw} variant="info">{kw}</Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Category Filters */}
      <div className="flex items-center gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === cat.value
                ? 'bg-accent-teal text-navy-900'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {cat.label}
            {itemsSummary?.by_category[cat.value] && cat.value !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({itemsSummary.by_category[cat.value]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Priority Summary */}
      {itemsSummary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {PRIORITY_ORDER.map(priority => {
            const count = itemsSummary.by_priority[priority] || 0
            return (
              <Card key={priority} className="text-center py-4">
                <div className={`text-2xl font-bold ${
                  priority === 'critical' ? 'text-red-400' :
                  priority === 'high' ? 'text-orange-400' :
                  priority === 'medium' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {count}
                </div>
                <div className="text-xs text-white/50 capitalize">{priority}</div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Action Items List */}
      {isLoading ? (
        <div className="text-center py-12 text-white/50">Loading insights...</div>
      ) : actionItems.length === 0 ? (
        <div className="text-center py-12 text-white/50">No action items generated yet</div>
      ) : (
        <div className="space-y-4">
          {actionItems.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              isExpanded={expandedItem === item.id}
              onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}

      {/* Chat Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-teal rounded-full flex items-center justify-center shadow-lg hover:bg-accent-teal/90 transition-all hover:scale-105 z-50"
        >
          <MessageCircle className="w-6 h-6 text-navy-900" />
        </button>
      )}

      {/* Chat Panel */}
      {isChatOpen && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isChatFullscreen
            ? 'inset-4 md:inset-8'
            : isChatMinimized 
              ? 'bottom-6 right-6 w-72' 
              : 'bottom-6 right-6 w-96 h-[500px]'
        }`}>
          <Card className="h-full flex flex-col overflow-hidden bg-navy-900/95 backdrop-blur-xl border-accent-teal/30">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-teal/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accent-teal" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-white/50">Ask about your insights</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Minimize button */}
                <button
                  onClick={() => {
                    setIsChatMinimized(!isChatMinimized)
                    if (isChatFullscreen) setIsChatFullscreen(false)
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title={isChatMinimized ? "Expand" : "Minimize"}
                >
                  <Minimize2 className={`w-4 h-4 text-white/50 ${isChatMinimized ? 'rotate-180' : ''}`} />
                </button>
                {/* Fullscreen button */}
                <button
                  onClick={() => {
                    setIsChatFullscreen(!isChatFullscreen)
                    if (isChatMinimized) setIsChatMinimized(false)
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title={isChatFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  <Maximize2 className={`w-4 h-4 ${isChatFullscreen ? 'text-accent-teal' : 'text-white/50'}`} />
                </button>
                {/* Close button */}
                <button
                  onClick={() => {
                    setIsChatOpen(false)
                    setIsChatFullscreen(false)
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            {!isChatMinimized && (
              <>
                <div 
                  ref={chatMessagesRef}
                  className={`flex-1 overflow-y-auto p-4 space-y-4 ${isChatFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}
                >
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' 
                          ? 'bg-accent-lime/20' 
                          : 'bg-accent-teal/20'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="w-3.5 h-3.5 text-accent-lime" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-accent-teal" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-accent-lime/20 text-white'
                          : 'bg-white/10 text-white/90'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-white/90">{children}</li>,
                              h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
                              code: ({ children }) => <code className="bg-white/10 px-1 py-0.5 rounded text-accent-teal text-xs">{children}</code>,
                              pre: ({ children }) => <pre className="bg-white/10 p-2 rounded my-2 overflow-x-auto">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-accent-teal/50 pl-3 my-2 italic text-white/70">{children}</blockquote>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-teal/20 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-accent-teal" />
                      </div>
                      <div className="bg-white/10 rounded-2xl px-4 py-2 text-sm text-white/60">
                        <span className="inline-flex gap-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className={`p-4 border-t border-white/10 ${isChatFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask about your analysis..."
                      className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder-white/40 focus:outline-none focus:border-accent-teal/50 ${
                        isChatFullscreen ? 'py-3 text-base' : 'py-2 text-sm'
                      }`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={chatMutation.isPending || !chatInput.trim()}
                      className={`bg-accent-teal rounded-xl hover:bg-accent-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isChatFullscreen ? 'px-4 py-3' : 'p-2'
                      }`}
                    >
                      <Send className={`text-navy-900 ${isChatFullscreen ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    </button>
                  </div>
                  <div className={`mt-2 flex flex-wrap gap-1 ${isChatFullscreen ? 'gap-2' : ''}`}>
                    {[
                      'What are the top complaints?', 
                      'Summarize the feedback', 
                      'What should we prioritize?',
                      ...(isChatFullscreen ? [
                        'What brands are mentioned?',
                        'Any safety concerns?',
                        'What features do users want?'
                      ] : [])
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setChatInput(q)}
                        className={`rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors ${
                          isChatFullscreen ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function SummaryMetric({ 
  label, 
  value, 
  icon,
  color = 'text-white'
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string 
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-2 text-white/50">
        {icon}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  )
}

function ActionItemCard({ 
  item, 
  isExpanded, 
  onToggle 
}: { 
  item: ActionItem
  isExpanded: boolean
  onToggle: () => void 
}) {
  const priorityColors = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-green-500',
  }

  return (
    <Card className={`border-l-4 ${priorityColors[item.priority]}`}>
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={getPriorityColor(item.priority)}>
                {item.priority.toUpperCase()}
              </Badge>
              <Badge className={getCategoryColor(item.category)}>
                {item.category}
              </Badge>
              {item.timeline && (
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timeline}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {item.title}
            </h3>
            <p className="text-sm text-white/60">
              {item.description}
            </p>
          </div>
          
          {/* Impact Score */}
          {item.impact_score !== null && (
            <div className="text-center min-w-[80px]">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke={item.impact_score >= 70 ? '#22C55E' : item.impact_score >= 40 ? '#EAB308' : '#EF4444'}
                    strokeWidth="4"
                    strokeDasharray={`${(item.impact_score / 100) * 176} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{item.impact_score}</span>
                </div>
              </div>
              <span className="text-xs text-white/40">Impact</span>
            </div>
          )}
          
          <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in">
          {/* Recommendations */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-teal" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {item.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="text-accent-teal mt-0.5">✓</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Metrics */}
          {item.effort_level && (
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-white/50">Effort:</span>
                <span className="ml-2 text-white capitalize">{item.effort_level.replace('_', ' ')}</span>
              </div>
              {item.metrics?.source_count && (
                <div>
                  <span className="text-white/50">Based on:</span>
                  <span className="ml-2 text-white">{item.metrics.source_count} posts</span>
                </div>
              )}
            </div>
          )}

          {/* Related Posts */}
          {item.related_post_ids && item.related_post_ids.length > 0 && (
            <RelatedPostsSection itemId={item.id} />
          )}
        </div>
      )}
    </Card>
  )
}

function RelatedPostsSection({ itemId }: { itemId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['relatedPosts', itemId],
    queryFn: () => getRelatedPosts(itemId),
  })

  if (isLoading) return <div className="text-sm text-white/50 mt-4">Loading related posts...</div>
  if (!data?.posts?.length) return null

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent-cyan" />
        Supporting Evidence
      </h4>
      <div className="space-y-2">
        {data.posts.slice(0, 5).map((post: any) => (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg">{
                post.sentiment === 'positive' ? '😄' :
                post.sentiment === 'slightly_positive' ? '🙂' :
                post.sentiment === 'neutral' ? '😐' :
                post.sentiment === 'slightly_negative' ? '🙁' : '😠'
              }</span>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{post.title}</p>
                <p className="text-xs text-white/40">r/{post.subreddit} • ↑{post.score}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/60" />
          </a>
        ))}
      </div>
    </div>
  )
}

