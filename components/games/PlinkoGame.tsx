import { HalloweenDecorations } from './shared/HalloweenDecorations';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeneratedGame, GameRunOptions, TriviaStyle } from '../../types';
import { translateInterfaceText as ui, displayTeamName, useInterfaceLanguage } from '../../utils/interfaceLanguage';
import { requestGameFullscreen } from '../../utils/gameFullscreen';
import { PlinkoAudio, PlinkoSound } from '../../utils/plinkoAudio';
import { makePlinkoPegs, makePlinkoRails, plinkoRoundLayout, plinkoRoundValues, plinkoDropScore, plinkoBonusOffers, plinkoPocketStars, simulatePlinkoTurn, PlinkoFrame, PlinkoBonus } from '../../utils/plinko';
import { WinnerCeremonyHero, WinnerCeremonyStandingsTable } from './shared/WinnerCeremonyHero';
import { StandardQuestionCard } from './shared/StandardQuestionCard';
import { useActiveTeamScroll } from './shared/useActiveTeamScroll';
import { useMobileQuestionViewport } from './shared/useMobileQuestionViewport';
import { PlinkoBoard } from './PlinkoBoard';
import { PlinkoBonusIcon, PLINKO_BONUS_COPY, PlinkoFaceIcon, PLINKO_FACES } from './PlinkoIcons';
import { Volume2, VolumeX, Maximize2, Minimize2, LogOut, Flag, Dice5, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeTriviaStyle } from '../../utils/triviaStyles';
import { saveTriviaStyle } from '../../services/triviaStyleStorage';
import { TriviaStylePicker } from './TriviaStylePicker';
import { useWorkspaceDialog } from './GameWorkspace';
import './trivia-comic.css';
import './trivia-skins.css';
import './plinko.css';
import './plinko-chrome.css';
import './plinko-mobile.css';
import './plinko-styles.css';

type Props = { game: GeneratedGame; options: GameRunOptions; onBack: () => void; onFinish: () => void; onReplay: () => void; onTriviaStyleChange?: (style:TriviaStyle) => void };
type Phase = 'chips' | 'round' | 'turn' | 'question' | 'bonus' | 'choose' | 'falling' | 'tally' | 'result' | 'over';

