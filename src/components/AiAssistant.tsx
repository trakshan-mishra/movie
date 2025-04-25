import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Tv, Sparkles, Calendar, ThumbsUp, AlertCircle } from 'lucide-react';
import {
  getUpcoming,
  getTrending,
  search,
  getDetails,
  getSimilarMovies,
  getSimilarTVShows,
  getMovieGenres,
  getTVGenres,
  discoverMedia
} from '../services/tmdb';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import MediaGrid from './MediaGrid';

interface GenreMaps {
  movie: Record<number, string>;
  tv: Record<number, string>;
}

// Define Gemini API types
interface GeminiContent {
  role: string;
  parts: { text: string }[];
}


interface ConversationContext {
  lastTopic?: string;
  lastQuestion?: string;
  lastAnswerType?: string;
  followUpContext?: string;
  suggestedFilters?: string[];
  previousResults?: (Movie | TVShow)[];
}

const AiAssistant = () => {
  const [preferences, setPreferences] = useState({
    genres: [] as number[],
    year: null as number | null,
    type: 'all' as 'all' | 'movie' | 'tv',
    mood: null as string | null,
    region: null as string | null, 
    similar: null as string | null,
    query: null as string | null,
    themes: [] as string[],
    subgenre: null as string | null,
    rating: null as string | null,
    lastQuery: null as string | null
  });

  const [recommendations, setRecommendations] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState('trending');
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant' as const,
      content: "Hi there! I'm your movie and TV show assistant. What kind of content are you in the mood for today? Try asking for 'trending sci-fi shows', 'movies like Inception', or 'funny Bollywood movies from 2023'!"
    }
  ]);
  const [genreMaps, setGenreMaps] = useState<GenreMaps>({ movie: {}, tv: {} });
  const conversationRef = useRef<HTMLDivElement>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});
  
  // Store conversation history for context
  // Removed unused geminiHistory state

  // Scroll to bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Load genres on mount
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const movieGenres = await getMovieGenres();
        const tvGenres = await getTVGenres();
        
        const movieMap: Record<number, string> = {};
        const tvMap: Record<number, string> = {};
        
        movieGenres.forEach(genre => {
          movieMap[genre.id] = genre.name.toLowerCase();
        });
        
        tvGenres.forEach(genre => {
          tvMap[genre.id] = genre.name.toLowerCase();
        });
        
        setGenreMaps({
          movie: movieMap,
          tv: tvMap
        });
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };
    
    loadGenres();
  }, []);

  // Check if input is a follow-up to previous question
  const isFollowUp = useCallback((input: string): boolean => {
    const shortInput = input.toLowerCase().trim();
    
    // Check if the input is very short (likely a follow-up)
    if (shortInput.split(' ').length <= 3) {
      return true;
    }
    
    // Check for common follow-up phrases
    const followUpPatterns = [
      'yes', 'yeah', 'no', 'nope', 'sure', 'okay', 
      'i like', 'i prefer', 'i want', 'more', 'show me',
      'like that', 'similar', 'instead', 'but with',
      'what about', 'how about'
    ];
    
    return followUpPatterns.some(pattern => shortInput.includes(pattern));
  }, []);

  // Extract detailed preferences from user input
  const analyzeUserInput = useCallback((input: string, isFollowUpQuery: boolean = false) => {
    const lowerInput = input.toLowerCase();
    let updatedPrefs = { ...preferences };
    
    // If it's a follow-up, keep previous preferences unless explicitly changed
    if (!isFollowUpQuery) {
      // Reset preferences if not a follow-up
      updatedPrefs = {
        genres: [] as number[],
        year: null as number | null,
        type: 'all' as 'all' | 'movie' | 'tv',
        mood: null as string | null,
        region: null as string | null,
        similar: null as string | null,
        query: null as string | null,
        themes: [] as string[],
        subgenre: null as string | null,
        rating: null as string | null,
        lastQuery: lowerInput
      };
    } else {
      // For follow-ups, keep the context but update lastQuery
      updatedPrefs.lastQuery = lowerInput;
    }

    // Special keyword handling
    if (lowerInput.includes('oscar') || lowerInput.includes('academy award')) {
      updatedPrefs.query = 'Academy Award winning';
    }
    
    // Handle horror subcategories
    const horrorSubgenres = {
      'jump scare': 'jump scares',
      'jump scares': 'jump scares',
      'jumpscare': 'jump scares',
      'slow burn': 'slow burn',
      'atmospheric': 'atmospheric',
      'psychological': 'psychological',
      'slasher': 'slasher',
      'gore': 'gore',
      'zombie': 'zombie',
      'monster': 'monster',
      'paranormal': 'paranormal',
      'ghost': 'ghost',
      'supernatural': 'supernatural',
      'possession': 'possession',
      'demonic': 'demonic',
      'occult': 'occult',
      'folk horror': 'folk horror',
      'body horror': 'body horror',
      'found footage': 'found footage'
    };
    
    // Check for horror subgenres
    Object.entries(horrorSubgenres).forEach(([keyword, value]) => {
      if (lowerInput.includes(keyword)) {
        updatedPrefs.subgenre = value;
      }
    });

    // Keywords for parsing
    const typeKeywords: Record<string, 'movie' | 'tv'> = {
      'movie': 'movie', 'movies': 'movie', 'film': 'movie', 'films': 'movie',
      'tv': 'tv', 'tv show': 'tv', 'show': 'tv', 'shows': 'tv', 'series': 'tv'
    };

    const moodKeywords: Record<string, string> = {
      'happy': 'comedy', 'sad': 'drama', 'exciting': 'action', 'scary': 'horror',
      'thoughtful': 'drama', 'relaxing': 'comedy', 'fun': 'comedy', 'funny': 'comedy',
      'intense': 'thriller', 'dark': 'thriller', 'weird': 'mystery', 'classic': 'history'
    };

    const regionKeywords: Record<string, string> = {
      'bollywood': 'IN', 'indian': 'IN', 'hollywood': 'US', 'american': 'US',
      'korean': 'KR', 'k-drama': 'KR', 'spanish': 'ES', 'french': 'FR', 'japanese': 'JP',
      'anime': 'JP', 'british': 'GB', 'uk': 'GB', 'italian': 'IT'
    };

    const themeKeywords = [
      'time travel', 'space', 'alien', 'zombie', 'superhero', 'post-apocalyptic',
      'dystopian', 'robot', 'ai', 'artificial intelligence', 'cyberpunk',
      'virtual reality', 'heist', 'spy', 'true story', 'based on book', 'biography',
      'psychological', 'supernatural', 'ghost', 'monster', 'vampire', 'werewolf',
      'magic', 'medieval', 'coming of age', 'high school', 'college', 'road trip'
    ];

    // 1. Detect "similar to"
    const similarPatterns = [
      /(?:like|similar to|recommend me|find me|suggest me)\s+(["']?)([^"'.!?]+)\1/i,
      /(?:movies|shows|series|films)\s+(?:that are|which are)?\s+like\s+(["']?)([^"'.!?]+)\1/i
    ];
    
    let similarMatch = null;
    for (const pattern of similarPatterns) {
      similarMatch = lowerInput.match(pattern);
      if (similarMatch) break;
    }
    updatedPrefs.similar = similarMatch ? similarMatch[2].trim() : updatedPrefs.similar;

    // 2. Extract Year
    const yearPattern = /\b(19[5-9]\d|20\d{2})\b/g;
    const yearMatch = lowerInput.match(yearPattern);
    if (yearMatch) {
      updatedPrefs.year = parseInt(yearMatch[yearMatch.length - 1]);
    }

    // 3. Detect Media Type
    for (const keyword in typeKeywords) {
      if (lowerInput.includes(keyword)) {
        updatedPrefs.type = typeKeywords[keyword];
        break;
      }
    }

    // 4. Detect Genres from TMDB
    const detectedGenres: number[] = [];
    for (const [id, name] of Object.entries(genreMaps.movie)) {
      if (lowerInput.includes(name)) {
        detectedGenres.push(Number(id));
      }
    }
    for (const [id, name] of Object.entries(genreMaps.tv)) {
      if (lowerInput.includes(name) && !detectedGenres.includes(Number(id))) {
        detectedGenres.push(Number(id));
      }
    }

    if (detectedGenres.length > 0) {
      updatedPrefs.genres = detectedGenres;
    }

    // 5. Detect Mood and map to genre
    for (const keyword in moodKeywords) {
      if (lowerInput.includes(keyword)) {
        updatedPrefs.mood = moodKeywords[keyword];
        break;
      }
    }

    // 6. Detect Region
    for (const keyword in regionKeywords) {
      if (lowerInput.includes(keyword)) {
        updatedPrefs.region = regionKeywords[keyword];
        break;
      }
    }

    // 7. Detect Themes
    const detectedThemes: string[] = [];
    themeKeywords.forEach(theme => {
      if (lowerInput.includes(theme)) {
        detectedThemes.push(theme);
      }
    });
    if (detectedThemes.length > 0) {
      updatedPrefs.themes = [...new Set(detectedThemes)];
    }

    // 8. Detect Rating preferences
    if (lowerInput.includes('highest rated') || lowerInput.includes('best rated') || lowerInput.includes('top rated')) {
      updatedPrefs.rating = 'top';
    }

    // 9. Set general query if nothing specific detected
    if (!updatedPrefs.similar && updatedPrefs.genres.length === 0 && !updatedPrefs.mood && 
        !updatedPrefs.region && updatedPrefs.themes.length === 0 && !updatedPrefs.year && !updatedPrefs.subgenre) {
      const queryCandidate = lowerInput
        .replace(/movies?|films?|tv shows?|shows?|series/g, '')
        .replace(/trending|popular|latest|new|recent|upcoming|soon|future/g, '')
        .replace(/like|similar to/g, '')
        .trim();
      if (queryCandidate.length > 3) {
        updatedPrefs.query = queryCandidate;
      }
    }

    return updatedPrefs;
  }, [genreMaps, preferences]);

  const handleFilterTypeChange = (input: string): string => {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('trending') || lowerInput.includes('popular')) return 'trending';
    if (lowerInput.includes('latest') || lowerInput.includes('new') || lowerInput.includes('recent')) return 'latest';
    if (lowerInput.includes('upcoming') || lowerInput.includes('soon') || lowerInput.includes('future')) return 'upcoming';
    return filterType;
  };

  const fetchRecommendations = useCallback(async (prefs: typeof preferences, filter: string) => {
    setIsLoading(true);
    let results: (Movie | TVShow)[] = [];
    
    try {
      // Build API parameters based on preferences
      let apiParams: Record<string, any> = {};
      
      // Genre filtering
      if (prefs.genres.length > 0) {
        apiParams.with_genres = prefs.genres.join(',');
      }
      
      // Year filtering
      if (prefs.year) {
        apiParams.primary_release_year = prefs.year;
      }
      
      // Region filtering
      if (prefs.region) {
        apiParams.with_origin_country = prefs.region;
      }
      
      // Rating sort
      if (prefs.rating === 'top') {
        apiParams.sort_by = 'vote_average.desc';
        apiParams.vote_count_gte = 100; // Only include well-rated items
      } else {
        // Default sorting based on filter type
        apiParams.sort_by = filter === 'trending' ? 'popularity.desc' : 
                          filter === 'latest' ? 'release_date.desc' : 
                          'popularity.desc';
      }

      // Handle unique horror subgenre requests with keyword search
      if (prefs.subgenre) {
        // Map subgenres to TMDB keywords or additional search terms
        const keywordMappings: Record<string, string> = {
          'jump scares': '110833', // TMDB keyword ID for jump scares
          'slow burn': '189932',   // Slow burn horror keyword
          'psychological': '3139',  // Psychological horror
          'slasher': '12339',      // Slasher
          'found footage': '159554', // Found footage
          'supernatural': '3136',  // Supernatural horror
          'paranormal': '9715',    // Paranormal activity
          'possession': '163219',  // Possession
          'demonic': '163219',     // Using same as possession
          'occult': '37101',       // Occult
          'body horror': '4568',   // Body horror
          'folk horror': '268371'  // Folk horror
        };
        
        if (keywordMappings[prefs.subgenre]) {
          apiParams.with_keywords = keywordMappings[prefs.subgenre];
        }
      }
      
      // 1. Handle "Similar To" requests
      if (prefs.similar) {
        const searchResults = await search(prefs.similar, prefs.type);

        if (searchResults && searchResults.length > 0) {
          const foundItem = searchResults[0];
          if (foundItem.media_type === 'movie' && foundItem.id) {
            results = await getSimilarMovies(foundItem.id);
          } else if (foundItem.media_type === 'tv' && foundItem.id) {
            results = await getSimilarTVShows(foundItem.id);
          } else {
            results = searchResults;
          }
        } else {
          results = await search(prefs.similar, prefs.type);
        }
      }
      // 2. Handle General Search Query
      else if (prefs.query) {
        results = await search(prefs.query, prefs.type);
      }
      // 3. Handle Filter-Based Results with discover API
      else {
        const mediaTypesToFetch = prefs.type === 'all' ? ['movie', 'tv'] : [prefs.type];
        const fetchPromises: Promise<(Movie | TVShow)[]>[] = [];

        for (const type of mediaTypesToFetch) {
          // Use discover API for filtered requests
          fetchPromises.push(discoverMedia(type as MediaType, apiParams));
        }
        const fetchedResults = await Promise.all(fetchPromises);
        results = fetchedResults.flat();
      }

      // Apply additional client-side filters if needed
      if (prefs.themes.length > 0) {
        // If we have themes, we could enhance this with additional API calls
        // For now, we'll filter based on overview text as a simple approach
        results = results.filter(item => {
          const overview = item.overview ? item.overview.toLowerCase() : '';
          return prefs.themes.some(theme => overview.includes(theme.toLowerCase()));
        });
      }

      // Sort results
      results.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      
      // Return up to 20 results
      results = results.slice(0, 20);

      return results;
    } catch (err) {
      console.error('Error in fetchRecommendations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate natural language response based on retrieved content
  const generateDynamicResponse = useCallback((recs: (Movie | TVShow)[], prefs: typeof preferences, context: ConversationContext): string => {
    if (recs.length === 0) {
      return "I couldn't find any titles matching your specific request. Could you try with different criteria or let me know if you'd like recommendations from a related category?";
    }
    
    const isFollowUpQuery = context.lastTopic && prefs.lastQuery?.toLowerCase().split(' ').length <= 5;
    
    // Extract useful information for response generation
    const mediaType = prefs.type === 'movie' ? 'movies' : 
                      prefs.type === 'tv' ? 'TV shows' : 
                      'movies and TV shows';
    
    // Get the genre names from IDs
    const genreNames = prefs.genres.map(id => 
      genreMaps.movie[id] || genreMaps.tv[id] || ''
    ).filter(Boolean);
    
    // Determine top genres in the results for better descriptions
    const genreCounts: Record<string, number> = {};
    recs.forEach(item => {
      const genres = item.genre_ids || [];
      genres.forEach(genreId => {
        const genreName = genreMaps.movie[genreId] || genreMaps.tv[genreId];
        if (genreName) {
          genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
        }
      });
    });
    
    // Sort genres by frequency
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Build response based on the query type and results
    let response = '';
    
    // Handle follow-up to horror with jump scares
    if (isFollowUpQuery && context.lastTopic === 'horror' && prefs.subgenre === 'jump scares') {
      response = `Perfect! I've found some excellent horror ${mediaType} with jump scares. `;
      
      // Highlight top recommendations
      const top3 = recs.slice(0, 3);
      const titles = top3.map(item => `"${(item as Movie).title || (item as TVShow).name}"`).join(', ');
      
      response += `You might enjoy ${titles}, which are known for their effective scares. `;
      response += `I've loaded ${recs.length} recommendations that should give you those adrenaline-pumping moments you're looking for.`;
      
      // Add a follow-up question
      response += ` Would you like me to suggest something with a specific theme like supernatural, possession, or found footage horror?`;
      
      // Update context for next conversation
      setConversationContext({
        lastTopic: 'horror',
        lastAnswerType: 'jump scares',
        suggestedFilters: ['supernatural', 'possession', 'found footage'],
        previousResults: recs
      });
      
      return response;
    }
    
    // Handle horror subgenre requests generally
    if (prefs.subgenre) {
      const subgenreMapping: Record<string, string> = {
        'jump scares': 'startling moments and sudden frights',
        'slow burn': 'gradually increasing tension and atmospheric dread',
        'psychological': 'mind-bending psychological elements',
        'slasher': 'classic slasher elements',
        'found footage': 'realistic found footage style',
        'supernatural': 'supernatural phenomena',
        'paranormal': 'paranormal activity',
        'possession': 'demonic possession themes',
        'folk horror': 'folk horror traditions',
        'body horror': 'disturbing body transformations'
      };
      
      const description = subgenreMapping[prefs.subgenre] || prefs.subgenre;
      
      response = `Here are some great ${mediaType} featuring ${description}. `;
      
      // Highlight top recommendations
      const top3 = recs.slice(0, 3);
      const titles = top3.map(item => `"${(item as Movie).title || (item as TVShow).name}"`).join(', ');
      
      response += `Standouts include ${titles}. `;
      
      // Add year info if relevant
      if (prefs.year) {
        response += `All from around ${prefs.year} as requested. `;
      }
      
      response += `I've loaded ${recs.length} recommendations that match what you're looking for.`;
      
      // Add a follow-up question based on context
      if (prefs.subgenre === 'jump scares') {
        response += ` Would you prefer supernatural horror or more realistic threats?`;
        setConversationContext({
          lastTopic: 'horror',
          lastAnswerType: 'jump scares',
          suggestedFilters: ['supernatural', 'realistic'],
          previousResults: recs
        });
      } else {
        response += ` Is there a specific theme or time period you'd be interested in?`;
        setConversationContext({
          lastTopic: 'horror',
          lastAnswerType: prefs.subgenre,
          previousResults: recs
        });
      }
      
      return response;
    }
    
    // Handle similar to requests
    if (prefs.similar) {
      response = `I found some great options similar to "${prefs.similar}" for you. `;
      
      // Highlight top recommendations
      const top3 = recs.slice(0, 3);
      const titles = top3.map(item => `"${(item as Movie).title || (item as TVShow).name}"`).join(', ');
      
      response += `You might enjoy ${titles}, which share similar themes or style. `;
      
      // Mention genres if we have them
      if (topGenres.length > 0) {
        response += `These recommendations often feature ${topGenres.join(', ')} elements. `;
      }
      
      response += `I've loaded ${recs.length} titles that fans of "${prefs.similar}" typically enjoy.`;
      
      // Add follow-up question
      response += ` Would you like more options or something with a specific mood?`;
      
      setConversationContext({
        lastTopic: 'similar',
        lastAnswerType: prefs.similar,
        previousResults: recs
      });
      
      return response;
    }

    // Generic response for other queries
    response = `Here are some ${prefs.mood || ''} ${genreNames.join(', ')} ${mediaType} `;
    
    if (prefs.year) {
      response += `from around ${prefs.year} `;
    }
    
    if (prefs.themes.length > 0) {
      response += `featuring ${prefs.themes.join(' and ')} `;
    }
    
    response += `that you might enjoy. `;
    
    // Highlight top recommendations
    const top3 = recs.slice(0, 3);
    const titles = top3.map(item => `"${(item as Movie).title || (item as TVShow).name}"`).join(', ');
    
    response += `Some standouts include ${titles}. `;
    
    response += `I've loaded ${recs.length} recommendations based on your preferences.`;
    
    // Add follow-up question
    response += ` Looking for something more specific or from a different genre?`;
    
    // Update context for next conversation
    setConversationContext({
      lastTopic: genreNames[0] || prefs.mood || 'general',
      previousResults: recs
    });
    
    return response;
  }, [genreMaps]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentInput = userInput.trim();
    if (!currentInput) return;

    // Add user message to conversation
    const userMsg = { role: 'user' as const, content: currentInput };
    setConversation(prev => [...prev, userMsg]);
    setUserInput('');

    // Show thinking indicator
    const thinkingMsg = { role: 'assistant' as const, content: 'Thinking...' };
    setConversation(prev => [...prev, thinkingMsg]);
    setIsLoading(true);

    // Check if this is a follow-up question
    const isFollowUpQuery = isFollowUp(currentInput);

    // Analyze user input and set preferences
    const newPrefs = analyzeUserInput(currentInput, isFollowUpQuery);
    const newFilter = handleFilterTypeChange(currentInput);
    setPreferences(newPrefs);
    setFilterType(newFilter);

    // Fetch recommendations from TMDB API
    const recs = await fetchRecommendations(newPrefs, newFilter);
    setRecommendations(Array.isArray(recs) ? recs : []);

    // Generate dynamic response based on the results and context
    const dynamicResponse = generateDynamicResponse(recs, newPrefs, conversationContext);

    // Update the conversation with the final response
    setConversation(prev => {
      const updated = [...prev];
      const thinkingIndex = updated.findLastIndex(msg => 
        msg.role === 'assistant' && msg.content === 'Thinking...'
      );
      if (thinkingIndex > -1) {
        updated[thinkingIndex] = { role: 'assistant', content: dynamicResponse };
      } else {
        updated.push({ role: 'assistant', content: dynamicResponse });
      }
      return updated;
    });

    setIsLoading(false);
  }, [userInput, analyzeUserInput, fetchRecommendations, isFollowUp, generateDynamicResponse, conversationContext]);

  useEffect(() => {
    const loadInitialContent = async () => {
      setIsLoading(true);
      try {
        const movieResults = await getTrending('movie');
        const tvResults = await getTrending('tv');
        const combined = [...movieResults, ...tvResults]
                          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
                          .slice(0, 20);
        setRecommendations(combined);
      } catch (error) {
        console.error('Error loading initial content:', error);
        setConversation(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I couldn\'t load initial recommendations. Please try asking me something!' 
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialContent();
  }, []);

  const handleExamplePromptClick = (prompt: string) => {
    setUserInput(prompt);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 mt-6 mb-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl dark:bg-black/30 dark:border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-500 bg-clip-text text-transparent">
          Movie Assistant
        </h2>
      </div>

      <div ref={conversationRef} className="mb-4 bg-white/30 dark:bg-gray-900/50 rounded-xl border border-white/20 dark:border-gray-800/50 shadow-inner p-3 sm:p-4 h-64 sm:h-80 overflow-y-auto scroll-smooth">
        {conversation.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <div
              className={`inline-block max-w-[85%] sm:max-w-[80%] p-2 px-3 sm:p-3 rounded-xl text-sm sm:text-base shadow ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                  : 'bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && conversation[conversation.length - 1]?.content !== 'Thinking...' && (
          <div className="flex justify-start mb-3">
          <div className="inline-block max-w-[85%] sm:max-w-[80%] p-2 px-3 sm:p-3 rounded-xl text-sm sm:text-base shadow bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-white">
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-200 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-200 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Movie Grid Section */}
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-3">
      {filterType === 'trending' && <ThumbsUp className="w-5 h-5 text-blue-500" />}
      {filterType === 'latest' && <Calendar className="w-5 h-5 text-blue-500" />}
      {filterType === 'upcoming' && <Film className="w-5 h-5 text-blue-500" />}
      <h3 className="text-lg font-medium">
        {filterType === 'trending' && 'Trending'}
        {filterType === 'latest' && 'Latest'}
        {filterType === 'upcoming' && 'Upcoming'}
        {filterType === 'search' && 'Results'}
        {filterType === 'discover' && 'Recommendations'}
      </h3>
      {isLoading && (
        <div className="ml-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
    
    {/* Media Grid display */}
    <MediaGrid items={recommendations} />
    
    {recommendations.length === 0 && !isLoading && (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          No recommendations to display yet. Try asking for movies or shows you might enjoy!
        </p>
      </div>
    )}
  </div>

  {/* Input Section */}
  <div className="relative">
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Ask for movie or TV show recommendations..."
        className="w-full p-3 pl-4 pr-10 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:placeholder-gray-400"
      />
      <button
        type="submit"
        disabled={!userInput.trim()}
        className="absolute right-2 p-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="w-5 h-5" />
        <span className="sr-only">Search</span>
      </button>
    </form>

    {/* Example prompts */}
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={() => handleExamplePromptClick("Show me horror movies with jump scares")}
        className="text-xs px-3 py-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        Horror with jump scares
      </button>
      <button
        onClick={() => handleExamplePromptClick("Movies like Inception")}
        className="text-xs px-3 py-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        Movies like Inception
      </button>
      <button
        onClick={() => handleExamplePromptClick("Korean dramas about time travel")}
        className="text-xs px-3 py-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        Korean time travel dramas
      </button>
      <button
        onClick={() => handleExamplePromptClick("Trending sci-fi shows")}
        className="text-xs px-3 py-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        Trending sci-fi shows
      </button>
    </div>
  </div>
</div>
);
};

export default AiAssistant;