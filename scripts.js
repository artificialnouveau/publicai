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
        <div class="design-section-kicker">Member states</div>
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
// COUNTRY MAP — orthographic globe; spins to the chapter's country on scroll
// ============================================================
(function(){
  const root = document.getElementById('countryMap');
  const group = document.getElementById('countryMapGroup');
  if (!root || !group) return;

  const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  const R = 78;          // globe radius in viewport units
  const CX = 100, CY = 100;
  const DEG = Math.PI / 180;

  // Current view (defaults to a sensible Europe-leaning Atlantic view).
  let viewLng = 0;
  let viewLat = 35;

  // Decode TopoJSON arcs to lng/lat using the transform.
  function decodeTopojson(topology) {
    const { scale, translate } = topology.transform;
    return topology.arcs.map(arc => {
      let x = 0, y = 0;
      return arc.map(([dx, dy]) => {
        x += dx; y += dy;
        return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
      });
    });
  }

  // Orthographic projection of (lng, lat) given the current view (lng0, lat0).
  // Returns [x, y, visible].
  function project(lng, lat) {
    const dl = (lng - viewLng) * DEG;
    const phi = lat * DEG;
    const phi0 = viewLat * DEG;
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
    const sinP0 = Math.sin(phi0), cosP0 = Math.cos(phi0);
    const cosDl = Math.cos(dl), sinDl = Math.sin(dl);
    const cosC = sinP0 * sinPhi + cosP0 * cosPhi * cosDl;
    const x = cosPhi * sinDl;
    const y = cosP0 * sinPhi - sinP0 * cosPhi * cosDl;
    return [CX + x * R, CY - y * R, cosC > 0];
  }

  // City coordinates per scene id. Used to drop a pulsing dot for the
  // currently-active chapter and to set the rotation target.
  const CITY_COORDS = {
    'scene-dublin-apr':  [-6.27, 53.35],
    'scene-berlin':      [13.40, 52.52],
    'scene-brussels':    [4.35, 50.85],
    'scene-tokyo':       [139.69, 35.69],
    'scene-stockholm':   [18.07, 59.33],
    'scene-monroe':      [-92.11, 32.51],
    'scene-ottawa':      [-75.69, 45.42],
    'scene-paris':       [2.35, 48.86],
    'scene-dublin-jan':  [-6.27, 53.35],
    'scene-whitehouse':  [-77.04, 38.90],
  };

  // --- Coalition trail: a curved, dotted line that hops from each chapter's
  // capital to the next (Dublin -> Berlin -> Brussels -> ...). The newest hop
  // is brightest; every older hop fades a step further back. ---
  const arcsGroup = document.getElementById('cmArcs');
  const NS_SVG = 'http://www.w3.org/2000/svg';
  // Scenes with coordinates, in chapter (DOM) order.
  let arcSequence = [];
  // One arc record per consecutive pair; arc i links seq[i] -> seq[i+1].
  let arcList = [];
  // How many hops have been revealed so far (monotonic as you scroll down).
  let revealedCount = 0;
  // Visual fade applied per hop age.
  const FADE_TOP = 0.95, FADE_DECAY = 0.62, FADE_FLOOR = 0.18;

  // Spherical-linear interpolation between two [lng, lat] points; returns a
  // list of [lng, lat] samples tracing the great circle between them.
  function greatCircle(a, b, n) {
    function toVec(p) {
      const l = p[0] * DEG, ph = p[1] * DEG;
      return [Math.cos(ph) * Math.cos(l), Math.cos(ph) * Math.sin(l), Math.sin(ph)];
    }
    const va = toVec(a), vb = toVec(b);
    let dot = va[0]*vb[0] + va[1]*vb[1] + va[2]*vb[2];
    dot = Math.max(-1, Math.min(1, dot));
    const om = Math.acos(dot);
    const pts = [];
    if (om < 1e-6) return [a.slice(), b.slice()];
    const sinOm = Math.sin(om);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s1 = Math.sin((1 - t) * om) / sinOm;
      const s2 = Math.sin(t * om) / sinOm;
      const x = s1*va[0] + s2*vb[0], y = s1*va[1] + s2*vb[1], z = s1*va[2] + s2*vb[2];
      pts.push([Math.atan2(y, x) / DEG, Math.asin(Math.max(-1, Math.min(1, z))) / DEG]);
    }
    return pts;
  }

  // Project the first `frac` (0..1) of an arc, breaking the path wherever it
  // crosses to the hidden hemisphere.
  function arcPath(points, frac) {
    const count = Math.max(2, Math.ceil(frac * (points.length - 1)) + 1);
    let d = '', inSub = false;
    for (let i = 0; i < count; i++) {
      const [x, y, vis] = project(points[i][0], points[i][1]);
      if (vis) { d += (inSub ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); inSub = true; }
      else inSub = false;
    }
    return d;
  }

  // Redraw every revealed hop against the current view.
  function drawArcs() {
    arcList.forEach(arc => {
      arc.el.setAttribute('d', arc.revealed ? arcPath(arc.points, arc.progress) : '');
    });
  }

  // Re-apply the trailing fade: newest revealed hop brightest, older dimmer.
  function refreshArcFade() {
    const newest = revealedCount - 1;
    arcList.forEach((arc, i) => {
      if (!arc.revealed) { arc.el.style.opacity = '0'; return; }
      const age = newest - i;
      arc.el.style.opacity = Math.max(FADE_FLOOR, FADE_TOP * Math.pow(FADE_DECAY, age)).toFixed(3);
    });
  }

  // Animate any hops still growing in.
  let arcRaf = false;
  function arcTick(ts) {
    let active = false;
    arcList.forEach(arc => {
      if (arc.revealed && arc.progress < 1) {
        if (!arc.start) arc.start = ts;
        arc.progress = Math.min((ts - arc.start) / 1100, 1);
        active = true;
      }
    });
    drawArcs();
    if (active) requestAnimationFrame(arcTick);
    else arcRaf = false;
  }
  function ensureArcRaf() {
    if (!arcRaf) { arcRaf = true; requestAnimationFrame(arcTick); }
  }

  // Build one dotted hop per consecutive pair of capitals (all hidden at first).
  function buildArcs() {
    if (!arcsGroup) return;
    arcSequence = Array.from(document.querySelectorAll('.scene[data-country-id]'))
      .filter(s => CITY_COORDS[s.id]);
    arcList = [];
    for (let i = 1; i < arcSequence.length; i++) {
      const from = CITY_COORDS[arcSequence[i - 1].id];
      const to = CITY_COORDS[arcSequence[i].id];
      const el = document.createElementNS(NS_SVG, 'path');
      el.setAttribute('class', 'cm-arc');
      el.style.opacity = '0';
      arcsGroup.appendChild(el);
      arcList.push({ points: greatCircle(from, to, 48), el, revealed: false, progress: 0, start: 0 });
    }
  }

  // Reveal hops up to (and including) the link into the chapter at seqIndex.
  function revealTrailTo(seqIndex) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let changed = false;
    for (let i = 0; i < seqIndex; i++) {
      if (!arcList[i].revealed) {
        arcList[i].revealed = true;
        arcList[i].progress = reduce ? 1 : 0;
        arcList[i].start = 0;
        changed = true;
      }
    }
    if (seqIndex > revealedCount) revealedCount = seqIndex;
    refreshArcFade();
    if (changed) { if (reduce) drawArcs(); else ensureArcRaf(); }
  }

  let dotEl = null;
  let countryData = [];

  // Expand a country geometry into a list of rings, where each ring is a
  // list of [lng, lat] points.
  function expandRings(geom, arcs) {
    function decodeArc(idx) {
      const reverse = idx < 0;
      const a = reverse ? ~idx : idx;
      const pts = arcs[a].slice();
      return reverse ? pts.reverse() : pts;
    }
    function toAbsolute(arcRefs) {
      const ring = [];
      arcRefs.forEach((idx, i) => {
        const pts = decodeArc(idx);
        if (i === 0) ring.push(...pts);
        else ring.push(...pts.slice(1));
      });
      return ring;
    }
    if (geom.type === 'Polygon') return geom.arcs.map(toAbsolute);
    if (geom.type === 'MultiPolygon') return geom.arcs.flatMap(p => p.map(toAbsolute));
    return [];
  }

  // Cheap centroid: average lng/lat of first ring (used for back-side culling).
  function approxCentroid(rings) {
    if (!rings.length) return [0, 0];
    const r = rings[0];
    let lx = 0, ly = 0;
    r.forEach(([a,b]) => { lx += a; ly += b; });
    return [lx / r.length, ly / r.length];
  }

  // Project one ring with visibility-aware path breaks. Returns a path
  // fragment (zero or more subpaths, each closed with Z) for the visible
  // portion of the ring.
  function projectRing(ring) {
    let d = '';
    let inSub = false;
    for (let i = 0; i < ring.length; i++) {
      const [x, y, vis] = project(ring[i][0], ring[i][1]);
      if (vis) {
        d += (inSub ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        inSub = true;
      } else if (inSub) {
        d += 'Z';
        inSub = false;
      }
    }
    if (inSub) d += 'Z';
    return d;
  }

  function redraw() {
    countryData.forEach(c => {
      // Back-side culling: skip countries whose centroid isn't on the visible
      // hemisphere. Cheap test that avoids weirdly mirrored geometry.
      const [clng, clat] = c.centroid;
      const dl = (clng - viewLng) * DEG;
      const cosC = Math.sin(viewLat * DEG) * Math.sin(clat * DEG)
                 + Math.cos(viewLat * DEG) * Math.cos(clat * DEG) * Math.cos(dl);
      if (cosC < -0.15) { c.el.setAttribute('d', ''); return; }
      let d = '';
      c.rings.forEach(r => { d += projectRing(r); });
      c.el.setAttribute('d', d);
    });
    if (dotEl && dotEl._sceneEl) positionDotNow(dotEl._sceneEl);
    drawArcs();
  }

  // Tween rotation from (viewLng, viewLat) to (targetLng, targetLat).
  let tweenStart = 0, tweenDur = 900;
  let fromLng = 0, fromLat = 0, toLng = 0, toLat = 0;
  let animating = false;
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function tick(ts) {
    if (!tweenStart) tweenStart = ts;
    const t = Math.min((ts - tweenStart) / tweenDur, 1);
    const e = easeInOut(t);
    viewLng = fromLng + (toLng - fromLng) * e;
    viewLat = fromLat + (toLat - fromLat) * e;
    redraw();
    if (t < 1) requestAnimationFrame(tick);
    else { animating = false; tweenStart = 0; }
  }
  function spinTo(lng, lat) {
    // Shortest-path longitude tween: wrap so the diff is in [-180, 180].
    let d = lng - viewLng;
    while (d > 180)  d -= 360;
    while (d < -180) d += 360;
    fromLng = viewLng; fromLat = viewLat;
    toLng = viewLng + d; toLat = lat;
    tweenStart = 0;
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  }

  function positionDotNow(sceneEl) {
    if (!dotEl || !sceneEl) return;
    const coords = CITY_COORDS[sceneEl.id];
    if (!coords) { dotEl.classList.remove('is-visible'); dotEl.classList.add('is-hidden'); return; }
    const [x, y, vis] = project(coords[0], coords[1]);
    dotEl.setAttribute('cx', x.toFixed(2));
    dotEl.setAttribute('cy', y.toFixed(2));
    if (vis) {
      dotEl.classList.remove('is-hidden');
      dotEl.classList.add('is-visible');
    } else {
      dotEl.classList.add('is-hidden');
      dotEl.classList.remove('is-visible');
    }
  }

  fetch(ATLAS_URL)
    .then(r => r.json())
    .then(topology => {
      const arcs = decodeTopojson(topology);
      const NS = 'http://www.w3.org/2000/svg';
      countryData = topology.objects.countries.geometries.map(g => {
        const rings = expandRings(g, arcs);
        const el = document.createElementNS(NS, 'path');
        el.setAttribute('class', 'cm-country');
        el.setAttribute('data-id', String(g.id));
        group.appendChild(el);
        return { id: String(g.id), rings, centroid: approxCentroid(rings), el };
      });
      const svg = group.ownerSVGElement;
      dotEl = document.createElementNS(NS, 'circle');
      dotEl.setAttribute('class', 'cm-dot is-hidden');
      dotEl.setAttribute('r', '2.8');
      dotEl.setAttribute('cx', '0');
      dotEl.setAttribute('cy', '0');
      svg.appendChild(dotEl);
      buildArcs();
      redraw();
      setupHighlighter();
    })
    .catch(err => { console.warn('Country map failed to load', err); });

  function setupHighlighter() {
    const scenes = Array.from(document.querySelectorAll('.scene[data-country-id]'));
    if (!scenes.length || !('IntersectionObserver' in window)) return;
    let active = null;
    function setActive(sceneEl) {
      const id = sceneEl ? sceneEl.dataset.countryId : null;
      group.querySelectorAll('.cm-country.is-active').forEach(p => p.classList.remove('is-active'));
      if (!sceneEl || !id) {
        if (dotEl) {
          dotEl.classList.add('is-hidden');
          dotEl.classList.remove('is-visible');
          dotEl._sceneEl = null;
        }
        active = null;
        return;
      }
      const path = group.querySelector('.cm-country[data-id="' + id + '"]');
      if (path) path.classList.add('is-active');
      if (dotEl) dotEl._sceneEl = sceneEl;
      active = id;
      const coords = CITY_COORDS[sceneEl.id];
      // Extend the dotted coalition trail to this chapter, then spin to it.
      const seqIndex = arcSequence.indexOf(sceneEl);
      if (seqIndex > 0) revealTrailTo(seqIndex);
      if (coords) spinTo(coords[0], coords[1]);
    }
    const visible = new Map();
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
      setActive(best);
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.75] });
    scenes.forEach(s => io.observe(s));
  }
})();

