"""Match recorded frames to the reference stills before editing.

Browser recording timestamps can drift from wall time during heavy WebGL work.
This pass locates the actual recorded overview/question instead of assuming that
the browser action's wall-clock time is a reliable edit point.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json, subprocess, sys
import imageio_ffmpeg

work = Path(__file__).resolve().parents[1] / 'output/playwright/promo-v2'
manifest_path = work / 'captures.json'
manifest = json.loads(manifest_path.read_text())
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
width, height, rate = 160, 90, 5
frame_bytes = width * height * 3
for mode in sys.argv[1:] or manifest:
    item = manifest[mode]
    raw = subprocess.run([ffmpeg, '-loglevel', 'error', '-i', item['file'],
        '-vf', f'fps={rate},scale={width}:{height}', '-f', 'rawvideo',
        '-pix_fmt', 'rgb24', 'pipe:1'], capture_output=True, check=True).stdout
    frames = [Image.frombytes('RGB', (width, height), raw[i:i+frame_bytes])
        for i in range(0, len(raw)-frame_bytes+1, frame_bytes)]
    edit = item.setdefault('edit', {})
    for stage in ['overview', 'action']:
        reference = Image.open(work / f'{mode}-{stage}.png').convert('RGB').resize((width, height))
        differences = [sum(ImageStat.Stat(ImageChops.difference(frame, reference)).mean)/3 for frame in frames]
        best = min(differences)
        # Choose the first stable matching frame; leave enough room for motion.
        index = next(i for i, difference in enumerate(differences) if difference <= best + .25)
        edit[stage] = round(index / rate + .2, 2)
        print(f'{mode} {stage}: {edit[stage]:.2f}s (difference {best:.2f})', flush=True)
    if mode == 'darts':
        # The first team's red flights distinguish a visible projectile from
        # the unchanged board. Select the strongest new red silhouette after
        # the question, rather than trusting an early screenshot of the board.
        region = (65, 18, 95, 75)
        def red_pixels(frame):
            return {i for i, (r,g,b) in enumerate(frame.crop(region).get_flattened_data())
                if r > 115 and r > g*1.6 and r > b*1.6}
        baseline = red_pixels(frames[round(edit['overview']*rate)])
        scores = [(len(red_pixels(frame) - baseline), i) for i, frame in enumerate(frames)
            if i/rate > edit['action'] + 1]
        score = max(value for value, _ in scores)
        index = next(index for value, index in scores if value >= max(5, score*.9))
        if score < 5:
            raise ValueError('Darts: no visible red dart found; review the recording')
        edit['throw'] = round(max(0, index/rate - .8), 2)
        subprocess.run([ffmpeg, '-loglevel', 'error', '-y', '-i', item['file'], '-vf', f'fps={rate},trim=start={index/rate},setpts=PTS-STARTPTS', '-frames:v', '1', str(work/'darts-flight-verified.png')], check=True)
        print(f'darts throw: {edit["throw"]:.2f}s (visible red silhouette {score} pixels)', flush=True)
    manifest_path.write_text(json.dumps(manifest, indent=2))
