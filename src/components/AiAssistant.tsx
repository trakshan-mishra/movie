'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Search } from 'lucide-react';
import MediaGrid from './MediaGrid';
import { Movie, TVShow } from '../types/tmdb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TMDB_API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

const AiAssistant: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    { role: 'assistant', content: "Hey there! 👋 I'm your movie buddy. What are you in the mood for today? 🎬✨" }
  ]);
  const [recommendations, setRecommendations] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    try {
      const apiKey = 'AIzaSyAUMnTrkkufLXhN4a8GCVm9kEjUZVf4wk4';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Oops! Couldn't connect to my database right now. 😔 Try again later!";
    }
  };

  const fetchMediaDetails = async (title: string): Promise<Movie | TVShow | null> => {
    try {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${TMDB_API_KEY}`);
      const searchData = await searchRes.json();
      const firstResult = searchData.results?.[0];
      return firstResult || null;
    } catch (error) {
      console.error('Error fetching media details:', error);
      return null;
    }
  };

  const detectIntent = (input: string) => {
    const lower = input.toLowerCase();
    if (lower.includes('worth') || lower.includes('good') || lower.includes('is') && lower.includes('good')) {
      return 'worth_it';
    }
    if (lower.includes('which one') || lower.includes('what should i pick') || lower.includes('suggest one')) {
      return 'pick_one';
    }
    return 'recommend';
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = userInput.trim();
    if (!input) return;

    const userMsg = { role: 'user' as const, content: input };
    setConversation(prev => [...prev, userMsg]);
    setUserInput('');
    setIsLoading(true);

    const thinkingMsg = { role: 'assistant' as const, content: 'Thinking of something awesome for you... 🤔🍿' };
    setConversation(prev => [...prev, thinkingMsg]);

    const intent = detectIntent(input);

    if (intent === 'worth_it') {
      const title = input.replace(/is|worth|good|\?/gi, '').trim();
      const response = await callGeminiAPI(`Is "${title}" worth watching? Reply like an excited movie buddy with casual tone and emojis.`);
      setConversation(prev => {
        const updated = [...prev];
        const idx = updated.findLastIndex(msg => msg.role === 'assistant' && msg.content.includes('Thinking'));
        if (idx > -1) updated[idx] = { role: 'assistant', content: response };
        return updated;
      });
      setIsLoading(false);
      return;
    }

    if (intent === 'pick_one' && recommendations.length > 0) {
      const best = [...recommendations].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
      const title = (best as any).title || (best as any).name || 'one of the titles';
      const response = await callGeminiAPI(`Tell me why "${title}" is a great choice for the user in a casual, excited tone with emojis.`);
      setConversation(prev => {
        const updated = [...prev];
        const idx = updated.findLastIndex(msg => msg.role === 'assistant' && msg.content.includes('Thinking'));
        if (idx > -1) updated[idx] = { role: 'assistant', content: response };
        return updated;
      });
      setIsLoading(false);
      return;
    }

    // Otherwise: normal recommendations
    const aiResponse = await callGeminiAPI(`Suggest 5 highly rated movies or TV shows for this request: "${input}". Only list their titles, one per line.`);
    const titles = aiResponse.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);

    const mediaItems = await Promise.all(titles.map(title => fetchMediaDetails(title)));
    const validItems = mediaItems.filter((item): item is Movie | TVShow => item !== null);

    setRecommendations(validItems);

    const cheerfulReply = `You're gonna love these picks! 🎉 Let me know which one you're vibing with! 🍿😎`;
    setConversation(prev => {
      const updated = [...prev];
      const idx = updated.findLastIndex(msg => msg.role === 'assistant' && msg.content.includes('Thinking'));
      if (idx > -1) updated[idx] = { role: 'assistant', content: cheerfulReply };
      return updated;
    });

    setIsLoading(false);
  }, [userInput, recommendations]);

  return (
    <div className="max-w-6xl mx-auto p-6 mt-6 mb-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl dark:bg-black/30 dark:border-white/10">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-500 bg-clip-text text-transparent">
          Your Movie Buddy 🎥✨
        </h2>
      </div>

      {/* Conversation */}
      <div ref={conversationRef} className="bg-white/30 dark:bg-gray-900/50 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-inner p-4 h-72 overflow-y-auto scroll-smooth mb-6">
        {conversation.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <div className={`inline-block max-w-[80%] p-3 rounded-xl text-sm shadow ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                : 'bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-white'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="inline-block max-w-[80%] p-3 rounded-xl text-sm shadow bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-white">
              <div className="flex space-x-1 animate-pulse">
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <MediaGrid items={recommendations} type="movie" />
        </div>
      )}

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-6">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="What's on your mind? 🎬 (e.g., Dark shows, Uplifting movies)"
          className="flex-1 p-3 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 shadow-inner focus:outline-none"
        />
        <button
          type="submit"
          disabled={!userInput.trim()}
          className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

    </div>
  );
};

export default AiAssistant;
