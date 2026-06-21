// ============================================================
// SCROLL OBSERVER + SIMULATION, bind scenes to viz pane and sim state
// ============================================================
(function(){
  // Sim config keyed by scene element id. Defaults are the passive/inaction
  // option, so a reader who scrolls without interacting ends in the worst case.
  const SIM = {
    'scene-preface':    { type:'observe', label:'Why this scenario exists.' },
    'scene-nyc':        { type:'observe', label:'The flip switches.' },
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
      evidence: '~$240M ARR; AMD-backed Series D.',
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

  // Where each decision happens in the story, for the recap link.
  const SCENE_SRC = {
    'scene-brussels':  'Ch 4 · Brussels',
    'scene-ottawa':    'Ch 8 · Ottawa',
    'scene-tokyo':     'Ch 5 · Tokyo',
    'scene-paris':     'Ch 9 · Paris',
    'scene-berlin':    'Ch 3 · Berlin',
    'scene-ether':     'Ch 12 · The Ether',
    'scene-stockholm': 'Ch 6 · Stockholm',
  };

  // Render a single inline pick: the story question and its source chapter,
  // then chips + impact callout, so nobody has to scroll back to answer.
  function pickHtml(sceneId){
    const cfg = SIM[sceneId];
    if (!cfg) return '';
    const made = !!simState[sceneId];
    const src = SCENE_SRC[sceneId];
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
        <span class="design-pick-label">${PICK_LABELS[sceneId] || ''}${src ? `<a class="design-pick-src" href="#${sceneId}">${src}</a>` : ''}</span>
        <p class="design-pick-q">${cfg.question} <em class="design-pick-flag">${made ? 'your call from the story' : 'not called in the story yet; call it here'}</em></p>
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
              <span class="design-summary-row-value">${(GOVERNANCE.find(g=>g.id===shape.governance)||{}).name || '&ndash;'}</span>
            </div>
            <div class="design-summary-row">
              <span class="design-summary-row-label">Mandate</span>
              <span class="design-summary-row-value">${(SCOPE.find(s=>s.id===shape.scope)||{}).name || '&ndash;'}</span>
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

  // Scenario presets in the scorecard: set the membership decisions in one tap
  // so visitors can A/B whole coalitions instead of toggling four picks.
  const SCENARIOS = {
    eu:       { 'scene-brussels':'eu-coalition', 'scene-ottawa':'eu-only',            'scene-tokyo':'off-the-shelf',   'scene-paris':'co-leads' },
    fiveeyes: { 'scene-brussels':'eu-coalition', 'scene-ottawa':'five-eyes-minus-us', 'scene-tokyo':'off-the-shelf',   'scene-paris':'co-leads' },
    allies:   { 'scene-brussels':'eu-allies',    'scene-ottawa':'five-eyes-minus-us', 'scene-tokyo':'coalition-model', 'scene-paris':'co-leads' },
    reset:    { 'scene-brussels':'national',     'scene-ottawa':'eu-only',            'scene-tokyo':'off-the-shelf',   'scene-paris':'defers' }
  };
  const noteEl = document.getElementById('clScenarioNote');
  const noteDefault = noteEl ? noteEl.textContent : '';
  document.querySelectorAll('.cl-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = SCENARIOS[btn.dataset.scenario];
      if (!preset) return;
      Object.keys(preset).forEach(k => { simState[k] = preset[k]; });
      saveState();
      renderCoalitionDesign();
      if (noteEl && btn.dataset.note) noteEl.textContent = btn.dataset.note;
    });
    // Show that option's context (who joins) on hover / keyboard focus.
    const showNote = () => { if (noteEl && btn.dataset.note) noteEl.textContent = btn.dataset.note; };
    const resetNote = () => { if (noteEl) noteEl.textContent = noteDefault; };
    btn.addEventListener('mouseenter', showNote);
    btn.addEventListener('focus', showNote);
    btn.addEventListener('mouseleave', resetNote);
    btn.addEventListener('blur', resetNote);
  });

  // Render the design panel on load so the outcome section is ready whenever
  // the user reaches it. Picks are inline inside each section now.
  if (outcome) {
    renderCoalitionDesign();
  }

  // =====================================================================
  // CHAPTER CHECKPOINTS, make the calls inside the story (FT Uber-Game
  // style). Each decide-chapter ends with "Your call"; picking an option
  // writes the same simState the coalition designer reads, so Your
  // Coalition is already built by the time the reader reaches it.
  // Changing a pick later in the designer updates the checkpoint too.
  // =====================================================================
  function renderCheckpoints(){
    decisionOrder.forEach(sceneId => {
      const scene = document.getElementById(sceneId);
      const cfg = SIM[sceneId];
      if (!scene || !cfg) return;
      let box = scene.querySelector('.checkpoint');
      if (!box) {
        box = document.createElement('div');
        box.className = 'checkpoint';
        (scene.querySelector('.scene-prose') || scene).appendChild(box);
      }
      const made = !!simState[sceneId];
      const pick = getPick(sceneId);
      const picked = cfg.options.find(o => o.id === pick) || cfg.options[0];
      box.innerHTML =
        '<div class="checkpoint-kicker">Your call &middot; ' +
          (made ? 'locked in (revise here or in Your Coalition)' : 'this builds Your Coalition below') + '</div>' +
        '<div class="checkpoint-q">' + cfg.question + '</div>' +
        '<div class="checkpoint-options" role="radiogroup" aria-label="' + cfg.question.replace(/"/g, '&quot;') + '">' +
          cfg.options.map(o =>
            '<button type="button" class="checkpoint-opt' + (made && o.id === pick ? ' is-picked' : '') + '" ' +
            'data-opt="' + o.id + '" aria-pressed="' + (made && o.id === pick) + '">' + o.label + '</button>'
          ).join('') +
        '</div>' +
        '<p class="checkpoint-impact">' + (made ? picked.impact :
          'No call yet. The passive option (' + cfg.options[0].label.toLowerCase() + ') stands until you choose.') + '</p>';
      box.querySelectorAll('.checkpoint-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          simState[sceneId] = btn.dataset.opt;
          saveState();
          renderCheckpoints();
          renderCoalitionDesign(); // cascades to scorecard + live charts
        });
      });
    });
  }
  renderCheckpoints();
  // Keep checkpoints in sync when picks change from the designer side.
  window.addEventListener('coalition:change', renderCheckpoints);
})();

// ============================================================
// SIGN-ON FORM, mailto fallback if Formspree id is the placeholder
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
      const subject = encodeURIComponent('Airbus for AI, sign-on');
      window.location.href = 'mailto:hello@publicai.co?subject=' + subject + '&body=' + body;
      document.getElementById('signon').classList.add('is-submitted');
    }
    // If a real Formspree id is set, let the form submit normally.
  });
})();


