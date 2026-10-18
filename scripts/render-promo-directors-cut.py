"""Render the separate, popup-free full-HD edit. Leaves the homepage cut intact.

Requires Pillow and imageio-ffmpeg. Source frames are produced offline by
capture-promo-directors-cut.mjs, at 30 real animation steps per output second.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import array, hashlib, json, math, random, subprocess, sys, urllib.request, wave
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'output/playwright/promo-directors-cut'
DEST = ROOT/'public/assets/promo'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1920, 1080, 30
AUDIO_ONLY = "--audio-only" in sys.argv
BLUE, YELLOW, NAVY = '#0EA5E9', '#FACC15', '#0F172A'
manifest = json.loads((WORK/'frames.json').read_text())
boards = ['trivia','timebomb','snakes','wordwheel','millionaire','darts','survey','jeopardy','pubquiz','stopfire','blockbeaters','livequiz']
films = ['trivia-qa','timebomb-qa','snakes-qa','wordwheel-qa','millionaire-qa','dart-throw','barrel-explosion','snakes-move','survey-x','live-teacher','live-mobile','live-scoreboard','winners']
for key in [*[f'board-{mode}' for mode in boards], *films, 'live-lobby', 'mobile-lobby']:
    item = manifest[key]
    if item['errors']: raise ValueError(f'{key}: browser errors: {item["errors"]}')
    if 'dir' in item and len(list(Path(item['dir']).glob('*.jpg'))) != item['frames']:
        raise ValueError(f'{key}: incomplete frame sequence')

old = DEST/'classroom-games.mp4'
old_hash = hashlib.sha256(old.read_bytes()).hexdigest()
font_file = ROOT/'output/playwright/promo-v2/Fredoka.ttf'
if not font_file.exists():
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf',font_file)
def font(size):
    face=ImageFont.truetype(str(font_file),size);face.set_variation_by_axes([600,100]);return face
def label(draw, xy, value, size, fill='white'):
    draw.text(xy,value,font=font(size),fill=fill,anchor='mm')
def background():
    image=Image.new('RGB',(W,H),BLUE)
    draw=ImageDraw.Draw(image)
    for y in range(H):
        t=y/H;draw.line((0,y,W,y),fill=(round(8+6*t),round(141+24*t),round(218+15*t)))
    return image
logo=Image.open(ROOT/'public/icon-192.png').convert('RGBA')
intro=background();intro.paste(logo,(864,270),logo);d=ImageDraw.Draw(intro)
label(d,(960,578),'The Teachers Room',116)
d.rounded_rectangle((812,677,1108,685),4,fill=YELLOW)
intro.save(WORK/'title.png')
outro=background();d=ImageDraw.Draw(outro)
label(d,(960,300),'Time to Gamify',114)
label(d,(960,432),'your classes',114)
outro.paste(logo,(864,592),logo)
label(d,(960,860),'The Teachers Room',62)
# Keep the picture free of credits. Attribution accompanies the video on its
# review page, in the downloadable credits, and in the MP4 metadata.
outro.save(WORK/'end.png')

def run(args):
    result=subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stderr[-4000:])
def encode(inputs, graph, output, frames, complex=False):
    run([*inputs, '-filter_complex' if complex else '-vf',graph,
        *(['-map','[v]'] if complex else []),'-an','-frames:v',frames,'-r',FPS,
        '-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-threads','2',output])

timeline=[]; parts=[]; elapsed=0
def add(name, frames, inputs, graph, complex=False):
    global elapsed
    filename=WORK/f'edit-{len(parts):02d}.mp4'
    if not AUDIO_ONLY: encode(inputs,graph,filename,frames,complex)
    timeline.append({'scene':name,'start':elapsed,'end':elapsed+frames/FPS,'frames':frames})
    elapsed+=frames/FPS;parts.append(filename)
    if not AUDIO_ONLY: print(f'Rendered {name} ({frames} frames)',flush=True)
def still(name, source, frames, fades=False):
    graph='scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1'
    if fades:graph+=f',fade=t=in:d=0.2:color=0x0EA5E9,fade=t=out:st={frames/FPS-.25}:d=0.25:color=0x0EA5E9'
    add(name,frames,['-loop','1','-framerate',FPS,'-i',source],graph)
def film(name):
    item=manifest[name]
    add(name,item['frames'],['-framerate',FPS,'-i',Path(item['dir'])/'%05d.jpg'],'setsar=1')

still('title',WORK/'title.png',90,True)
for i,mode in enumerate(boards):still(f'board-{mode}',manifest[f'board-{mode}']['still'],22 if i%2==0 else 23)
for name in films[:9]:film(name)

# The teacher's entire screen and the real mobile screen, framed as two devices.
# Neither game viewport is cropped, enlarged beyond its native size, or simulated.
device=background();d=ImageDraw.Draw(device)
d.rounded_rectangle((22,161,1338,917),22,fill='#071525',outline='#5EC5F1',width=2)
d.rounded_rectangle((1408,68,1842,968),44,fill='#071525',outline='#7DD3FC',width=2)
d.rounded_rectangle((1528,80,1722,91),5,fill='#334155')
d.rounded_rectangle((1537,948,1713,954),3,fill='#64748B')
device.save(WORK/'devices.png')
def devices(name, teacher, mobile, frames, sequences=False):
    inputs=['-loop','1','-framerate',FPS,'-i',WORK/'devices.png']
    for source in [teacher,mobile]:
        inputs+=['-framerate',FPS,'-i',source] if sequences else ['-loop','1','-framerate',FPS,'-i',source]
    graph='[1:v]scale=1280:720,setsar=1[t];[2:v]scale=390:844,setsar=1[m];[0:v][t]overlay=40:180[desk];[desk][m]overlay=1430:106[v]'
    add(name,frames,inputs,graph,True)
devices('live-setup',manifest['live-lobby']['still'],manifest['mobile-lobby']['still'],90)
devices('live-teacher-and-mobile',Path(manifest['live-teacher']['dir'])/'%05d.jpg',Path(manifest['live-mobile']['dir'])/'%05d.jpg',90,True)
film('live-scoreboard');film('winners')
still('final-page',WORK/'end.png',120,True)
(WORK/'edit-list.txt').write_text(''.join(f"file '{part.as_posix()}'\n" for part in parts))
if AUDIO_ONLY:
    if not (WORK/'picture.mp4').exists(): raise ValueError('Render the full edit before replacing only its soundtrack')
else:
    run(['-f','concat','-safe','0','-i',WORK/'edit-list.txt','-c','copy',WORK/'picture.mp4'])

# The user's chosen original ska mix, including its original edit and accents.
music=WORK/'Upbeat Forever.mp3'
if not music.exists():urllib.request.urlretrieve('https://incompetech.com/music/royalty-free/mp3-royaltyfree/Upbeat%20Forever.mp3',music)
sr=48000; sound=array.array('f',[0.0])*(round(elapsed*sr));rng=random.Random(18)
def scene_start(name):return next(item['start'] for item in timeline if item['scene']==name)
def effect(at,kind):
    duration=.18 if kind=='dart' else .48
    for i in range(round(duration*sr)):
        t=i/sr;env=(1-t/duration)**2
        if kind=='dart':value=(rng.uniform(-1,1)*math.exp(-t*55)+math.sin(2*math.pi*80*t)*.5)*.32
        else:value=((2*((100*t)%1)-1)*.18)
        index=round(at*sr)+i
        if index<len(sound):sound[index]+=value*env
effect(scene_start('dart-throw')+.45,'dart');effect(scene_start('survey-x')+.05,'buzz')
pcm=array.array('h',(round(max(-1,min(1,v))*32767) for v in sound))
with wave.open(str(WORK/'accents.wav'),'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes(pcm.tobytes())
run(['-i',WORK/'picture.mp4','-ss','11.707317','-i',music,'-i',WORK/'accents.wav',
    '-filter_complex',f'[1:a]atrim=duration={elapsed},asetpts=PTS-STARTPTS,afade=t=in:d=0.25,afade=t=out:st={elapsed-1.1}:d=1.1,volume=0.78[m];[m][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1:LRA=9[a]',
    '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-t',elapsed,
    '-metadata','title=The Teachers Room — Directors Cut',
    '-metadata','comment=Music: Upbeat Forever by Kevin MacLeod (incompetech.com). CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Edited excerpt; fades and game sound effects added.',
    '-movflags','+faststart',DEST/'classroom-games-directors-cut.mp4'])

poster=intro.copy();d=ImageDraw.Draw(poster)
for i,mode in enumerate(['trivia','snakes','darts','wordwheel']):
    thumb=ImageOps.contain(Image.open(manifest[f'board-{mode}']['still']).convert('RGB'),(420,236),Image.Resampling.LANCZOS)
    poster.paste(thumb,(66+i*462,760))
poster.save(DEST/'directors-cut-poster.webp',quality=95)
(WORK/'timeline.json').write_text(json.dumps(timeline,indent=2))
(DEST/'directors-cut-credits.txt').write_text('''Music: "Upbeat Forever" by Kevin MacLeod (incompetech.com).
Source: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500063
Licensed under Creative Commons Attribution 4.0:
https://creativecommons.org/licenses/by/4.0/
Changes: edited excerpt, short fades, and added game sound effects.

Gameplay, logo and existing game effect assets: The Teachers Room project.
Typeface: Fredoka, SIL Open Font License.
''',encoding='utf8')
def stamp(seconds):
    ms=round(seconds*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
descriptions={
 'title':'[Energetic instrumental music] The Teachers Room.',
 'trivia-qa':'Trivia: a question opens and the correct answer is revealed.',
 'timebomb-qa':'Time Bomb: teams answer two maths questions.',
 'snakes-qa':'Snakes and Ladders: answer the question to advance.',
 'wordwheel-qa':'Word Wheel: Astronaut is entered and marked correct.',
 'millionaire-qa':'Millionaire Maker: Six is selected and revealed as correct.',
 'dart-throw':'A dart flies towards the board and lands.',
 'barrel-explosion':'A radioactive barrel bursts into yellow slime.',
 'snakes-move':'A Snakes and Ladders playing piece moves across the board.',
 'survey-x':'Survey Showdown: an incorrect answer produces a large red X.',
 'live-setup':'Live Quiz: the teacher host screen beside a student phone.',
 'live-teacher-and-mobile':'The student answers on the phone; the teacher reveals the answer.',
 'live-scoreboard':'The live scoreboard ranks the teams.',
 'winners':'The winners podium and celebration.',
 'final-page':'Time to Gamify your classes. The Teachers Room.',
}
(DEST/'directors-cut-en.vtt').write_text('WEBVTT\n\n'+''.join(f'{stamp(item["start"])} --> {stamp(item["end"])}\n{descriptions.get(item["scene"],item["scene"].replace("board-","").title()+" game board.")}\n\n' for item in timeline),encoding='utf8')
assert hashlib.sha256(old.read_bytes()).hexdigest()==old_hash,'The previous video must remain unchanged'
print(f'Complete: {elapsed:.2f}s, 1920x1080, 30fps; previous video preserved.',flush=True)
