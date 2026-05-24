const pipelineLog = document.getElementById('pipelineLog');
const runTurnBtn = document.getElementById('runTurn');
const rollDiceBtn = document.getElementById('rollDice');
const clearLogBtn = document.getElementById('clearLog');
const playerInput = document.getElementById('playerInput');
const profileSelect = document.getElementById('profile');
const gpuProfile = document.getElementById('gpuProfile');
const mediaMode = document.getElementById('mediaMode');
const shortMemoryList = document.getElementById('shortMemory');

const state = {
  shortMemory: [],
  profile: 'a100',
};

const profileMap = {
  a100: { gpu: 'A100-80GB', media: 'async' },
  dual: { gpu: '2x GPU (split realtime/media)', media: 'parallel async' },
  h100: { gpu: 'H100 NVL', media: 'fast async' },
};

function log(line) {
  const p = document.createElement('p');
  p.textContent = line;
  pipelineLog.appendChild(p);
  pipelineLog.scrollTop = pipelineLog.scrollHeight;
}

function refreshMemory() {
  shortMemoryList.innerHTML = '';
  state.shortMemory.slice(-6).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    shortMemoryList.appendChild(li);
  });
}

function simulateDmReply(input) {
  const hooks = [
    'Une presence magique flotte dans l air.',
    'Tu remarques une empreinte recente sur la pierre.',
    'Un PNJ te fixe en silence depuis l ombre.',
  ];
  const pick = hooks[Math.floor(Math.random() * hooks.length)];
  return `DM: ${pick} Action comprise: "${input.trim()}".`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTurn() {
  const input = playerInput.value.trim();
  if (!input) {
    log('Erreur: aucune entree joueur.');
    return;
  }

  log('P0: ASR worker -> transcription recue.');
  await sleep(250);

  log('P0: LLM worker -> raisonnement + tool-calling regles.');
  await sleep(380);

  const reply = simulateDmReply(input);
  state.shortMemory.push(`Joueur: ${input}`);
  state.shortMemory.push(reply);
  refreshMemory();

  log('P1: Tool regles -> verifications effectuees.');
  await sleep(180);

  log(`P0: TTS worker -> ${reply}`);

  setTimeout(() => log('P2: worker-image -> scene en cours de generation (async).'), 200);
  setTimeout(() => log('P2: worker-music -> ambience mise a jour (async).'), 350);
  setTimeout(() => log('P2: worker-sfx -> effet declenche (async).'), 500);
}

function rollD20() {
  const result = 1 + Math.floor(Math.random() * 20);
  log(`Tool d20: resultat = ${result}`);
}

profileSelect.addEventListener('change', (e) => {
  state.profile = e.target.value;
  const profile = profileMap[state.profile];
  gpuProfile.textContent = profile.gpu;
  mediaMode.textContent = profile.media;
  log(`Infra: profil bascule vers ${profile.gpu}.`);
});

runTurnBtn.addEventListener('click', runTurn);
rollDiceBtn.addEventListener('click', rollD20);
clearLogBtn.addEventListener('click', () => {
  pipelineLog.innerHTML = '';
});

log('Systeme pret. Lance un tour pour tester la boucle modulaire.');
refreshMemory();