// ============================================================
// COUNTRY MAP, orthographic globe; spins to the chapter's country on scroll
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
    'scene-nyc':         [-74.01, 40.71],
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

  // Every country that appears in the story (by topojson id), for the preface
  // overview where the whole coalition is lit at once.
  const STORY_IDS = Array.from(new Set(
    Array.from(document.querySelectorAll('.scene[data-country-id]'))
      .map(s => s.dataset.countryId).filter(Boolean)
  ));
  const cmReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let spinning = false, spinRaf = 0, prefaceActive = false;
  function spinStep() {
    if (!spinning) return;
    viewLng += 0.12; if (viewLng > 180) viewLng -= 360;
    redraw();
    spinRaf = requestAnimationFrame(spinStep);
  }
  function startSpin() { if (cmReduce || spinning || document.hidden) return; spinning = true; spinRaf = requestAnimationFrame(spinStep); }
  function stopSpin() { spinning = false; if (spinRaf) cancelAnimationFrame(spinRaf); spinRaf = 0; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpin(); else if (prefaceActive) startSpin(); });

  function setupHighlighter() {
    const scenes = Array.from(document.querySelectorAll('.scene[data-country-id]'));
    if (!scenes.length || !('IntersectionObserver' in window)) return;
    let active = null;
    function setActive(sceneEl) {
      const id = sceneEl ? sceneEl.dataset.countryId : null;
      group.querySelectorAll('.cm-country.is-active, .cm-country.is-story').forEach(p => p.classList.remove('is-active', 'is-story'));
      // Preface: light up every country in the story and let the globe turn.
      if (sceneEl && sceneEl.id === 'scene-preface') {
        STORY_IDS.forEach(cid => {
          const p = group.querySelector('.cm-country[data-id="' + cid + '"]');
          if (p) p.classList.add('is-story');
        });
        if (dotEl) { dotEl.classList.add('is-hidden'); dotEl.classList.remove('is-visible'); dotEl._sceneEl = null; }
        active = 'preface'; prefaceActive = true;
        startSpin();
        return;
      }
      prefaceActive = false; stopSpin();
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
      // Pick the furthest-along scene that has reached its reading position.
      // Stacked cards pin at their sticky offset (style.top), so a stuck card
      // compares against its own pin rather than the mid-viewport line.
      let best = null;
      scenes.forEach(el => {
        if (!visible.has(el)) return;
        const pin = parseFloat(el.style.top || '');
        const limit = isNaN(pin) ? window.innerHeight / 2 : Math.max(pin + 6, window.innerHeight / 2);
        if (el.getBoundingClientRect().top <= limit) best = el;
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
    const clone = chart.cloneNode(true);
    // cloneNode copies a <canvas> element but not its rendered bitmap, so the
    // two canvas-backed charts (viz-capital, viz-talent) would clone blank.
    // Copy the pixels across so their popovers aren't empty boxes.
    const srcCanvases = chart.querySelectorAll('canvas');
    const dstCanvases = clone.matches && clone.matches('canvas') ? [clone] : clone.querySelectorAll('canvas');
    srcCanvases.forEach((src, i) => {
      const dst = dstCanvases[i];
      if (!dst || !src.width || !src.height) return;
      dst.width = src.width; dst.height = src.height;
      try { dst.getContext('2d').drawImage(src, 0, 0); } catch (e) {}
    });
    pop.appendChild(clone);
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
    // Clear the connector line right away (it only belongs in the 50/50 view),
    // then redraw the canvas charts after the panel finishes resizing so they
    // don't stretch and pixelate.
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
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
  // Keep the backing store matched to the rendered size (layout, fonts, split,
  // stacking) so the text never stretches and pixelates.
  if (window.ResizeObserver) new ResizeObserver(() => { resize(); if (reduceMotion) draw(); }).observe(canvas);
  const colA=[{label:'France / Germany',x:0.07,y:0.18,col:'#0057FF'},{label:'Nordics / UK',x:0.07,y:0.40,col:'#0057FF'},{label:'Southern EU',x:0.07,y:0.62,col:'#0057FF'},{label:'Eastern EU',x:0.07,y:0.82,col:'#0057FF'}];
  const colB=[{label:'Relocate to US (57%)',x:0.50,y:0.15,col:'#b8002e'},{label:'Stay in EU (28%)',x:0.50,y:0.40,col:'#4a4a4a'},{label:'UK / Switzerland',x:0.50,y:0.62,col:'#8e8e8e'},{label:'Other (15%)',x:0.50,y:0.82,col:'#7a7a7a'}];
  const colC=[{label:'$109B US AI ecosystem',x:0.93,y:0.22,col:'#b8002e'},{label:'$14B EU AI ecosystem',x:0.93,y:0.52,col:'#0057FF'},{label:'Diluted / lost',x:0.93,y:0.80,col:'#666666'}];
  const allNodes=[colA,colB,colC];
  const colHeaders=[{label:'EU FUNDING SOURCES',x:0.07},{label:'WHERE FOUNDERS GO',x:0.50},{label:'ECONOMIC RESULT',x:0.93}];
  const flows=[{from:[0,0],to:[1,0],w:0.22},{from:[0,1],to:[1,0],w:0.18},{from:[0,1],to:[1,1],w:0.12},{from:[0,2],to:[1,1],w:0.10},{from:[0,2],to:[1,2],w:0.08},{from:[0,3],to:[1,2],w:0.05},{from:[0,3],to:[1,3],w:0.06},{from:[1,0],to:[2,0],w:0.30},{from:[1,1],to:[2,1],w:0.15},{from:[1,2],to:[2,1],w:0.08},{from:[1,3],to:[2,2],w:0.06}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,t){const t2=1-t;return t2*t2*t2*a+3*t2*t2*t*b+3*t2*t*t*c+t*t*t*d;}
  function pill(text,x,y,align,font,color){
    ctx.font=font;ctx.textAlign=align;
    const w=ctx.measureText(text).width;
    const x0=align==='left'?x:align==='right'?x-w:x-w/2;
    ctx.fillStyle='rgba(255,255,255,0.9)';
    if (ctx.roundRect){ctx.beginPath();ctx.roundRect(x0-6,y-11,w+12,15,7.5);ctx.fill();}
    else ctx.fillRect(x0-6,y-11,w+12,15);
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { return; }
    ctx.clearRect(0,0,W,H);
    const fs=Math.max(7.5, Math.min(9, W*0.018));
    const lfs=Math.max(9.5, Math.min(11, W*0.021));
    ctx.font='600 '+fs+'px JetBrains Mono, monospace';ctx.fillStyle='rgba(10,10,10,0.38)';
    // Edge headers anchored to the canvas edges so they never clip.
    ctx.textAlign='left';   ctx.fillText(colHeaders[0].label, 2, 11);
    ctx.textAlign='center'; ctx.fillText(colHeaders[1].label, 0.5*W, 11);
    ctx.textAlign='right';  ctx.fillText(colHeaders[2].label, W-2, 11);
    ctx.lineCap='round';
    flows.forEach((f,fi)=>{
      const n1=allNodes[f.from[0]][f.from[1]],n2=allNodes[f.to[0]][f.to[1]];
      const x1=n1.x*W,y1=n1.y*H,x2=n2.x*W,y2=n2.y*H,thickness=f.w*H*0.7;
      const grad=ctx.createLinearGradient(x1,y1,x2,y2);
      grad.addColorStop(0,n1.col+'30');grad.addColorStop(1,n2.col+'30');
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.4,y1,x1+(x2-x1)*0.6,y2,x2,y2);
      ctx.strokeStyle=grad;ctx.lineWidth=thickness;ctx.stroke();
      particles[fi]=(particles[fi]+0.004)%1;const s=particles[fi];
      const bx=bezPt(x1,x1+(x2-x1)*0.4,x1+(x2-x1)*0.6,x2,s),by=bezPt(y1,y1,y2,y2,s);
      ctx.beginPath();ctx.arc(bx,by,1.8,0,Math.PI*2);ctx.fillStyle=n2.col;ctx.fill();
    });
    allNodes.forEach((col,ci)=>{col.forEach(n=>{
      const nx=n.x*W,ny=n.y*H;
      ctx.beginPath();ctx.arc(nx,ny,4.2,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
      ctx.lineWidth=2.4;ctx.strokeStyle=n.col;ctx.stroke();
      const align=ci===0?'left':ci===2?'right':'center';
      const labelX=ci===0?nx+10:ci===2?nx-10:nx;
      const labelY=Math.max(26,ny-12);
      pill(n.label,labelX,labelY,align,'600 '+lfs+'px Inter, sans-serif','rgba(10,10,10,0.78)');
    });});
  }
  // Only animate while the canvas is on-screen and the tab is visible, so the
  // RAF loop doesn't burn CPU/battery for the whole (long) page.
  let running=false, inView=false;
  function tick(){ if (reduceMotion || document.hidden || !inView){ running=false; return; } draw(); requestAnimationFrame(tick); }
  function start(){ if (!running){ running=true; requestAnimationFrame(tick); } }
  if (reduceMotion){ draw(); }
  else if (window.IntersectionObserver){
    new IntersectionObserver(es=>{ inView=es[0].isIntersecting; if (inView) start(); else draw(); }).observe(canvas);
    document.addEventListener('visibilitychange',()=>{ if (!document.hidden) start(); });
  } else { inView=true; start(); }
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
  if (window.ResizeObserver) new ResizeObserver(() => { resize(); if (reduceMotion) draw(); }).observe(canvas);
  const educated=[{label:'EU-West',y:0.14,col:'#0057FF',pct:'22%'},{label:'EU-East',y:0.28,col:'#0057FF',pct:'8%'},{label:'UK / CH',y:0.42,col:'#8e8e8e',pct:'12%'},{label:'China',y:0.56,col:'#6a6a6a',pct:'29%'},{label:'India',y:0.70,col:'#7a7a7a',pct:'11%'},{label:'US',y:0.84,col:'#4a4a4a',pct:'18%'}];
  const working=[{label:'Work in US',y:0.20,col:'#b8002e',pct:'~59%'},{label:'Work in EU',y:0.42,col:'#0057FF',pct:'~15%'},{label:'UK / CH',y:0.58,col:'#8e8e8e',pct:'~10%'},{label:'China',y:0.74,col:'#6a6a6a',pct:'~10%'},{label:'Elsewhere',y:0.88,col:'#7a7a7a',pct:'~5%'}];
  const flows=[{from:0,to:0,w:0.10},{from:0,to:1,w:0.08},{from:0,to:2,w:0.03},{from:1,to:0,w:0.03},{from:1,to:1,w:0.04},{from:2,to:0,w:0.05},{from:2,to:2,w:0.05},{from:3,to:0,w:0.14},{from:3,to:3,w:0.10},{from:3,to:1,w:0.03},{from:4,to:0,w:0.06},{from:4,to:2,w:0.02},{from:4,to:4,w:0.02},{from:5,to:0,w:0.14},{from:5,to:4,w:0.03}];
  let particles=flows.map(()=>Math.random());
  function bezPt(a,b,c,d,s){const s2=1-s;return s2*s2*s2*a+3*s2*s2*s*b+3*s2*s*s*c+s*s*s*d;}
  function draw(){
    const dpr=window.devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);const W=canvas.width/dpr,H=canvas.height/dpr;
    if (W < 4 || H < 4) { return; }
    ctx.clearRect(0,0,W,H);
    const insetPx = W < 380 ? 80 : 100;
    const LX = Math.max(0.18, insetPx / W);
    const RX = 1 - LX;
    const tfs=Math.max(9, Math.min(11, W*0.022));
    const lfs=Math.max(11, Math.min(14, W*0.027));
    const pfs=Math.max(10, Math.min(13, W*0.025));
    const dotR=Math.max(3, Math.min(5, W*0.012));
    ctx.font='600 '+tfs+'px JetBrains Mono, monospace';ctx.textAlign='center';ctx.fillStyle='rgba(10,10,10,0.38)';
    ctx.fillText('EDUCATED IN', LX*W, 10);
    ctx.fillText('NOW WORKING IN', RX*W, 10);
    ctx.fillStyle='rgba(10,10,10,0.08)';
    const arrowFs = Math.max(18, Math.min(28, W*0.06));
    ctx.font=arrowFs+'px Inter, sans-serif';
    ctx.fillText('→', 0.5*W, 0.5*H + arrowFs*0.15);
    flows.forEach((f,fi)=>{
      const src=educated[f.from],dst=working[f.to];const x1=LX*W+8,y1=src.y*H,x2=RX*W-8,y2=dst.y*H,thickness=f.w*H*0.6;
      const grad=ctx.createLinearGradient(x1,y1,x2,y2);
      grad.addColorStop(0,src.col+'2A');grad.addColorStop(1,dst.col+'2A');
      ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+(x2-x1)*0.35,y1,x1+(x2-x1)*0.65,y2,x2,y2);ctx.strokeStyle=grad;ctx.lineWidth=thickness;ctx.stroke();
      particles[fi]=(particles[fi]+0.003+f.w*0.005)%1;const s=particles[fi];
      const bx=bezPt(x1,x1+(x2-x1)*0.35,x1+(x2-x1)*0.65,x2,s),by=bezPt(y1,y1,y2,y2,s);
      ctx.beginPath();ctx.arc(bx,by,2,0,Math.PI*2);ctx.fillStyle=dst.col;ctx.fill();
    });
    educated.forEach(n=>{
      ctx.beginPath();ctx.arc(LX*W,n.y*H,dotR,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle=n.col;ctx.stroke();
      ctx.textAlign='right';ctx.font='600 '+lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.75)';ctx.fillText(n.label,LX*W-14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,LX*W-14,n.y*H+18);
    });
    working.forEach(n=>{
      ctx.beginPath();ctx.arc(RX*W,n.y*H,dotR,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle=n.col;ctx.stroke();
      ctx.textAlign='left';ctx.font='600 '+lfs+'px Inter, sans-serif';ctx.fillStyle='rgba(10,10,10,0.75)';ctx.fillText(n.label,RX*W+14,n.y*H+4);
      ctx.font=pfs+'px JetBrains Mono, monospace';ctx.fillStyle=n.col;ctx.fillText(n.pct,RX*W+14,n.y*H+18);
    });
  }
  // Only animate while on-screen and the tab is visible (see Capital Flow above).
  let running=false, inView=false;
  function tick(){ if (reduceMotion || document.hidden || !inView){ running=false; return; } draw(); requestAnimationFrame(tick); }
  function start(){ if (!running){ running=true; requestAnimationFrame(tick); } }
  if (reduceMotion){ draw(); }
  else if (window.IntersectionObserver){
    new IntersectionObserver(es=>{ inView=es[0].isIntersecting; if (inView) start(); else draw(); }).observe(canvas);
    document.addEventListener('visibilitychange',()=>{ if (!document.hidden) start(); });
  } else { inView=true; start(); }
})();

// --- Section -> chart connectors: hover a decision section to draw a dotted line
//     to its relevant live-data chart (and outline that chart). ---
(function(){
  const NS = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(NS, 'svg');
  overlay.setAttribute('class', 'link-overlay');
  overlay.setAttribute('aria-hidden', 'true');
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
  // The connector only makes sense in the 50/50 view (both panels visible).
  const splitEl = document.getElementById('outcomeSplit');
  function isBalanced(){
    return !splitEl || (!splitEl.classList.contains('split-data') && !splitEl.classList.contains('split-design'));
  }
  let active = null, target = null, pinnedId = null;
  function recompute(){
    if (!active || !target) return;
    if (!isBalanced()) { hide(); return; }
    const s = active.getBoundingClientRect();
    const c = target.getBoundingClientRect();
    if ((!s.width && !s.height) || (!c.width && !c.height)) { hide(); return; } // an endpoint is hidden/detached
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
    active = sec; target = tgt; pinnedId = id;
    target.classList.add('viz-linked');
    recompute();
    overlay.classList.add('is-on');
  }
  function hide(){
    overlay.classList.remove('is-on');
    if (target) target.classList.remove('viz-linked');
    active = null; target = null; pinnedId = null;
  }
  // Tag sections that have a chart (for the cursor hint), once the designer renders.
  function tag(){
    document.querySelectorAll('.design-section').forEach(sec => {
      if (targetIdFor(sec)) sec.setAttribute('data-haschart', '');
    });
  }
  // After the designer re-renders (any pick change), the old section nodes are
  // gone: re-tag and re-attach the pinned line to the matching new section.
  function rebind(){
    tag();
    if (!pinnedId) return;
    const tgt = document.getElementById(pinnedId);
    let sec = null;
    document.querySelectorAll('.design-section[data-haschart]').forEach(s => {
      if (targetIdFor(s) === pinnedId) sec = s;
    });
    if (sec && tgt){ active = sec; target = tgt; target.classList.add('viz-linked'); recompute(); }
    else hide();
  }
  tag();
  // Hover a decision to PIN its line. It stays put and tracks scrolling (so you
  // can scroll to the chart it points at) until you hover a different decision.
  document.addEventListener('mouseover', (e) => {
    if (window.innerWidth < 1100 || !isBalanced()) return;
    const sec = e.target.closest && e.target.closest('.design-section[data-haschart]');
    if (sec && sec !== active) show(sec);
  });
  // Esc clears the pinned line.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', recompute, { passive: true });
  window.addEventListener('resize', recompute);
  // Re-bind after every coalition change; deferred so the new DOM is in place.
  window.addEventListener('coalition:change', () => setTimeout(rebind, 0));
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
    // Scroll-scrubbed charts own their own value label; don't count-up over it.
    if (el.closest('[data-scrub]')) return;
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
  // Top-tier AI researchers each member brings, in thousands (illustrative).
  const MEMBER_TALENT = {
    DE:12, FR:10, GB:14, CA:8, ES:4,
    SE:3, CH:5, JP:9, KR:6, SG:3
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
    document.querySelectorAll('#viz-language rect[data-lang]').forEach(u => {
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
    const units = Math.max(1, Math.min(5, Math.round(ef)));
    const group = $('#computeEuChips');
    if (group){
      let html = '';
      for (let i = 0; i < units; i++){
        html += '<rect class="ed-unit eu" x="' + (110 + i * 30) + '" y="38" width="22" height="22" rx="3"/>';
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
    // dot plot: slide the coalition marker along the $ axis (16px = $0, ~3px/$B)
    const x = Math.min(344, 16 + total * 2.982);
    const dot = $('#ottawaCoalDot');
    if (dot) dot.setAttribute('cx', x.toFixed(1));
    const word = $('#ottawaCoalWord');
    if (word) word.setAttribute('x', x.toFixed(1));
    const amtEl = $('#ottawaCoalAmt');
    if (amtEl) {
      amtEl.setAttribute('x', x.toFixed(1));
      countTo(amtEl, Math.round(total), '$', 'B', 0);
    }
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
    document.querySelectorAll('#viz-capex g[data-cc]').forEach(u => {
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

  function setBar(sel, frac){
    const el = $(sel);
    if (el) el.style.width = Math.max(2, Math.min(100, frac * 100)) + '%';
  }
  // The scorecard: coalition totals against the US/target benchmark (the full
  // track = the benchmark, the fill = how far the coalition closes the gap).
  function renderSummary(members){
    const n = members.size;
    let ef  = 0; members.forEach(m => { ef  += (MEMBER_COMPUTE[m] || 0); }); if (!n) ef  = 2.0;
    let cap = 0; members.forEach(m => { cap += (MEMBER_INVEST[m]  || 0); }); if (!n) cap = 14;
    let tal = 0; members.forEach(m => { tal += (MEMBER_TALENT[m]  || 0); });
    const strong = new Set(BASE_STRONG);
    members.forEach(m => (MEMBER_LANGS[m] || []).forEach(l => strong.add(l)));
    const langs = strong.size;
    countTo($('#clMembers'), n, '', '', 0);
    setBar('#clBarCompute', ef / 5);    setText('#clCompute', '~' + ef.toFixed(1) + ' / 5 EF');
    setBar('#clBarCapital', cap / 109);  setText('#clCapital', '$' + Math.round(cap) + ' / 109B');
    setBar('#clBarTalent',  tal / 60);   setText('#clTalent',  Math.round(tal) + ' / 60k');
    setBar('#clBarLangs',   langs / 24);  setText('#clLangs',   langs + ' / 24');
  }

  const PULSE_CARDS = ['viz-language','viz-compute','viz-ottawa','viz-capex','viz-revenue'];
  function pulse(){
    PULSE_CARDS.forEach(id => {
      const c = document.getElementById(id);
      if (!c) return;
      c.classList.remove('viz-pulse');
      void c.offsetWidth; // restart the animation
      c.classList.add('viz-pulse');
    });
  }

  let lastSig = null, inited = false;
  function update(){
    const members = (window.__coalition && window.__coalition.members) || new Set();
    renderLanguages(members);
    renderCompute(members);
    renderInvestment(members);
    renderCapex(members);
    renderRevenue(members);
    renderSummary(members);
    const sig = Array.from(members).sort().join(',');
    if (inited && sig !== lastSig) pulse();
    lastSig = sig; inited = true;
  }

  window.addEventListener('coalition:change', update);
  // The designer renders (and first broadcasts) before this listener binds,
  // so run once now from the persisted state.
  update();
})();

// ============================================================
// SCROLL-SCRUBBED TIME-SERIES: the line draws and its value ticks as you
// scroll the chart through the viewport (reversible), in the ai-2027 style.
// Charts opt in with data-scrub + a y->value mapping on the <svg>.
// ============================================================
(function(){
  const charts = Array.from(document.querySelectorAll('.viz-card .mn-chart[data-scrub]'));
  if (!charts.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const items = charts.map(svg => {
    const line = svg.querySelector('.mn-line');
    if (!line) return null;
    const card = svg.closest('.viz-card');
    card.classList.add('is-scrub');
    let len = 0;
    try { len = line.getTotalLength(); } catch(e) { len = 0; }
    line.style.strokeDasharray = len;
    return {
      line, card, len,
      end:  svg.querySelector('.ci-end'),
      emph: svg.querySelector('.ci-emph'),
      y0:+svg.dataset.y0, v0:+svg.dataset.v0,
      y1:+svg.dataset.y1, v1:+svg.dataset.v1,
      pre: svg.dataset.pre || '', suf: svg.dataset.suf || '',
      round:+(svg.dataset.round || 1)
    };
  }).filter(Boolean);

  function apply(it, p){
    it.line.style.strokeDashoffset = it.len * (1 - p);
    let pt; try { pt = it.line.getPointAtLength(it.len * p); } catch(e){ return; }
    if (it.end){ it.end.setAttribute('cx', pt.x); it.end.setAttribute('cy', pt.y); }
    if (it.emph){
      const v = it.v0 + (pt.y - it.y0) * (it.v1 - it.v0) / (it.y1 - it.y0);
      const r = Math.round(v / it.round) * it.round;
      it.emph.textContent = it.pre + r + it.suf;
    }
  }

  if (reduce){ items.forEach(it => apply(it, 1)); return; } // no scrubbing: show full

  let ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      items.forEach(it => {
        const rect = it.card.getBoundingClientRect();
        // p = 0 as the card enters (top at 85% vh) -> 1 once it reaches 35% vh.
        let p = (vh * 0.85 - rect.top) / (vh * 0.5);
        p = Math.max(0, Math.min(1, p));
        apply(it, p);
      });
      ticking = false;
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

// ============================================================
// SCROLL-STACKING LAYOUT: pin each live-data card with position:sticky so they
// pile as you scroll, the previous card's header peeking above the next. The
// per-card sticky top + z-index are assigned in VISUAL (flex order) sequence.
// ============================================================
(function(){
  const grid = document.querySelector('.supporting-data-grid');
  if (!grid) return;
  const BASE = 70;
  function apply(){
    const kids = Array.from(grid.children).filter(
      el => el.classList.contains('viz-card') || el.classList.contains('story-act')
    );
    kids.sort((a, b) =>
      (parseInt(getComputedStyle(a).order, 10) || 0) - (parseInt(getComputedStyle(b).order, 10) || 0)
    );
    // Pin each card with an accumulating peek strip, but CAP the offset so the
    // stacked headers never grow taller than the viewport. An uncapped stack
    // (BASE + 58 per card across ~18 cards) exceeded the viewport and trapped
    // scrolling. Past the cap, later cards pin at the same offset and cover the
    // ones beneath, so the pile always stays scrollable to the end.
    const cap = Math.max(BASE + 380, Math.round(window.innerHeight * 0.62));
    let top = BASE;
    kids.forEach((el, i) => {
      el.style.top = Math.min(top, cap) + 'px';
      el.style.zIndex = String(i + 1); // later (visual) cards sit on top
      // Small peek per card so many more title strips stay visible, while the
      // cap still keeps the stack within the viewport so scrolling never traps.
      top += el.classList.contains('story-act') ? 30 : 26;
    });
  }
  grid.classList.add('is-stack');
  apply();
  window.addEventListener('resize', apply);
})();

// ============================================================
// SCROLL RAILS: a fixed left-edge timeline of where you are. One for the story
// chapters, one for the member-states decisions. Dots fill in as you progress;
// click a dot to jump; the rail shows only while its section is on screen.
// ============================================================
(function(){
  if (!('IntersectionObserver' in window) || window.innerWidth < 1100) return;

  function makeRail(items, sectionEl, aria){
    if (!items.length || !sectionEl) return null;
    const rail = document.createElement('nav');
    rail.className = 'scroll-rail';
    rail.setAttribute('aria-label', aria);
    const nodes = items.map(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scroll-rail-node';
      btn.setAttribute('aria-label', it.label);            // dot-only at rest, so label the button
      btn.innerHTML = '<span class="scroll-rail-dot"></span><span class="scroll-rail-label"></span>';
      btn.querySelector('.scroll-rail-label').textContent = it.label;
      btn.addEventListener('click', () => {
        // scrollIntoView misfires on the sticky-pinned story cards (a stuck
        // card reads as already in view, so it won't scroll back up). Compute
        // the target's natural flow position by walking offsetParents, which
        // ignores the current sticky offset, then scroll there.
        let y = 0, n = it.el;
        while (n){ y += n.offsetTop; n = n.offsetParent; }
        window.scrollTo({ top: Math.max(0, y - 80), behavior: 'smooth' });
      });
      rail.appendChild(btn);
      return btn;
    });
    document.body.appendChild(rail);

    function setActive(idx){
      nodes.forEach((n, i) => {
        if (i === idx) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
        n.classList.toggle('is-active', i === idx);
        n.classList.toggle('is-done', i <= idx);
      });
    }
    const seen = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { e.isIntersecting ? seen.set(e.target, true) : seen.delete(e.target); });
      // Last item that has reached its reading position wins. Stacked story
      // cards pin at style.top, so a stuck card compares against its own pin.
      let bestIdx = -1;
      items.forEach((it, i) => {
        if (!seen.get(it.el)) return;
        const pin = parseFloat(it.el.style.top || '');
        const limit = isNaN(pin) ? window.innerHeight * 0.5 : Math.max(pin + 6, window.innerHeight * 0.5);
        if (it.el.getBoundingClientRect().top <= limit) bestIdx = i;
      });
      if (bestIdx >= 0) setActive(bestIdx);
    }, { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.5, 1] });
    items.forEach(it => io.observe(it.el));

    const visIo = new IntersectionObserver(es => {
      es.forEach(e => rail.classList.toggle('is-visible', e.isIntersecting));
    }, { rootMargin: '-8% 0px -8% 0px' });
    visIo.observe(sectionEl);

    return { rail, items, io, visIo };
  }

  // --- Story chapters ---
  let storyRail = null;
  const story = document.getElementById('story');
  if (story){
    const items = Array.from(story.querySelectorAll('.scene')).map(s => {
      const k = s.querySelector('.scene-kicker');
      const t = s.querySelector('.scene-title');
      const num = k ? ((k.textContent.match(/\d+/) || [''])[0]) : '';
      const city = t ? t.textContent.trim() : '';
      return { el: s, label: (num ? num + '  ' : '') + city };
    });
    storyRail = makeRail(items, story, 'Story progress');
  }

  // The outcome takes the left edge over the story: once it scrolls into view,
  // suppress the story rail so it can't collide with the scorecard / member rail.
  const outcomeSection = document.getElementById('outcome');
  if (storyRail && outcomeSection){
    new IntersectionObserver(es => {
      es.forEach(e => storyRail.rail.classList.toggle('rail-suppressed', e.isIntersecting));
    }, { rootMargin: '0px 0px -30% 0px' }).observe(outcomeSection);
  }

  // No rail during the hero ("The Airbus for AI Story"): it only appears once
  // the hero has fully scrolled past and the chapters are underway.
  const heroSection = document.querySelector('.hero');
  if (storyRail && heroSection){
    new IntersectionObserver(es => {
      es.forEach(e => storyRail.rail.classList.toggle('rail-hero', e.isIntersecting));
    }).observe(heroSection);
  }

  // --- Member-states decisions (rebuilt only when the designer DOM is replaced) ---
  const designWrap = document.querySelector('.outcome-split-design');
  let memberRail = null;
  function buildMemberRail(){
    const design = document.getElementById('coalitionDesign');
    if (!design || !designWrap) return;
    const items = Array.from(design.querySelectorAll('.design-section')).map(s => {
      const t = s.querySelector('.design-section-title');
      return { el: s, label: t ? t.textContent.trim() : '' };
    });
    if (memberRail){ memberRail.io.disconnect(); memberRail.visIo.disconnect(); memberRail.rail.remove(); }
    memberRail = makeRail(items, designWrap, 'Decision progress');
  }
  buildMemberRail();
  // Re-bind only after a real re-render (the section nodes get replaced); a hover
  // preview leaves the DOM in place, so skip those to avoid flicker.
  window.addEventListener('coalition:change', () => setTimeout(() => {
    if (memberRail && memberRail.items[0] && document.body.contains(memberRail.items[0].el)) return;
    buildMemberRail();
  }, 0));
})();

// --- Collapse / expand the coalition scorecard (esp. useful on mobile) ---
(function(){
  const card = document.getElementById('coalitionLiveSummary');
  const btn = document.getElementById('clToggle');
  if (!card || !btn) return;
  btn.addEventListener('click', () => {
    const collapsed = card.classList.toggle('is-collapsed');
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? 'Expand coalition summary' : 'Collapse coalition summary');
    btn.innerHTML = collapsed ? '+' : '&minus;';
  });
})();

// ============================================================
// SVG CHART TOOLTIPS: native <title> tooltips are slow and only fire over
// painted geometry. Drive an instant, styled tooltip from each row's <title>,
// triggered by a full-row transparent hit rect so the whole band is hoverable.
// ============================================================
(function(){
  const rows = document.querySelectorAll('.scene-fig .ed-row');
  if (!rows.length) return;
  let tip = null;
  function ensureTip(){
    if (!tip){
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    return tip;
  }
  function place(e){
    const t = ensureTip();
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + t.offsetWidth > window.innerWidth - 8) x = e.clientX - t.offsetWidth - pad;
    if (y + t.offsetHeight > window.innerHeight - 8) y = e.clientY - t.offsetHeight - pad;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }
  rows.forEach(row => {
    const titleEl = row.querySelector('title');
    if (!titleEl) return;
    const text = titleEl.textContent.trim();
    row.addEventListener('mouseenter', e => {
      const t = ensureTip();
      t.textContent = text;
      t.classList.add('is-on');
      place(e);
    });
    row.addEventListener('mousemove', place);
    row.addEventListener('mouseleave', () => { if (tip) tip.classList.remove('is-on'); });
  });
})();

// ============================================================
// STACKED STORY CARDS: chapters pin and pile as you scroll, like the
// live-data cards. All widths; per-card sticky top + z-index in DOM order.
// ============================================================
(function(){
  const story = document.querySelector('.story');
  if (!story) return;
  const scenes = Array.from(story.querySelectorAll('.scene'));
  if (!scenes.length) return;
  story.classList.add('is-stack');
  // A card SHORTER than the viewport pins by its top (the stair of peeking
  // headers, capped so deep chapters stay reachable). A card TALLER than the
  // viewport pins by its BOTTOM (negative top offset): it scrolls normally
  // until all of its text has been readable, and only then does the next
  // card slide over it.
  // Tighter stair on small screens so the pile leaves room to read.
  function dims () {
    return window.innerWidth < 1024
      ? { BASE: 54, STEP: 30, PIN_MAX: 104, GAP: 14 }
      : { BASE: 70, STEP: 52, PIN_MAX: 222, GAP: 28 };
  }
  function applyTops () {
    const { BASE, STEP, PIN_MAX, GAP } = dims();
    const vh = window.innerHeight;
    scenes.forEach((el, i) => {
      const stair = Math.min(BASE + i * STEP, PIN_MAX);
      const bottomPin = vh - el.offsetHeight - GAP;
      el.style.top = Math.min(stair, bottomPin) + 'px';
      el.style.zIndex = String(i + 1);
    });
  }
  applyTops();
  window.addEventListener('resize', applyTops);
  window.addEventListener('load', applyTops);
  // Card heights change at runtime (guess widgets reveal, checkpoints render,
  // sources expand); re-pin whenever they do.
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(applyTops);
    scenes.forEach(el => ro.observe(el));
  }
  scenes.forEach((el, i) => {
    // Clicking a covered (earlier) chapter scrolls back to its start so it
    // is fully readable again. Links, buttons and widgets keep working.
    el.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('a, button, input, .ydi, .checkpoint, details')) return;
      const next = scenes[i + 1];
      const nextPin = next ? parseFloat(next.style.top || '0') : 0;
      const covered = next && next.getBoundingClientRect().top <= Math.max(nextPin + 6, 0);
      if (!covered) return;
      const cs = getComputedStyle(story);
      let y = story.getBoundingClientRect().top + window.scrollY + (parseFloat(cs.paddingTop) || 0);
      for (let j = 0; j < i; j++) y += scenes[j].offsetHeight + 30; // 30 = stacked margin-bottom
      window.scrollTo({ top: y - dims().BASE, behavior: 'smooth' });
    });
  });
})();

// ============================================================
// STORY ASCII RAIL: an animated character mini-chart in the right rail that
// follows the chapter being read. Real figures, drawn in mono; bars grow in
// when a chapter becomes active, then idle quietly. Reduced motion = static.
// ============================================================
(function(){
  const wrap = document.getElementById('storyAsciiWrap');
  const pre = document.getElementById('storyAscii');
  const cap = document.getElementById('storyAsciiCap');
  const link = document.getElementById('storyAsciiLink');
  if (!wrap || !pre || window.innerWidth < 1024) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // bar: fraction -> '████··········'
  const B = (f, w) => {
    const n = Math.round(Math.max(0, Math.min(1, f)) * w);
    return '█'.repeat(n) + '·'.repeat(w - n);
  };
  const P = t => Math.min(1, t / 14); // grow-in progress

  const VIZ = {
    'scene-nyc': { label: 'us export controls', href: '#viz-export', r: t => {
      const p = P(t);
      return 'us chip rules, 2022-26\n\n actions ' + B(p, 13) + ' 10\n 3 later reversed\n\n policy that flips yearly\n is not infrastructure';
    }},
    'scene-dublin-apr': { label: 'talent migration', href: '#viz-talent', r: t => {
      const p = P(t);
      return 'EU-trained top researchers,\nwhere they end up working\n\n US   ' + B(0.60 * p, 13) + ' 60%\n EU   ' + B(0.15 * p, 13) + ' ~15%\n else ' + B(0.25 * p, 13) + ' 25%';
    }},
    'scene-berlin': { label: 'cloud dependence', href: '#viz-cloud', r: t => {
      const p = P(t);
      return 'who runs europe’s cloud\n\n US    ' + B(0.70 * p, 13) + ' 70%\n EU    ' + B(0.15 * p, 13) + ' 15%\n other ' + B(0.15 * p, 13) + ' 15%\n\n one act can switch it off';
    }},
    'scene-brussels': { label: 'language coverage', href: '#viz-language', r: t => {
      const p = P(t);
      return 'of 24 EU languages\n\n strong  ' + B(3 / 24 * p, 13) + '  3\n partial ' + B(8 / 24 * p, 13) + '  8\n at risk ' + B(13 / 24 * p, 13) + ' 13\n\n 13 face digital extinction';
    }},
    'scene-tokyo': { label: 'japan’s AI bet', href: '#viz-tokyo', r: t => {
      const p = P(t);
      return 'the sovereign bet\n\n GENIAC fund   ¥1T / 5yr\n\n world rare-earth refining\n china ' + B(0.90 * p, 13) + ' 90%\n rest  ' + B(0.10 * p, 13) + ' 10%';
    }},
    'scene-stockholm': { label: 'defence-AI boom', href: '#viz-defense', r: t => {
      const p = P(t);
      return 'helsing, valuation\n\n 2025      ' + B(12 / 18 * p, 13) + ' €12B\n 2026 est. ' + B(p, 13) + ' ~$18B\n\n defence is where Europe\n can move fastest';
    }},
    'scene-monroe': { label: 'capital flow', href: '#viz-capital', r: t => {
      const p = P(t);
      let racks = '';
      for (let r = 0; r < 3; r++) {
        const fr = Math.max(0, Math.min(8, Math.round((p - r * 0.12) * 9)));
        let l = '';
        for (let c = 0; c < 8; c++) l += (c < fr ? '*' : '·') + (c < 7 ? ' ' : '');
        racks += ' r0' + (r + 1) + ' [' + l + ']\n';
      }
      return 'hyperion data center, monroe LA\n server racks coming online\n\n' + racks + '\n $27B: one US site\n $14B: all EU AI in 2024';
    }},
    'scene-ottawa': { label: 'why pool', href: '#viz-ottawa', r: t => {
      const p = P(t);
      return '2024 private AI money\n\n US ' + B(p, 13) + ' $109B\n EU ' + B(14 / 109 * p, 13) + ' $14B\n CN ' + B(9.3 / 109 * p, 13) + ' $9.3B\n UK ' + B(4.5 / 109 * p, 13) + ' $4.5B\n\n no one competes alone';
    }},
    'scene-paris': { label: 'france’s power edge', href: '#viz-energy', r: t => {
      const p = P(t);
      return 'the french grid\n\n nuclear ' + B(0.70 * p, 13) + ' 70%\n other   ' + B(0.30 * p, 13) + ' 30%\n\n ~90 TWh exported\n power for compute';
    }},
    'scene-dublin-jan': { label: 'brain drain', href: '#viz-brain', r: t => {
      return 'EU-trained, still in EU\n\n 2019 ' + B(0.50 * Math.min(1, t / 8), 13) + ' ~50%\n 2022 ' + B(0.43 * Math.min(1, Math.max(0, t - 5) / 8), 13) + ' ~43%\n 2026 ' + B(0.40 * Math.min(1, Math.max(0, t - 10) / 8), 13) + ' ~40%';
    }},
    'scene-whitehouse': { label: 'pentagon money', href: '#viz-pentagon', r: t => {
      const labs = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'XAI'];
      let out = 'the godfather offer\n\n';
      labs.forEach((l, i) => {
        const pos = (t + i * 3) % 10;
        let line = '';
        for (let k = 0; k < 10; k++) line += (k === pos) ? '$' : '-';
        out += ' DoW ' + line + '> ' + l + '\n';
      });
      return out + '\n $200M ceilings each';
    }},
    'scene-ether': { label: 'pooled vs alone', href: '#viz-ether', r: t => {
      const p = P(t);
      return 'share of the US level\n\n capital alone  ' + B(0.04 * p, 10) + '   4%\n         pooled ' + B(0.17 * p, 10) + '  17%\n compute alone  ' + B(0.20 * p, 10) + '  20%\n         pooled ' + B(0.82 * p, 10) + '  82%\n talent  alone  ' + B(0.23 * p, 10) + '  23%\n         pooled ' + B(p, 10) + ' 100%+';
    }}
  };

  const scenes = Array.from(document.querySelectorAll('.scene'));
  const more = document.getElementById('storyAsciiMore');
  const moreBody = document.getElementById('storyAsciiMoreBody');
  let activeId = null, since = 0, moreFor = null;

  // ---- chronology timeline: the story jumps around 2026-27; this places
  // the chapter you are reading on the real axis. ----
  const WHEN = {
    'scene-nyc':        { y: 2027, m: 4,  d: 15, label: 'Apr 2027' },
    'scene-dublin-apr': { y: 2026, m: 4,  d: 23, label: 'Apr 2026' },
    'scene-berlin':     { y: 2027, m: 4,  d: 16, label: 'Apr 2027' },
    'scene-brussels':   { y: 2026, m: 6,  d: 3,  label: 'Jun 2026' },
    'scene-tokyo':      { y: 2027, m: 2,  d: 19, label: 'Feb 2027' },
    'scene-stockholm':  { y: 2026, m: 12, d: 7,  label: 'Dec 2026' },
    'scene-monroe':     { y: 2026, m: 9,  d: 4,  label: 'Sep 2026' },
    'scene-ottawa':     { y: 2027, m: 4,  d: 16, label: 'Apr 2027' },
    'scene-paris':      { y: 2027, m: 4,  d: 17, label: 'Apr 2027' },
    'scene-dublin-jan': { y: 2026, m: 1,  d: 12, label: 'Jan 2026' },
    'scene-whitehouse': { y: 2027, m: 4,  d: 18, label: 'Apr 2027' },
    'scene-ether':      { y: 2027, m: 4,  d: 25, label: 'Apr 2027' }
  };
  const tlWrap = document.getElementById('storyTimeline');
  const tlSvg = document.getElementById('storyTimelineSvg');
  const tlNow = document.getElementById('storyTimelineNow');
  // x position: Jan 2026 .. May 2027 mapped onto 10..210
  function tlX (w) { return 10 + (((w.y - 2026) * 12 + (w.m - 1) + w.d / 31) / 16.2) * 200; }
  function renderTimeline () {
    if (!tlWrap || !tlSvg) return;
    const cur = WHEN[activeId];
    if (!cur) { tlWrap.hidden = true; return; }
    tlWrap.hidden = false;
    const curT = (cur.y * 12 + cur.m) + cur.d / 31;
    let out = '<line class="tl-axis" x1="6" y1="22" x2="214" y2="22"/>' +
      '<text class="tl-year" x="10" y="40">JAN 2026</text>' +
      '<text class="tl-year" x="210" y="40" text-anchor="end">MAY 2027</text>';
    Object.keys(WHEN).forEach(id => {
      const w = WHEN[id];
      if (id === activeId) return;
      const t = (w.y * 12 + w.m) + w.d / 31;
      out += '<circle class="tl-tick' + (t < curT ? ' done' : '') + '" cx="' + tlX(w).toFixed(1) + '" cy="22" r="2.4"><title>' + w.label + '</title></circle>';
    });
    out += '<circle class="tl-now-ring" cx="' + tlX(cur).toFixed(1) + '" cy="22" r="5.4"/>' +
      '<circle class="tl-tick now" cx="' + tlX(cur).toFixed(1) + '" cy="22" r="2.8"/>';
    tlSvg.innerHTML = out;
    if (tlNow) {
      const idx = scenes.findIndex(sc => sc.id === activeId); // preface is 0
      tlNow.textContent = 'now reading: ' + cur.label + (idx > 0 ? ' · chapter ' + idx : '');
    }
  }

  // The expandable explainer: borrow the chart's own curated info overlay
  // (what it shows, why it matters, sources) so the rail stays in sync with
  // the full card below.
  function fillMore (href) {
    if (!more || !moreBody || moreFor === href) return;
    moreFor = href;
    more.removeAttribute('open'); // collapse when the chapter changes
    const body = document.querySelector(href + ' .viz-info-body');
    moreBody.innerHTML = body ? body.innerHTML : '';
  }

  function draw () {
    const v = VIZ[activeId];
    if (!v) { wrap.hidden = true; return; }
    wrap.hidden = false;
    pre.textContent = v.r(reduced ? 99 : since);
    cap.textContent = 'live data · ' + v.label;
    link.setAttribute('href', v.href);
    fillMore(v.href);
    since++;
  }

  function pickActive () {
    // A scene is "current" once it reaches its reading position. Stacked
    // cards pin at style.top, so a stuck card compares against its own pin
    // rather than the mid-viewport line (whose value deep pins can exceed).
    let cur = null;
    scenes.forEach(s => {
      const pin = parseFloat(s.style.top || '');
      const limit = isNaN(pin) ? window.innerHeight * 0.45 : Math.max(pin + 6, window.innerHeight * 0.45);
      if (s.getBoundingClientRect().top <= limit) cur = s.id;
    });
    if (cur !== activeId) { activeId = cur; since = 0; draw(); renderTimeline(); window.dispatchEvent(new CustomEvent('scene:active', { detail: cur })); }
  }

  window.addEventListener('scroll', pickActive, { passive: true });
  window.addEventListener('resize', pickActive);
  pickActive();
  // Pause the ticker when the tab is backgrounded so it doesn't run ~6.7x/sec
  // for the lifetime of the page.
  let ticker = null;
  function startTicker () { if (!reduced && !ticker) ticker = setInterval(draw, 150); }
  function stopTicker () { if (ticker) { clearInterval(ticker); ticker = null; } }
  document.addEventListener('visibilitychange', () => { document.hidden ? stopTicker() : startTicker(); });
  startTicker();
})();

