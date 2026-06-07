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
    // Broadcast the live coalition so the data charts can recompute from the
    // member set the visitor is assembling (member-state-linked "scrubbing").
    window.__coalition = { members: shape.members, labs: shape.labs, scope: shape.scope };
    window.dispatchEvent(new CustomEvent('coalition:change'));

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
    // Broadcast a coalition without persisting it (used for hover preview).
    function broadcastPreview(){
      const sh = deriveShape();
      window.__coalition = { members: sh.members, labs: sh.labs, scope: sh.scope };
      window.dispatchEvent(new CustomEvent('coalition:change'));
    }

    root.querySelectorAll('.design-pick-option').forEach(btn => {
      btn.addEventListener('click', () => {
        simState[btn.dataset.scene] = btn.dataset.pick;
        saveState();
        renderCoalitionDesign();
      });
      // Hover preview: scrub the charts to this option, then snap back on leave.
      btn.addEventListener('mouseenter', () => {
        const saved = simState[btn.dataset.scene];
        simState[btn.dataset.scene] = btn.dataset.pick;
        broadcastPreview();
        simState[btn.dataset.scene] = saved;
      });
      btn.addEventListener('mouseleave', broadcastPreview);
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

// --- Resize the decisions / live-data split (50-50 default; minimize/maximize) ---
(function(){
  const split = document.getElementById('outcomeSplit');
  const btns = document.querySelectorAll('.split-btn');
  if (!split || !btns.length) return;
  btns.forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.split;
    split.classList.remove('split-data', 'split-design');
    if (mode === 'data') split.classList.add('split-data');
    else if (mode === 'design') split.classList.add('split-design');
    btns.forEach(x => x.classList.toggle('is-active', x === b));
  }));
})();

// --- Capital Flow Sankey (restored) ---
(function(){
  const canvas = document.getElementById('dbCapitalFlowCanvas');
  if (!canvas) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
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
  const colA=[{label:'France / Germany',x:0.07,y:0.18,col:'#0057FF'},{label:'Nordics / UK',x:0.07,y:0.40,col:'#0057FF'},{label:'Southern EU',x:0.07,y:0.62,col:'#0057FF'},{label:'Eastern EU',x:0.07,y:0.82,col:'#0057FF'}];
  const colB=[{label:'Relocate to US (57%)',x:0.50,y:0.15,col:'#b8002e'},{label:'Stay in EU (28%)',x:0.50,y:0.40,col:'#4a4a4a'},{label:'UK / Switzerland',x:0.50,y:0.62,col:'#8e8e8e'},{label:'Other (15%)',x:0.50,y:0.82,col:'#7a7a7a'}];
  const colC=[{label:'$109B US AI ecosystem',x:0.93,y:0.22,col:'#b8002e'},{label:'$14B EU AI ecosystem',x:0.93,y:0.52,col:'#0057FF'},{label:'Diluted / lost',x:0.93,y:0.80,col:'#666666'}];
  const allNodes=[colA,colB,colC];
  const colHeaders=[{label:'EU FUNDING SOURCES',x:0.07},{label:'WHERE FOUNDERS GO',x:0.50},{label:'ECONOMIC RESULT',x:0.93}];
  const flows=[{from:[0,0],to:[1,0],w:0.22},{from:[0,1],to:[1,0],w:0.18},{from:[0,1],to:[1,1],w:0.12},{from:[0,2],to:[1,1],w:0.10},{from:[0,2],to:[1,2],w:0.08},{from:[0,3],to:[1,2],w:0.05},{from:[0,3],to:[1,3],w:0.06},{from:[1,0],to:[2,0],w:0.30},{from:[1,1],to:[2,1],w:0.15},{from:[1,2],to:[2,1],w:0.08},{from:[1,3],to:[2,2],w:0.06}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,t){const t2=1-t;return t2*t2*t2*a+3*t2*t2*t*b+3*t2*t*t*c+t*t*t*d;}
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    const fs=Math.max(8, Math.min(11, W*0.024));
    const lfs=Math.max(11, Math.min(14, W*0.03));
    ctx.font=fs+'px JetBrains Mono, monospace';ctx.fillStyle='rgba(10,10,10,0.45)';
    // Edge headers anchored to the canvas edges so they never clip.
    ctx.textAlign='left';   ctx.fillText(colHeaders[0].label, 2, 12);
    ctx.textAlign='center'; ctx.fillText(colHeaders[1].label, 0.5*W, 12);
    ctx.textAlign='right';  ctx.fillText(colHeaders[2].label, W-2, 12);
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
      ctx.fillStyle='rgba(10,10,10,0.8)';ctx.font=lfs+'px Inter, sans-serif';
      ctx.textAlign=ci===0?'left':ci===2?'right':'center';
      const labelX=ci===0?n.x*W+12:ci===2?n.x*W-12:n.x*W;
      ctx.fillText(n.label,labelX,n.y*H-10);
    });});
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
})();