// --- viz-info overlay: close on outside click or Escape ---
(function(){
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.viz-info[open]').forEach(d => {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('details.viz-info[open]').forEach(d => d.removeAttribute('open'));
  });
})();

// --- Live-data grid: keep one headline figure on each chart card and move the
// full figure set into that card's "i" overlay, so all eight charts can sit
// together beside the coalition designer without crowding. ---
(function(){
  document.querySelectorAll('.supporting-data-grid .viz-card').forEach(card => {
    const footer = card.querySelector('.viz-footer');
    if (!footer) return;
    const body = card.querySelector('.viz-info-body');
    if (body && footer.querySelector('.viz-mini-stat')) {
      const full = footer.cloneNode(true);
      full.classList.remove('viz-footer');
      full.classList.add('viz-figures');
      const h = document.createElement('h4');
      h.textContent = 'Key figures';
      body.appendChild(h);
      body.appendChild(full);
    }
    footer.classList.remove('viz-footer');
    footer.classList.add('viz-headline');
  });
})();

// --- Minimal charts: quiet draw/grow animation when a card scrolls into view ---
(function(){
  const cards = Array.from(document.querySelectorAll('.supporting-data-grid .viz-card'))
    .filter(c => c.querySelector('.mn-chart'));
  if (!cards.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    cards.forEach(c => c.classList.add('mn-anim', 'is-in'));
    return;
  }
  cards.forEach(c => c.classList.add('mn-anim'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  cards.forEach(c => io.observe(c));
})();

// --- Footnote chart previews: tap/hover a marker or data link to see its chart
//     in a floating popover (a clone of the chart from the live-data panel). ---
(function(){
  const pop = document.createElement('div');
  pop.className = 'viz-pop';
  pop.setAttribute('role', 'dialog');
  document.body.appendChild(pop);
  let openFor = null, hideTimer = null;

  function targetId(el){
    return el.dataset.vizPop || (el.getAttribute('href') || '').replace('#','');
  }
  function fill(id){
    const card = document.getElementById(id);
    if (!card) return false;
    const name = card.querySelector('.viz-name');
    const chart = card.querySelector('.viz-canvas-wrap') || card.querySelector('svg');
    if (!chart) return false;
    pop.innerHTML = '';
    if (name){ const t=document.createElement('div'); t.className='viz-pop-title'; t.textContent=name.textContent; pop.appendChild(t); }
    pop.appendChild(chart.cloneNode(true));
    return true;
  }
  function place(trigger){
    const r = trigger.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let left = r.left + r.width/2 - pr.width/2;
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    let top = r.top - pr.height - 10;            // prefer above
    if (top < 8) top = r.bottom + 10;            // else below
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function show(trigger){
    clearTimeout(hideTimer);
    const id = targetId(trigger);
    if (!fill(id)) return;
    openFor = trigger;
    pop.classList.add('is-open');
    // measure then place (two rAFs so layout settles)
    requestAnimationFrame(()=>{ place(trigger); requestAnimationFrame(()=>place(trigger)); });
  }
  function hide(){ pop.classList.remove('is-open'); openFor = null; }
  function hideSoon(){ hideTimer = setTimeout(hide, 180); }

  const triggers = document.querySelectorAll('.story-fn, .scene-data-link');
  triggers.forEach(t => {
    t.addEventListener('mouseenter', () => show(t));
    t.addEventListener('mouseleave', hideSoon);
    t.addEventListener('focus', () => show(t));
    t.addEventListener('blur', hideSoon);
    // tap: toggle, and don't jump for inline markers
    t.addEventListener('click', (e) => {
      if (t.classList.contains('story-fn')) e.preventDefault();
      if (openFor === t) hide(); else show(t);
    });
  });
  pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  pop.addEventListener('mouseleave', hideSoon);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hide(); });
  window.addEventListener('scroll', hide, { passive:true });
  document.addEventListener('click', (e)=>{ if(openFor && !pop.contains(e.target) && !openFor.contains(e.target) && e.target!==openFor) hide(); });
})();