// ============================================================
// YOU DRAW IT, guess the number before the data shows it (NYT-style).
// Five key stats get a guess slider inside their chapter; the reveal
// compares intuition to the sourced figure, and the outcome section
// totals the misses.
// ============================================================
(function(){
  const YDI = {
    talent:  { q: 'Top-tier AI researchers trained in the EU: what share ends up working in the US?',
               min: 0, max: 100, start: 30, truth: 60, fmt: v => v + '%', href: '#viz-talent', chart: 'Talent migration' },
    cloud:   { q: 'What share of Europe’s cloud market runs on US hyperscalers?',
               min: 0, max: 100, start: 35, truth: 70, fmt: v => v + '%', href: '#viz-cloud', chart: 'Cloud dependence' },
    langs:   { q: 'Of the EU’s 24 official languages, how many do frontier models support well?',
               min: 0, max: 24, start: 12, truth: 3, fmt: v => v + ' of 24', href: '#viz-language', chart: 'Language coverage' },
    capital: { q: 'US private AI investment in 2024 was $109B. How much was the EU’s?',
               min: 0, max: 109, start: 55, truth: 14, fmt: v => '$' + v + 'B', href: '#viz-ottawa', chart: 'Why pool' },
    energy:  { q: 'What share of France’s electricity is nuclear?',
               min: 0, max: 100, start: 35, truth: 70, fmt: v => v + '%', href: '#viz-energy', chart: 'France’s power edge' }
  };
  const KEY = 'afa_ydi_v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){}
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(e){} }

  function verdict(cfg, guess){
    const d = Math.abs(guess - cfg.truth);
    const span = cfg.max - cfg.min;
    if (d <= span * 0.05) return 'Dead on.';
    if (d <= span * 0.15) return 'Close, but the chart has the rest.';
    return 'Off by ' + cfg.fmt(d).replace(' of 24', '') + '. This is why the chapters carry data.';
  }

  function renderScore(){
    const el = document.getElementById('ydiScore');
    if (!el) return;
    const keys = Object.keys(YDI).filter(k => saved[k] !== undefined);
    if (!keys.length) { el.hidden = true; return; }
    let miss = 0;
    keys.forEach(k => { const c = YDI[k]; miss += Math.abs(saved[k] - c.truth) / (c.max - c.min); });
    const avg = Math.round((miss / keys.length) * 100);
    el.hidden = false;
    el.innerHTML = '<b>Your intuition vs the data:</b> ' + keys.length + ' of ' + Object.keys(YDI).length +
      ' stats guessed while reading · average miss ' + avg + ' points (of 100).' +
      (avg <= 10 ? ' You already knew the water was hot.' : avg <= 25 ? ' The gap is bigger than it feels.' : ' The status quo flatters itself.');
  }

  function reveal(box, key, guess, animate){
    const cfg = YDI[key];
    const pct = v => Math.round(((v - cfg.min) / (cfg.max - cfg.min)) * 100);
    box.classList.add('is-done');
    box.innerHTML =
      '<div class="ydi-kicker">your guess vs the data</div>' +
      '<div class="ydi-q">' + cfg.q + '</div>' +
      '<div class="ydi-bars">' +
        '<div class="ydi-bar-row"><span>you</span><div class="ydi-track"><i class="ydi-bar you" style="width:' + pct(guess) + '%"></i></div><b>' + cfg.fmt(guess) + '</b></div>' +
        '<div class="ydi-bar-row"><span>data</span><div class="ydi-track"><i class="ydi-bar truth" style="width:' + (animate ? 0 : pct(cfg.truth)) + '%"></i></div><b>' + cfg.fmt(cfg.truth) + '</b></div>' +
      '</div>' +
      '<p class="ydi-verdict">' + verdict(cfg, guess) + ' <a href="' + cfg.href + '">' + cfg.chart + ' &darr;</a></p>';
    if (animate) {
      const bar = box.querySelector('.ydi-bar.truth');
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct(cfg.truth) + '%'; }));
    }
    renderScore();
  }

  function build(box){
    const key = box.dataset.ydi;
    const cfg = YDI[key];
    if (!cfg) return;
    if (saved[key] !== undefined) { reveal(box, key, saved[key], false); return; }
    box.innerHTML =
      '<div class="ydi-kicker">before the data &middot; your guess</div>' +
      '<div class="ydi-q">' + cfg.q + '</div>' +
      '<div class="ydi-row">' +
        '<input type="range" min="' + cfg.min + '" max="' + cfg.max + '" step="1" value="' + cfg.start + '" aria-label="' + cfg.q.replace(/"/g, '&quot;') + '">' +
        '<output>' + cfg.fmt(cfg.start) + '</output>' +
      '</div>' +
      '<button type="button" class="ydi-lock">Lock in my guess</button>';
    const range = box.querySelector('input');
    const out = box.querySelector('output');
    range.addEventListener('input', () => { out.textContent = cfg.fmt(+range.value); });
    box.querySelector('.ydi-lock').addEventListener('click', () => {
      saved[key] = +range.value;
      persist();
      reveal(box, key, saved[key], true);
    });
  }

  document.querySelectorAll('.ydi[data-ydi]').forEach(build);
  renderScore();
})();