// --- Talent Migration flow (restored) ---
(function(){
  const canvas=document.getElementById('dbTalentChordCanvas');
  if(!canvas)return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx=canvas.getContext('2d');
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
  const educated=[{label:'EU-West',y:0.14,col:'#0057FF',pct:'22%'},{label:'EU-East',y:0.28,col:'#0057FF',pct:'8%'},{label:'UK / CH',y:0.42,col:'#8e8e8e',pct:'12%'},{label:'China',y:0.56,col:'#6a6a6a',pct:'29%'},{label:'India',y:0.70,col:'#7a7a7a',pct:'11%'},{label:'US',y:0.84,col:'#4a4a4a',pct:'18%'}];
  const working=[{label:'Work in US',y:0.20,col:'#b8002e',pct:'~60%'},{label:'Work in EU',y:0.42,col:'#0057FF',pct:'~15%'},{label:'UK / CH',y:0.58,col:'#8e8e8e',pct:'~10%'},{label:'China',y:0.74,col:'#6a6a6a',pct:'~10%'},{label:'Elsewhere',y:0.88,col:'#7a7a7a',pct:'~5%'}];
  const flows=[{from:0,to:0,w:0.10},{from:0,to:1,w:0.08},{from:0,to:2,w:0.03},{from:1,to:0,w:0.03},{from:1,to:1,w:0.04},{from:2,to:0,w:0.05},{from:2,to:2,w:0.05},{from:3,to:0,w:0.14},{from:3,to:3,w:0.10},{from:3,to:1,w:0.03},{from:4,to:0,w:0.06},{from:4,to:2,w:0.02},{from:4,to:4,w:0.02},{from:5,to:0,w:0.14},{from:5,to:4,w:0.03}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,s){const s2=1-s;return s2*s2*s2*a+3*s2*s2*s*b+3*s2*s*s*c+s*s*s*d;}
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0,0,W,H);
    const insetPx = W < 380 ? 80 : 100;
    const LX = Math.max(0.18, insetPx / W);
    const RX = 1 - LX;
    const tfs=Math.max(9, Math.min(11, W*0.022));
    const lfs=Math.max(11, Math.min(14, W*0.027));
    const pfs=Math.max(10, Math.min(13, W*0.025));
    const dotR=Math.max(3, Math.min(5, W*0.012));
    ctx.font=tfs+'px JetBrains Mono, monospace';ctx.textAlign='center';ctx.fillStyle='rgba(10,10,10,0.45)';
    ctx.fillText('EDUCATED IN', LX*W, 10);
    ctx.fillText('NOW WORKING IN', RX*W, 10);
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
      ctx.textAlign='right';ctx.font=lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.7)';ctx.fillText(n.label,LX*W-14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,LX*W-14,n.y*H+18);
    });
    working.forEach(n=>{
      ctx.beginPath();ctx.arc(RX*W,n.y*H,dotR,0,Math.PI*2);ctx.fillStyle=n.col;ctx.fill();
      ctx.textAlign='left';ctx.font=lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.7)';ctx.fillText(n.label,RX*W+14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,RX*W+14,n.y*H+18);
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
})();

