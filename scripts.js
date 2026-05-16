// ============================================================
// SCROLL OBSERVER + SIMULATION — bind scenes to viz pane and sim state
// ============================================================
(function(){
  // Sim config keyed by scene element id. Defaults are the passive/inaction
  // option, so a reader who scrolls without interacting ends in "Slow Boil".
  const SIM = {
    'scene-dublin-apr': { type:'observe', label:'The talent shock arrives.' },
    'scene-berlin':     { type:'decide', question:'The Digital Liberty Act is on the desk. Germany’s call:', options:[
      { id:'sign',          label:'Sign',                    strength:'passive', score:0, default:true,
        impact:'Germany aligns with the US framework. The Digital Liberty Act constrains the coalition before it forms.' },
      { id:'negotiate',     label:'Negotiate slow walk',     strength:'mid',     score:1,
        impact:'Germany asks for carve-outs and a longer transition. The coalition gets time, not certainty.' },
      { id:'refuse-bloc',   label:'Refuse and form a bloc',  strength:'active',  score:2,
        impact:'Germany refuses to sign and convenes a counter-bloc. The coalition gains its first anchor and its first explicit opponent.' }
    ] },
    'scene-brussels':   { type:'decide', question:'How do you frame the public case?', options:[
      { id:'national',      label:'National only',           strength:'passive', score:0, default:true,
        impact:'You frame the case in domestic terms. Other capitals hear it as someone else’s problem.' },
      { id:'eu-coalition',  label:'EU coalition',            strength:'mid',     score:1,
        impact:'The case lands as EU industrial policy. Membership is bounded to the 27; mandate stays narrow.' },
      { id:'eu-allies',     label:'EU + allies',             strength:'active',  score:2,
        impact:'The case lands as a middle-power proposal. Canada, Japan, South Korea, Singapore become eligible co-founders.' }
    ] },
    'scene-tokyo':      { type:'decide', question:'After the hallucination, where do your models come from?', options:[
      { id:'off-the-shelf', label:'Off-the-shelf US',        strength:'passive', score:0, default:true,
        impact:'Japan stays a consumer. Sovereignty is rhetorical; inference still routes through US-controlled APIs.' },
      { id:'build-own',     label:'Build your own',          strength:'mid',     score:1,
        impact:'Japan trains a national model. Useful for language coverage, but not at frontier scale.' },
      { id:'coalition-model', label:'Join a coalition model', strength:'active', score:2,
        impact:'Japan co-trains with the coalition. RIKEN compute and Japanese-language data enter the shared stack.' }
    ] },
    'scene-stockholm':  { type:'decide', question:'What does the coalition cover?', options:[
      { id:'defense-only',  label:'Defense only (Helsing)',  strength:'passive', score:0, default:true,
        impact:'The coalition stays narrow and saleable to security ministries. Civilian models remain US-dependent.' },
      { id:'defense-commercial', label:'Defense + commercial', strength:'mid',  score:1,
        impact:'Two product lines fund each other. Governance gets harder; the political base broadens.' },
      { id:'full-stack',    label:'Full sovereign stack',    strength:'active', score:2,
        impact:'Models, compute, deployment, language tooling. Closer to the proposal\'s frontier-and-APIs scope.' }
    ] },
    'scene-monroe':     { type:'observe', label:'The other side keeps building.' },
    'scene-ottawa':     { type:'decide', question:'Coalition with whom?', options:[
      { id:'eu-only',       label:'EU only',                 strength:'passive', score:0, default:true,
        impact:'Geographically tidy, politically smaller. No Five Eyes overlap, no Atlantic crossing.' },
      { id:'eu-canada',     label:'EU + Canada',             strength:'mid',     score:1,
        impact:'Canada brings Cohere and a Five Eyes seat. The coalition crosses one Atlantic line.' },
      { id:'five-eyes-minus-us', label:'EU + Five Eyes (minus US)', strength:'active', score:2,
        impact:'UK, Canada, Australia, New Zealand join with the EU. Standards-body coverage jumps; intelligence-sharing gets complicated.' }
    ] },
    'scene-paris':      { type:'decide', question:'France’s move:', options:[
      { id:'defers',        label:'France defers',           strength:'passive', score:0, default:true,
        impact:'The proposal continues without a French anchor. The Airbus parallel weakens.' },
      { id:'co-leads',      label:'France co-leads',         strength:'mid',     score:1,
        impact:'France contributes Mistral, Jean Zay, and the AI Action Plan budget. Leadership is shared, not owned.' },
      { id:'leads',         label:'France leads',            strength:'active',  score:2,
        impact:'France hosts the coalition, anchors the legal entity, contributes Mistral as the first frontier model.' }
    ] },
    'scene-dublin-jan': { type:'observe', label:'What Aaron found.' },
    'scene-whitehouse': { type:'observe', label:'The US tightens.' },
    'scene-ether':      { type:'decide', question:'The coalition decides:', options:[
      { id:'sign-dla',      label:'Sign the DLA',            strength:'passive', score:0, default:true,
        impact:'The coalition formally accepts the US framework. It exists, but inside someone else’s rules.' },
      { id:'hybrid',        label:'Hybrid path',             strength:'mid',     score:1,
        impact:'You operate inside the DLA for now and build outside it in parallel. Two stacks for a while.' },
      { id:'form-entity',   label:'Form coalition entity',   strength:'active',  score:2,
        impact:'A legal entity is incorporated, joint compute and IP get signed, an MVP ships inside the coalition\'s 3-month frame.' }
    ] }
  };

  const SIM_KEY = 'afa_sim_v1';
  let simState = {};
  // lockedSet is intentionally NOT restored from storage. Locks are a within-
  // session UX detail (once the outcome view appears, picks freeze); the user
  // should always be able to reopen the page and change their picks again.
  let lockedSet = new Set();
  try {
    const raw = JSON.parse(sessionStorage.getItem(SIM_KEY) || '{}');
    simState = raw.picks || {};
  } catch(e) { /* ignore */ }

  function saveState(){
    try { sessionStorage.setItem(SIM_KEY, JSON.stringify({ picks: simState })); } catch(e){}
  }

  const decisionOrder = Object.keys(SIM).filter(id => SIM[id].type === 'decide');
  const totalDecisions = decisionOrder.length;

  function getPick(sceneId){
    if (simState[sceneId]) return simState[sceneId];
    const cfg = SIM[sceneId];
    if (cfg && cfg.options) {
      const def = cfg.options.find(o => o.default);
      if (def) return def.id;
    }
    return null;
  }


  // ===== Outcome rendering =====
  const outcome = document.getElementById('outcome');
  // =====================================================================
  // COALITION DESIGN PANEL
  // Coalition design components derived from story picks. Each section shows the
  // universe of options; the user's picks (from the seven calls) highlight
  // which slice the story takes. No tier, no score.
  // =====================================================================

  const COALITION_MEMBERS = [
    { iso: 'FR', name: 'France',       entity: 'Mistral AI',     role: 'private champion', brings: 'Frontier generalist LLM; €2.5B France 2030 state line.' },
    { iso: 'CA', name: 'Canada',       entity: 'Cohere',         role: 'private champion', brings: 'Enterprise + RAG tooling; Five Eyes bridge.' },
    { iso: 'ES', name: 'Spain',        entity: 'BSC (Salamandra)', role: 'public lab',     brings: 'MareNostrum 5 compute; multilingual EU LLM.' },
    { iso: 'JP', name: 'Japan',        entity: 'RIKEN',          role: 'public lab',       brings: 'Fugaku-class compute; Japanese-language stack.' },
    { iso: 'DE', name: 'Germany',      entity: '',               role: '',                 brings: 'JUPITER exascale; €5B KI-Aktionsplan.' },
    { iso: 'GB', name: 'UK',           entity: '',               role: '',                 brings: 'AI Safety Institute; £2B AI Opportunities Plan.' },
    { iso: 'KR', name: 'South Korea',  entity: '',               role: '',                 brings: 'Chip supply chain; INAISI seat.' },
    { iso: 'SE', name: 'Sweden',       entity: 'New Nordics AI', role: 'regional',         brings: 'Nordic-Baltic AI Centre; LUMI-AI upgrade.' },
    { iso: 'SG', name: 'Singapore',    entity: '',               role: '',                 brings: 'INAISI seat; Asia-Pacific bridge.' },
    { iso: 'CH', name: 'Switzerland',  entity: 'Swiss AI',       role: 'public-academic',  brings: 'EPFL/ETH research; multilingual evals.' },
  ];

  const COALITION_LABS = [
    {
      name: 'Mistral',  country: 'France',  type: 'Private champion',
      evidence: '~€400M ARR (Jan 2026); €1.7B Sept 2025 raise.',
      gate: 'In when France is in. Activated by <strong>Paris</strong> = <em>co-leads</em> or <em>leads</em>, or <strong>Brussels</strong> = <em>EU coalition</em> / <em>EU + allies</em>.',
    },
    {
      name: 'Cohere',   country: 'Canada',  type: 'Private champion',
      evidence: '~$240M ARR; AMD-backed Series E.',
      gate: 'In when Canada is in. Activated by <strong>Ottawa</strong> = <em>EU + Canada</em> or <em>EU + Five Eyes</em>.',
    },
    {
      name: 'BSC',      country: 'Spain',   type: 'Public lab',
      evidence: 'Salamandra family; MareNostrum 5; €90M AI upgrade.',
      gate: 'In when Spain is in. Activated by <strong>Brussels</strong> = <em>EU coalition</em> or <em>EU + allies</em>.',
    },
    {
      name: 'RIKEN',    country: 'Japan',   type: 'Public lab',
      evidence: 'Fugaku compute; METI-backed sovereign LLM.',
      gate: 'In when Japan is in. Activated by <strong>Brussels</strong> = <em>EU + allies</em>, or <strong>Tokyo</strong> = <em>Coalition model</em>.',
    },
  ];

  const GOVERNANCE = [
    { id: 'state-led',  name: 'State-led merger',          desc: 'Pure Airbus model: member states own equity, slow to form, strong sovereignty.' },
    { id: 'ppp',        name: 'Public-private partnership', desc: "The proposal's preferred shape. Member contributes one national entity; consortium coordinates pre-training, compute, market." },
    { id: 'foundation', name: 'Foundation / non-profit',   desc: 'Mozilla / Linux Foundation style. Open by default; harder to capitalize at frontier scale.' },
    { id: 'federated',  name: 'Federated co-op',           desc: 'Visa-like consortium of autonomous members. Easy to start, weak central capacity.' },
  ];

  const SCOPE = [
    { id: 'defense-only',       name: 'Defense only',          desc: 'Helsing-anchored. Saleable to security ministries; civilian models stay US-dependent.' },
    { id: 'defense-commercial', name: 'Defense + commercial',  desc: 'Two product lines fund each other. Broader political base, harder governance.' },
    { id: 'full-stack',         name: 'Full sovereign stack',  desc: "The proposal's scope: models, compute, deployment, language tooling, APIs." },
  ];

  // Map the user's picks onto each design dimension.
  function deriveShape(){
    const p = simState;
    const brussels = p['scene-brussels']  || 'national';
    const ottawa   = p['scene-ottawa']    || 'eu-only';
    const tokyo    = p['scene-tokyo']     || 'off-the-shelf';
    const paris    = p['scene-paris']     || 'defers';
    const berlin   = p['scene-berlin']    || 'sign';
    const ether    = p['scene-ether']     || 'sign-dla';
    const stockholm = p['scene-stockholm']|| 'defense-only';

    // Members: build the set from Brussels (scope) + Ottawa (Atlantic) + Tokyo (Japan in/out) + Paris (FR role)
    const inSet = new Set();
    // France in if France co-leads/leads OR EU coalition+ scope
    if (paris !== 'defers' || brussels !== 'national') inSet.add('FR');
    // Spain, Germany, Sweden, Switzerland in if EU coalition or wider
    if (brussels !== 'national') {
      inSet.add('DE'); inSet.add('ES'); inSet.add('SE'); inSet.add('CH');
    }
    // Canada via Ottawa
    if (ottawa === 'eu-canada' || ottawa === 'five-eyes-minus-us') inSet.add('CA');
    // UK + Five Eyes minus US
    if (ottawa === 'five-eyes-minus-us') inSet.add('GB');
    // Japan/Korea/Singapore via Tokyo or EU+allies framing
    if (brussels === 'eu-allies' || tokyo === 'coalition-model') {
      inSet.add('JP'); inSet.add('KR'); inSet.add('SG');
    }

    // Anchor labs follow their country's membership
    const labsIn = new Set();
    if (inSet.has('FR')) labsIn.add('Mistral');
    if (inSet.has('CA')) labsIn.add('Cohere');
    if (inSet.has('ES')) labsIn.add('BSC');
    if (inSet.has('JP')) labsIn.add('RIKEN');

    // Governance derives from Berlin + Ether
    let gov = 'state-led';
    if (ether === 'form-entity' && berlin === 'refuse-bloc') gov = 'state-led';
    else if (ether === 'form-entity') gov = 'ppp';
    else if (ether === 'hybrid') gov = 'federated';
    else gov = 'foundation';

    return { members: inSet, labs: labsIn, governance: gov, scope: stockholm };
  }

  // One-sentence synthesis of the coalition shape, derived from picks.
  function synthesizeCoalition(shape){
    const memberCount = shape.members.size;
    const labCount = shape.labs.size;
    const govName = (GOVERNANCE.find(g => g.id === shape.governance) || {}).name || 'an unsettled governance shape';
    const scopeName = (SCOPE.find(s => s.id === shape.scope) || {}).name || 'an unsettled scope';

    let geo;
    const hasFiveEyesEU = shape.members.has('GB') && shape.members.has('CA');
    const hasAsia = shape.members.has('JP') || shape.members.has('KR') || shape.members.has('SG');
    const hasEU = shape.members.has('FR') || shape.members.has('DE') || shape.members.has('ES');
    if (memberCount === 0) geo = 'an empty coalition (no states in)';
    else if (hasFiveEyesEU && hasAsia) geo = 'a EU + Five Eyes + Asia-Pacific coalition';
    else if (hasFiveEyesEU) geo = 'a EU + Five Eyes coalition';
    else if (hasAsia && hasEU) geo = 'a EU + Asia-Pacific coalition';
    else if (hasEU) geo = 'an EU-only coalition';
    else geo = 'a coalition of ' + memberCount + ' states';

    const anchorList = Array.from(shape.labs);
    const anchorStr = anchorList.length === 0 ? 'no anchor labs' :
                      anchorList.length === 1 ? 'anchored by ' + anchorList[0] :
                      'anchored by ' + anchorList.slice(0, -1).join(', ') + ' and ' + anchorList[anchorList.length - 1];

    return `${geo.charAt(0).toUpperCase() + geo.slice(1)}, ${anchorStr} (${labCount} of 4 named), operating as ${govName.toLowerCase()}, building toward ${scopeName.toLowerCase()}.`;
  }

  // Short, brief-style labels for each decision (different from the in-story
  // question text so the outcome reads like a configurable policy brief).
  const PICK_LABELS = {
    'scene-brussels':  'How the case is framed',
    'scene-ottawa':    'Trans-Atlantic shape',
    'scene-tokyo':     'Japan participation',
    'scene-paris':     'France role',
    'scene-berlin':    'Germany on the Digital Liberty Act',
    'scene-ether':     'Final structure',
    'scene-stockholm': 'Mandate scope',
  };

  // Render a single inline pick (label + chips + impact callout).
  function pickHtml(sceneId){
    const cfg = SIM[sceneId];
    if (!cfg) return '';
    const pick = getPick(sceneId);
    const pickedOpt = cfg.options.find(o => o.id === pick) || cfg.options[0];
    const options = cfg.options.map(o => `
      <button type="button"
              class="design-pick-option ${o.id === pick ? 'is-picked' : ''}"
              data-scene="${sceneId}" data-pick="${o.id}"
              role="radio" aria-checked="${o.id === pick}">
        <span>${o.label}</span>
      </button>`).join('');
    return `
      <div class="design-pick" data-scene="${sceneId}">
        <span class="design-pick-label">${PICK_LABELS[sceneId] || cfg.question}</span>
        <div class="design-pick-options" role="radiogroup">${options}</div>
        <p class="design-pick-impact" data-strength="${pickedOpt.strength}">${pickedOpt.impact || ''}</p>
      </div>`;
  }

  function renderCoalitionDesign(){
    const root = document.getElementById('coalitionDesign');
    if (!root) return;
    const shape = deriveShape();

    const memberHtml = COALITION_MEMBERS.map(m => {
      const active = shape.members.has(m.iso);
      return `
        <div class="design-card ${active ? 'is-active' : ''}">
          <div class="design-card-name">
            ${m.name}
            ${active ? '<span class="design-card-tag">in</span>' : ''}
          </div>
          ${m.entity ? `<div class="design-card-entity">${m.entity}${m.role ? '  ·  ' + m.role : ''}</div>` : ''}
          <div class="design-card-brings">${m.brings}</div>
        </div>`;
    }).join('');

    const labsHtml = COALITION_LABS.map(l => {
      const active = shape.labs.has(l.name);
      return `
        <div class="design-card is-anchor ${active ? 'is-active' : ''}">
          <div class="design-card-name">
            ${l.name}
            <span class="design-card-tag">${active ? 'anchor in' : 'not in'}</span>
          </div>
          <div class="design-card-entity">${l.country}  ·  ${l.type}</div>
          <div class="design-card-brings">${l.evidence}</div>
          <div class="design-card-gate" data-active="${active}">${l.gate}</div>
        </div>`;
    }).join('');

    const govHtml = GOVERNANCE.map(g => {
      const active = shape.governance === g.id;
      return `
        <div class="design-row ${active ? 'is-active' : ''}">
          <div class="design-row-name">
            ${g.name}
          </div>
          <div class="design-row-desc">${g.desc}</div>
        </div>`;
    }).join('');

    const scopeHtml = SCOPE.map(s => {
      const active = shape.scope === s.id;
      return `
        <div class="design-row ${active ? 'is-active' : ''}">
          <div class="design-row-name">
            ${s.name}
          </div>
          <div class="design-row-desc">${s.desc}</div>
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="design-section">
        <div class="design-section-kicker">Member states (10 in the proposal)</div>
        <h3 class="design-section-title">Who joins</h3>
        <p class="design-section-note">France, Germany, Japan, Singapore, South Korea, Spain, Sweden, Switzerland, the UK, and Canada are the first-cohort middle powers. Four picks on the left decide which of them are eligible on the right.</p>
        <div class="design-split-body">
          <div class="design-picks">
            ${pickHtml('scene-brussels')}
            ${pickHtml('scene-ottawa')}
            ${pickHtml('scene-tokyo')}
            ${pickHtml('scene-paris')}
          </div>
          <div class="design-grid">${memberHtml}</div>
        </div>
      </div>

      <div class="design-section">
        <div class="design-section-kicker">Anchor labs (four, not twenty)</div>
        <h3 class="design-section-title">Who anchors</h3>
        <p class="design-section-note">Two private champions (Mistral, Cohere), two public labs (BSC, RIKEN). The anchors follow from the member picks above.</p>
        <div class="design-split-body">
          <div class="design-derivation">
            <span class="design-derivation-label">How an anchor enters</span>
            <p>A lab is &ldquo;in&rdquo; when its host state is &ldquo;in,&rdquo; so anchors are downstream of the four <em>Who joins</em> picks. Each card on the right shows exactly which decision and which option activates it.</p>
            <p>Currently <strong>${shape.labs.size} of 4</strong> anchor labs active:</p>
            <ul class="design-derivation-list">
              ${COALITION_LABS.map(l => `<li data-active="${shape.labs.has(l.name)}"><span>${l.name}</span> &middot; ${l.country} ${shape.labs.has(l.name) ? '<em>in</em>' : '<em>out</em>'}</li>`).join('')}
            </ul>
            <p class="design-derivation-quote">&ldquo;Start small: four labs, not twenty.&rdquo;</p>
          </div>
          <div class="design-grid">${labsHtml}</div>
        </div>
      </div>

      <div class="design-section">
        <div class="design-section-kicker">Governance shape</div>
        <h3 class="design-section-title">How it&rsquo;s held together</h3>
        <p class="design-section-note">The proposal favors a public-private partnership but leaves room for &ldquo;most likely something bespoke.&rdquo; The picks on the left decide which archetype it lands as.</p>
        <div class="design-split-body">
          <div class="design-picks">
            ${pickHtml('scene-berlin')}
            ${pickHtml('scene-ether')}
          </div>
          <div class="design-rows">${govHtml}</div>
        </div>
      </div>

      <div class="design-section">
        <div class="design-section-kicker">Scope</div>
        <h3 class="design-section-title">What the coalition covers</h3>
        <p class="design-section-note">The proposal&rsquo;s preferred end-state is the full stack; the entry point can be narrower.</p>
        <div class="design-split-body">
          <div class="design-picks">
            ${pickHtml('scene-stockholm')}
          </div>
          <div class="design-rows">${scopeHtml}</div>
        </div>
      </div>

      <div class="design-section">
        <div class="design-section-kicker">MVP target (the floor)</div>
        <h3 class="design-section-title">How small the first version can be</h3>
        <p class="design-section-note">The smallest credible coalition that can grow into a frontier programme. Independent of the shape above.</p>
        <div class="design-split-body">
          <div class="design-derivation">
            <span class="design-derivation-label">Why this small</span>
            <p>The MVP is deliberately tiny: small enough to ship before politics catches up, big enough to demonstrate the concept.</p>
            <p>The headline number for a frontier training run today is roughly $2B. The proposal is explicit that this is <em>not</em> what the MVP should aim at.</p>
            <p class="design-derivation-quote">&ldquo;Training a $2 billion &lsquo;leading frontier model&rsquo; is not the minimum viable product.&rdquo;</p>
          </div>
          <div class="design-mvp">
            <div class="design-mvp-stats">
              <div class="design-mvp-stat">10<span>person team</span></div>
              <div class="design-mvp-stat">3<span>months</span></div>
              <div class="design-mvp-stat">~100k<span>GPU-hours</span></div>
              <div class="design-mvp-stat">~$150k<span>budget</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="design-section design-section-summary">
        <div class="design-section-kicker">In summary</div>
        <h3 class="design-section-title">What you&rsquo;d be supporting</h3>
        <p class="design-section-note">One sentence, derived from your picks above. Change any choice and this updates.</p>
        <div class="design-split-body">
          <div class="design-derivation">
            <span class="design-derivation-label">Coalition shape</span>
            <p>${synthesizeCoalition(shape)}</p>
            <p class="design-derivation-quote">If this is the proposal you&rsquo;d sign your name to, add it to the public roll below.</p>
          </div>
          <div class="design-summary-stats">
            <div class="design-summary-row">
              <span class="design-summary-row-label">Members</span>
              <span class="design-summary-row-value">${shape.members.size} of 10 named</span>
            </div>
            <div class="design-summary-row">
              <span class="design-summary-row-label">Anchor labs</span>
              <span class="design-summary-row-value">${shape.labs.size} of 4 named</span>
            </div>
            <div class="design-summary-row">
              <span class="design-summary-row-label">Governance</span>
              <span class="design-summary-row-value">${(GOVERNANCE.find(g=>g.id===shape.governance)||{}).name || '&mdash;'}</span>
            </div>
            <div class="design-summary-row">
              <span class="design-summary-row-label">Mandate</span>
              <span class="design-summary-row-value">${(SCOPE.find(s=>s.id===shape.scope)||{}).name || '&mdash;'}</span>
            </div>
            <div class="design-summary-row">
              <span class="design-summary-row-label">MVP</span>
              <span class="design-summary-row-value">10 ppl &middot; 3 mo &middot; ~$150k</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire up the inline pick buttons.
    root.querySelectorAll('.design-pick-option').forEach(btn => {
      btn.addEventListener('click', () => {
        simState[btn.dataset.scene] = btn.dataset.pick;
        saveState();
        renderCoalitionDesign();
      });
    });

    // Store the derived shape on the sign-on form so it travels with the
    // sign-on submission.
    const outcomeField = document.getElementById('signonOutcome');
    if (outcomeField) {
      outcomeField.value = `members:${shape.members.size}/10 labs:${shape.labs.size}/4 gov:${shape.governance} scope:${shape.scope}`;
    }
  }

  // The legacy renderOutcome() name is preserved so existing call sites keep
  // working; it now just re-renders the design panel.
  function renderOutcome(){ renderCoalitionDesign(); }

  // Render the design panel on load so the outcome section is ready whenever
  // the user reaches it. Picks are inline inside each section now.
  if (outcome) {
    renderCoalitionDesign();
  }
})();

// ============================================================
// SIGN-ON FORM — mailto fallback if Formspree id is the placeholder
// ============================================================
(function(){
  const form = document.getElementById('signonForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    const action = form.getAttribute('action') || '';
    const get = (id) => (document.getElementById(id) || {}).value || '';
    if (action.includes('REPLACE_WITH_YOUR_FORM_ID')) {
      e.preventDefault();
      const body = encodeURIComponent(
        'Name: ' + get('signonName') + '\n' +
        'Email: ' + get('signonEmail') + '\n' +
        'Org: ' + get('signonOrg') + '\n' +
        'Outcome: ' + get('signonOutcome') + '\n\n' +
        get('signonReason')
      );
      const subject = encodeURIComponent('Airbus for AI — sign-on');
      window.location.href = 'mailto:hello@publicai.co?subject=' + subject + '&body=' + body;
      document.getElementById('signon').classList.add('is-submitted');
    }
    // If a real Formspree id is set, let the form submit normally.
  });
})();

// ============================================================
// CHART RENDER FUNCTIONS — lifted from the v1 dashboard
// ============================================================

// Honor prefers-reduced-motion: charts will draw once and stop their
// requestAnimationFrame loops. The static frame still conveys the data;
// only the particle-along-curve flourishes go away.
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Language Heatmap ---
(function(){
  const containers = Array.from(document.querySelectorAll('[data-chart="lang-heatmap"]'));
  if (!containers.length) return;
  containers.forEach(container => {
    container.innerHTML = '';
  const languages = [
    {name:'English',code:'EN',level:'strong',speakers:'~450M'},
    {name:'French',code:'FR',level:'strong',speakers:'~77M'},
    {name:'Spanish',code:'ES',level:'strong',speakers:'~47M'},
    {name:'German',code:'DE',level:'moderate',speakers:'~95M'},
    {name:'Italian',code:'IT',level:'moderate',speakers:'~63M'},
    {name:'Dutch',code:'NL',level:'moderate',speakers:'~25M'},
    {name:'Polish',code:'PL',level:'moderate',speakers:'~40M'},
    {name:'Portuguese',code:'PT',level:'moderate',speakers:'~12M'},
    {name:'Romanian',code:'RO',level:'moderate',speakers:'~22M'},
    {name:'Swedish',code:'SV',level:'moderate',speakers:'~10M'},
    {name:'Czech',code:'CS',level:'moderate',speakers:'~10M'},
    {name:'Greek',code:'EL',level:'weak',speakers:'~11M'},
    {name:'Hungarian',code:'HU',level:'weak',speakers:'~10M'},
    {name:'Finnish',code:'FI',level:'weak',speakers:'~5M'},
    {name:'Danish',code:'DA',level:'weak',speakers:'~6M'},
    {name:'Bulgarian',code:'BG',level:'weak',speakers:'~7M'},
    {name:'Slovak',code:'SK',level:'weak',speakers:'~5M'},
    {name:'Croatian',code:'HR',level:'weak',speakers:'~4M'},
    {name:'Lithuanian',code:'LT',level:'weak',speakers:'~3M'},
    {name:'Slovenian',code:'SL',level:'weak',speakers:'~2M'},
    {name:'Latvian',code:'LV',level:'weak',speakers:'~1.5M'},
    {name:'Estonian',code:'ET',level:'weak',speakers:'~1M'},
    {name:'Irish',code:'GA',level:'weak',speakers:'~0.2M'},
    {name:'Maltese',code:'MT',level:'weak',speakers:'~0.5M'}
  ];
  const colorMap = {strong:'#0fa37a',moderate:'#c96a2b',weak:'#ff3333'};
  languages.forEach(lang => {
    const cell = document.createElement('div');
    cell.style.cssText = `padding:8px 6px;border-radius:6px;border:0.5px solid ${colorMap[lang.level]}30;background:${colorMap[lang.level]}0a;text-align:center;`;
    cell.innerHTML = `
      <div style="font-family:var(--mono);font-size:0.78rem;font-weight:500;color:${colorMap[lang.level]};">${lang.code}</div>
      <div style="font-size:0.56rem;color:var(--text-soft);margin-top:2px;">${lang.name}</div>
      <div style="font-size:0.52rem;color:${colorMap[lang.level]}90;margin-top:1px;">${lang.speakers}</div>
    `;
    container.appendChild(cell);
  });
  });
})();

// --- Capital Flow Sankey ---
(function(){
  const _list_dbCapitalFlowCanvas = Array.from(document.querySelectorAll('[data-chart="capital-flow"]'));
  _list_dbCapitalFlowCanvas.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize(); window.addEventListener('resize',resize);
  const colA=[{label:'France / Germany',x:0.07,y:0.18,col:'#0fa37a'},{label:'Nordics / UK',x:0.07,y:0.40,col:'#0fa37a'},{label:'Southern EU',x:0.07,y:0.62,col:'#0fa37a'},{label:'Eastern EU',x:0.07,y:0.82,col:'#0fa37a'}];
  const colB=[{label:'Relocate to US (57%)',x:0.50,y:0.15,col:'#ff3333'},{label:'Stay in EU (28%)',x:0.50,y:0.40,col:'#1a6cd4'},{label:'UK / Switzerland',x:0.50,y:0.62,col:'#4a8ce4'},{label:'Other (15%)',x:0.50,y:0.82,col:'#7b6fd6'}];
  const colC=[{label:'$109B US AI ecosystem',x:0.93,y:0.22,col:'#ff3333'},{label:'$14B EU AI ecosystem',x:0.93,y:0.52,col:'#0fa37a'},{label:'Diluted / lost',x:0.93,y:0.80,col:'rgba(10,10,10,0.45)'}];
  const allNodes=[colA,colB,colC];
  const colHeaders=[{label:'EU FUNDING SOURCES',x:0.07},{label:'WHERE FOUNDERS GO',x:0.50},{label:'ECONOMIC RESULT',x:0.93}];
  const flows=[{from:[0,0],to:[1,0],w:0.22},{from:[0,1],to:[1,0],w:0.18},{from:[0,1],to:[1,1],w:0.12},{from:[0,2],to:[1,1],w:0.10},{from:[0,2],to:[1,2],w:0.08},{from:[0,3],to:[1,2],w:0.05},{from:[0,3],to:[1,3],w:0.06},{from:[1,0],to:[2,0],w:0.30},{from:[1,1],to:[2,1],w:0.15},{from:[1,2],to:[2,1],w:0.08},{from:[1,3],to:[2,2],w:0.06}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,t){const t2=1-t;return t2*t2*t2*a+3*t2*t2*t*b+3*t2*t*t*c+t*t*t*d;}
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    const fs=Math.max(7, Math.min(9, W*0.025));
    const lfs=Math.max(8, Math.min(11, W*0.03));
    ctx.font=fs+'px Inter, sans-serif';ctx.textAlign='center';
    colHeaders.forEach(ch=>{ctx.fillStyle='rgba(10,10,10,0.4)';ctx.fillText(ch.label,ch.x*W,12);});
    flows.forEach((f,fi)=>{
      const n1=allNodes[f.from[0]][f.from[1]],n2=allNodes[f.to[0]][f.to[1]];
      const x1=n1.x*W,y1=n1.y*H,x2=n2.x*W,y2=n2.y*H,thickness=f.w*H*0.7;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.4,y1,x1+(x2-x1)*0.6,y2,x2,y2);ctx.strokeStyle=n1.col+'18';ctx.lineWidth=thickness;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.4,y1,x1+(x2-x1)*0.6,y2,x2,y2);ctx.strokeStyle=n2.col+'50';ctx.lineWidth=0.8;ctx.stroke();
      particles[fi]=(particles[fi]+0.004)%1;const s=particles[fi];
      const bx=bezPt(x1,x1+(x2-x1)*0.4,x1+(x2-x1)*0.6,x2,s),by=bezPt(y1,y1,y2,y2,s);
      ctx.beginPath();ctx.arc(bx,by,2.5,0,Math.PI*2);ctx.fillStyle=n2.col;ctx.fill();
    });
    allNodes.forEach((col,ci)=>{col.forEach(n=>{
      ctx.beginPath();ctx.arc(n.x*W,n.y*H,Math.max(3,5*W/500),0,Math.PI*2);ctx.fillStyle=n.col;ctx.fill();
      ctx.fillStyle='rgba(10,10,10,0.78)';ctx.font=lfs+'px Inter, sans-serif';
      ctx.textAlign=ci===0?'left':ci===2?'right':'center';
      const labelX=ci===0?n.x*W+12:ci===2?n.x*W-12:n.x*W;
      ctx.fillText(n.label,labelX,n.y*H-10);
    });});
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  // Always draw — the dock is fixed so visibility is controlled separately
  draw();
  });
})();

// --- Talent Migration ---
(function(){
  const _list_dbTalentChordCanvas = Array.from(document.querySelectorAll('[data-chart="talent-migration"]'));
  _list_dbTalentChordCanvas.forEach(canvas => {
  const ctx=canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();window.addEventListener('resize',resize);
  const educated=[{label:'EU-West',y:0.14,col:'#0fa37a',pct:'22%'},{label:'EU-East',y:0.28,col:'#0fa37a',pct:'8%'},{label:'UK / CH',y:0.42,col:'#4a8ce4',pct:'12%'},{label:'China',y:0.56,col:'#c96a2b',pct:'29%'},{label:'India',y:0.70,col:'#7b6fd6',pct:'11%'},{label:'US',y:0.84,col:'#1a6cd4',pct:'18%'}];
  const working=[{label:'Work in US',y:0.20,col:'#1a6cd4',pct:'~60%'},{label:'Work in EU',y:0.42,col:'#0fa37a',pct:'~15%'},{label:'UK / CH',y:0.58,col:'#4a8ce4',pct:'~10%'},{label:'China',y:0.74,col:'#c96a2b',pct:'~10%'},{label:'Elsewhere',y:0.88,col:'rgba(10,10,10,0.55)',pct:'~5%'}];
  const flows=[{from:0,to:0,w:0.10},{from:0,to:1,w:0.08},{from:0,to:2,w:0.03},{from:1,to:0,w:0.03},{from:1,to:1,w:0.04},{from:2,to:0,w:0.05},{from:2,to:2,w:0.05},{from:3,to:0,w:0.14},{from:3,to:3,w:0.10},{from:3,to:1,w:0.03},{from:4,to:0,w:0.06},{from:4,to:2,w:0.02},{from:4,to:4,w:0.02},{from:5,to:0,w:0.14},{from:5,to:4,w:0.03}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,s){const s2=1-s;return s2*s2*s2*a+3*s2*s2*s*b+3*s2*s*s*c+s*s*s*d;}
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    // Reserve room for the (now short) labels on each side; flow region
    // gets most of the width.
    const insetPx = W < 380 ? 80 : 100;
    const LX = Math.max(0.18, insetPx / W);
    const RX = 1 - LX;
    const tfs=Math.max(7, Math.min(9, W*0.022));
    const lfs=Math.max(8, Math.min(11, W*0.026));
    const pfs=Math.max(7, Math.min(10, W*0.024));
    const dotR=Math.max(3, Math.min(5, W*0.012));
    // Headers sit ABOVE the columns, not at chart top, so they never
    // collide with the first row of labels at narrow widths.
    ctx.font=tfs+'px Inter, sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(10,10,10,0.42)';
    ctx.fillText('EDUCATED IN', LX*W, 10);
    ctx.fillText('NOW WORKING IN', RX*W, 10);
    // Center arrow stays soft and tucked behind the bezier curves.
    ctx.fillStyle='rgba(10,10,10,0.08)';
    const arrowFs = Math.max(18, Math.min(28, W*0.06));
    ctx.font=arrowFs+'px Inter, sans-serif';
    ctx.fillText('→', 0.5*W, 0.5*H + arrowFs*0.15);
    flows.forEach((f,fi)=>{
      const src=educated[f.from],dst=working[f.to];const x1=LX*W+8,y1=src.y*H,x2=RX*W-8,y2=dst.y*H,thickness=f.w*H*0.6;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.35,y1,x1+(x2-x1)*0.65,y2,x2,y2);ctx.strokeStyle=src.col+'12';ctx.lineWidth=thickness;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.35,y1,x1+(x2-x1)*0.65,y2,x2,y2);ctx.strokeStyle=dst.col+'40';ctx.lineWidth=0.7;ctx.stroke();
      particles[fi]=(particles[fi]+0.003+f.w*0.005)%1;const s=particles[fi];
      const bx=bezPt(x1,x1+(x2-x1)*0.35,x1+(x2-x1)*0.65,x2,s),by=bezPt(y1,y1,y2,y2,s);
      ctx.beginPath();ctx.arc(bx,by,2,0,Math.PI*2);ctx.fillStyle=dst.col;ctx.fill();
    });
    educated.forEach(n=>{
      ctx.beginPath();ctx.arc(LX*W,n.y*H,dotR,0,Math.PI*2);ctx.fillStyle=n.col;ctx.fill();
      ctx.textAlign='right';ctx.font=lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.65)';ctx.fillText(n.label,LX*W-14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,LX*W-14,n.y*H+18);
    });
    working.forEach(n=>{
      ctx.beginPath();ctx.arc(RX*W,n.y*H,dotR,0,Math.PI*2);ctx.fillStyle=n.col;ctx.fill();
      ctx.textAlign='left';ctx.font=lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.65)';ctx.fillText(n.label,RX*W+14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,RX*W+14,n.y*H+18);
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
  });
})();

// --- Compute Map: now rendered as static HTML (see .compute-stats markup) ---

// --- Coalition Revenue Growth ---
(function(){
  const _list_dbGrowthChart = Array.from(document.querySelectorAll('[data-chart="coalition-revenue"]'));
  _list_dbGrowthChart.forEach(canvas => {
  const ctx=canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();window.addEventListener('resize',resize);
  // Real-time axis: points carry an absolute date (year + month/12) so all
  // three series share one timeline.
  const X_MIN = 2023.0;
  const X_MAX = 2026.25;
  const series=[
    {name:'Mistral AI',color:'#3b82f6',points:[
      {date:2025.0,  y:20,  label:'Jan 2025'},
      {date:2025.25, y:50},
      {date:2025.5,  y:150},
      {date:2025.92, y:312, label:'Dec 2025'},
      {date:2026.0,  y:400, label:'Jan 2026'},
    ]},
    {name:'Cohere',color:'#ef4444',points:[
      {date:2024.17, y:22,  label:'Mar 2024'},
      {date:2025.33, y:100, label:'May 2025'},
      {date:2025.75, y:150, label:'Oct 2025'},
      {date:2026.08, y:240, label:'Feb 2026'},
    ]},
    {name:'DeepL',color:'#06b6d4',points:[
      {date:2023.5, y:141, label:'2023'},
      {date:2024.5, y:185, label:'2024'},
    ]}
  ];
  const maxY=420;
  function dateToX(d){ return (d - X_MIN) / (X_MAX - X_MIN); }
  let grown=reduceMotion?1:0;
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    const pad={l:54,r:64,t:30,b:42};
    const cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
    grown=Math.min(grown+0.015,1);

    // Y gridlines + labels
    ctx.strokeStyle='rgba(10,10,10,0.06)';ctx.lineWidth=0.5;
    for(let v=0;v<=400;v+=100){
      const y=pad.t+ch-(v/maxY)*ch;
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();
      ctx.fillStyle='rgba(10,10,10,0.45)';ctx.font='10px JetBrains Mono, monospace';ctx.textAlign='right';
      ctx.fillText('$'+v+'M',pad.l-8,y+4);
    }
    // Y-axis title
    ctx.save();ctx.translate(14,pad.t+ch/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='rgba(10,10,10,0.35)';ctx.font='9px Inter, sans-serif';ctx.textAlign='center';ctx.fillText('ARR ($M)',0,0);ctx.restore();

    // X-axis baseline + year ticks
    ctx.strokeStyle='rgba(10,10,10,0.25)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t+ch);ctx.lineTo(pad.l+cw,pad.t+ch);ctx.stroke();
    // Year labels: skip alternate years on narrow canvases so they don't collide.
    const xLabelFs = cw < 280 ? 8 : 9.5;
    const skipEven = cw < 240;
    for(let year=2023; year<=2026; year++){
      const x = pad.l + dateToX(year) * cw;
      ctx.strokeStyle='rgba(10,10,10,0.25)';
      ctx.beginPath();ctx.moveTo(x,pad.t+ch);ctx.lineTo(x,pad.t+ch+4);ctx.stroke();
      if (!skipEven || year % 2 === 1) {
        ctx.fillStyle='rgba(10,10,10,0.55)';
        ctx.font = xLabelFs + 'px JetBrains Mono, monospace';
        ctx.textAlign='center';
        ctx.fillText(year, x, pad.t+ch+18);
      }
      // Faint vertical gridline
      ctx.strokeStyle='rgba(10,10,10,0.04)';
      ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+ch);ctx.stroke();
    }

    series.forEach(s=>{
      ctx.beginPath();
      s.points.forEach((p,i)=>{
        const x=pad.l+dateToX(p.date)*cw;
        const y=pad.t+ch-(Math.min(p.y*grown,p.y)/maxY)*ch;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      });
      ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.stroke();
      s.points.forEach(p=>{
        const x=pad.l+dateToX(p.date)*cw;
        const y=pad.t+ch-(Math.min(p.y*grown,p.y)/maxY)*ch;
        ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
        if(p.label&&grown>0.8){
          ctx.fillStyle='rgba(10,10,10,0.55)';ctx.font='8px Inter, sans-serif';ctx.textAlign='center';
          ctx.fillText(p.label,x,y>pad.t+30?y-10:y+16);
        }
      });
      const last=s.points[s.points.length-1];
      const lx=pad.l+dateToX(last.date)*cw;
      const ly=pad.t+ch-(Math.min(last.y*grown,last.y)/maxY)*ch;
      if(grown>0.8){
        ctx.fillStyle=s.color;ctx.font='bold 11px JetBrains Mono, monospace';ctx.textAlign='left';
        const labelTxt = '$'+Math.round(last.y*grown)+'M';
        // Clamp label inside canvas, never cropped.
        const maxLabelX = W - ctx.measureText(labelTxt).width - 4;
        ctx.fillText(labelTxt, Math.min(lx+8, maxLabelX), ly+4);
      }
    });

    // Legend (top-left)
    const lx=pad.l+10;
    series.forEach((s,i)=>{
      const ly=pad.t+10+i*16;
      ctx.beginPath();ctx.arc(lx,ly,3,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
      ctx.fillStyle='rgba(10,10,10,0.65)';ctx.font='10px Inter, sans-serif';ctx.textAlign='left';
      ctx.fillText(s.name,lx+8,ly+4);
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
  });
})();

// --- EU Public AI Capex (Paris) ---
(function(){
  const _list_dbEuCapexCanvas = Array.from(document.querySelectorAll('[data-chart="eu-public-capex"]'));
  _list_dbEuCapexCanvas.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // State-committed public AI funding, in €B. Sorted descending.
  // `asp` = aspirational/private-pipeline pledge typically quoted alongside.
  const data = [
    { name: 'EU (InvestAI)',  state: 20.0, asp: 180, highlight: false, aspNote: 'mobilisation target €200B' },
    { name: 'Germany',        state:  5.0, asp: 0,   highlight: false, aspNote: '' },
    { name: 'France',         state:  2.5, asp: 107, highlight: true,  aspNote: 'private pipeline €109B' },
    { name: 'UK',             state:  2.4, asp: 0,   highlight: false, aspNote: '' },
    { name: 'Spain',          state:  2.1, asp: 0,   highlight: false, aspNote: '' },
    { name: 'Italy',          state:  1.0, asp: 0,   highlight: false, aspNote: '' },
    { name: 'Nordics',        state:  0.35,asp: 0,   highlight: false, aspNote: '' },
    { name: 'Netherlands',    state:  0.2, asp: 0,   highlight: false, aspNote: '' },
  ];
  const maxState = 22; // scale max — EU at 20€B is the largest committed
  const ACCENT = '#0077c8';
  const BAR = 'rgba(10,10,10,0.7)';

  let grown = reduceMotion ? 1 : 0;
  function draw(){
    const dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const W = canvas.width / dpr, H = canvas.height / dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 90, r: 18, t: 20, b: 10 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    grown = Math.min(grown + 0.025, 1);

    // Header label
    ctx.fillStyle = 'rgba(10,10,10,0.42)';
    ctx.font = '8.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PUBLIC AI COMMITMENT — €B (STATE)', pad.l, 11);

    const rowH = ch / data.length;
    const barH = Math.min(18, rowH * 0.55);

    // Faint vertical gridlines at 5, 10, 15, 20
    ctx.strokeStyle = 'rgba(10,10,10,0.06)';
    ctx.lineWidth = 0.5;
    [5, 10, 15, 20].forEach(v => {
      const x = pad.l + (v / maxState) * cw;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ch);
      ctx.stroke();
      ctx.fillStyle = 'rgba(10,10,10,0.30)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('€' + v, x, pad.t + ch + 8);
    });

    data.forEach((d, i) => {
      const y = pad.t + i * rowH;
      const cy = y + rowH / 2;
      const by = cy - barH / 2;

      // Country label (left)
      ctx.fillStyle = d.highlight ? ACCENT : 'rgba(10,10,10,0.78)';
      ctx.font = d.highlight ? 'bold 10.5px Inter, sans-serif' : '10.5px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(d.name, pad.l - 8, cy + 3.5);

      // Solid state bar
      const stateW = (d.state / maxState) * cw * grown;
      ctx.fillStyle = d.highlight ? ACCENT : BAR;
      ctx.fillRect(pad.l, by, stateW, barH);

      // Aspirational hashed extension, capped at the chart edge
      if (d.asp > 0 && grown > 0.4) {
        const aspAvail = cw - stateW;
        const aspW = Math.min((d.asp / maxState) * cw, aspAvail) * Math.min((grown - 0.4) / 0.6, 1);
        if (aspW > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(pad.l + stateW, by, aspW, barH);
          ctx.clip();
          // Diagonal hatch pattern
          ctx.strokeStyle = d.highlight ? 'rgba(0,119,200,0.35)' : 'rgba(10,10,10,0.28)';
          ctx.lineWidth = 1;
          for (let x = -barH; x < aspW + barH; x += 5) {
            ctx.beginPath();
            ctx.moveTo(pad.l + stateW + x, by + barH);
            ctx.lineTo(pad.l + stateW + x + barH, by);
            ctx.stroke();
          }
          ctx.restore();
          // Trailing edge fade to indicate truncation
          if ((d.asp / maxState) * cw > aspAvail) {
            const grad = ctx.createLinearGradient(pad.l + cw - 20, 0, pad.l + cw, 0);
            grad.addColorStop(0, 'rgba(248,246,241,0)');
            grad.addColorStop(1, 'rgba(248,246,241,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(pad.l + cw - 20, by, 20, barH);
          }
        }
      }

      // State value label (right of solid bar)
      if (grown > 0.5) {
        ctx.fillStyle = d.highlight ? ACCENT : 'rgba(10,10,10,0.68)';
        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        const labelX = Math.min(pad.l + stateW + 5, pad.l + cw - 38);
        const val = d.state >= 1 ? d.state.toFixed(1) : d.state.toFixed(2);
        ctx.fillText('€' + val + 'B', labelX, cy + 3.5);
      }

      // Aspirational note above the bar
      if (d.asp > 0 && grown > 0.85) {
        ctx.fillStyle = d.highlight ? 'rgba(0,119,200,0.7)' : 'rgba(10,10,10,0.45)';
        ctx.font = 'italic 8px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('+ ' + d.aspNote, pad.l + cw - 2, by - 2);
      }
    });

    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
  });
})();

// --- Export Controls Timeline (White House) ---
(function(){
  const _list_dbExportControlsCanvas = Array.from(document.querySelectorAll('[data-chart="export-controls"]'));
  _list_dbExportControlsCanvas.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // status: 'force' (red/green dot), 'rescinded' (gray), 'reversed' (orange), 'suspended' (orange)
  const events = [
    { date: 'Oct \'22', label: 'BIS Oct 7 rule (advanced computing ICs to PRC)', status: 'force',     pill: 'in force' },
    { date: 'Oct \'23', label: 'Performance-density + HBM update; 40+ country FDPR',       status: 'force',     pill: 'in force' },
    { date: 'Dec \'24', label: 'HBM controls (3A090.c); 140 entities listed',              status: 'force',     pill: 'in force' },
    { date: 'Jan \'25', label: 'AI Diffusion Rule — 3-tier countries + model weights',     status: 'rescinded', pill: 'rescinded' },
    { date: 'Apr \'25', label: 'H20 / MI308 license requirement',                          status: 'reversed',  pill: 'reversed' },
    { date: 'May \'25', label: 'Diffusion Rule rescinded',                                  status: 'force',     pill: 'in force' },
    { date: 'Jul \'25', label: 'H20 shipments to China resume',                             status: 'force',     pill: 'in force' },
    { date: 'Sep \'25', label: '50% Affiliates Rule',                                       status: 'suspended', pill: 'suspended' },
    { date: 'Jan \'26', label: 'H200 / MI325X case-by-case licensing',                      status: 'force',     pill: 'in force' },
    { date: 'Jan \'26', label: '25% Section 232 semiconductor tariff',                      status: 'force',     pill: 'in force' },
  ];

  const colors = {
    force:     '#0a7d3d',
    rescinded: 'rgba(10,10,10,0.40)',
    reversed:  '#c96a2b',
    suspended: '#c96a2b',
  };

  let grown = reduceMotion ? 1 : 0;
  function draw(){
    const dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const W = canvas.width / dpr, H = canvas.height / dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 8, r: 10, t: 22, b: 8 };
    const dateColW = 48;
    const pillW = 64;

    grown = Math.min(grown + 0.025, 1);

    // Header
    ctx.fillStyle = 'rgba(10,10,10,0.42)';
    ctx.font = '8.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('US AI EXPORT-CONTROL ACTIONS (2022–2026)', pad.l, 12);

    const usableH = H - pad.t - pad.b;
    const rowH = Math.min(24, usableH / events.length);
    const labelX = pad.l + dateColW + 14;
    const labelMaxW = W - labelX - pillW - 12 - pad.r;

    // Vertical timeline rail
    const railX = pad.l + dateColW + 4;
    ctx.strokeStyle = 'rgba(10,10,10,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(railX, pad.t);
    ctx.lineTo(railX, pad.t + rowH * events.length);
    ctx.stroke();

    const drawTo = Math.max(1, Math.floor(events.length * grown));
    events.forEach((e, i) => {
      if (i >= drawTo) return;
      const y = pad.t + i * rowH;
      const cy = y + rowH / 2;

      // Date
      ctx.fillStyle = 'rgba(10,10,10,0.6)';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(e.date, pad.l, cy + 3);

      // Marker dot
      ctx.beginPath();
      ctx.arc(railX, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[e.status] || '#1e293b';
      ctx.fill();

      // Label
      ctx.fillStyle = e.status === 'rescinded' ? 'rgba(10,10,10,0.5)' : 'rgba(10,10,10,0.85)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      // Truncate label if too long
      let label = e.label;
      while (ctx.measureText(label).width > labelMaxW && label.length > 4) {
        label = label.slice(0, -2);
      }
      if (label !== e.label) label = label.slice(0, -1) + '…';
      ctx.fillText(label, labelX, cy + 3);

      // Status pill
      const pillX = W - pad.r - pillW;
      const pillY = cy - 7;
      ctx.fillStyle = colors[e.status] || '#1e293b';
      ctx.globalAlpha = 0.18;
      ctx.fillRect(pillX, pillY, pillW, 14);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors[e.status] || '#1e293b';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(pillX + 0.5, pillY + 0.5, pillW - 1, 13);
      ctx.fillStyle = colors[e.status] || '#1e293b';
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.pill.toUpperCase(), pillX + pillW / 2, cy + 3);

      // Strike-through for rescinded
      if (e.status === 'rescinded') {
        ctx.strokeStyle = 'rgba(10,10,10,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelX, cy);
        ctx.lineTo(labelX + Math.min(labelMaxW, ctx.measureText(label).width), cy);
        ctx.stroke();
      }
    });

    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
  });
})();

// --- Talent Brain Drain Timeline (Dublin Jan) ---
(function(){
  const _list_dbTalentTimelineCanvas = Array.from(document.querySelectorAll('[data-chart="talent-timeline"]'));
  _list_dbTalentTimelineCanvas.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  // (pane visibility check removed; charts always render inline)
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width, cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Quarterly trend, interpolated between MacroPolo (2022 anchor) and Atomico
  // (2023-24 anchors). 2019 baseline is the upper reference line.
  const baseline2019 = 50;     // % of EU-trained AI researchers working in EU
  const anchor2022 = 43;       // MacroPolo 3.0
  const points = [
    { q: 'Q4 24', v: 43.0, anchor: 'MacroPolo 3.0 (NeurIPS 2022 sample)' },
    { q: 'Q1 25', v: 42.4 },
    { q: 'Q2 25', v: 41.7 },
    { q: 'Q3 25', v: 41.1, anchor: 'Atomico SoET 2025: net tech inflow 26k (was 52k)' },
    { q: 'Q4 25', v: 40.5 },
    { q: 'Q1 26', v: 40.0, anchor: 'Euronews: brain drain accelerating' },
  ];
  const yMin = 36, yMax = 52;

  let grown = reduceMotion ? 1 : 0;
  function draw(){
    const dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const W = canvas.width / dpr, H = canvas.height / dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 38, r: 16, t: 22, b: 26 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    grown = Math.min(grown + 0.018, 1);

    // Header
    ctx.fillStyle = 'rgba(10,10,10,0.42)';
    ctx.font = '8.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('% OF EU-TRAINED AI RESEARCHERS WORKING IN EU', pad.l, 12);

    // Y gridlines + labels
    ctx.strokeStyle = 'rgba(10,10,10,0.07)';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = 'rgba(10,10,10,0.4)';
    ctx.font = '8.5px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    [40, 45, 50].forEach(v => {
      const y = pad.t + ch - ((v - yMin) / (yMax - yMin)) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + cw, y);
      ctx.stroke();
      ctx.fillText(v + '%', pad.l - 5, y + 3);
    });

    // 2019 baseline reference (dashed)
    const baseY = pad.t + ch - ((baseline2019 - yMin) / (yMax - yMin)) * ch;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(10,125,61,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, baseY);
    ctx.lineTo(pad.l + cw, baseY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(10,125,61,0.7)';
    ctx.font = 'italic 8.5px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('2019 baseline', pad.l + 4, baseY - 4);

    // Plot points & line
    const stepX = cw / (points.length - 1);
    const xy = points.map((p, i) => {
      const x = pad.l + i * stepX;
      const y = pad.t + ch - ((p.v - yMin) / (yMax - yMin)) * ch;
      return { x, y, p };
    });
    // Area under curve (subtle red wash)
    const drawTo = Math.max(1, Math.floor(xy.length * grown));
    ctx.beginPath();
    ctx.moveTo(xy[0].x, pad.t + ch);
    for (let i = 0; i < drawTo; i++) ctx.lineTo(xy[i].x, xy[i].y);
    ctx.lineTo(xy[drawTo - 1].x, pad.t + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grad.addColorStop(0, 'rgba(184,0,46,0.18)');
    grad.addColorStop(1, 'rgba(184,0,46,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < drawTo; i++) {
      if (i === 0) ctx.moveTo(xy[i].x, xy[i].y);
      else ctx.lineTo(xy[i].x, xy[i].y);
    }
    ctx.strokeStyle = '#b8002e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points + x labels + anchor callouts
    xy.forEach((pt, i) => {
      if (i >= drawTo) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#b8002e';
      ctx.fill();

      // X-axis quarter label
      ctx.fillStyle = 'rgba(10,10,10,0.5)';
      ctx.font = '8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pt.p.q, pt.x, pad.t + ch + 14);

      // Value label only on first, last, and anchor points
      const isAnchor = !!pt.p.anchor;
      const isEndpoint = i === 0 || i === xy.length - 1;
      if ((isAnchor || isEndpoint) && grown > 0.75) {
        ctx.fillStyle = '#b8002e';
        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pt.p.v.toFixed(1) + '%', pt.x, pt.y - 8);
      }
    });

    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
  });
})();

// ============================================================
// LIVE DATA PANEL — swaps the visible chart pane based on the active chapter
// ============================================================
(function(){
  const panel = document.getElementById('liveDataPanel');
  const titleEl = document.getElementById('liveDataTitle');
  if (!panel) return;
  const panes = Array.from(panel.querySelectorAll('.live-data-pane'));
  if (!panes.length) return;

  // Copy the static compute-map HTML from the supporting-data section into
  // the matching sticky panel slot so it renders in both places without
  // duplicating markup in index.html.
  const sourceCompute = document.querySelector('.viz-card .compute-stats');
  const mirrorCompute = document.querySelector('.live-data-pane[data-viz="compute-map"]');
  if (sourceCompute && mirrorCompute) {
    mirrorCompute.innerHTML = '';
    mirrorCompute.appendChild(sourceCompute.cloneNode(true));
  }

  function activate(vizId) {
    let title = '';
    panes.forEach(p => {
      const on = p.dataset.viz === vizId;
      p.classList.toggle('is-active', on);
      if (on) title = p.dataset.title || '';
    });
    if (titleEl) titleEl.textContent = title || '—';
  }

  // Default to the first chart visible.
  const firstScene = document.querySelector('.scene[data-viz]');
  if (firstScene) activate(firstScene.dataset.viz);

  const scenes = Array.from(document.querySelectorAll('.scene[data-viz]'));
  if (!scenes.length || !('IntersectionObserver' in window)) return;
  const visible = new Map();
  let currentViz = null;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) visible.set(e.target, true);
      else visible.delete(e.target);
    });
    let best = null, bestY = Infinity;
    visible.forEach((_, el) => {
      const t = el.getBoundingClientRect().top;
      if (t < bestY && t < window.innerHeight / 2) { bestY = t; best = el; }
    });
    if (best && best.dataset.viz !== currentViz) {
      currentViz = best.dataset.viz;
      activate(currentViz);
      // Dispatch a resize so the now-visible canvas redraws at the panel size.
      window.dispatchEvent(new Event('resize'));
    }
  }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.75] });
  scenes.forEach(s => io.observe(s));
})();