// ============================================================
// CAST CARDS, every chapter opens with its characters as small RPG-style
// dossiers (archetype, claim to fame, defining trait), so readers can parse
// who is speaking without holding the whole story in their head.
// ============================================================
(function(){
// Case-file dossier with two symbolic markers (no avatar): a flag or role glyph
// for who they answer to, and a faction pip + colour for their bloc. Markers and
// colours come from CastMarks (cast-markers.js), shared with the game chips.
function markerChip(key){
  return (window.CastMarks && CastMarks.has(key))
    ? '<span class="cast-flag" aria-hidden="true"><svg viewBox="0 0 18 12">' + CastMarks.faceInner(key) + '</svg></span>'
    : '';
}
function factionTag(key){
  if(!(window.CastMarks && CastMarks.has(key))) return '';
  return '<span class="cast-cat"><svg class="cast-pip" viewBox="0 0 10 10" aria-hidden="true">'
    + CastMarks.pipInner(CastMarks.facOf(key), '#FBF7EE') + '</svg>' + CastMarks.label(key) + '</span>';
}
function castCat(key){ return (window.CastMarks && CastMarks.has(key)) ? CastMarks.color(key) : 'var(--accent)'; }
  const CAST = {
    'scene-nyc': [
      { art: 'editor', name: 'The Editor-in-Chief', cls: 'gatekeeper', claim: 'decides what the world reads at breakfast', trait: 'will not print what is wrong' }
    ],
    'scene-dublin-apr': [
      { art: 'researcher', name: 'The Researcher', cls: 'narrator', claim: 'moved from the San Francisco office to Dublin', trait: 'survived the layoff round' },
      { art: 'aaron', name: 'Aaron', cls: 'policy lawyer', claim: 'kept OpenAI legal inside the EU', trait: 'hands you a hard drive on his way out' }
    ],
    'scene-berlin': [
      { art: 'chancellor', name: 'The German Chancellor', cls: 'cornered ally', claim: 'staked his reputation on Washington', trait: 'calls the bluff at 5am' },
      { art: 'pieter', name: 'Pieter', cls: 'the honest aide', claim: 'cannot reach the White House', trait: 'fetches coffee, hears everything' }
    ],
    'scene-brussels': [
      { art: 'execpres', name: 'The Executive President of Tech Sovereignty', cls: 'true believer, twice ignored', claim: 'gave this same speech six months ago', trait: 'throws away the script' }
    ],
    'scene-tokyo': [
      { art: 'japanpm', name: 'The Japanese Prime Minister', cls: 'iron politician', claim: 'sanctioned the \u00a51.067T sovereign model', trait: 'don\u2019t lie, don\u2019t tell the truth' },
      { art: 'proghead', name: 'The Program Head', cls: 'scapegoat engineer', claim: 'warned the model wasn\u2019t ready', trait: 'speaks to his shoes' }
    ],
    'scene-stockholm': [
      { art: 'swedishvc', name: 'The Swedish VC', cls: 'kingmaker', claim: 'founded the most popular streaming app on earth', trait: 'wants Stockholm to stay livable' },
      { art: 'estonian', name: 'The Estonian', cls: 'fintech billionaire', claim: 'co-founded Wise', trait: 'asks the rude questions' },
      { art: 'skype', name: 'The Skype Co-founder', cls: 'elder statesman', claim: 'has seen this movie before', trait: 'blunt with old employees' }
    ],
    'scene-monroe': [
      { art: 'electrician', name: 'The Electrician', cls: 'union local', claim: 'two years wiring Hyperion', trait: 'keeps his mouth shut, sees everything' }
    ],
    'scene-ottawa': [
      { art: 'saul', name: 'Evan Saul, The Minister', cls: 'newscaster turned minister', claim: 'runs Artificial Development and Digital Innovation', trait: 'weaponizes silence' },
      { art: 'nasr', name: 'Mona Nasr, Chief Science Officer', cls: 'empiricist', claim: 'warned about this for years', trait: 'measures everything, forgives nothing' }
    ],
    'scene-paris': [
      { art: 'frenchpres', name: 'The French President', cls: 'grandmaster', claim: 'raised $110B for French AI', trait: 'negotiates from the back of a moving car' }
    ],
    'scene-dublin-jan': [
      { art: 'aaron', name: 'Aaron', cls: 'whistle, half blown', claim: 'rose fast by being trusted', trait: 'a USB card under his tongue' },
      { art: 'patrick', name: 'Patrick', cls: 'the company\u2019s hand', claim: 'flew in from San Francisco overnight', trait: 'punctuates sentences like a boxer' }
    ],
    'scene-whitehouse': [
      { art: 'uspres', name: 'The President', cls: 'the godfather', claim: 'a trillion-dollar budget', trait: 'makes offers no lab refuses' }
    ],
    'scene-ether': [
      { art: 'coalition', name: 'The Coalition of the Doomed', cls: 'conference call', claim: 'prime ministers, chancellors, commissioners, VCs', trait: 'nobody signed' }
    ]
  };
  function esc (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  // Stable case number per character, in order of first appearance.
  let caseNo = 0; const caseId = {};
  Object.keys(CAST).forEach(id => CAST[id].forEach(c => {
    if (!(c.art in caseId)) caseId[c.art] = String(++caseNo).padStart(2, '0');
  }));
  Object.keys(CAST).forEach(id => {
    const scene = document.getElementById(id);
    if (!scene) return;
    const header = scene.querySelector('.scene-header');
    if (!header) return;
    const row = document.createElement('div');
    row.className = 'cast-row';
    row.setAttribute('aria-label', 'Characters in this chapter');
    row.innerHTML = CAST[id].map(c =>
      '<div class="cast-card" style="--cat:' + castCat(c.art) + '">' +
        '<div class="cast-head">' +
          markerChip(c.art) +
          '<span class="cast-case">CASE ' + caseId[c.art] + '</span>' +
          factionTag(c.art) +
        '</div>' +
        '<div class="cast-name">' + esc(c.name) + '</div>' +
        '<div class="cast-stat"><b>type</b><span>' + esc(c.cls) + '</span></div>' +
        '<div class="cast-stat"><b>claim</b><span>' + esc(c.claim) + '</span></div>' +
        '<div class="cast-stat"><b>trait</b><span>' + esc(c.trait) + '</span></div>' +
      '</div>').join('');
    header.insertAdjacentElement('afterend', row);
  });

  // A single roll-up of every character/stakeholder, tucked under the preface's
  // "2027: You Sleep With a Scorpion..." part line so readers can meet the
  // whole cast before the story proper starts.
  const preface = document.getElementById('scene-preface');
  if (preface) {
    const anchor = preface.querySelector('.scene-part') || preface.querySelector('.scene-header');
    if (anchor) {
      const seen = {}, all = [];
      Object.keys(CAST).forEach(id => CAST[id].forEach(c => {
        if (!(c.art in seen)) { seen[c.art] = true; all.push(c); }
      }));
      const det = document.createElement('details');
      det.className = 'cast-summary';
      det.innerHTML =
        '<summary class="cast-summary-bar">' +
          '<span class="cast-summary-label">The cast &middot; ' + all.length + ' characters &amp; stakeholders</span>' +
        '</summary>' +
        '<p class="cast-summary-intro">Everyone who moves through the twelve chapters, grouped by the bloc they answer to. Each gets a fuller dossier when they first appear.</p>' +
        '<ul class="cast-sum-grid">' + all.map(c =>
          '<li class="cast-sum-item" style="--cat:' + castCat(c.art) + '">' +
            '<span class="cast-sum-mark">' + markerChip(c.art) + '</span>' +
            '<div class="cast-sum-body">' +
              '<div class="cast-sum-name">' + esc(c.name) + '</div>' +
              '<div class="cast-sum-desc">' + esc(c.cls) + ' &middot; ' + esc(c.claim) + '</div>' +
            '</div>' +
            factionTag(c.art) +
          '</li>').join('') +
        '</ul>';
      anchor.insertAdjacentElement('afterend', det);
    }
  }
})();

// ============================================================
// AARON'S DRIVE, take the hard drive in chapter 2, carry it in the rail,
// plug it in at the outcome to mount the real documents behind the fiction.
// ============================================================
(function(){
  const chip = document.getElementById('usbPickup');
  const dock = document.getElementById('usbDock');
  if (!chip || !dock) return;
  const FILES = [
    { name: 'cloud_act_2018.pdf', note: 'the CLOUD Act, as enacted', href: 'https://www.congress.gov/bill/115th-congress/house-bill/4943' },
    { name: 'bis_advanced_computing_ifr_oct2022.pdf', note: '87 FR 62186, the first chip controls', href: 'https://www.federalregister.gov/documents/2022/10/13/2022-21658/implementation-of-additional-export-controls-certain-advanced-computing-and-semiconductor' },
    { name: 'ai_diffusion_framework_jan2025.pdf', note: '90 FR 4544, tiers by allegiance', href: 'https://www.federalregister.gov/documents/2025/01/15/2025-00636/framework-for-artificial-intelligence-diffusion' },
    { name: 'dod_cdao_frontier_contracts.eml', note: '$200M ceilings, all four labs', href: 'https://defensescoop.com/2025/07/14/pentagon-ai-contracts-musk-xai-google-openai-anthropic-cdao/' },
    { name: 'ai_index_2025_economy.xlsx', note: '$109.1B vs $14B, the money gap', href: 'https://hai.stanford.edu/ai-index/2025-ai-index-report/economy' },
    { name: 'dependency_memo_draft.txt', note: 'every figure on this site, sourced', href: 'research.html' }
  ];
  function state () { try { return sessionStorage.getItem('afa_usb') || ''; } catch (e) { return ''; } }
  function setState (v) { try { sessionStorage.setItem('afa_usb', v); } catch (e) {} }

  function railToken () {
    const aside = document.getElementById('storyAsciiWrap');
    if (!aside || document.getElementById('usbToken')) return;
    const t = document.createElement('div');
    t.id = 'usbToken';
    t.className = 'usb-token';
    t.textContent = 'in your pocket: unmarked drive';
    aside.parentNode.insertBefore(t, aside);
  }

  function renderDock () {
    dock.hidden = false;
    const st = state();
    if (st === 'mounted') {
      dock.innerHTML =
        '<div class="artifact artifact-files"><div class="artifact-label">AARON_BACKUP &middot; mounted &middot; verified against public record</div>' +
        FILES.map(f =>
          '<a class="file-row" href="' + f.href + '" target="_blank" rel="noopener"><b>' + f.name + '</b><span>' + f.note + '</span></a>').join('') +
        '</div>';
    } else if (st === 'taken') {
      dock.innerHTML =
        '<div class="usb-port"><span>You still have Aaron&rsquo;s drive.</span>' +
        '<button type="button" id="usbMount">[=] plug it in</button></div>';
      const b = document.getElementById('usbMount');
      if (b) b.addEventListener('click', () => { setState('mounted'); renderDock(); });
    } else {
      dock.hidden = true;
      dock.innerHTML = '';
    }
  }

  chip.hidden = false;
  if (state()) {
    chip.textContent = '[=] unmarked drive · taken';
    chip.classList.add('is-taken');
    chip.disabled = true;
    railToken();
  }
  chip.addEventListener('click', () => {
    if (state()) return;
    setState('taken');
    chip.textContent = '[=] unmarked drive · taken';
    chip.classList.add('is-taken');
    chip.disabled = true;
    railToken();
    renderDock();
  });
  renderDock();
})();

// ============================================================
// BRIEFING TOGGLE, every chapter flips between the fiction and a
// three-bullet policy briefing with its chart, for readers in policy mode.
// ============================================================
(function(){
  const BRIEFS = {
    'scene-nyc': { href: '#viz-export', chart: 'US export controls', bullets: [
      'The hinge: a US administration openly conditions allied access to its technology stack on alignment against China.',
      'Allies learn the terms from a front page, not through channels; the trust damage lands before the legal effect does.',
      'The precedent is real: ten US chip-control actions between 2022 and 2026, three of them reversed.'
    ]},
    'scene-dublin-apr': { href: '#viz-talent', chart: 'Talent migration', bullets: [
      'A US lab consolidates home and cuts its European offices in days; the people are suddenly available.',
      'Today roughly 60% of top EU-trained AI researchers already end up working in the US.',
      'Talent windows open briefly and close westward; catching one requires an employer that exists.'
    ]},
    'scene-berlin': { href: '#viz-cloud', chart: 'Cloud dependence', bullets: [
      'A US framework (the Digital Liberty Act) prices allied access by tiers: aligned, managed, restricted.',
      'About 70% of Europe&rsquo;s cloud runs on US hyperscalers; even &ldquo;sovereign&rdquo; stacks sit on Microsoft or Google.',
      'Germany&rsquo;s bind generalizes: comply against China and lose your economy, or refuse and lose your infrastructure.'
    ]},
    'scene-brussels': { href: '#viz-language', chart: 'Language coverage', bullets: [
      'The EU&rsquo;s core failure is coordination, not capability: fragmented capital, compute, and goals.',
      'Frontier models support 3 of 24 official EU languages well; 13 face digital extinction.',
      'The speech&rsquo;s ask: pool resources into one entity, or stop using the word sovereignty.'
    ]},
    'scene-tokyo': { href: '#viz-tokyo', chart: 'Japan&rsquo;s AI bet', bullets: [
      'An underfunded sovereign model is not sovereignty: Japan&rsquo;s &yen;1T model hallucinated a trade crisis into existence.',
      'A wrong model wired into government becomes the backbone of decision-making before anyone audits it.',
      'The inputs are also captive: China refines ~90% of the world&rsquo;s rare earths.'
    ]},
    'scene-stockholm': { href: '#viz-defense', chart: 'Defence-AI boom', bullets: [
      'Private European capital can move at strategic speed when the wedge is defense: Helsing &euro;12B, an estimated ~$18B in 2026.',
      'A multilateral defense champion is proof that strategic-grade tech can be built and funded in Europe.',
      'The cost: admitting that consumer tech success aided the gutting of Europe&rsquo;s infrastructure.'
    ]},
    'scene-monroe': { href: '#viz-capital', chart: 'Capital flow', bullets: [
      'The other side builds single $27B sites (Hyperion) while debating nothing.',
      'US private AI investment was $109B in 2024; the EU&rsquo;s was $14B.',
      'Grid strain and untested engineering are absorbed as routine costs of scale.'
    ]},
    'scene-ottawa': { href: '#viz-ottawa', chart: 'Why pool', bullets: [
      'The middle-power bind: Canada spent ~$15B on AI infrastructure in a decade; the US spent ~$470B in 2025 alone.',
      'Canada&rsquo;s offer is brains, not infrastructure: world-class researchers and a major lab (Cohere).',
      'Conclusion on the call: a third path needs a coalition of the doomed, and someone has to start dialing.'
    ]},
    'scene-paris': { href: '#viz-energy', chart: 'France&rsquo;s power edge', bullets: [
      'France&rsquo;s leverage is physical: ~70% nuclear electricity that can host real compute.',
      'A $110B private raise exists, but the GPUs age and the datacenters run behind schedule.',
      'The play: respond as a bloc within 48 hours, because alone every member buckles.'
    ]},
    'scene-dublin-jan': { href: '#viz-brain', chart: 'Brain drain', bullets: [
      'How capture works inside a lab: a compliance professional radicalized by what he printed.',
      'Legal does not mean aligned with allied interests; the company&rsquo;s mandate is value, not alliance.',
      'Evidence wants out: the chapter ends with the receipts leaving the building.'
    ]},
    'scene-whitehouse': { href: '#viz-pentagon', chart: 'Pentagon money', bullets: [
      'The labs formally become strategic assets: Department of War investment, undisclosed size, one condition.',
      'The real-world anchor: $200M Pentagon ceilings each for OpenAI, Anthropic, Google, and xAI in 2025.',
      'Allied collateral (Luxembourg&rsquo;s China trade) is priced at zero in the deal.'
    ]},
    'scene-ether': { href: '#viz-ether', chart: 'Pooled vs alone', bullets: [
      'The way out is institutional: a two-page instrument, not a communiqu&eacute;.',
      'Article II is the core: pooled compute, jointly owned weights, no third-state kill switch.',
      'Alone, no member clears a quarter of the US level; pooled, compute and talent approach frontier scale.'
    ]}
  };
  Object.keys(BRIEFS).forEach(id => {
    const scene = document.getElementById(id);
    if (!scene) return;
    const b = BRIEFS[id];
    const bar = document.createElement('div');
    bar.className = 'brief-bar';
    bar.innerHTML = '<button type="button" class="brief-toggle" aria-pressed="false">read it as a briefing</button>';
    const brief = document.createElement('div');
    brief.className = 'scene-brief';
    brief.innerHTML =
      '<div class="artifact-label">The briefing &middot; what this chapter argues</div>' +
      '<ul>' + b.bullets.map(t => '<li>' + t + '</li>').join('') + '</ul>' +
      '<a class="brief-chart" href="' + b.href + '">the data: ' + b.chart + ' &darr;</a>';
    const cast = scene.querySelector('.cast-row');
    const anchor = cast || scene.querySelector('.scene-header');
    if (!anchor) return;
    anchor.insertAdjacentElement('afterend', bar);
    bar.insertAdjacentElement('afterend', brief);
    const btn = bar.querySelector('.brief-toggle');
    btn.addEventListener('click', () => {
      const on = scene.classList.toggle('as-brief');
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'back to the story' : 'read it as a briefing';
    });
  });
})();

// ============================================================
// LIVE DATA ENTRANCES: cards rise in on scroll, chart marks pop with a
// stagger, headline numerals count up. Skipped under reduced motion.
// ============================================================
(function(){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver !== 'function') return;
  const cards = document.querySelectorAll('.supporting-data-grid .viz-card, .scene-fig');
  if (!cards.length) return;
  document.documentElement.classList.add('viz-anim');

  function countUp (el) {
    const m = el.textContent.match(/^([^0-9]*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    const target = parseFloat(m[2]);
    const dec = (m[2].split('.')[1] || '').length;
    const t0 = performance.now(), dur = 900;
    function tick (t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + (target * e).toFixed(dec) + m[3];
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      en.target.querySelectorAll('.viz-mini-value').forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 });
  cards.forEach(c => io.observe(c));
})();

// ============================================================
// CARD LIGHTBOX: click a live-data card to expand it. The real node moves
// into the overlay (canvases re-render crisp and keep animating), then
// returns to its place in the pile on close.
// ============================================================
(function(){
  const grid = document.querySelector('.supporting-data-grid');
  if (!grid) return;
  const lb = document.createElement('div');
  lb.className = 'viz-lightbox';
  lb.innerHTML = '<div class="viz-lightbox-card" role="dialog" aria-label="Expanded chart"></div>';
  const slot = lb.firstChild;
  document.body.appendChild(lb);
  let openCard = null, marker = null;
  function open (card) {
    if (openCard) close();
    marker = document.createElement('div');
    marker.style.height = card.offsetHeight + 'px';
    card.parentNode.insertBefore(marker, card);
    slot.appendChild(card);
    card.classList.add('is-expanded');
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    openCard = card;
    window.dispatchEvent(new Event('resize'));
  }
  function close () {
    if (!openCard) return;
    marker.parentNode.insertBefore(openCard, marker);
    marker.remove(); marker = null;
    openCard.classList.remove('is-expanded');
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    openCard = null;
    window.dispatchEvent(new Event('resize'));
  }
  grid.addEventListener('click', e => {
    const card = e.target.closest('.viz-card');
    if (!card || card.classList.contains('is-expanded')) return;
    if (e.target.closest('a, button, details, summary, input, label')) return;
    open(card);
  });
  lb.addEventListener('click', e => { if (!e.target.closest('.viz-card')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