// --- Section -> chart connectors: hover a decision section to draw a dotted line
//     to its relevant live-data chart (and outline that chart). ---
(function(){
  const NS = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(NS, 'svg');
  overlay.setAttribute('class', 'link-overlay');
  const path = document.createElementNS(NS, 'path');
  const d1 = document.createElementNS(NS, 'circle'); d1.setAttribute('r', '4');
  const d2 = document.createElementNS(NS, 'circle'); d2.setAttribute('r', '4');
  overlay.appendChild(path); overlay.appendChild(d1); overlay.appendChild(d2);
  document.body.appendChild(overlay);

  // Map each decision section (by its title) to the chart that informs it.
  const MAP = {
    'Who joins': 'viz-ottawa',
    'Who anchors': 'viz-revenue',
    'How it’s held together': 'viz-export',
    'What the coalition covers': 'viz-defense',
    'How small the first version can be': 'viz-compute',
  };
  function targetIdFor(sec){
    const t = sec.querySelector('.design-section-title');
    if (!t) return null;
    return MAP[t.textContent.trim()] || null;
  }
  let active = null, target = null;
  function recompute(){
    if (!active || !target) return;
    const s = active.getBoundingClientRect();
    const c = target.getBoundingClientRect();
    const sx = s.right, sy = s.top + Math.min(s.height/2, 38);
    const cx = c.left, cy = c.top + Math.min(c.height/2, 60);
    const mx = (sx + cx) / 2;
    path.setAttribute('d', `M${sx},${sy} C ${mx},${sy} ${mx},${cy} ${cx},${cy}`);
    d1.setAttribute('cx', sx); d1.setAttribute('cy', sy);
    d2.setAttribute('cx', cx); d2.setAttribute('cy', cy);
  }
  function show(sec){
    const id = targetIdFor(sec); if (!id) return;
    const tgt = document.getElementById(id); if (!tgt) return;
    if (target && target !== tgt) target.classList.remove('viz-linked');
    active = sec; target = tgt;
    target.classList.add('viz-linked');
    recompute();
    overlay.classList.add('is-on');
  }
  function hide(){
    overlay.classList.remove('is-on');
    if (target) target.classList.remove('viz-linked');
    active = null; target = null;
  }
  // Tag sections that have a chart (for the cursor hint), once the designer renders.
  function tag(){
    document.querySelectorAll('.design-section').forEach(sec => {
      if (targetIdFor(sec)) sec.setAttribute('data-haschart', '');
    });
  }
  tag();
  // Delegated hover (designer is rendered by JS; delegation survives re-render).
  document.addEventListener('mouseover', (e) => {
    if (window.innerWidth < 1100) return;
    const sec = e.target.closest && e.target.closest('.design-section[data-haschart]');
    if (sec) { if (sec !== active) show(sec); }
    else if (active && !(e.target.closest && e.target.closest('.link-overlay'))) hide();
  });
  window.addEventListener('scroll', recompute, { passive: true });
  window.addEventListener('resize', recompute);
  // re-tag after a tick in case the designer renders slightly later
  setTimeout(tag, 600);
})();

