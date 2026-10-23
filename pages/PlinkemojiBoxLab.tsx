import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Expand, Flag, LogOut, Volume2, VolumeX, X, ArrowUpRight, Check } from 'lucide-react';
import { PlinkoFaceIcon } from '../components/games/PlinkoIcons';
import { PlinkoBoard } from '../components/games/PlinkoBoard';
import { makePlinkoPegs, makePlinkoRails, plinkoPocketStars, plinkoRoundValues, plinkoPegStyle } from '../utils/plinko';
import '../components/games/plinko.css';
import './plinkemoji-box-lab.css';

const styles = [
  ['wonky', 'Wonky Arcade', 'Gold edges, deep purple and a jaunty 3D shadow.'],
  ['comic', 'Comic Pop', 'Bold ink outlines, bright colour and punchy shadows.'],
  ['jelly', 'Jelly Glass', 'Translucent blue jelly with soft, luminous edges.'],
  ['sticker', 'Sticker Stack', 'Cream stickers, purple ink and little pieces of tape.'],
  ['chrome', 'Pinball Chrome', 'Brushed metal frames with glowing arcade details.'],
  ['pillow', 'Inflatable', 'Squishy purple cushions with pillowy, rounded edges.'],
  ['blocks', 'Toy Blocks', 'Chunky blue blocks with sunny yellow details.'],
  ['ticket', 'Prize Tickets', 'Scalloped tickets, dashed seams and warm paper.'],
  ['neon', 'Neon Console', 'Dark panels, electric outlines and floating light.'],
  ['cloud', 'Cloud Club', 'Soft cloud shapes, lavender shadows and golden stars.'],
  ['modern', 'Studio Modern', 'Warm white, precise cobalt edges and a clean editorial layout.'],
  ['orbit', 'Holographic Orbit', 'Midnight panels wrapped in iridescent light and luminous score rings.'],
  ['papercut', 'Paper Cut', 'Layered teal paper, coral tabs and crisp cut-out shadows.'],
  ['mission', 'Space Mission', 'Flight-deck panels, clipped corners and amber instrument details.'],
  ['candy', 'Candy Circuit', 'Raspberry frames, candy-striped edges and glossy cream buttons.'],
] as const;
const teams = ['Foxes', 'Owls', 'Bears', 'Lions', 'Otters', 'Eagles'];
const scores = [128, 96, 84, 64, 52, 40];
const stars = [2, 1, 3, 0, 1, 2];
const pegs = makePlinkoPegs(2), rails = makePlinkoRails(2), values = plinkoRoundValues(2, 50, () => .5);

