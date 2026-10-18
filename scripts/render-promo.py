"""Rebuild the 90-second advert from scripts/capture-promo.mjs footage.
Requires Pillow and imageio-ffmpeg. Raw media stays in ignored output/playwright.
The soundtrack is synthesized here from an original score; no sampled music.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import array, json, math, os, random, subprocess, urllib.request, wave
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'output/playwright/promo-v2'
DEST = ROOT / 'public/assets/promo'
DEST.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1280, 720, 24
BLUE, YELLOW, NAVY = '#0EA5E9', '#FACC15', '#0F172A'
MODES = [
    ('jeopardy', 'Jeopardy', 'Turn revision into competition.'),
    ('millionaire', 'Millionaire Maker', 'Make every answer count.'),
    ('survey', 'Survey Showdown', 'Think together. Win together.'),
    ('pubquiz', 'Pub Quiz', 'Bring your team spirit.'),
    ('darts', 'Darts', 'Aim high. Show what you know.'),
    ('snakes', 'Snakes and Ladders', 'A new adventure with every roll.'),
    ('timebomb', 'Time Bomb', 'Think fast. Beat the clock.'),
    ('stopfire', 'Stop the Fire!', 'Keep your cool under pressure.'),
    ('trivia', 'Trivia Quiz', 'Big questions. Brilliant moments.'),
    ('wordwheel', 'Word Wheel', 'Give vocabulary a spin.'),
    ('blockbeaters', 'Block Beaters', 'Connect answers. Claim the board.'),
    ('livequiz', 'Live Quiz Challenge', 'Get everyone in on the action.'),
]
font_file = WORK / 'Fredoka.ttf'
if not font_file.exists():
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf', font_file)
def font(size):
    face = ImageFont.truetype(str(font_file), size)
    face.set_variation_by_axes([600, 100])
    return face
def text(draw, xy, value, size, color='white', anchor='mm'):
    draw.text(xy, value, font=font(size), fill=color, anchor=anchor)
def background():
    im = Image.new('RGB', (W,H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        f = y/H
        d.line((0,y,W,y), fill=(int(9+5*f), int(128+37*f), int(205+28*f)))
    d.ellipse((920,-210,1510,380), outline='#53bdeb', width=38)
    d.ellipse((-130,500,220,850), outline='#2cb2e9', width=24)
    d.rounded_rectangle((80,90,142,152), 12, outline=YELLOW, width=5)
    d.polygon([(1140,510),(1170,570),(1104,570)], outline=YELLOW, width=5)
    for x,y in [(240,210),(1050,420),(190,560),(960,90)]:
        d.ellipse((x,y,x+10,y+10), fill='#95dcf6')
    return im
logo = Image.open(ROOT/'public/icon-192.png').convert('RGBA')
def brand(im, y, size=110):
    mark=logo.resize((size,size),Image.Resampling.LANCZOS)
    im.paste(mark,((W-size)//2,y),mark)

intro = background(); d=ImageDraw.Draw(intro)
brand(intro,105,120)
text(d,(640,305),'The Teachers Room',82)
d.rounded_rectangle((450,368,830,376),4,fill=YELLOW)
text(d,(640,435),'A little learning. A lot of play.',36)
text(d,(640,585),'12 GAME MODES  /  ENDLESS POSSIBILITIES',23,'#dcf5ff')
intro.save(WORK/'intro.png')
outro=background(); d=ImageDraw.Draw(outro)
text(d,(640,180),'Time to Gamify',82)
text(d,(640,276),'your classes',82)
brand(outro,364,100)
text(d,(640,513),'The Teachers Room',45)
text(d,(640,607),'theteachersroom.app',27,'#dcf5ff')
outro.save(WORK/'outro.png')

def run(args):
    result=subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stderr[-4000:])
def encode(output, inputs, vf, duration):
    run([*inputs,'-an','-vf',vf,'-t',duration,'-r',FPS,'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-threads','2',output])
def card(source, filename, duration):
    encode(WORK/filename,['-loop','1','-i',WORK/source],
           f"scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0EA5E9,fade=t=in:d=0.3:color=0x0EA5E9,fade=t=out:st={duration-0.2}:d=0.2:color=0x0EA5E9",duration)

def star(draw, cx, cy, radius, fill):
    points=[]
    for i in range(10):
        angle=-math.pi/2+i*math.pi/5
        r=radius if i%2==0 else radius*.46
        points.append((cx+math.cos(angle)*r,cy+math.sin(angle)*r))
    draw.polygon(points,fill=fill,outline=NAVY,width=3)

def popup(mode, name, slogan):
    # A balanced brand card: smooth geometry, restrained accents and soft depth.
    sticker=Image.new('RGBA',(940,350))
    shadow=Image.new('RGBA',sticker.size)
    ImageDraw.Draw(shadow).rounded_rectangle((42,44,898,306),32,fill=(2,30,53,95))
    sticker.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    d=ImageDraw.Draw(sticker)
    d.rounded_rectangle((34,24,906,290),30,fill='#FFFFFF')
    d.rounded_rectangle((34,24,906,186),30,fill=BLUE)
    d.rectangle((34,148,906,186),fill=BLUE)
    # Precise, low-contrast corner motifs keep the card playful without scribbles.
    d.ellipse((789,-14,957,154),outline='#50BFF0',width=18)
    d.rounded_rectangle((73,57,125,65),4,fill=YELLOW)
    title_size=54
    while d.textlength(name,font=font(title_size))>740: title_size-=1
    text(d,(470,123),name,title_size)
    message_size=35
    while d.textlength(slogan,font=font(message_size))>780: message_size-=1
    text(d,(470,235),slogan,message_size,NAVY)
    directory=WORK/f'{mode}-popup'; directory.mkdir(exist_ok=True)
    for frame in range(49):
        t=frame/FPS
        entrance=min(1,t/.32)
        eased=1-(1-entrance)**3
        opacity=min(1,t/.16)*max(0,min(1,(2-t)/.25))
        scale=.94+.06*eased
        canvas=Image.new('RGBA',(W,H))
        if frame<48:
            image=sticker.resize((round(940*scale),round(350*scale)),Image.Resampling.LANCZOS)
            image.putalpha(image.getchannel('A').point(lambda alpha: round(alpha*opacity)))
            canvas.alpha_composite(image,((W-image.width)//2,round((H-image.height)//2+12*(1-eased))))
        canvas.save(directory/f'{frame:03d}.png')
    return directory

card('intro.png','00.mp4',4)
manifest=json.loads((WORK/'captures.json').read_text())
only=os.environ.get('PROMO_ONLY')
reuse_segments=os.environ.get('PROMO_REUSE_SEGMENTS') == '1'
for index,(mode,name,slogan) in enumerate(MODES):
    if only and mode != only: continue
    if reuse_segments and (WORK/f'{index+1:02d}.mp4').exists(): continue
    popup_dir=popup(mode,name,slogan)
    item=manifest[mode]
    overview=item.get('edit',{}).get('overview',item['overview'])
    action=item.get('edit',{}).get('action',item['action'])
    if item['width']!=1920 or item['height']!=1080:
        raise ValueError(f'{mode}: capture has the wrong dimensions')
    # Fit the ENTIRE recorded 16:9 canvas. No crops, zooms or moving camera.
    # Four seconds of the distinctive board, two seconds of a question/action.
    action_offset=action-overview
    if mode == 'darts':
        throw_offset=item.get('edit',{}).get('throw',item['throwStart']-.25)-overview
        vf=(f"[0:v]fps=24,trim=start={overview},setpts=PTS-STARTPTS,scale=1280:720,setsar=1,split=3[overview][question][throw];"
            f"[overview]trim=duration=2,setpts=PTS-STARTPTS[board];[question]trim=start={action_offset}:duration=0.75,setpts=PTS-STARTPTS[card];"
            f"[throw]trim=start={throw_offset}:duration=3.25,setpts=PTS-STARTPTS[play];"
            "[board][card][play]concat=n=3:v=1:a=0[game];[game][1:v]overlay=0:0:eof_action=pass,"
            "fade=t=in:d=0.12:color=0x0EA5E9,fade=t=out:st=5.88:d=0.12:color=0x0EA5E9[v]")
    else:
        vf=(f"[0:v]fps=24,trim=start={overview},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,setsar=1,split=2[overview][action];"
            f"[overview]trim=duration=4,setpts=PTS-STARTPTS[board];[action]trim=start={action_offset}:duration=2,setpts=PTS-STARTPTS[play];"
            "[board][play]concat=n=2:v=1:a=0[game];[game][1:v]overlay=0:0:eof_action=pass,"
            "fade=t=in:d=0.12:color=0x0EA5E9,fade=t=out:st=5.88:d=0.12:color=0x0EA5E9[v]")
    run(['-i',item['file'],'-framerate',FPS,'-i',popup_dir/'%03d.png',
         '-filter_complex',vf,'-map','[v]','-an','-t','6','-r',FPS,'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-threads','2',WORK/f'{index+1:02d}.mp4'])
    print(f'Rendered {name}',flush=True)

if only: raise SystemExit(f'Preview segment: {WORK / str(next(i+1 for i,item in enumerate(MODES) if item[0]==only)).zfill(2)}.mp4')

# Eight-second finale focuses on four very different, complete game boards.
montage=['trivia','jeopardy','blockbeaters','wordwheel']
inputs=[]
for mode in montage:
    inputs+=['-i',manifest[mode]['file']]
graph=';'.join(f'[{i}:v]fps=24,trim=start={manifest[mode].get("edit",{}).get("overview",manifest[mode]["overview"])},setpts=PTS-STARTPTS,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]' for i in range(4))
graph+=';[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|640_0|0_360|640_360,fade=t=in:d=0.15:color=0x0EA5E9,fade=t=out:st=7.8:d=0.2:color=0x0EA5E9[v]'
run([*inputs,'-filter_complex',graph,'-map','[v]','-an','-t','8','-r',FPS,'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-threads','2',WORK/'13.mp4'])
card('outro.png','14.mp4',6)
(WORK/'concat.txt').write_text(''.join(f"file '{i:02d}.mp4'\n" for i in range(15)))
run(['-f','concat','-safe','0','-i',WORK/'concat.txt','-c','copy',WORK/'picture.mp4'])

# Original 120 BPM electro-pop score: C / G / Am / F, mallet arpeggios,
# warm bass, soft kick, snare and hats. Deterministic and entirely synthesized.
SR=22050; DURATION=90
audio=array.array('f',[0])*(SR*DURATION)
rng=random.Random(18026)
def note(at,duration,midi,level,kind='pluck'):
    freq=440*2**((midi-69)/12); offset=int(at*SR)
    for i in range(min(int(duration*SR),len(audio)-offset)):
        t=i/SR; env=min(1,t/0.008)*math.exp(-t*(5 if kind=='pluck' else 2.5))
        tone=math.sin(2*math.pi*freq*t)+0.20*math.sin(4*math.pi*freq*t)
        audio[offset+i]+=level*env*tone
def drum(at,kind,level):
    duration={'kick':.22,'snare':.14,'hat':.045}[kind]; offset=int(at*SR)
    for i in range(min(int(duration*SR),len(audio)-offset)):
        t=i/SR
        if kind=='kick': value=math.sin(2*math.pi*(48*t+7*(1-math.exp(-t*25))))*math.exp(-t*19)
        else: value=rng.uniform(-1,1)*math.exp(-t*(33 if kind=='snare' else 110))
        audio[offset+i]+=value*level
chords=[(48,52,55),(43,47,50),(45,48,52),(41,45,48)]
for beat in range(176):
    at=beat*.5; chord=chords[(beat//4)%4]
    if at>=4:
        drum(at,'kick',.30); drum(at+.25,'hat',.045)
        if beat%2: drum(at,'snare',.11)
    note(at,.42,chord[0]-12,.16,'bass')
    for half in range(2): note(at+half*.25,.42,chord[(beat+half)%3]+24,.075)
    if beat%4==0:
        for pitch in chord: note(at,1.3,pitch+12,.045,'pad')
for at in [4+i*6 for i in range(12)]+[76,84]:
    for j,pitch in enumerate([72,76,79]): note(at+j*.07,.35,pitch,.06)
for pitch in [48,60,64,67,72]: note(88,1.9,pitch,.085,'pad')
pcm=array.array('h')
for i,value in enumerate(audio):
    t=i/SR; gain=min(1,t/.4)*min(1,(90-t)/1.3)
    pcm.append(int(math.tanh(value*1.3)*gain*25000))
with wave.open(str(WORK/'original-score.wav'),'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR); wav.writeframes(pcm.tobytes())
run(['-i',WORK/'picture.mp4','-i',WORK/'original-score.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-ar','48000','-af','loudnorm=I=-18:TP=-1.5:LRA=9','-t','90','-movflags','+faststart',DEST/'classroom-games.mp4'])

# Poster uses stills from the captured games, with clear branding above them.
poster=background(); d=ImageDraw.Draw(poster)
for i,mode in enumerate(['jeopardy','snakes','survey','wordwheel']):
    shot=ImageOps.contain(Image.open(WORK/f'{mode}-overview.png').convert('RGB'),(276,156),Image.Resampling.LANCZOS)
    poster.paste(shot,(55+i*300,350))
brand(poster,50,90)
text(d,(640,218),'The Teachers Room',66)
text(d,(640,292),'12 game modes. One unforgettable classroom.',29)
poster.save(DEST/'classroom-games-poster.webp',quality=88)

def stamp(seconds):
    ms=round(seconds*1000); return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
for lang in ['en','es']:
    entries=[(0,4,'[Upbeat instrumental music] The Teachers Room' if lang=='en' else '[Música instrumental animada] The Teachers Room')]
    for i,(_,name,slogan) in enumerate(MODES): entries.append((4+i*6,4+(i+1)*6,name+' — '+slogan if lang=='en' else name))
    entries.extend([(76,84,'Play. Learn. Celebrate.' if lang=='en' else 'Juega. Aprende. Celebra.'),
        (84,90,'Time to Gamify your classes. The Teachers Room.' if lang=='en' else 'Es hora de gamificar tus clases. The Teachers Room.')])
    (DEST/f'captions-{lang}.vtt').write_text('WEBVTT\n\n'+''.join(f'{stamp(a)} --> {stamp(b)}\n{v}\n\n' for a,b,v in entries),encoding='utf8')
print(f'Finished: {DEST / "classroom-games.mp4"}',flush=True)