// --- Count-up: headline numbers animate to their value as the chart scrolls
//     into view (the percentages / dollars "change" rather than just appearing). ---
(function(){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  function fmt(n, dec){ return dec > 0 ? n.toFixed(dec) : Math.round(n).toString(); }
  function animate(el){
    if (el.dataset.counted) return;
    const raw = el.textContent;
    const m = raw.trim().match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    el.dataset.counted = '1';
    const pre = m[1], numStr = m[2], suf = m[3];
    const end = parseFloat(numStr);
    const dec = (numStr.split('.')[1] || '').length;
    const dur = 1000; let start = null;
    function step(ts){
      if (!start) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + fmt(end * e, dec) + suf;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = raw;
    }
    el.textContent = pre + fmt(0, dec) + suf;
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.cu-fig, .ci-emph, .mn-figure').forEach(animate);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.45 });
  document.querySelectorAll('.supporting-data-grid .viz-card').forEach(c => io.observe(c));
})();

// ============================================================
// MEMBER-STATE-LINKED CHARTS: the live data recomputes from the
// coalition the visitor is assembling (the designer broadcasts
// `coalition:change` with window.__coalition.members). As states join,
// the charts "scrub" to that scenario instead of to a point in time.
// ============================================================
(function(){
  // Languages each member state brings to first-class representation
  // (frontier models already cover EN/FR/ES; members add their own).
  const BASE_STRONG  = ['EN','FR','ES'];
  const BASE_PARTIAL = ['DE','IT','NL','PT','PL','SV','DA','FI'];
  const MEMBER_LANGS = {
    FR:['FR'], DE:['DE'], ES:['ES'], SE:['SV','DA','FI'],
    CH:['IT','DE','FR'], CA:['FR'], GB:[], JP:[], KR:[], SG:[]
  };
  // Each member's contribution to pooled frontier compute, in exaFLOPS.
  const MEMBER_COMPUTE = {
    DE:1.0, ES:0.3, SE:0.5, CH:0.1, FR:0.2,
    CA:0.4, GB:0.5, JP:0.7, KR:0.3, SG:0.1
  };
  // 2024 private AI investment each member brings to the pool, in $B.
  const MEMBER_INVEST = {
    FR:3, DE:2, ES:0.6, SE:0.6, CH:0.8,
    GB:4.5, CA:2, JP:2, KR:1.5, SG:1
  };
  // State-committed public AI funds, in EUR B (the EU InvestAI fund joins once
  // any EU member is in). Bag country codes mirror the chart's data-cc tags.
  const MEMBER_CAPEX = {
    FR:2.5, DE:5, ES:2.1, SE:0.35, CH:0.5,
    GB:2.4, CA:1.4, JP:6, KR:1, SG:0.5
  };
  const EU_MEMBERS = ['FR','DE','ES','SE'];
  // Anchor labs tied to their home state, with ARR in $M.
  const MEMBER_LABS = {
    FR:{ name:'Mistral', arr:400 },
    CA:{ name:'Cohere',  arr:240 },
    DE:{ name:'DeepL',   arr:185 }
  };

  const $ = (sel) => document.querySelector(sel);
  function setText(sel, txt){ const el = $(sel); if (el) el.textContent = txt; }

  // Animate a mini-stat value (e.g. "~2 EF") toward a new number.
  function countTo(el, end, prefix, suffix, dec){
    if (!el) return;
    const m = (el.textContent || '').match(/-?\d+(?:\.\d+)?/);
    const start = m ? parseFloat(m[0]) : 0;
    const dur = 600; let t0 = null;
    function step(ts){
      if (!t0) t0 = ts;
      const t = Math.min((ts - t0) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const v = start + (end - start) * e;
      el.textContent = prefix + (dec > 0 ? v.toFixed(dec) : Math.round(v)) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderLanguages(members){
    const strong = new Set(BASE_STRONG);
    members.forEach(m => (MEMBER_LANGS[m] || []).forEach(l => strong.add(l)));
    const partial = BASE_PARTIAL.filter(l => !strong.has(l));
    let strongN = 0, partialN = 0;
    document.querySelectorAll('#viz-language use[data-lang]').forEach(u => {
      const code = u.getAttribute('data-lang');
      let cls;
      if (strong.has(code)) { cls = 'cu-strong'; strongN++; }
      else if (partial.indexOf(code) !== -1) { cls = 'cu-partial'; partialN++; }
      else cls = 'cu-risk';
      u.setAttribute('class', cls);
      const label = u.nextElementSibling; // the <text> code label
      if (label) label.setAttribute('class', cls === 'cu-strong' ? 'cu-code' : 'cu-code ink');
    });
    const riskN = 24 - strongN - partialN;
    setText('#legStrong', strongN + ' strong');
    setText('#legPartial', partialN + ' partial');
    setText('#legRisk', riskN + ' at risk');
    setText('#langCap', strongN + ' of 24 EU languages sit at the coalition table');
  }

  function renderCompute(members){
    let sum = 0;
    members.forEach(m => { sum += (MEMBER_COMPUTE[m] || 0); });
    const hasMembers = members.size > 0;
    const ef = hasMembers ? sum : 2.0; // empty coalition falls back to today's EuroHPC baseline
    const chips = Math.max(1, Math.min(6, Math.round(ef)));
    const group = $('#computeEuChips');
    if (group){
      let html = '';
      for (let i = 0; i < chips; i++){
        html += '<use href="#chip" x="' + (170 + i * 35) + '" y="60" class="cu-chip-eu"/>';
      }
      group.innerHTML = html;
    }
    setText('#computeCap', hasMembers
      ? 'Your coalition pools ≈ ' + ef.toFixed(1) + ' EF against the US’s ~5'
      : 'EuroHPC today ≈ 2 EF, unpooled, against the US’s ~5');
    countTo($('#computePooledEF'), ef, '~', ' EF', 1);
  }

  function renderInvestment(members){
    let sum = 0;
    members.forEach(m => { sum += (MEMBER_INVEST[m] || 0); });
    const total = members.size ? sum : 14; // empty -> today's EU baseline (~$14B)
    const coins = Math.max(1, Math.min(9, Math.round(total / 10)));
    const group = $('#ottawaCoalition');
    if (group){
      let html = '';
      for (let i = 0; i < coins; i++){
        html += '<ellipse class="cu-coin-eu" cx="225" cy="' + (120 - i * 7) + '" rx="15" ry="4.7"/>';
      }
      group.innerHTML = html;
    }
    const amtEl = $('#ottawaCoalAmt');
    if (amtEl) countTo(amtEl, Math.round(total), '$', 'B', 0);
    setText('#ottawaCap', 'Pooled, the coalition reaches ≈ $' + Math.round(total) + 'B vs $109B');
  }

  function renderCapex(members){
    // EU-level InvestAI fund counts once any EU state is in.
    const euIn = EU_MEMBERS.some(c => members.has(c));
    let total = euIn ? 20 : 0;
    members.forEach(m => { total += (MEMBER_CAPEX[m] || 0); });
    // Dim the bag of any country not in the coalition (EU bag follows euIn).
    // With no coalition yet, show every bag full as the neutral "on the table" view.
    const active = members.size > 0;
    document.querySelectorAll('#viz-capex use[data-cc]').forEach(u => {
      const cc = u.getAttribute('data-cc');
      const inIt = cc === 'EU' ? euIn : members.has(cc);
      u.style.opacity = (!active || inIt) ? '1' : '0.18';
    });
    setText('#capexTotal', members.size
      ? 'Your coalition commits ≈ €' + total.toFixed(total < 10 ? 1 : 0) + 'B in state AI funds'
      : 'Add members to pool their state AI funds (EU InvestAI €20B)');
  }

  function renderRevenue(members){
    let arr = 0; const names = [];
    Object.keys(MEMBER_LABS).forEach(cc => {
      if (members.has(cc)) { arr += MEMBER_LABS[cc].arr; names.push(MEMBER_LABS[cc].name); }
    });
    // Dim the reference labs whose home state is not in the coalition.
    // With no coalition yet, keep them full as scale references.
    const active = members.size > 0;
    document.querySelectorAll('#viz-revenue g[data-cc]').forEach(g => {
      g.style.opacity = (!active || members.has(g.getAttribute('data-cc'))) ? '1' : '0.25';
    });
    setText('#revNote', names.length
      ? 'Coalition labs: $' + arr + 'M ARR across ' + names.length + (names.length === 1 ? ' firm' : ' firms')
      : 'No anchor labs in yet. Mistral ARR shown for scale');
  }

  function update(){
    const members = (window.__coalition && window.__coalition.members) || new Set();
    renderLanguages(members);
    renderCompute(members);
    renderInvestment(members);
    renderCapex(members);
    renderRevenue(members);
  }

  window.addEventListener('coalition:change', update);
  // The designer renders (and first broadcasts) before this listener binds,
  // so run once now from the persisted state.
  update();
})();
