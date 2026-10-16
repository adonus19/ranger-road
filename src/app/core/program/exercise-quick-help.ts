/** Short display steps segmented from each exercise's catalog How, three to five per exercise. */
const quickHelpSteps: Readonly<Record<string, readonly string[]>> = {
  'box-squat': [
    'Stand in front of a stable box or bench, feet about shoulder width.',
    'Brace and sit back and down under control.',
    'Lightly contact the box without collapsing or fully relaxing.',
    'Drive through the whole foot to stand.',
  ],
  'bench-press': [
    'Set your eyes roughly under the bar and plant your feet.',
    'Pull your shoulder blades gently back and down.',
    'Lower the bar under control toward your lower chest or sternum.',
    'Press up without bouncing.',
  ],
  'assisted-pull-up': [
    'Secure the assistance band and begin in an active hang.',
    'Pull your elbows down and back.',
    'Bring your chin toward or over the bar if comfortable.',
    'Lower slowly.',
  ],
  'supported-split-squat': [
    'Take a split stance and lightly hold the rack for balance.',
    'Lower vertically to a comfortable depth.',
    'Push through your front foot to rise.',
  ],
  'suitcase-carry': [
    'Hold one weight at your side.',
    'Stand tall.',
    'Walk slowly without leaning or twisting.',
  ],
  'side-plank': [
    'Place your elbow under your shoulder.',
    'Lift your hips into a straight line.',
    'Breathe normally.',
  ],
  'goblet-squat-to-box': [
    'Hold a dumbbell at your chest.',
    'Brace and sit down under control to the box.',
    'Lightly touch the box.',
    'Stand after lightly touching the box.',
  ],
  'step-up': [
    'Put your entire foot on a stable step.',
    'Drive through the top leg to stand.',
    'Control your descent.',
  ],
  'one-arm-db-row': [
    'Support one hand on a bench.',
    'Maintain a neutral spine.',
    'Pull the dumbbell toward your hip or ribcage and lower slowly.',
  ],
  'push-up': [
    'Start in a rigid plank with hands just outside your shoulders.',
    'Lower under control with your elbows angled back.',
    'Press up while maintaining your body line.',
  ],
  'glute-bridge': [
    'Lie on your back with knees bent.',
    'Brace lightly.',
    'Drive through your feet to raise your hips without over-arching your back.',
  ],
  'farmer-carry': [
    'Hold weights at both sides.',
    'Stand tall with your ribs controlled.',
    'Walk steadily.',
  ],
  'bird-dog': [
    'Start on hands and knees.',
    'Extend opposite arm and leg without twisting or arching.',
    'Pause, return, and alternate sides.',
  ],
  'cat-camel': [
    'Start on hands and knees.',
    'Slowly alternate spinal flexion and extension.',
    'Stay in a comfortable, gentle range.',
  ],
  'half-kneeling-hip-flexor-stretch': [
    'Begin in a half-kneeling position.',
    'Lightly tuck your pelvis.',
    'Shift forward until the front of the rear hip stretches.',
  ],
  'supported-squat-hold': [
    'Hold a rack or stable support.',
    'Descend only to a comfortable depth.',
    'Breathe while keeping your whole foot in contact with the floor.',
  ],
  'wall-slide': [
    'Place your back against a wall as tolerated.',
    'Slide your arms upward.',
    'Do not force the range.',
  ],
  'open-book-rotation': [
    'Lie on your side with knees bent.',
    'Rotate your top arm and chest open.',
    'Keep your knees together.',
  ],
  'split-squat': [
    'Take a long split stance, feet hip-width apart, front foot flat and back heel lifted.',
    'Keep your torso tall and brace.',
    'Lower straight down until the back knee is just above the floor, or as deep as is comfortable.',
    'Push through the whole front foot to rise. Finish one side, then switch.',
  ],
  'goblet-squat': [
    'Hold one dumbbell against your chest with both hands, feet about shoulder width.',
    'Brace, then sit down and back under control to a comfortable depth.',
    'Keep your heels flat and chest tall.',
    'Drive through the whole foot to stand.',
  ],
  'calf-raise': [
    'Rise onto the balls of your feet under control.',
    'Pause at the top.',
    'Lower slowly.',
  ],
  'hammer-curl': [
    'Stand tall with a light dumbbell in each hand, palms facing your thighs.',
    'Keep your elbows beside your ribs and your wrists straight.',
    'Bend your elbows until your thumbs approach your shoulders.',
    'Lower slowly.',
  ],
  'supported-deep-squat': [
    'Hold a rack or stable support in front of you.',
    'Lower into the deepest squat that feels comfortable, whole foot on the floor, chest up.',
    'Breathe slowly and stay relaxed for the hold.',
    'Stand up.',
  ],
  'ankle-rock': [
    'Keep your heel down.',
    'Gently drive your knee forward over your toes.',
    'Return and repeat.',
  ],
  'neutral-spine-hamstring-stretch': [
    'Straighten one leg.',
    'Hinge from your hips toward it.',
    'Keep your spine neutral.',
  ],
  'single-leg-balance': [
    'Stand on one foot with a soft knee and tall posture.',
    'Keep your breathing steady.',
    'Keep a wall or rack within reach, then switch feet.',
  ],
  'slow-step-down': [
    'Stand on a low step.',
    'Lower the opposite heel toward the floor over about 3 seconds.',
    'Keep your knee tracking over your toes.',
    'Return to the top.',
  ],
  'supported-reverse-lunge': [
    'Hold the rack for balance if needed.',
    'Step one foot backward and lower straight down.',
    'Drive through the front foot to return.',
  ],
  'front-hold-carry': [
    'Hold one dumbbell or safe load close to your chest.',
    'Stand tall.',
    'Walk slowly without leaning back.',
  ],
  'bear-hug-carry': [
    'Hug a securely packed object close to your torso.',
    'Check that nothing can shift.',
    'Walk with short, controlled steps.',
  ],
  'elevated-light-hinge-pattern': [
    'Set an empty or light bar on elevated safeties or blocks.',
    'Soften your knees and push your hips backward, keeping the bar close and your spine neutral.',
    'Stand by driving your hips forward.',
  ],
  'seated-two-db-overhead-press': [
    'Sit against the upright bench with a dumbbell at each shoulder.',
    'Brace, then press both weights up until your arms are straight.',
    'Lower under control to shoulder height.',
  ],
  'standing-two-db-overhead-press': [
    'Stand with a dumbbell at each shoulder, glutes squeezed and ribs down.',
    'Press both weights straight up without dipping your knees.',
    'Lower under control.',
  ],
  'one-arm-db-overhead-press': [
    'Sit or stand with one dumbbell at your shoulder.',
    'Brace and press straight up until your arm is straight.',
    'Lower under control. Finish one side, then switch.',
  ],
  'half-kneeling-one-arm-db-press': [
    'Kneel on one knee on a pad, the other foot flat in front.',
    'Hold the dumbbell on the side of the down knee and stand tall through the hips.',
    'Press straight up and lower under control.',
    'Switch your stance when you switch arms.',
  ],
  'barbell-overhead-press': [
    'Set the bar at collarbone height in the rack, grip just outside your shoulders, and unrack.',
    'Squeeze your glutes and brace.',
    'Press the bar straight up, moving your head back just enough to clear your face.',
    'Lower to the front of your shoulders and rack it when done.',
  ],
  'seated-barbell-overhead-press': [
    'Sit against the upright bench inside the rack, bar at about chin height.',
    'Unrack with a grip just outside your shoulders.',
    'Press straight up and lower to chin height under control.',
    'Rack the bar when done.',
  ],
  'two-hand-overhead-carry': [
    'Hold one dumbbell by both ends and press it overhead.',
    'Keep your ribs down and biceps near your ears.',
    'Walk slowly for the time.',
    'Lower the dumbbell to your shoulders and down.',
  ],
  'waiter-carry': [
    'Press one dumbbell overhead, palm facing in, arm straight.',
    'Keep your ribs down and stand tall without leaning.',
    'Walk slowly for the time.',
    'Lower the weight and switch sides.',
  ],
  'db-biceps-curl': [
    'Stand tall with a dumbbell in each hand, palms forward.',
    'Keep your elbows beside your ribs.',
    'Curl the weights up, then lower slowly to straight arms.',
  ],
  'preacher-curl': [
    'Set the bench to an incline and rest the back of one upper arm on the backrest.',
    'Hold the dumbbell palm up and curl it.',
    'Lower slowly until your arm is nearly straight.',
    'Finish one side, then switch.',
  ],
  'pallof-press': [
    'Loop a band around a rack upright at chest height and stand side-on to it.',
    'Hold the band at the middle of your chest and brace.',
    'Press your hands straight out, hold a breath, and bring them back.',
    'Don’t let the band turn you. Finish one side, then face the other way.',
  ],
  'plank-shoulder-taps': [
    'Hold a high plank, hands under your shoulders, feet a little wider than your hips.',
    'Tap one hand to the opposite shoulder, then put it down.',
    'Alternate slowly, keeping your hips still.',
  ],
  'band-pull-apart': [
    'Hold a light band in front of your chest with straight arms.',
    'Move your hands out to the sides until the band touches your chest.',
    'Return slowly.',
  ],
  'band-face-pull': [
    'Anchor a band at about face height and hold it palms down.',
    'Step back until the band pulls.',
    'Pull toward your face, hands finishing beside your ears with elbows high.',
    'Return slowly.',
  ],
  'chest-supported-db-reverse-fly': [
    'Lie face down on an incline bench, chest on the pad, a light dumbbell in each hand.',
    'With a slight bend in your elbows, raise your arms out to the sides until they are level with your body.',
    'Squeeze your shoulder blades together.',
    'Lower slowly.',
  ],
  'chin-up': [
    'Loop the band on the pull-up bar and put a foot or knee in it.',
    'Grip the bar with palms facing you and start in an active hang.',
    'Pull until your chin is over the bar if comfortable.',
    'Lower slowly.',
  ],
  'band-light-pull-up': [
    'Do the work sets as assisted pull-ups with the lightest band that keeps your reps clean.',
    'For the negatives, step up until your chin is over the bar and take your feet off.',
    'Lower as slowly as you can to an active hang, about 3–5 seconds.',
    'Step down and reset between reps.',
  ],
  'pull-up': [
    'Hang from the bar with hands just outside your shoulders, palms away.',
    'Set your shoulders, then pull until your chin is over the bar.',
    'Lower under control to an active hang.',
  ],
  'chest-to-bar-pull-up': [
    'Start from a still, active hang.',
    'Pull hard and fast until your chest reaches the bar.',
    'Lower under control.',
  ],
  'straight-bar-dip': [
    'For the dip, hold the rack’s two short bars with straight arms at your sides.',
    'Lower until your upper arms are about parallel with the floor, then press up.',
    'For the transition drill, set a low barbell and take a false grip, wrists over the bar.',
    'Lean back, pull your chest to the bar, and turn your elbows forward to finish on top.',
  ],
  'band-assisted-muscle-up': [
    'Loop a band over the pull-up bar, put your knees or feet in it, and take a false grip.',
    'Pull hard toward your lower chest.',
    'Turn your elbows forward over the bar and press out to straight arms.',
    'Lower the way you came, under control.',
  ],
  'muscle-up': [
    'Start from a still hang with a false grip.',
    'Pull explosively toward your lower chest.',
    'Turn your elbows over the bar and press out to straight arms.',
    'Lower under control, or drop to a hang and step down.',
  ],
  'pike-push-up': [
    'Start in a push-up position and walk your feet in so your hips rise.',
    'Bend your elbows to lower the top of your head toward a point just ahead of your hands.',
    'Press back up.',
  ],
  'feet-elevated-pike-push-up': [
    'Put your feet on the bench and walk your hands back until your hips are high over your shoulders.',
    'Lower the top of your head toward the floor in front of your hands.',
    'Press back up.',
  ],
  'wall-handstand-push-up-negative': [
    'Fold a towel or mat at the foot of the wall.',
    'Kick up, or walk up chest-to-wall, hands about a hand’s length from the wall.',
    'Lower slowly over 3–5 seconds until your head touches the pad.',
    'Come down from the wall and reset. Do not press up.',
  ],
  'wall-handstand-push-up': [
    'Set up as for the negative, with a folded towel or mat under your head.',
    'Lower under control until your head lightly touches the pad.',
    'Press back up to straight arms.',
  ],
  'wall-plank-hold': [
    'Start in a push-up position with your feet against the wall.',
    'Walk your feet up until your body is a straight line from hands to heels.',
    'Push the floor away and hold.',
    'Walk your feet back down to finish.',
  ],
  'wall-walk': [
    'From the wall plank, walk your feet higher and your hands closer to the wall in small steps.',
    'Stop where you are still in control and pause.',
    'Walk back out the same way.',
  ],
  'chest-to-wall-handstand-hold': [
    'Walk up into the handstand with your chest toward the wall.',
    'Push tall through your shoulders and squeeze your legs together.',
    'Hold, then walk down.',
  ],
  'kick-up-to-wall': [
    'Stand facing the wall a little more than a body length away and put your hands down a hand’s length from it.',
    'Kick one leg up, then the other, until your heels rest on the wall.',
    'Hold briefly, then step one foot down at a time.',
    'To bail, turn one hand and cartwheel out.',
  ],
  'freestanding-handstand-attempts': [
    'Kick up near, but not against, the wall.',
    'Find the balance through your fingers and hold as long as you can.',
    'Come down with the bail when you tip.',
  ],
  'planche-lean': [
    'Start in a push-up position, fingers turned slightly out.',
    'Keep your arms straight and lean forward so your shoulders pass your hands.',
    'Hold, then lean back.',
  ],
  'frog-stand': [
    'Squat with your hands on the floor, shoulder width apart.',
    'Rest your knees on the backs of your upper arms.',
    'Lean forward slowly and lift your feet.',
    'Hold, then put your feet down.',
  ],
  'pseudo-planche-push-up': [
    'Set up in the planche lean with hands near your hips and fingers turned out.',
    'Keep the lean as you lower.',
    'Press back up.',
  ],
  'tuck-planche-hold': [
    'Place your hands on the floor or low handles with straight arms.',
    'Lean forward, round your upper back slightly, and lift your feet with knees tucked to your chest.',
    'Hold the position.',
  ],
  'advanced-tuck-planche-hold': [
    'Get into the tuck planche with straight arms.',
    'Flatten your back.',
    'Move your knees away from your chest until your hips are level with your shoulders, and hold.',
  ],
  'tuck-planche-push-up': [
    'Get into the tuck planche.',
    'Bend your elbows to lower a few inches.',
    'Press back to straight arms without your feet touching.',
  ],
  'straddle-planche': [
    'Start from the advanced tuck.',
    'Extend your legs out wide and straight behind you.',
    'Keep your body level and hold.',
  ],
  'planche-push-up': [
    'Get into a straddle or full planche.',
    'Lower with control.',
    'Press back up without your feet touching.',
  ],
  'wrist-circles': [
    'Kneel on hands and knees, fingers pointing forward.',
    'Shift your weight in slow circles, 5 each way.',
    'Rotate each wrist in loose circles in the air.',
  ],
  'wrist-rocks': [
    'Kneel on hands and knees, fingers pointing forward, and rock slowly forward and back 10 times.',
    'Turn your fingers out to the sides and rock 10 times.',
    'Point them back toward your knees and rock 5 times, only as far as is comfortable.',
  ],
  'pike-hold': [
    'From a push-up position, walk your feet in so your hips rise into an upside-down V.',
    'Push the floor away with straight arms.',
    'Hold, keeping your head in line with your arms.',
  ],
  'lateral-step-down': [
    'Stand side-on on a low step.',
    'Bend the standing leg and lower the outside heel toward the floor over about 3 seconds.',
    'Touch lightly and stand back up. Finish one side, then switch.',
  ],
  'single-leg-reach': [
    'Stand on one leg with a soft knee.',
    'Tap the free foot forward, to the side, then back, returning each time.',
    'Switch legs.',
  ],
  'single-leg-romanian-deadlift': [
    'Hold a light dumbbell in the hand opposite your standing leg.',
    'With a soft knee, push your hips back and let the free leg rise behind you.',
    'Keep your back flat and go only as far as your hamstring allows.',
    'Drive your hips forward to stand. Switch sides.',
  ],
};

export function getQuickHelpSteps(exerciseId: string): string[] | undefined {
  const steps = quickHelpSteps[exerciseId];
  return steps ? [...steps] : undefined;
}
