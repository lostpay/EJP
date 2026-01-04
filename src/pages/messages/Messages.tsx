import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageSquare, Send, ArrowLeft, User, Building2, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { Card, Button, Spinner, EmptyState, Textarea } from '@/components/ui'
import type { Message, Profile, Company, JobSeeker } from '@/types'
import toast from 'react-hot-toast'

interface ThreadParticipant {
  id: string
  email: string
  role: 'admin' | 'company' | 'jobseeker'
  displayName: string
  companies?: Company | null
  job_seekers?: JobSeeker | null
}

interface MessageThread {
  participantId: string
  participant: ThreadParticipant
  lastMessage: Message
  unreadCount: number
}

interface MessageWithSender extends Message {
  sender: Profile
}

export function Messages() {
  const { oderId: threadId } = useParams<{ oderId: string }>()  // otherId is the param name, threadId is our local variable
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Thread list state
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)

  // Conversation state
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [otherParticipant, setOtherParticipant] = useState<ThreadParticipant | null>(null)

  // Message input
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversation threads
  useEffect(() => {
    if (user) {
      fetchThreads()
    }
  }, [user])

  // Fetch messages when thread is selected
  useEffect(() => {
    if (threadId && user) {
      fetchMessages(threadId)
    }
  }, [threadId, user])

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message

          // Update messages if we're in the right thread
          if (threadId && (newMsg.sender_id === threadId || newMsg.receiver_id === threadId)) {
            fetchMessages(threadId)
          }

          // Refresh threads list
          fetchThreads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, threadId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchThreads = async () => {
    if (!user) return

    setIsLoadingThreads(true)

    try {
      // Get all messages where user is sender or receiver
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('sent_at', { ascending: false })

      if (error) throw error

      // Group by the other participant
      const threadMap = new Map<string, { messages: Message[]; unreadCount: number }>()

      for (const msg of allMessages || []) {
        const oderId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id

        if (!threadMap.has(oderId)) {
          threadMap.set(oderId, { messages: [], unreadCount: 0 })
        }

        const thread = threadMap.get(oderId)!
        thread.messages.push(msg)

        if (!msg.is_read && msg.receiver_id === user.id) {
          thread.unreadCount++
        }
      }

      // Fetch participant details
      const participantIds = Array.from(threadMap.keys())

      if (participantIds.length === 0) {
        setThreads([])
        setIsLoadingThreads(false)
        return
      }

      const { data: participants } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:companies!companies_user_id_fkey(*),
          job_seekers:job_seekers!job_seekers_user_id_fkey(*)
        `)
        .in('id', participantIds)

      // Build thread list
      const threadList: MessageThread[] = []

      for (const [oderId, { messages, unreadCount }] of threadMap) {
        const participant = participants?.find(p => p.id === oderId)

        if (participant) {
          // Handle arrays from Supabase joins
          const companies = Array.isArray(participant.companies)
            ? participant.companies[0]
            : participant.companies
          const jobSeekers = Array.isArray(participant.job_seekers)
            ? participant.job_seekers[0]
            : participant.job_seekers

          threadList.push({
            participantId: oderId,
            participant: {
              id: participant.id,
              email: participant.email,
              role: participant.role,
              displayName: companies?.company_name || jobSeekers?.full_name || participant.email,
              companies,
              job_seekers: jobSeekers,
            },
            lastMessage: messages[0],
            unreadCount,
          })
        }
      }

      // Sort by last message time
      threadList.sort((a, b) =>
        new Date(b.lastMessage.sent_at).getTime() - new Date(a.lastMessage.sent_at).getTime()
      )

      setThreads(threadList)
    } catch (error) {
      console.error('Error fetching threads:', error)
      toast.error('Failed to load messages')
    } finally {
      setIsLoadingThreads(false)
    }
  }

  const fetchMessages = async (oderId: string) => {
    if (!user) return

    setIsLoadingMessages(true)

    try {
      // Fetch participant info
      const { data: participant } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:companies!companies_user_id_fkey(*),
          job_seekers:job_seekers!job_seekers_user_id_fkey(*)
        `)
        .eq('id', oderId)
        .single()

      if (participant) {
        const companies = Array.isArray(participant.companies)
          ? participant.companies[0]
          : participant.companies
        const jobSeekers = Array.isArray(participant.job_seekers)
          ? participant.job_seekers[0]
          : participant.job_seekers

        setOtherParticipant({
          id: participant.id,
          email: participant.email,
          role: participant.role,
          displayName: companies?.company_name || jobSeekers?.full_name || participant.email,
          companies,
          job_seekers: jobSeekers,
        })
      }

      // Fetch messages between the two users
      const { data: msgs, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${oderId}),and(sender_id.eq.${oderId},receiver_id.eq.${user.id})`)
        .order('sent_at', { ascending: true })

      if (error) throw error

      setMessages(msgs as MessageWithSender[] || [])

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', oderId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      // Refresh threads to update unread count
      fetchThreads()
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load conversation')
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!user || !threadId || !newMessage.trim()) return

    setIsSending(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: threadId,
          content: newMessage.trim(),
          is_read: false,
        })

      if (error) throw error

      setNewMessage('')
      fetchMessages(threadId)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getParticipantIcon = (role: string) => {
    return role === 'company' ? (
      <Building2 className="h-5 w-5 text-blue-600" />
    ) : (
      <User className="h-5 w-5 text-green-600" />
    )
  }

  // Conversation View
  if (threadId) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(user?.role === 'company' ? '/company/messages' : '/messages')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {otherParticipant && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {getParticipantIcon(otherParticipant.role)}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{otherParticipant.displayName}</h2>
                <p className="text-sm text-gray-500 capitalize">{otherParticipant.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.sender_id === user?.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_id === user?.id ? 'text-primary-200' : 'text-gray-500'
                    }`}
                  >
                    {formatMessageTime(msg.sent_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="pt-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              isLoading={isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    )
  }

  // Thread List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">Your conversations</p>
      </div>

      {isLoadingThreads ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No messages yet"
          description="When you start a conversation with a company or applicant, it will appear here."
        />
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.participantId}
              to={`${user?.role === 'company' ? '/company/messages' : '/messages'}/${thread.participantId}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      {getParticipantIcon(thread.participant.role)}
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {thread.participant.displayName}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(thread.lastMessage.sent_at)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {thread.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                      {thread.lastMessage.content}
                    </p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <Circle className="h-3 w-3 fill-primary-600 text-primary-600" />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
