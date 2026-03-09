'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Zap, Play, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  picks?: TmdbItem[];
}

const TMDB_KEY = "51d91894475b90ea5449bb71c1cd0a65";

const SUGGESTIONS = [
  "Something great tonight 🌙",
  "Make me laugh 😂",
  "Make me cry 😭",
  "Best thrillers ever made",
  "Hidden gems nobody talks about",
  "Like Breaking Bad but different",
];

const G = {
  card: {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
  } as React.CSSProperties,
};

/* ---------------- RECOMMENDATION ENGINE ---------------- */

function detectGenre(query: string) {
  const q = query.toLowerCase();

  if (q.includes("laugh") || q.includes("funny") || q.includes("comedy")) return "35";
  if (q.includes("cry") || q.includes("sad") || q.includes("emotional")) return "18";
  if (q.includes("thriller") || q.includes("suspense")) return "53";
  if (q.includes("action")) return "28";
  if (q.includes("romance") || q.includes("love")) return "10749";
  if (q.includes("horror") || q.includes("scary")) return "27";

  return "";
}

async function getRecommendations(query: string): Promise<TmdbItem[]> {

  const genre = detectGenre(query);

  const url = genre
    ? `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=popularity.desc`
    : `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.results ?? []).slice(0,5);
}

/* ---------------- COMPONENT ---------------- */

export default function AiAssistant() {

  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Tell me your mood 🎬 Comedy? Thriller? Something emotional? I'll find the perfect watch.",
    },
  ]);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, loading]);

  const send = useCallback(async (text?: string) => {

    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Msg = { role: "user", content };

    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {

      const picks = await getRecommendations(content);

      const responses = [
        "Oh you NEED to see these.",
        "Trust me on this lineup.",
        "Tonight's watchlist sorted.",
        "These should hit the spot.",
        "Queue these up immediately."
      ];

      const random = responses[Math.floor(Math.random()*responses.length)];

      setMsgs(prev => [
        ...prev,
        {
          role: "assistant",
          content: random,
          picks
        }
      ]);

    } catch {

      setMsgs(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Something broke while searching. Try again."
        }
      ]);

    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }

  }, [input, loading]);

  const goPlay = (item: TmdbItem) => {

    const isTV =
      item.media_type === "tv" || (!item.title && !!item.name);

    navigate(`/${isTV ? "tv" : "movie"}/${item.id}`);
  };

  return (

    <div style={{ maxWidth: 880, margin: "0 auto", padding: 32, color: "#f1f5f9" }}>

      {/* HEADER */}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>

        <div style={{
          width:46,
          height:46,
          borderRadius:12,
          background:"linear-gradient(135deg,#7c3aed,#06b6d4)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center"
        }}>
          <Zap color="white"/>
        </div>

        <div>

          <h2 style={{ fontWeight:800 }}>CinemaBot</h2>

          <p style={{ fontSize:11, opacity:0.5 }}>
            Free AI Movie Companion
          </p>

        </div>

        <Sparkles style={{ marginLeft:"auto", opacity:0.6 }}/>

      </div>

      {/* CHAT */}

      <div
        ref={chatRef}
        style={{
          ...G.card,
          borderRadius:16,
          padding:16,
          height:420,
          overflowY:"auto",
          display:"flex",
          flexDirection:"column",
          gap:12
        }}
      >

        {msgs.map((msg,i)=>(
          <div key={i}
          style={{
            alignSelf: msg.role==="user" ? "flex-end":"flex-start",
            maxWidth:"80%"
          }}>

            <div
            style={{
              padding:"10px 14px",
              borderRadius:12,
              background: msg.role==="user"
                ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                : "rgba(255,255,255,0.1)"
            }}
            >
              {msg.content}
            </div>

            {/* MEDIA PICKS */}

            {msg.picks && (

              <div style={{
                display:"flex",
                gap:10,
                marginTop:10,
                overflowX:"auto"
              }}>

                {msg.picks.map(item=>{

                  const title = item.title ?? item.name ?? "";

                  return (

                    <div
                      key={item.id}
                      onClick={()=>goPlay(item)}
                      style={{
                        width:110,
                        cursor:"pointer"
                      }}
                    >

                      <img
                        src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                        style={{
                          width:"100%",
                          borderRadius:8
                        }}
                      />

                      <p style={{
                        fontSize:11,
                        marginTop:4
                      }}>
                        {title}
                      </p>

                    </div>

                  );

                })}

              </div>

            )}

          </div>
        ))}

      </div>

      {/* SUGGESTIONS */}

      {msgs.length===1 && (

        <div style={{
          display:"flex",
          flexWrap:"wrap",
          gap:8,
          marginTop:10
        }}>

          {SUGGESTIONS.map(s=>(
            <button
              key={s}
              onClick={()=>send(s)}
              style={{
                padding:"6px 12px",
                borderRadius:20,
                background:"rgba(255,255,255,0.1)",
                border:"none",
                cursor:"pointer",
                color:"#111010"
              }}
            >
              {s}
            </button>
          ))}

        </div>

      )}

      {/* INPUT */}

      <div
        style={{
          ...G.card,
          marginTop:12,
          borderRadius:12,
          padding:"6px 10px",
          display:"flex",
          alignItems:"center",
          gap:8
        }}
      >

        <input
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{
            if(e.key==="Enter") send();
          }}
          placeholder="Ask for a movie..."
          style={{
            flex:1,
            background:"transparent",
            border:"none",
            outline:"none",
            color:"white"
          }}
        />

        <button
          onClick={()=>send()}
          disabled={!input.trim() || loading}
          style={{
            width:36,
            height:36,
            borderRadius:8,
            border:"none",
            background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center"
          }}
        >
          <Send size={16} color="white"/>
        </button>

      </div>

    </div>
  );
}