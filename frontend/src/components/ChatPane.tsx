import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import { sendChatMessage, ChatMessage } from '../services/api';
import { Send, Loader2, User, Bot, Sparkles } from 'lucide-react';

const ChatPane: React.FC = () => {
  const { chatHistory, appendChatMessage, resume_latex, appendSurgicalPatches, inputMode, extractedPdfText } = useStore();
  const { apiKey } = useAuth();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    appendChatMessage(userMsg);
    setInput('');
    setIsSending(true);

    const resumeContent = inputMode === 'pdf' ? extractedPdfText : resume_latex;

    try {
      const response = await sendChatMessage(chatHistory.concat(userMsg), input, resumeContent, inputMode, apiKey!);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response_text,
        patches: response.suggested_patches
      };
      appendChatMessage(assistantMsg);
    } catch (error) {
      console.error('Chat failed', error);
      appendChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Failed to get a response from the AI. Please check your connection and API key.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQueuePatches = (patches: any[]) => {
    appendSurgicalPatches(patches);
    appendChatMessage({
      id: Date.now().toString(),
      role: 'system',
      content: `Suggested ${patches.length} edit(s) added to the review queue. Click "Review Surgical Patches" in the sidebar to apply them.`
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg-base)' }}>
      {/* Messages list */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {chatHistory.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-text-muted)' }}>
            <Bot size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '13px' }}>Ask me anything about your resume or request specific edits!</p>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            {msg.role !== 'user' && (
              <div style={{ padding: '6px', backgroundColor: msg.role === 'assistant' ? 'var(--color-accent-subtle)' : 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                {msg.role === 'assistant' ? <Bot size={16} color="var(--color-accent)" /> : <Sparkles size={16} color="var(--color-text-muted)" />}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                lineHeight: 1.5,
                backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                color: msg.role === 'user' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
              {inputMode === 'latex' && msg.patches && msg.patches.length > 0 && (
                <button
                  onClick={() => handleQueuePatches(msg.patches!)}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-accent-subtle)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Sparkles size={12} />
                  Queue Edits for Review ({msg.patches.length})
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <div style={{ padding: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <User size={16} color="var(--color-text-muted)" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question or request an edit..."
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '13px',
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          style={{
            padding: '10px',
            backgroundColor: !input.trim() || isSending ? 'var(--color-bg-subtle)' : 'var(--color-accent)',
            color: !input.trim() || isSending ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: !input.trim() || isSending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
        >
          {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default ChatPane;
