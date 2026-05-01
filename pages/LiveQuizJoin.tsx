import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, LogIn, RotateCcw } from 'lucide-react';
import {
  getLiveQuizSessionByCode,
  getRememberedLiveQuizParticipantId,
  joinLiveQuizSession,
  reconnectLiveQuizParticipant,
} from '../utils/liveQuizUtils';
import { recordGamePlay } from '../utils/gameUtils';
import { LiveQuizParticipant, LiveQuizSession } from '../types';

export const LiveQuizJoin: React.FC = () => {
  const { joinCode = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [rememberedParticipant, setRememberedParticipant] = useState<LiveQuizParticipant | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    getLiveQuizSessionByCode(joinCode)
      .then((loaded) => {
        if (disposed) return;
        setSession(loaded);
        setRememberedParticipant(null);
        setLoading(false);
        if (loaded) {
          const participantId = getRememberedLiveQuizParticipantId(loaded.id);
          if (participantId) {
            void reconnectLiveQuizParticipant(loaded.id, participantId).then((result) => {
              if (!disposed && result.success && result.participant) {
                setRememberedParticipant(result.participant);
              }
            });
          }
        }
      })
      .catch(() => {
        if (disposed) return;
        setSession(null);
        setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [joinCode]);

  const handleJoin = async () => {
    if (!session) return;
    setError('');
    setJoining(true);
    const result = await joinLiveQuizSession(session.id, name);
    setJoining(false);
    if (!result.success || !result.participant) {
      setError(result.error || 'Unable to join this game.');
      return;
    }
    if (session.sourceGameId) void recordGamePlay(session.sourceGameId);
    navigate(`/live/play/${session.id}/${result.participant.id}`);
  };

  const handleReconnect = async () => {
    if (!session || !rememberedParticipant) return;
    setError('');
    setReconnecting(true);
    const result = await reconnectLiveQuizParticipant(session.id, rememberedParticipant.id);
    setReconnecting(false);
    if (!result.success || !result.participant) {
      setRememberedParticipant(null);
      setError(result.error || 'Could not reconnect. Join again to continue as a new player.');
      return;
    }
    navigate(`/live/play/${session.id}/${result.participant.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-yellow border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Live quiz not found</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Ask your teacher to check the join code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1 text-xs font-black uppercase text-slate-900">
          <LogIn size={14} />
          Live Quiz
        </div>
        <h1 className="text-3xl font-black leading-tight">{session.title}</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">Code {session.joinCode}</p>

        {rememberedParticipant && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-black text-slate-900">Continue as {rememberedParticipant.displayName}</div>
            <p className="mt-1 text-xs font-bold text-slate-600">Use this if your connection dropped or you refreshed the page.</p>
            <button
              type="button"
              onClick={() => void handleReconnect()}
              disabled={reconnecting}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-3 font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={17} />
              {reconnecting ? 'Reconnecting...' : 'Rejoin game'}
            </button>
          </div>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleJoin();
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">Name or team</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-yellow"
              placeholder="Enter your name"
              maxLength={40}
            />
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={joining || !name.trim()}
            className="w-full rounded-xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};
