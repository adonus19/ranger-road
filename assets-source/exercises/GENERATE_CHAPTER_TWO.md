# Chapter II exercise pictures

Generated 2026-10-08 with gpt-image-2 (medium quality, image edit with a Chapter I strip or map as style reference). Prompts are in each exercise folder (`sequence.prompt.txt`, `muscle-map.prompt.txt`) with the reference path in the `.ref` file. Run again with `node tools/exercise-images/gen-image.mjs <ref.png> <prompt.txt> <out.png> <WxH>` (needs `OPENAI_API_KEY`; sequences 2016x784, maps 1584x992), then `cwebp -q 80` into `public/images/exercises/<id>/`.

Panel plans were approved by the user: Ankle Rock half-kneeling; hamstring stretch standing with the heel on a low step. Retries: Hammer Curl, Ankle Rock and Supported Deep Squat each needed a stronger prompt; the final prompts are recorded.

Maps reused without generating (same documented targets): goblet-squat from goblet-squat-to-box, split-squat from supported-split-squat; calf-raise, ankle-rock and neutral-spine-hamstring-stretch use the plain map because the catalog names no target muscles.