export function PlinkoGame({ game, options, onBack, onFinish, onReplay, onTriviaStyleChange }: Props) {
  useInterfaceLanguage();
  const {user}=useAuth();
  const [gameStyle,setGameStyle]=useState(()=>normalizeTriviaStyle(options.triviaStyle??game.config.triviaStyle));
  const [showOptions,setShowOptions]=useState(false),[styleSaveError,setStyleSaveError]=useState(false);
  const styleSaves=useRef(Promise.resolve()),styleVersion=useRef(0);
  const optionsDialog=useWorkspaceDialog(showOptions,()=>setShowOptions(false));
  const chooseStyle=(next:TriviaStyle)=>{
    setGameStyle(next);setStyleSaveError(false);onTriviaStyleChange?.(next);
    const version=++styleVersion.current;
    styleSaves.current=styleSaves.current.then(async()=>{const saved=await saveTriviaStyle(game,next,user?.id);if(version===styleVersion.current)setStyleSaveError(!saved);});
  };

  const players = Math.max(1, Math.min(6, options.players || 2));
  const rounds = Math.max(1, Math.min(20, options.plinkoRounds || 5));
  const pegPoints = Math.max(1, options.plinkoPegPoints ?? 2);
  const roundIncrease = Math.max(0, options.plinkoRoundIncrease ?? 50);
  const [scores, setScores] = useState<number[]>(() => Array(players).fill(0));
  const [names, setNames] = useState(() => Array.from({ length: players }, (_, i) => options.teamNames?.[i] && !/^Team \d+$/.test(options.teamNames[i]) ? options.teamNames[i] : ui('Player {number}', {number:i+1})));
  const [chips,setChips] = useState<number[]>(()=>Array(players).fill(-1));
  const [chipTeam,setChipTeam] = useState(0);
  const [stars,setStars] = useState<number[]>(()=>Array(players).fill(0));
  const [bonusBubble,setBonusBubble]=useState<{bonus:PlinkoBonus;x:number;y:number;width:number;below:boolean}|null>(null);
  const [offers,setOffers] = useState<PlinkoBonus[]>([]);
  const [starFlights,setStarFlights] = useState<Array<{id:number;count:number;x:number;y:number;progress:number}>>([]);
  const starGroups=useRef<Array<{id:number;team:number;count:number;fromX:number;fromY:number;toX:number;toY:number;start:number;duration:number}>>([]);
  const starId=useRef(0);
  const starAnimation=useRef(0);
  const starTargets=useRef<Array<HTMLElement|null>>([]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>('chips');
  const [pegTime, setPegTime] = useState(() => performance.now() / 1000);
  const [entry, setEntry] = useState(3);
  const [values, setValues] = useState<number[]>(() => plinkoRoundValues(0));
  const [frame, setFrame] = useState<PlinkoFrame | null>(null);
  const [trail, setTrail] = useState<PlinkoFrame[]>([]);
  const [extraBalls, setExtraBalls] = useState<Array<{ frame: PlinkoFrame; trail: PlinkoFrame[] }>>([]);
  const [bonus, setBonus] = useState<PlinkoBonus | null>(null);
  const [result, setResult] = useState<{ hits: number; redHits: number; pegScore: number; pocketPoints: number; points: number; pockets: number[] } | null>(null);
  const [muted, setMuted] = useState(options.muted);
  const audio=useRef<PlinkoAudio|null>(null);
  if(!audio.current)audio.current=new PlinkoAudio(options.muted);
  const sound=useCallback((cue:PlinkoSound,detail=0)=>{audio.current?.play(cue,detail);},[]);
  useEffect(()=>{audio.current?.setMuted(muted);},[muted]);
  useEffect(()=>()=>audio.current?.dispose(),[]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [confirm, setConfirm] = useState<'quit' | 'end' | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editStars, setEditStars] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const chipDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = chipDialog.current;
    if (phase === 'chips') {
      if (dialog && !dialog.open) dialog.showModal();
      dialog?.querySelector<HTMLButtonElement>('.plinko-face-grid button:not(:disabled)')?.focus();
    } else if (dialog?.open) dialog.close();
  }, [phase, chipTeam]);
  const animation = useRef(0);
  const liveCounter = useRef<HTMLSpanElement>(null);
  const scoreTargets = useRef<Array<HTMLElement | null>>([]);
  const [flight, setFlight] = useState<{points:number; x:number; y:number; scale:number} | null>(null);
  const dropLock = useRef(false);
  const currentTeam = turn % players;
  const teamStrip=useRef<HTMLDivElement>(null);
  useActiveTeamScroll(teamStrip,currentTeam);
  useEffect(() => {
    const panel=container.current?.querySelector<HTMLElement>('.plinko-score-panel');
    if(!panel)return;
    const revealActiveTeam=()=>{
      if(panel.scrollHeight<=panel.clientHeight)return;
      const active=panel.querySelector<HTMLElement>('[aria-current="true"]');
      if(!active)return;
      const row=active.getBoundingClientRect(),bounds=panel.getBoundingClientRect();
      if(row.top<bounds.top+6)panel.scrollTop+=row.top-bounds.top-6;
      else if(row.bottom>bounds.bottom-6)panel.scrollTop+=row.bottom-bounds.bottom+6;
    };
    revealActiveTeam();
    const observer=new ResizeObserver(revealActiveTeam);
    observer.observe(panel);
    return ()=>observer.disconnect();
  },[currentTeam]);
  const round = Math.floor(turn / players) + 1;
  const layout = plinkoRoundLayout(round - 1);
  const rails = useMemo(() => makePlinkoRails(round - 1), [round]);
  const [pegs, setPegs] = useState(() => makePlinkoPegs(0));
  const questions = useMemo(() => {
    const list = (game.questions || []).filter(q => !q.isBonus);
    if (options.randomizeQuestions) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [game.questions, options.randomizeQuestions]);
  const busy = phase === 'falling' || phase === 'tally';
  const activeFrames = [...(frame ? [frame] : []), ...extraBalls.map(b => b.frame)];
  const livePoints = phase === 'tally' || phase === 'result' ? (result?.points ?? 0) : phase === 'falling' ? activeFrames.reduce((n, f) => n + f.pegUnits * pegPoints + (f.exitEligible && f.pocket >= 0 ? values[f.pocket] : 0), 0) : 0;
  const hasTurnPoints = activeFrames.some(f => f.hits > 0 || (f.exitEligible && f.pocket >= 0));
  const boxStars=useMemo(()=>plinkoPocketStars(round-1,values.length),[round,values.length]);
  const question = questions.length ? questions[turn % questions.length] : undefined;
  useMobileQuestionViewport(container, phase === 'question', {headerSelector:mobile?'.plinko-score-panel':'[data-question-overlay-anchor]'});
  useEffect(() => {
    if (phase !== 'choose' && phase !== 'turn' && phase !== 'round') return;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      if (now - last > 32) { setPegTime(now / 1000); last = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const resize = () => setMobile(media.matches);
    const fs = () => setFullscreen(Boolean(document.fullscreenElement));
    resize();
    media.addEventListener('change', resize);
    document.addEventListener('fullscreenchange', fs);
    return () => { media.removeEventListener('change', resize); document.removeEventListener('fullscreenchange', fs); cancelAnimationFrame(animation.current); cancelAnimationFrame(starAnimation.current); };
  }, []);

  useEffect(()=>{
    if(phase!=='round')return;
    sound('round');
    const timer=window.setTimeout(()=>setPhase('turn'),window.matchMedia('(prefers-reduced-motion: reduce)').matches?600:2100);
    return ()=>window.clearTimeout(timer);
  },[phase,round,sound]);
  const next = () => {
    const nextTurn = turn + 1;
    if (nextTurn >= rounds * players) { setPhase('over'); return; }
    if (nextTurn % players === 0) {
      const nextRound = Math.floor(nextTurn / players);
      setPegs(makePlinkoPegs(nextRound));
      setValues(plinkoRoundValues(nextRound, roundIncrease));
    }
    dropLock.current = false;
    setFrame(null); setTrail([]); setExtraBalls([]); setBonus(null); setResult(null); setEntry(3);
    setBonusBubble(null);setTurn(nextTurn); setPhase(nextTurn%players===0?'round':'turn');
  };
  const transferPoints = (points: number, reduced: boolean) => {
    const from = liveCounter.current!.getBoundingClientRect();
    const to = scoreTargets.current[currentTeam]!.getBoundingClientRect();
    const oldScore = scores[currentTeam];
    const flyDuration = reduced ? 180 : 700, countDuration = reduced ? 200 : 550;
    let started: number | undefined,lastCoin=-1;
    sound('score-flight');
    setPhase('tally');
    const transfer = (now: number) => {
      started ??= now;
      const elapsed = now - started;
      const fly = Math.min(1, elapsed / flyDuration), ease = 1 - (1-fly)**3;
      if (fly < 1) setFlight({points, x:from.x+from.width/2+(to.x+to.width/2-from.x-from.width/2)*ease,
        y:from.y+from.height/2+(to.y+to.height/2-from.y-from.height/2)*ease-Math.sin(fly*Math.PI)*55, scale:1-fly*.3});
      else setFlight(null);
      const count = Math.max(0, Math.min(1, (elapsed-flyDuration)/countDuration));
      const coin=Math.min(10,Math.floor(Math.max(0,elapsed-flyDuration*.35)/(flyDuration*.65+countDuration)*10));
      if(points!==0&&elapsed>flyDuration*.35&&coin>lastCoin){lastCoin=coin;sound('coin',points<0?10-coin:coin);}
      if (count > 0) setScores(previous => previous.map((score, i) => i === currentTeam ? oldScore + Math.round(points*(1-(1-count)**3)) : score));
      if (count < 1) { animation.current=requestAnimationFrame(transfer); return; }
      setScores(previous => previous.map((score, i) => i === currentTeam ? oldScore+points : score));
      setPhase('result');
    };
    animation.current=requestAnimationFrame(transfer);
  };
  const awardStars=(pocket:number,reduced:boolean)=>{
    const count=boxStars[pocket];
    if(!count)return;
    sound('star');
    const from=board.current?.querySelector(`[data-testid="plinko-box-stars-${pocket}"]`)?.getBoundingClientRect();
    const to=starTargets.current[currentTeam]?.getBoundingClientRect();
    if(!from||!to){setStars(previous=>previous.map((n,i)=>i===currentTeam?n+count:n));return;}
    starGroups.current.push({id:starId.current++,team:currentTeam,count,fromX:from.x+from.width/2,fromY:from.y,toX:to.x+to.width/2,toY:to.y,start:performance.now(),duration:reduced?180:650});
    if(starAnimation.current)return;
    const fly=(now:number)=>{
      const visible:typeof starFlights=[];
      starGroups.current=starGroups.current.filter(group=>{
        const t=Math.max(0,Math.min(1,(now-group.start)/group.duration)),ease=1-(1-t)**3;
        if(t===1){setStars(previous=>previous.map((n,i)=>i===group.team?n+group.count:n));return false;}
        visible.push({id:group.id,count:group.count,x:group.fromX+(group.toX-group.fromX)*ease,y:group.fromY+(group.toY-group.fromY)*ease-Math.sin(t*Math.PI)*70,progress:t});
        return true;
      });
      setStarFlights(visible);
      starAnimation.current=starGroups.current.length?requestAnimationFrame(fly):0;
    };
    starAnimation.current=requestAnimationFrame(fly);
  };
  const showBonusBubble=(item:PlinkoBonus,target:HTMLElement)=>{
    const rect=target.getBoundingClientRect(),width=Math.min(260,window.innerWidth-24);
    setBonusBubble({bonus:item,width,x:Math.max(width/2+12,Math.min(window.innerWidth-width/2-12,rect.x+rect.width/2)),y:rect.top<180?rect.bottom+12:rect.top-12,below:rect.top<180});
  };
  const drop = (selectedEntry: number) => {
    if (phase !== 'choose' || dropLock.current) return;
    dropLock.current = true;
    const dropTime = performance.now() / 1000;
    const simulations = simulatePlinkoTurn(pegs, selectedEntry, Math.random, { bonus, rails, startTime: dropTime, entryCount:layout.entryCount, pocketCount:layout.pocketCount });
    setEntry(selectedEntry);
    setFrame(simulations[0].frames[0]);
    setExtraBalls([]);
    setPhase('falling');

    sound('drop');
    let start: number | undefined;
    const lastPeg = simulations.map(() => -1);
    const lastHits = simulations.map(() => 0), lastRails = simulations.map(() => 0), lastRoofs=simulations.map(()=>0);
    const dumplingPopped=new Set<number>();
    const hitAt = simulations.map(() => -Infinity), railAt = simulations.map(() => -Infinity);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalDuration = Math.max(...simulations.map(simulation => simulation.duration + simulation.delay));
    const wonBoxes=new Set<number>(),landedBodies=new Set<number>();
    const speed = reduced ? totalDuration / 1.2 : 1;
    const animate = (now: number) => {
      start ??= now;
      const elapsed = Math.min(totalDuration, (now - start) / 1000 * speed);
      setPegTime(dropTime + elapsed);
      const visible = simulations.flatMap((simulation, ball) => {
        if (elapsed < simulation.delay) return [];
        const progress = Math.max(0, Math.min(1, (elapsed - simulation.delay) / simulation.duration));
        const position = progress * (simulation.frames.length - 1), index = Math.floor(position);
        const landed=simulation.frames[index];
        if(landed.exitEligible&&landed.pocket>=0&&!landedBodies.has(ball)){landedBodies.add(ball);sound('land');}
        if(landed.exitEligible && landed.pocket>=0 && !wonBoxes.has(landed.pocket)){wonBoxes.add(landed.pocket);awardStars(landed.pocket,reduced);}
        const a = simulation.frames[index], b = simulation.frames[Math.min(index + 1, simulation.frames.length - 1)], mix = position - index;
        if(a.blob?.burst&&!dumplingPopped.has(ball)){dumplingPopped.add(ball);sound('dumpling-pop');}
        if(a.roofHits>lastRoofs[ball]){lastRoofs[ball]=a.roofHits;sound('roof');}
        if (a.hits > lastHits[ball]) {
          for (let scan = index; scan >= 0; scan--) if (simulation.frames[scan].peg >= 0) { lastPeg[ball] = simulation.frames[scan].peg; break; }
          lastHits[ball] = a.hits; hitAt[ball] = now; sound('peg');
        }
        if (a.railHits > lastRails[ball]) { lastRails[ball] = a.railHits; railAt[ball] = now; sound('rail'); }
        const frame = { ...a, x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix, rotation: a.rotation + (b.rotation - a.rotation) * mix, landing: (a.landing ?? 0) + ((b.landing ?? 0) - (a.landing ?? 0)) * mix, peg: now - hitAt[ball] < 220 ? lastPeg[ball] : -1, rail: now - railAt[ball] < 240 ? a.rail : -1 };
        return [{ frame, trail: simulation.frames.slice(Math.max(0, index - 24), index).filter((_, i) => i % 4 === 0) }];
      });
      if (visible[0]) { setFrame(visible[0].frame); setTrail(visible[0].trail); }
      setExtraBalls(visible.slice(1));
      if (elapsed < totalDuration) { animation.current = requestAnimationFrame(animate); return; }
      const scores = simulations.map(simulation => plinkoDropScore(simulation, values, pegPoints, bonus));
      const points = scores.reduce((total, score) => total + score.total, 0);
      setResult({ hits: simulations.reduce((n, drop) => n + drop.hits, 0), redHits: simulations.reduce((n, drop) => n + drop.redHits, 0), pegScore: scores.reduce((n, score) => n + score.pegScore, 0), pocketPoints: scores.reduce((n, score) => n + score.pocketPoints, 0), points, pockets: simulations.filter(drop=>drop.exitEligible && drop.pocket>=0).map(drop => drop.pocket) });
      transferPoints(points, reduced);
    };
    animation.current = requestAnimationFrame(animate);
  };

  if (phase === 'over') {
    const ranking = scores.map((score, index) => ({ index, name: names[index], score })).sort((a, b) => b.score - a.score);
    const winners = ranking.filter(t => t.score === ranking[0].score);
    const winnerHeadline = winners.length > 1 ? ui('WINNERS: {names}', { names: winners.map(t => displayTeamName(t.name)).join(' & ') }) : ui('WINNER: {name}', { name: displayTeamName(winners[0].name) });
    return <div className="game-winner-screen z-[300] bg-gradient-to-br from-violet-900 via-indigo-950 to-slate-950 text-white">
      <WinnerCeremonyHero winnerHeadline={winnerHeadline} subtitle={ui('Final standings')} ranking={ranking} isMobileViewport={mobile} musicEnabled={!muted} onPlayAgain={onReplay} onExit={onFinish}><WinnerCeremonyStandingsTable ranking={ranking} /></WinnerCeremonyHero>
    </div>;
  }
  const chooseChip=(face:number)=>{
    if(phase!=='chips'||chips.includes(face))return;
    sound('bonus');setChips(previous=>previous.map((n,i)=>i===chipTeam?face:n));
    if(chipTeam+1<players)setChipTeam(chipTeam+1);else setPhase('round');
  };
  const randomizeChips=()=>{
    if(phase!=='chips')return;
    const available=PLINKO_FACES.map((_,index)=>index).filter(face=>!chips.includes(face));
    for(let i=available.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
    let next=0;
    sound('bonus');setChips(chips.map(face=>face>=0?face:available[next++]));setPhase('round');
  };
  const saveTeam=(event:React.FormEvent)=>{
    event.preventDefault();
    if(editing===null)return;
    const index=editing,nextStars=Math.max(0,Math.floor(Number(editStars)||0));
    setNames(previous=>previous.map((name,i)=>i===index?editName.trim()||`Team ${i+1}`:name));
    setScores(previous=>previous.map((score,i)=>i===index?Math.max(0,Number(editScore)||0):score));
    setStars(previous=>previous.map((count,i)=>i===index?nextStars:count));
    if(index===currentTeam&&phase==='bonus'&&nextStars!==stars[index]){
      setBonusBubble(null);setOffers(plinkoBonusOffers(nextStars));
      if(nextStars===0){setBonus(null);setPhase('choose');}
    }
    setEditing(null);
  };
  const hoverSound=(target:EventTarget|null,related:EventTarget|null=null)=>{
    const button=target instanceof Element?target.closest('button'):null;
    if(!button||button.disabled||(related instanceof Node&&button.contains(related)))return;
    const entry=button.closest('.plinko-entries');sound(entry?'entry-hover':'hover',entry?Number(button.textContent)-1:0);
  };
  const renderMenuButtons = () => <>
            <button aria-label={muted ? ui('Unmute') : ui('Mute')} onClick={() => {const nextMuted=!muted;audio.current?.setMuted(nextMuted);if(!nextMuted)audio.current?.unlock();setMuted(nextMuted);}}>{muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button>
            <button disabled={phase === 'tally'} aria-label={fullscreen ? ui('Exit fullscreen') : ui('Enter fullscreen')} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else if (container.current) void requestGameFullscreen(container.current); }}>{fullscreen ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}</button>
            <button aria-label={ui('Quit')} onClick={() => {setShowOptions(false);setConfirm('quit');}}><LogOut size={19}/></button>
            <button aria-label={ui('End Game')} onClick={() => {setShowOptions(false);setConfirm('end');}}><Flag size={19}/></button>
  </>;
  return <div ref={container} onPointerDownCapture={event=>{audio.current?.unlock();}} onKeyDownCapture={()=>audio.current?.unlock()} onPointerOverCapture={event=>{if(event.pointerType==='mouse')hoverSound(event.target,event.relatedTarget);}} onFocusCapture={event=>hoverSound(event.target,event.relatedTarget)} className={`plinko-game ${gameStyle==='comic-pop'?'trivia-comic':'trivia-skinned'}`} data-trivia-style={gameStyle} data-phase={phase} style={{'--plinko-players':players,'--plinko-team-rows':Math.ceil(players/2)} as React.CSSProperties}>
        {gameStyle==='halloween'&&<HalloweenDecorations muted={muted}/>}
    <div data-question-overlay-anchor />
    <div className="plinko-stage" data-bonus-choices={phase==='bonus'}>
      <button className="plinko-mobile-menu plinko-cog" aria-label={ui('Game options')} aria-haspopup="dialog" onClick={()=>setShowOptions(true)}><Settings size={22}/><span>{ui('Menu')}</span></button>
      {phase==='bonus' && <aside className="plinko-bonus-panel is-picking" aria-label={ui('Bonuses')}>
        <h2>{ui('Choose your bonus')}</h2>
        <div className="plinko-bonus-gallery" style={{'--plinko-offers':offers.length} as React.CSSProperties}>{offers.map((item,index)=><button key={item} className="plinko-gallery-option is-offered" style={{animationDelay:`${index*80}ms`}} data-bonus={item} aria-label={ui(PLINKO_BONUS_COPY[item].label)} aria-describedby={bonusBubble?.bonus===item?'plinko-bonus-bubble':undefined}
          onMouseEnter={event=>showBonusBubble(item,event.currentTarget)} onMouseLeave={()=>setBonusBubble(null)} onFocus={event=>showBonusBubble(item,event.currentTarget)} onBlur={()=>setBonusBubble(null)}
          onClick={()=>{sound('bonus');setBonusBubble(null);setBonus(item);setStars(previous=>previous.map((n,i)=>i===currentTeam?0:n));setPhase('choose');}}><PlinkoBonusIcon bonus={item} size={124}/></button>)}</div>
      </aside>}
      <div className="plinko-board-wrap" ref={board}>
        <div className="plinko-live-counter" aria-live="polite" aria-atomic="true"><strong><span key={livePoints} ref={liveCounter} data-testid="plinko-live-points" style={{visibility:hasTurnPoints && phase === 'falling' ? 'visible' : 'hidden'}}>{hasTurnPoints ? livePoints : ''}</span></strong></div>
        <PlinkoBoard round={round} stars={boxStars} face={chips[currentTeam]} entryCount={layout.entryCount} pegTime={pegTime} pegs={pegs} values={values} entry={entry} choosing={phase === 'choose'} falling={phase === 'falling'} frame={frame} trail={trail} extraBalls={extraBalls} rails={rails} bonus={bonus} winningPockets={result?.pockets} pegPoints={pegPoints} onPreview={setEntry} onDrop={drop} />
        {phase==='round' && <div className="plinko-round-intro" role="status" aria-live="assertive" data-testid="plinko-round-intro"><h2 key={round}><span>{ui('Round')}</span> <strong>{round}</strong></h2></div>}
        {phase === 'turn' && <div className="plinko-turn-overlay" role="dialog" aria-labelledby="plinko-turn-heading"><div className="plinko-turn-dialog"><div className="plinko-turn-token"><PlinkoFaceIcon face={Math.max(0,chips[currentTeam])} size={200}/><h2 id="plinko-turn-heading">{displayTeamName(names[currentTeam])}</h2></div><button autoFocus className="plinko-primary" disabled={!question} onClick={() => setPhase('question')}>{ui('Start turn')}</button></div></div>}
      </div>
      <aside className="plinko-controls" aria-label={ui('Scores')}>
          <div className="plinko-tools plinko-sidebar-box">
            <button className="plinko-cog" aria-label={ui('Game options')} aria-haspopup="dialog" onClick={()=>setShowOptions(true)}><Settings size={22}/><span>{ui('Menu')}</span></button>
          </div>
        <div className="plinko-score-panel plinko-sidebar-box" data-choosing-chips={phase==='chips'}>
<div ref={teamStrip} className="plinko-scorebar" role="region" aria-label={ui('Scores')}>
          {scores.map((score, index) => <button key={index} className={index === currentTeam ? 'is-active' : ''} aria-current={index === currentTeam ? 'true' : undefined} data-tallying={phase === 'tally' && index === currentTeam} disabled={busy || phase === 'chips'} onClick={() => { setEditing(index); setEditName(names[index]); setEditScore(String(score)); setEditStars(String(stars[index])); }}>{chips[index] >= 0 ? <PlinkoFaceIcon face={chips[index]} size={30}/> : <span className="plinko-unassigned-chip" aria-hidden="true">?</span>}<span className="plinko-team-label"><span className="plinko-team-name">{displayTeamName(names[index])}</span><small ref={element=>{starTargets.current[index]=element;}} data-testid={`plinko-stars-${index}`} className="plinko-team-stars">★ {stars[index]}</small></span><strong ref={element => { scoreTargets.current[index]=element; }} data-testid={`plinko-score-${index}`}>{score}</strong></button>)}
        </div>
        </div><div className="plinko-menu-footer plinko-sidebar-box" data-testid={phase === 'result' ? 'plinko-result' : undefined} data-points={result?.points ?? 0}>
          <div className="plinko-round-counter" data-testid="plinko-round-counter">{ui('Round')} {round}/{rounds}</div>
          {!question && <p>{ui('Add questions in the editor before playing.')}</p>}
          <button className="plinko-primary" disabled={phase !== 'result'} onClick={next}>{turn + 1 >= rounds * players ? ui('See winners') : ui('Next turn')}</button>
        </div>
      </aside>
    </div>
    <dialog ref={chipDialog} className="plinko-dialog plinko-chip-dialog trivia-theme-dialog trivia-comic-dialog" aria-labelledby="plinko-chip-heading" onCancel={event=>event.preventDefault()}>
<div className="plinko-chip-picker" aria-labelledby="plinko-chip-heading">
          <h2 id="plinko-chip-heading">{ui('{name}, choose your chip',{name:displayTeamName(names[chipTeam])})}</h2>
          <div className="plinko-face-grid">{PLINKO_FACES.map((label,index)=><button key={label} disabled={chips.includes(index)} aria-label={ui(label)} onClick={()=>chooseChip(index)}><PlinkoFaceIcon face={index} size={48}/><span>{ui(label)}</span></button>)}</div>
          <button className="plinko-primary plinko-random-chip" onClick={randomizeChips}><Dice5 size={18}/>{ui('Random')}</button>
        </div>
    </dialog>
    {bonusBubble && phase==='bonus' && <div id="plinko-bonus-bubble" role="tooltip" className={`plinko-bonus-bubble ${bonusBubble.below?'is-below':''}`} style={{left:bonusBubble.x,top:bonusBubble.y,width:bonusBubble.width}}><strong>{ui(PLINKO_BONUS_COPY[bonusBubble.bonus].label)}</strong><p>{ui(PLINKO_BONUS_COPY[bonusBubble.bonus].description)}</p><i/></div>}
    {flight && <span className="plinko-score-flight" data-testid="plinko-score-flight" style={{left:flight.x,top:flight.y,transform:`translate(-50%, -50%) scale(${flight.scale})`}}>{flight.points >= 0 ? '+' : ''}{flight.points}</span>}
    {phase === 'question' && question && <StandardQuestionCard paused={showOptions} onSound={sound} chipFace={chips[currentTeam]} key={turn} question={question} config={game.config} options={options} turn={turn} teamName={displayTeamName(names[currentTeam])} onAnswer={correct => {
      if (correct) { if(stars[currentTeam]>0){const choices=plinkoBonusOffers(stars[currentTeam]);setOffers(choices);setPhase('bonus');}else{setBonus(null);setPhase('choose');} } else { setPhase('result'); }
    }} />}
    {showOptions&&<div className="plinko-dialog-backdrop plinko-options-backdrop" onClick={event=>{if(event.currentTarget===event.target)setShowOptions(false);}}>
      <div ref={optionsDialog} role="dialog" aria-modal="true" aria-label={ui('Game options')} className="plinko-dialog plinko-options-dialog trivia-theme-dialog trivia-comic-dialog">
        <h2>{ui('Game options')}</h2>
        <TriviaStylePicker value={gameStyle} onChange={chooseStyle}/>
        {styleSaveError&&<p role="alert">{ui('Failed to save. Please try again.')}</p>}
        <div className="plinko-style-actions">{renderMenuButtons()}</div>
        <button className="plinko-primary" onClick={()=>setShowOptions(false)}>{ui('Done')}</button>
      </div>
    </div>}
    {starFlights.map(starFlight=><span key={starFlight.id} className="plinko-star-flight" style={{left:starFlight.x,top:starFlight.y,transform:`translate(-50%,-50%) scale(${1-starFlight.progress*.25})`}}>{'★'.repeat(Math.min(3,starFlight.count))}{starFlight.count>3?` +${starFlight.count-3}`:''}</span>)}
    {confirm && <div className="plinko-dialog-backdrop" role="dialog" aria-modal="true" aria-label={ui('Confirm')}><div className="plinko-dialog trivia-theme-dialog trivia-comic-dialog"><h2>{confirm === 'quit' ? ui('Quit game?') : ui('End game now?')}</h2><p>{busy ? ui('Wait for the turn and score tally to finish.') : ui('Choose Continue to keep playing.')}</p><button className="plinko-primary" autoFocus onClick={() => setConfirm(null)}>{ui('Continue')}</button><button className="plinko-secondary" disabled={busy} onClick={() => { cancelAnimationFrame(animation.current); if (confirm === 'quit') onBack(); else setPhase('over'); setConfirm(null); }}>{confirm === 'quit' ? ui('Quit') : ui('End Game')}</button></div></div>}
    {editing !== null && <div className="plinko-dialog-backdrop" role="dialog" aria-modal="true" aria-label={ui('Edit team')}><form className="plinko-dialog trivia-theme-dialog trivia-comic-dialog" onSubmit={saveTeam}><h2>{ui('Edit team')}</h2><label>{ui('Team name')}<input autoFocus value={editName} maxLength={50} onChange={e => setEditName(e.target.value)} /></label><label>{ui('Score')}<input type="number" min="0" value={editScore} onChange={e => setEditScore(e.target.value)} /></label><label>{ui('Stars')}<input type="number" min="0" step="1" value={editStars} onChange={e => setEditStars(e.target.value)} /></label><button className="plinko-primary" type="submit">{ui('Save')}</button><button className="plinko-secondary" type="button" onClick={() => setEditing(null)}>{ui('Cancel')}</button></form></div>}
  </div>;
}
