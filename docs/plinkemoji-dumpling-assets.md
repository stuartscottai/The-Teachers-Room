# Dumpling presentation

The bonus is named **Dumpling** in English and Spanish. Its internal `blob` key stays unchanged so existing saved bonus references continue to work.

The live character uses a more saturated green material, a pinched soft crown, and an animated horrified face: wide eyes, small pupils, raised eyebrows and an open mouth with a tongue and upper teeth. The no-3D fallback also changes expression and colour.

On wall contact, the full-size body holds still for 0.55 seconds. The shocked expression and larger face snap toward the camera over 0.08 seconds, with the pupils centring on the viewer. The pop and voice then play, followed by a 0.24-second smooth collapse of the actual skin geometry. Flight starts after that collapse. Peg scoring pauses during the reaction and collapse.

## Icon

Asset: `public/assets/games/plinko/bonuses/dumpling-v1.webp` (512 px, transparent).

Created with the built-in image-generation tool and exported to WebP with its transparency preserved. The previous Blob artwork is retained but no longer used by this bonus.

Final generation prompt:

> Use case: stylized-concept. Project asset: one large transparent-background bonus icon for the emoji classroom game Plinkemoji. Create a charming bright saturated emerald/lime GREEN squishy dumpling toy character, resembling a soft silicone stress toy: a plump rounded flattened base, a small pinched peak with a few soft pleats at the crown, glossy jelly-like skin, oversized expressive white eyes with dark pupils and a cheerful little smile, subtly rosy cheeks. Front three-quarter view with the face clearly visible and a coherent simple silhouette. Premium polished 3D emoji rendering, vivid green body (not pale yellow), soft studio highlights and shaded volume, matching a friendly squishy game character. Single character centred, large within square canvas with 10 percent clear margin, fully visible, no floor, no background, genuine alpha transparency. No text, letters, logos, food props, plates or other objects.

## Pop voice

Asset: `public/assets/audio/plinkemoji/dumpling-scream-v1.wav` (0.40 seconds).

Generated locally with Windows' Microsoft Zira speech voice saying “Aaaah!”, trimmed, faded, normalised and raised in pitch by 1.28 to sound like a cartoon toy. This effect was not downloaded from a sound-effects website. It plays once at the recorded burst, through the game's existing mute and volume controls. A short synthesized cry covers playback before the file has loaded.

The voice loads with Plinkemoji's peg clips; other games using only the shared card sounds do not download it.