function Demo({ styleIndex, count, onExpand }: { styleIndex: number; count: number; onExpand: () => void }) {
  const [active, setActive] = useState(0);
  const [round, setRound] = useState(3);
  const [muted, setMuted] = useState(false);
  useEffect(() => setActive(0), [count]);
  const reset = () => { setActive(0); setRound(3); };
  return <div className={`boxlab-demo boxlab-${styles[styleIndex][0]}`} data-style={styleIndex + 1}>
    <div className="boxlab-box boxlab-menu" aria-label="Menu options">
      <button type="button" aria-label={muted ? 'Unmute preview' : 'Mute preview'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</button>
      <button type="button" aria-label="Preview beside the board" onClick={onExpand}><Expand /></button>
      <button type="button" aria-label="Reset preview" onClick={reset}><LogOut /></button>
      <button type="button" aria-label="Show final round" onClick={() => setRound(5)}><Flag /></button>
    </div>
    <div className="boxlab-box boxlab-teams" aria-label="Team scores">
      {teams.slice(0, count).map((name, i) => <button type="button" key={name} className={`boxlab-team ${active === i ? 'is-active' : ''}`} aria-current={active === i ? 'true' : undefined} onClick={() => setActive(i)}>
        <PlinkoFaceIcon face={i} size={30} /><span><b>{name}</b><small aria-label={`${stars[i]} stars`}>{'★'.repeat(stars[i]) || '☆'}</small></span><strong>{scores[i]}</strong>
      </button>)}
      <span className="boxlab-spark boxlab-spark-one" aria-hidden="true">✦</span><span className="boxlab-spark boxlab-spark-two" aria-hidden="true">✧</span>
    </div>
    <div className="boxlab-box boxlab-round">
      <span className="boxlab-round-label">Round {round}/5</span>
      <button type="button" className="boxlab-next" onClick={() => { setActive((active + 1) % count); if (active === count - 1) setRound(round === 5 ? 1 : round + 1); }}>Next turn <span aria-hidden="true">→</span></button>
    </div>
  </div>;
}

export const PlinkemojiBoxLab = () => {
  const [count, setCount] = useState(4);
  const [pegRound,setPegRound] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (preview !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);
  const open = (index: number) => { setSelected(index); setPreview(index); };
  return <div className="boxlab-page">
    <header className="boxlab-header">
      <Link to="/game-types/plinkemoji" className="boxlab-back">← Plinkemoji</Link>
      <p className="boxlab-eyebrow">THE BOX STYLE LAB</p>
      <h1>Compare game styles<span>✦</span></h1>
      <p>The same menu, scores and round in fifteen different styles. Hover, try Next turn, or preview a style beside the board.</p>
      <div className="boxlab-toolbar">
        <div role="group" aria-label="Number of teams"><span>Teams</span>{[2, 4, 6].map(n => <button type="button" key={n} aria-pressed={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
        <a href="#boxlab-options">Explore all {styles.length} <span aria-hidden="true">↓</span></a>
        <a href="#boxlab-new-options">See the 5 new styles</a>
        {selected !== null && <span className="boxlab-selection"><Check size={16} />Selected: {selected + 1}. {styles[selected][1]}</span>}
      </div>
    </header>
    <main id="boxlab-options" className="boxlab-grid">
      {styles.map(([key, name, description], i) => <article key={key} id={i === 10 ? 'boxlab-new-options' : undefined} className={`boxlab-card ${selected === i ? 'is-selected' : ''}`} data-testid={`box-style-${i + 1}`}>
        <div className="boxlab-card-heading"><span>{String(i + 1).padStart(2, '0')}</span><div><h2>{name}{i >= 10 && <small className="boxlab-new-badge">New</small>}</h2><p>{description}</p></div></div>
        <Demo styleIndex={i} count={count} onExpand={() => open(i)} />
        <button type="button" className="boxlab-preview-button" onClick={() => open(i)}>Preview {i + 1} with the board <ArrowUpRight size={18} /></button>
      </article>)}
    </main>
    <p className="boxlab-outro">Pick a number—or mix your favourite menu, team and round designs.</p>
    <dialog ref={dialog} className="boxlab-preview-dialog" aria-labelledby="boxlab-preview-title" onCancel={event => { event.preventDefault(); setPreview(null); }} onClick={event => { if (event.target === event.currentTarget) setPreview(null); }}>
      {preview !== null && <>
        <div className="boxlab-preview-heading"><div><p>BOARD PREVIEW</p><h2 id="boxlab-preview-title">{preview + 1}. {styles[preview][1]}</h2></div><button type="button" aria-label="Close board preview" onClick={() => setPreview(null)}><X /></button></div>
        <div className="boxlab-peg-picker" role="group" aria-label="Preview peg style"><span>Pegs</span>{[1,2,3,4,5].map(n=><button key={n} type="button" aria-pressed={pegRound===n} onClick={()=>setPegRound(n)}>Round {n}: {({arcade:'Buttons',jelly:'Jelly',neon:'Neon',rivet:'Rivets',crystal:'Gems'})[plinkoPegStyle(n)]}</button>)}</div>
        <div className="boxlab-preview-stage">
          <div className="boxlab-preview-bonus" aria-label="Bonus space"><span>Choose your bonus</span><img src="/assets/games/plinko/bonuses/blob-v1.webp" alt="The Blob bonus" /><img src="/assets/games/plinko/bonuses/sonic-v2.webp" alt="Sonic bonus" /></div>
          <div className="boxlab-preview-board"><PlinkoBoard round={pegRound} entryCount={10} pegTime={0} pegs={pegs} values={values} stars={plinkoPocketStars(2, values.length)} face={0} entry={3} choosing={false} falling={false} frame={null} trail={[]} rails={rails} pegPoints={2} onPreview={() => {}} onDrop={() => {}} /></div>
          <Demo key={preview} styleIndex={preview} count={count} onExpand={() => setPreview(null)} />
        </div>
        <div className="boxlab-preview-footer"><button type="button" disabled={preview === 0} onClick={() => setPreview(preview - 1)}>← Previous</button><button type="button" onClick={() => { setSelected(preview); setPreview(null); }}><Check size={17} /> Keep {preview + 1} selected</button><button type="button" disabled={preview === styles.length - 1} onClick={() => setPreview(preview + 1)}>Next →</button></div>
      </>}
    </dialog>
  </div>;
};
