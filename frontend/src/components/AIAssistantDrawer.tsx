import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User as UserIcon,
  Loader
} from 'lucide-react';

const AI_CHAT_API = apiUrl('/api/ai/chat');

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const AIAssistantDrawer: React.FC = () => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Hello! I am your **DeploySphere DevOps Assistant**. 

I can help you troubleshoot build failures, configure domain routing, provision SSL certificates, and monitor your containers.

**Here are some questions you can ask me:**
- *'Why did my last build fail?'* I will scan your failed build logs and point to the likely cause.
- *'How do I map custom domains and enable SSL?'*
- *'Where do I view host CPU and container RAM metrics?'*
- *'Explain Blue-Green and Canary deployment upstreams.'*
- *'What are the admin panel credentials?'*`,
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userPrompt = message;
    setMessage('');
    
    // Append User prompt to chat history
    setHistory(prev => [...prev, {
      sender: 'user',
      text: userPrompt,
      timestamp: new Date()
    }]);

    setLoading(true);

    try {
      const res = await axios.post(
        AI_CHAT_API,
        { message: userPrompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Append AI response
      setHistory(prev => [...prev, {
        sender: 'ai',
        text: res.data.reply,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error('AI response failure: ', err);
      setHistory(prev => [...prev, {
        sender: 'ai',
        text: 'Sorry, I encountered an error connecting to the DeploySphere AI services. Please verify that your backend server is online and try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Very clean custom markdown formatter (processes bold, bullet points, and codeblocks)
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      
      // Handle bold code snippets **word**
      const boldRegex = /\*\*(.*?)\*\*/g;
      formatted = formatted.replace(boldRegex, '<strong>$1</strong>');

      // Handle italic markdown *word*
      const italicRegex = /\*(.*?)\*/g;
      formatted = formatted.replace(italicRegex, '<em>$1</em>');

      // Handle bullet points
      if (formatted.trim().startsWith('- ')) {
        return (
          <li key={idx} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem' }} 
              dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }} />
        );
      }

      // Handle raw logs codeblocks pre code
      if (formatted.trim().startsWith('```') || formatted.trim().endsWith('```')) {
        return null; // Strip raw ticks lines, handled by grouping if needed
      }

      return (
        <p key={idx} style={{ margin: '0 0 0.5rem 0', lineHeight: '1.4' }} 
           dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  // Helper to determine if a block contains logs
  const renderMessageContent = (msg: ChatMessage) => {
    const isLogBlock = msg.text.includes('```');
    if (isLogBlock) {
      // Extract text outside blocks and log blocks themselves
      const parts = msg.text.split('```');
      return (
        <div>
          {formatText(parts[0])}
          {parts[1] && (
            <pre style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '0.75rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#d8b4fe',
              border: '1px solid rgba(255,255,255,0.05)',
              overflowX: 'auto',
              margin: '0.5rem 0'
            }}>
              <code>{parts[1].trim()}</code>
            </pre>
          )}
          {parts[2] && formatText(parts[2])}
        </div>
      );
    }
    return formatText(msg.text);
  };

  return (
    <>
      {/* FLOATING ACTION TOGGLE BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-solid) 0%, #8b5cf6 100%)',
          border: 'none',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        className="hover-scale"
        title="Open DeploySphere AI DevOps Assistant"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* CHAT CONTAINER PANEL */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '6rem',
          right: '2rem',
          width: '380px',
          height: '520px',
          backgroundColor: 'rgba(30, 27, 75, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} style={{ color: 'var(--accent-hover)' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>DevOps AI Assistant</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Powered by DeploySphere Logs Analyzer</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages list */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {history.map((msg, i) => (
              <div 
                key={i} 
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  maxWidth: '85%'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                  color: msg.sender === 'user' ? 'var(--accent-hover)' : '#c084fc',
                  flexShrink: 0
                }}>
                  {msg.sender === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>

                <div style={{
                  backgroundColor: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: msg.sender === 'user' ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  color: '#e2e8f0',
                  wordBreak: 'break-word'
                }}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c084fc',
                  flexShrink: 0
                }}>
                  <Bot size={14} />
                </div>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Loader size={14} className="spin" />
                  <span>Analyzing deployment variables...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form 
            onSubmit={handleSend}
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              gap: '0.5rem',
              backgroundColor: 'rgba(0,0,0,0.1)'
            }}
          >
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask DevOps AI..."
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                color: '#fff',
                outline: 'none'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--accent-solid)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: (loading || !message.trim()) ? 0.5 : 1,
                transition: 'var(--transition)'
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistantDrawer;
