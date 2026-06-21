#!/usr/bin/env python3
"""
Sovereign AI Consortium Decision Tree — Service Account Deployment

Uses the service account to:
  1. Create and populate the Google Spreadsheet
  2. Create the Google Document
  3. Share both to the target Drive folder
  4. Generate a beautiful static HTML visual tree
  5. Commit and push to GitHub Pages

The web app URL will be:
  https://www.artificialnouveau.com/publicai/sovereign-ai-decision-tree/
"""

import json, os, subprocess, textwrap
from pathlib import Path

SA_FILE    = '/Users/ahnjili_harmony/Documents/google_credentials_service.json'
FOLDER_ID  = '1qpCoDTH92V7amjDJTQk9tRsXtmudy6IG'
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
USER_EMAIL = 'artificialnouveau@gmail.com'
OUTPUT_DIR = REPO_ROOT / 'sovereign-ai-decision-tree'

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
]

# ── data ─────────────────────────────────────────────────────────────────────

BRANCHES = [
    ('A','Political and Governance',
     'Who owns the consortium, who decides, and how it positions itself in the world. Every other branch inherits these answers.'),
    ('B','Product and Technology',
     'What you actually build, how open it is, and who it serves. Constrained by Branch A governance and Branch C compute reality.'),
    ('C','Compute and Infrastructure',
     'The physical foundation. Without resolved compute, energy, and chip access, the product branch cannot deliver. This is where sovereignty is most often won or lost.'),
    ('D','Funding and Economic Model',
     'Where the money comes from, how the consortium sustains itself, and who owns the value created. Funding choices follow control choices in Branch A.'),
    ('E','Talent and Research',
     'People are scarcer than chips. How the consortium attracts, organizes, and retains researchers shapes whether the build succeeds.'),
    ('F','Security, Safety, and Compliance',
     'How the consortium prevents misuse, secures its systems, and proves it is trustworthy to members and the public.'),
    ('G','Legal, Ethical, and Data Sovereignty',
     'Where data lives, whose rights govern it, and who is liable when things go wrong. These choices underpin public trust and legal durability.'),
    ('H','Outcomes and Real-World Players',
     'What consortium model does each path actually produce, and who are the real entities shaping this landscape now? Context from current geopolitics and the sovereign AI debate.'),
]

NODES = [
    ('A1','A','Who holds sovereign control?',
     'Pick the ownership and authority model. This defines the legal home, the chain of command, and who can veto.'),
    ('A2','A','How are decisions made among members?',
     'Choose the governance mechanism that resolves disputes and sets strategy.'),
    ('A3','A','What is the geopolitical posture?',
     'Decide how the consortium relates to existing technology blocs and rivals.'),
    ('A4','A','What is the regulatory stance?',
     'Set the rule baseline the consortium will hold itself to across members.'),
    ('B1','B','Build, adapt, or license the foundation model?',
     'The single most expensive technical choice. It sets your compute bill, your timeline, and your independence.'),
    ('B2','B','Open or closed weights for what you build?',
     'Decide how widely the resulting models can be inspected, reused, and redistributed.'),
    ('B3','B','What is the product focus?',
     'Choose where the consortium concentrates effort first. Trying to do everything dilutes a young program.'),
    ('B4','B','What is the language and cultural scope?',
     'Sovereign programs often justify themselves on serving local languages and values. Decide the reach.'),
    ('C1','C','Where does compute live?',
     'Decide the hosting model for training and serving. This is the core of technical sovereignty.'),
    ('C2','C','How is chip supply secured?',
     'Access to advanced accelerators is the chief chokepoint. Resolve it before committing to training scope.'),
    ('C3','C','What is the energy strategy?',
     'Large clusters need stable, affordable power. Site and source decisions shape cost and emissions.'),
    ('D1','D','What is the capital source?',
     'Decide who funds the build and on what terms. This drives expectations on returns and control.'),
    ('D2','D','What is the revenue model?',
     'Choose how, or whether, the consortium earns income to sustain itself.'),
    ('D3','D','Who owns the intellectual property?',
     'Decide where models, data assets, and tooling legally sit. This often becomes the hardest negotiation.'),
    ('E1','E','How is talent sourced?',
     'Decide where the core research and engineering team comes from.'),
    ('E2','E','How is research organized?',
     'Choose the structure that balances focus with member participation.'),
    ('F1','F','How is safety governed?',
     'Decide who sets and enforces safety standards for the models and products.'),
    ('F2','F','How is access and export controlled?',
     'Decide who can use the models and how distribution is restricted.'),
    ('F3','F','How are incidents and misuse handled?',
     'Decide the response model for security breaches and harmful use.'),
    ('G1','G','What is the data residency rule?',
     'Decide where training and user data is stored and processed.'),
    ('G2','G','What rights and consent framework applies?',
     'Decide the legal basis for using personal and public data and protecting individuals.'),
    ('G3','G','Who bears liability?',
     'Decide where legal and financial responsibility rests when systems cause harm.'),
    ('H1','H','What consortium model does this path produce?',
     'Different combinations of A-G choices converge on recognizable institutional archetypes.'),
    ('H2','H','Which existing European and allied AI players are in scope?',
     'The coalition does not start from zero. Existing labs, research groups, and industrial champions can be absorbed or partnered.'),
    ('H3','H','What chip and infrastructure players must be negotiated with?',
     'Compute sovereignty depends on a small number of critical hardware suppliers, cloud providers, and semiconductor tool makers.'),
    ('H4','H','What U.S. model providers are negotiating partners or risks?',
     'Before a sovereign model exists, the consortium will rely on or resist U.S. frontier models.'),
    ('H5','H','What geopolitical triggers accelerate or kill the project?',
     'The "Fable scenario" — a U.S. export control that cuts allied access to frontier AI — is the clearest trigger.'),
]

OPTIONS = [
    ('A1-1','A1','Single nation','One government owns and directs the consortium.',
     'Fast decisions and clear accountability, but limited scale and harder regional buy in.','A2, D1'),
    ('A1-2','A1','Regional bloc','A group of allied states co own under a treaty or charter.',
     'Pooled compute, capital, and talent, but slower governance and alignment costs.','A2, A3'),
    ('A1-3','A1','Public institution group','National labs, universities, and agencies form the core.',
     'Strong research base and neutrality, but weaker commercial muscle.','B3, E2'),
    ('A1-4','A1','Public and private mix','States anchor it with industry as co investors.',
     'Capital and speed, but tension over control and profit.','D1, D3'),
    ('A2-1','A2','Consensus','Every member must agree on major moves.',
     'Maximum legitimacy, but vulnerable to gridlock and one member stalling.','A4'),
    ('A2-2','A2','Weighted voting','Votes scale with contribution of money, compute, or data.',
     'Rewards investment, but can entrench the largest member.','D1, D3'),
    ('A2-3','A2','Lead member plus board','One member steers, advised by the others.',
     'Speed and clarity, but risk of smaller members feeling captured.','A3'),
    ('A2-4','A2','Rotating chair','Leadership rotates on a fixed schedule.',
     'Shared ownership feeling, but strategy can lurch between terms.','A4'),
    ('A3-1','A3','Aligned with a bloc','Tie supply, standards, and security to one camp.',
     'Access to chips and partners, but dependence and reduced autonomy.','C2, F2'),
    ('A3-2','A3','Nonaligned','Stay neutral and trade with multiple sides.',
     'Maximum independence, but harder access to leading hardware.','C2'),
    ('A3-3','A3','Selective bilateral','Cut issue by issue deals with several partners.',
     'Flexibility, but constant negotiation and exposure to pressure.','A4, F2'),
    ('A4-1','A4','Strictest member standard','Adopt the toughest existing rule among members.',
     'High trust and export friendliness, but slower and costlier to ship.','G2'),
    ('A4-2','A4','New common standard','Write a fresh shared framework from scratch.',
     'Coherence and ownership, but long to negotiate and ratify.','G2, G3'),
    ('A4-3','A4','Sector by sector','Different rules for health, defense, public services.',
     'Pragmatic and fast in low risk areas, but fragmented to manage.','B3, F1'),
    ('B1-1','B1','Train from scratch','Build your own frontier model end to end.',
     'Full sovereignty and IP, but enormous cost, talent, and compute demands. The Moonshot path: absorb Mistral/Cohere/CuspAI talent, ~$500B total.','C1, D1, E1'),
    ('B1-2','B1','Adapt open weights','Start from strong open models (e.g., next-gen Mistral, DeepSeek-class).',
     'Faster and cheaper, but dependent on upstream releases and licenses. Fast-follower path — fails under Fable scenario when frontier is locked down.','B2, G1'),
    ('B1-3','B1','License a closed model','Run an Anthropic/OpenAI model inside sovereign infrastructure.',
     'Fast capability, but limited control and ongoing vendor dependence. Viable only if the Fable scenario does not materialize.','F2, G3'),
    ('B2-1','B2','Fully open','Release weights publicly for any member or citizen use.',
     'Trust, ecosystem growth, and scrutiny, but weaker control over misuse.','F2, F3'),
    ('B2-2','B2','Open with limits','Release under a license that restricts certain uses.',
     'Balance of openness and guardrails, but enforcement is hard.','F2, G2'),
    ('B2-3','B2','Closed','Keep weights internal to members and approved partners.',
     'Maximum control, but less ecosystem and slower external trust.','F2'),
    ('B3-1','B3','General platform','A broad model and API for many uses.',
     'Wide impact, but competes directly with global incumbents.','B4, D2'),
    ('B3-2','B3','Public sector services','Tools for government, courts, health, education.',
     'Clear mandate and funding, but procurement and trust hurdles.','G1, F1'),
    ('B3-3','B3','Strategic sectors','Focus on defense, energy, or critical infrastructure.',
     'High value and political backing, but heavy security burden.','F1, F2'),
    ('B3-4','B3','Industry tooling','Horizontal tools for member country firms.',
     'Economic returns and adoption, but needs commercial polish.','D2, E1'),
    ('B4-1','B4','Member languages first','Prioritize the languages of member populations.',
     'Strong local relevance and legitimacy, but smaller data pools.','G1, E1'),
    ('B4-2','B4','Multilingual from the start','Serve many languages at launch.',
     'Broad usefulness, but spreads scarce data and evaluation effort.','C1, D2'),
    ('B4-3','B4','Single common language','Build mainly in one shared working language.',
     'Simplicity and speed, but weaker on the sovereignty promise.','B3'),
    ('C1-1','C1','Sovereign datacenters','Build and operate facilities on member soil.',
     'Full control and data residency. The Moonshot: ~5-6 GW across Norway, France, Iberia, Germany deindustrialized zones. High capital and long lead times.','C3, D1'),
    ('C1-2','C1','Trusted regional cloud','Use vetted providers (e.g., CuspAI or European cloud) within the region.',
     'Faster start and lower upfront cost, but reliance on the provider.','G1, F2'),
    ('C1-3','C1','Hybrid','Own core training, rent burst and serving capacity.',
     'Balances control and flexibility, but complex to secure and govern.','C2, F2'),
    ('C2-1','C2','Import under agreements','Buy Nvidia Blackwell-class chips through trade and licensing deals.',
     'Quick access to leading chips. Nvidia has strong incentive to sell (prefers diverse buyers). Exposed to U.S. export controls.','A3, F2'),
    ('C2-2','C2','Domestic fabrication','Invest in local chip manufacturing (e.g., TSMC partnership, Samsung Foundry).',
     'Long term independence, but very costly and slow to mature. 15+ year timeline for full capacity.','D1, E1'),
    ('C2-3','C2','Mixed with reserves','Import now (Nvidia) while building ASML-leveraged coercion shield.',
     'Resilience against shocks. The Moonshot: use ASML EUV access as anti-coercion instrument against U.S. export controls.','D1, C3'),
    ('C3-1','C3','Dedicated generation','Build or contract power directly for the clusters.',
     'Reliable and controllable, but adds a major project to manage.','D1'),
    ('C3-2','C3','Priority grid access','Secure guaranteed capacity from the public grid.',
     'Lower build burden, but exposed to grid stress and policy shifts.','D1'),
    ('C3-3','C3','Locate near power','Site clusters where energy is cheap and abundant (Norway hydro, France nuclear, Iberia solar).',
     'Low cost and clean options. Germany built LNG terminals in 10 months in 2022 — precedent for crisis-speed infrastructure.','C1, G1'),
    ('D1-1','D1','Government appropriations','Member treasuries fund the program directly.',
     'Stable and mission aligned, but exposed to budget and election cycles.','D2'),
    ('D1-2','D1','Sovereign and development funds','Wealth funds or development banks invest.',
     'Patient large capital, but expects governance and return discipline.','D3'),
    ('D1-3','D1','Private investment with states','Industry invests alongside member governments.',
     'Speed and scale, but pressure for commercial returns and control. Crowd in legacy industries with deep cash reserves.','A1, D3'),
    ('D1-4','D1','Mixed','Blend public anchor with private investment and grants.',
     'The Moonshot total: ~$500B — compute ($275-300B), talent ($65B), political insulation ($80B), interim rental ($25B). Diversified but complex.','D2, D3'),
    ('D2-1','D2','Public good','Funded by states, free at the point of use.',
     'Maximum access and trust, but permanently dependent on budgets.','G3'),
    ('D2-2','D2','Commercial licensing','Charge firms and partners for access.',
     'Self sustaining over time. Partial privatization (Airbus model) can return capital to treasuries. But pulls focus toward paying customers.','B3, D3'),
    ('D2-3','D2','Tiered','Free public tier, paid commercial tier.',
     'Balances mission and revenue, but needs careful boundary setting.','B3, G2'),
    ('D3-1','D3','Held by the consortium','A central legal entity owns the IP.',
     'Coherent and easy to license, but members may resist pooling.','G3'),
    ('D3-2','D3','Shared by members','Members co own with agreed usage rights.',
     'Fair and politically palatable, but slow and litigious to manage.','A2, G3'),
    ('D3-3','D3','Open licensed','Release IP under open terms by default.',
     'Trust and ecosystem, but forgoes a major revenue lever.','B2, D2'),
    ('E1-1','E1','Repatriate diaspora','Recruit nationals working abroad to return.',
     'Aligned and loyal talent. Middle power nationals at American labs (Anthropic, OpenAI, DeepMind) are the primary pool. Limited and contested.','E2'),
    ('E1-2','E1','Recruit globally','Hire the best regardless of nationality.',
     'Top capability quickly, but visa, security, and trust questions. The Moonshot: ~150 senior researchers at $5-8M/year each, plus buying out unvested frontier-lab equity (~$10B).','F2, F3'),
    ('E1-3','E1','Train domestically','Invest in universities and fellowships at home.',
     'Durable long term pipeline, but slow to produce frontier talent.','E2, D1'),
    ('E2-1','E2','Central lab','One flagship lab concentrates the work.',
     'Focus and speed, but other members may feel sidelined.','C1'),
    ('E2-2','E2','Federated labs','Each member runs a node in a shared program.',
     'Broad buy in and local capacity, but coordination overhead.','A2, F3'),
    ('E2-3','E2','University partnerships','Anchor research in academic institutions.',
     'Talent pipeline and openness, but slower translation to product.','B3'),
    ('F1-1','F1','Independent body','An arm length safety authority — modeled on the UK AI Safety Institute.',
     'Credibility and trust. The Moonshot: country-level czars at ministerial rank with high-caliber policy teams as government liaisons.','F3, A4'),
    ('F1-2','F1','Internal team','Safety sits inside the build organization.',
     'Fast and informed, but vulnerable to pressure to ship.','F3'),
    ('F1-3','F1','Shared with regulators','Co govern with member country regulators.',
     'Strong legitimacy, but exposed to differing national rules.','G2, A4'),
    ('F2-1','F2','Members only','Access limited to member states and vetted users.',
     'Tight control, but limits reach and economic return.','B2, D2'),
    ('F2-2','F2','Tiered access','Different capability levels for different users.',
     'Flexible and risk aware, but complex to define and police.','G2'),
    ('F2-3','F2','Open with monitoring','Broad access with usage logging and review.',
     'Reach and openness, but heavy monitoring burden and privacy tension.','G1, G2'),
    ('F3-1','F3','Centralized response','One team owns detection and response.',
     'Consistent and fast, but a single point of overload.','F1'),
    ('F3-2','F3','Member level response','Each member handles incidents locally.',
     'Local context and speed, but uneven standards and gaps.','A2'),
    ('F3-3','F3','Shared protocol','Common playbook executed by all members.',
     'Coordinated and scalable, but requires constant joint drilling.','F1, A2'),
    ('G1-1','G1','Strictly in region','All data stays within member borders.',
     'Strong sovereignty claim, but limits cloud and partner options.','C1, C3'),
    ('G1-2','G1','Federated with localization','Data stays local but is queried across nodes.',
     'Balance of sovereignty and scale, but complex to engineer.','C1, F2'),
    ('G1-3','G1','Cross border under treaty','Data moves under agreed legal protections.',
     'Flexibility and scale, but depends on durable agreements.','A3, G2'),
    ('G2-1','G2','Strictest member law','Apply the toughest member standard everywhere (GDPR baseline).',
     'High trust and portability, but the most restrictive on data use.','B1, A4'),
    ('G2-2','G2','New common framework','Draft a shared rights regime for the consortium.',
     'Coherence and clarity, but slow and politically heavy.','A4, G3'),
    ('G2-3','G2','Sector specific','Tailor consent rules to each domain.',
     'Practical and proportionate, but fragmented and harder to audit.','B3, F1'),
    ('G3-1','G3','Consortium bears','The central entity is liable.',
     'Clear for users and partners, but concentrates risk and cost.','D3'),
    ('G3-2','G3','Members bear','Each member is liable for its own use.',
     'Aligns risk with control, but creates uneven exposure.','A2'),
    ('G3-3','G3','Shared','Liability is apportioned by an agreed formula.',
     'Fair in principle, but disputes are likely and slow to settle.','A2, D3'),
    # H — Outcomes and Real Players
    ('H1-1','H1','Airbus Model',
     'State-backed consortium with shared public ownership, built to reach commercial viability. Governments absorb early risk; partial privatization returns capital. The Moonshot: EU+Canada+Australia core, ~$500B over four years.',
     'Best chance at frontier parity and commercial sustainability. Requires extraordinary political will and a coercion shield against U.S. chip export controls.',
     'A1, D1, E1'),
    ('H1-2','H1','CERN Model',
     'Pure public-good research consortium. Members fund in proportion to GDP; outputs are open to all. Rotating scientific leadership. No commercial products.',
     'High legitimacy and easy to defend politically. Does not produce a deployable product competitive with U.S. or Chinese frontier models. Fails the sovereignty test under Fable scenario.',
     'B2, D2'),
    ('H1-3','H1','National Champion',
     'One country leads; others participate as junior partners. France+Mistral is the current attempt. UK could lead with CuspAI/DeepMind talent. The lead nation absorbs political and financial risk.',
     'Faster to launch and easier to govern. Structural dependency on the lead nation — if it defects or its policy changes, the project collapses.',
     'A1-1, D1'),
    ('H1-4','H1','Fast-Follower Alliance',
     'No attempt at the frontier. Standardizes on a second-tier open-weight model (next-generation Mistral, DeepSeek-class), deploys across member governments, negotiates sovereign terms with U.S. labs.',
     'Far cheaper and faster to implement. Does not solve the access problem under Fable scenario. Works as a hedge, not a sovereign strategy. Increasingly unviable as frontier/second-best gap widens.',
     'B1-2, F2'),
    ('H1-5','H1','Managed Dependency',
     'No autonomous model. Negotiates legally binding access agreements with U.S. providers (Anthropic, OpenAI, Google DeepMind), possibly backed by infrastructure investment or equity co-ownership.',
     'Lowest cost. Fails under the specific Fable scenario: a maximally volatile U.S. executive that ignores interdependence. Works only if the worst-case U.S. scenario does not materialize.',
     'A3, F2'),
    ('H2-1','H2','Mistral (France)',
     'Europe\'s highest-profile frontier-adjacent lab. Open-weight models competitive below the frontier. EU institutional backing, French government support, commercial traction.',
     'Real talent, real models, real infrastructure relationships. Not at the frontier. The Moonshot: useful as talent pool and base layer to absorb into the larger project, not as organizing entity.',
     'E1, B1'),
    ('H2-2','H2','Cohere / Aleph Alpha (Canada/Germany)',
     'Enterprise AI labs with government ties. Cohere focuses on enterprise APIs; Aleph Alpha has German federal contracts. Below the frontier but original research and government credibility.',
     'Valuable for government deployment relationships and multilingual capabilities. Flagged as structurally insufficient models for the sovereign project — have not achieved frontier parity.',
     'B3, E1'),
    ('H2-3','H2','CuspAI (UK)',
     'UK-based AI compute and infrastructure company focused on sovereign AI capability. Positioned at the intersection of government security requirements and frontier AI deployment.',
     'Strong alignment with consortium security and sovereignty goals. UK political uncertainty about joining a non-U.S.-aligned project is the main risk.',
     'C1, F1'),
    ('H2-4','H2','ASML and European Semiconductor Leverage',
     'ASML (Netherlands) produces the EUV lithography machines without which no one can manufacture leading-edge chips. Europe\'s most powerful AI leverage point.',
     'The Moonshot\'s coercion shield: if U.S. attempts to block chip exports, coalition can threaten EUV access. This turns ASML from a passive asset into an active diplomatic instrument. Politically sensitive and a one-shot card.',
     'C2, A3'),
    ('H3-1','H3','Nvidia',
     'Dominant supplier of AI accelerators (H100, B200, Blackwell). The Moonshot: ~3M Blackwell-class chips needed, ~$275-300B total. Nvidia prefers diverse buyers over U.S. monopsony — can be a U.S.-internal advocate for allowing sales.',
     'Critical path dependency. U.S. export controls could restrict sales. Nvidia\'s commercial interests make it a potential ally. The consortium should court Nvidia, not just pay it.',
     'C2, A3'),
    ('H3-2','H3','AWS / Azure / Google Cloud',
     'U.S. hyperscalers currently provide most compute for non-frontier AI in middle powers. Trusted regional cloud (C1-2) would route through one of these with negotiated data residency and sovereignty terms.',
     'Fast to deploy, well-understood operationally. Politically and legally complex — data residency commitments can be reversed, subject to U.S. jurisdiction, access can be revoked under Fable-type scenarios.',
     'C1, G1'),
    ('H3-3','H3','TSMC / Samsung Foundry',
     'Taiwan and South Korea produce the chips Nvidia designs. Domestic fabrication (C2-2) requires partnering with or competing against these foundries, or building a new fab (15+ year timeline).',
     'Long-term chip independence requires foundry access or ownership. TSMC\'s geopolitical position (Taiwan Strait risk) is itself a sovereignty concern.',
     'C2, A1'),
    ('H4-1','H4','Anthropic',
     'Frontier lab with the strongest safety focus. Has limited model access for competing frontier AI development. The Fable scenario references Anthropic\'s Fable 5 being shut down by U.S. export controls — directly inspiring this decision tree.',
     'Potential partner on safety standards. Active antagonist if the consortium\'s goal is frontier parity — Anthropic has explicit policy against helping build competing frontier systems.',
     'F1, A3'),
    ('H4-2','H4','OpenAI',
     'Dominant model provider with the broadest API access. The Moonshot suggests OpenAI may sell coding agent contracts to the consortium in early stages, positioning itself as less restrictive than Anthropic.',
     'Useful for bootstrapping the consortium\'s AI workforce before a sovereign model exists. Long-term dependence on OpenAI reproduces the problem the consortium is trying to solve.',
     'E1, B1'),
    ('H4-3','H4','xAI / Grok',
     'Elon Musk\'s AI lab. Now renting compute to Anthropic, suggesting financial stress at the second tier. Potentially willing to sell compute at favorable terms to the consortium.',
     'Geopolitically complex given Musk\'s relationship with U.S. government. Some consortium members\' domestic politics would make the association controversial.',
     'C1, A3'),
    ('H4-4','H4','Google DeepMind',
     'UK-headquartered but U.S.-controlled. Has the deepest scientific talent and longest research track record. UK government relationships may create a special channel for the consortium.',
     'UK DeepMind staff represent a potential talent recruitment pool, especially given growing concerns about commercialization pressure. Parent company U.S. jurisdiction remains the binding constraint.',
     'E1, F1'),
    ('H5-1','H5','The Fable Scenario',
     'A U.S. executive action shuts down or restricts a frontier AI model as domestic policy, with allied access cut as collateral damage. The clearest trigger for coalition formation. Named after Anthropic\'s Fable 5 model.',
     'Makes the case for the sovereign project more compelling than any policy paper. Also creates a political window for rapid coalition formation. Risk: may come too late, after the U.S. frontier has pulled too far ahead.',
     'A1, A3, D1'),
    ('H5-2','H5','Gradual Access Tiering',
     'The U.S. establishes a country-tier system for AI inference access. Europe 2031 scenario: most of Europe lands in Tier 2 with compute allocations halved as the U.S. faces compute scarcity.',
     'Less politically dramatic but more economically damaging. Creates sustained pressure without a single crisis moment. The consortium\'s case is harder to make, but the underlying need is the same.',
     'A3, C2, D1'),
    ('H5-3','H5','Semiconductor Coercion',
     'The U.S. pressures the Netherlands to cut ASML exports (to China or the consortium). Europe 2031: the Netherlands caves without EU support — the consortium structure prevents this through collective commitment.',
     'The ASML leverage is a finite card. Once spent protecting one bilateral relationship, it is no longer available. The consortium structure is specifically designed to pool this leverage.',
     'C2, A3, A1'),
    ('H5-4','H5','Chinese Competitive Pressure',
     'China\'s AI development forces a security framing even absent U.S. restrictions. DeepSeek/Kimi as the Chinese alternative — choosing not to build sovereign AI means choosing between U.S. and Chinese dependence.',
     'China\'s open-source releases (DeepSeek R1) temporarily cheapen fast-follower AI but also spread offensive capabilities. The consortium offers a third option: non-Chinese, non-U.S. frontier AI.',
     'A3, B1, F2'),
]

CRITICAL_PATH = [
    (1,'A1','Control',
     'Decide who owns and directs the consortium before anything else. The Airbus Model (H1-1) requires multi-government co-ownership; the National Champion (H1-3) requires one lead nation.'),
    (2,'A2','Decision rule',
     'Agree how members break ties. The Moonshot flags defection risk — weighted voting with precommitted resources is the strongest defense against bilateral U.S. buyouts of individual members.'),
    (3,'A3','Geopolitical posture',
     'Your alignment determines whether you can buy the chips your product plans assume. A nonaligned stance paired with ASML leverage (H2-4, H3-1) is The Moonshot coercion shield strategy.'),
    (4,'B1','Foundation model approach',
     'The Moonshot is explicit: only training from scratch (absorbing talent from Mistral, Cohere, CuspAI) achieves genuine sovereignty. Fast-follower (H1-4) fails under the Fable scenario when the frontier is locked down.'),
    (5,'C1, C2','Compute location and chips',
     'The Moonshot estimate: ~3M Blackwell-class chips (Nvidia), 5-6 GW of datacenter power, ~$275-300B. ASML (H2-4) is the coercion shield. Norway, France, Iberia, and Germany are the preferred datacenter hosts.'),
    (6,'D1','Capital source',
     'The Moonshot total: ~$500B over four years — compute ($275-300B), talent ($65B), political insulation ($80B), interim compute rental ($25B). Requires treasury-level commitment from multiple coalition governments.'),
    (7,'G1, G2','Data residency and rights',
     'Lock these before training. European member states bring GDPR frameworks; the new common standard approach (G2-2) creates coherence but requires treaty-level negotiation.'),
    (8,'F1','Safety governance',
     'Stand up oversight early. The Moonshot recommends country-level czars at ministerial rank with high-caliber policy teams — modeled on the UK AI Safety Institute — as government liaisons to the technical organization.'),
]

# ── spreadsheet ──────────────────────────────────────────────────────────────

def create_spreadsheet(services):
    print('  Creating Google Spreadsheet...')
    ss = services['sheets'].spreadsheets().create(body={
        'properties': {'title': 'Sovereign AI Consortium — Decision Tree Data'},
        'sheets': [
            {'properties': {'title': 'Branches',     'index': 0}},
            {'properties': {'title': 'Nodes',        'index': 1}},
            {'properties': {'title': 'Options',      'index': 2}},
            {'properties': {'title': 'CriticalPath', 'index': 3}},
        ]
    }).execute()
    ss_id = ss['spreadsheetId']

    def sid(name):
        return next(s['properties']['sheetId']
                    for s in ss['sheets']
                    if s['properties']['title'] == name)

    rows_branches = [['id','name','description']] + list(BRANCHES)
    rows_nodes    = [['id','branch_id','question','description']] + [list(n) for n in NODES]
    rows_options  = [['id','node_id','label','what_it_means','key_tradeoffs','leads_to']] + [list(o) for o in OPTIONS]
    rows_cp       = [['step','node_id','title','description']] + [list(c) for c in CRITICAL_PATH]

    services['sheets'].spreadsheets().values().batchUpdate(
        spreadsheetId=ss_id,
        body={'valueInputOption': 'RAW', 'data': [
            {'range': 'Branches!A1',     'values': rows_branches},
            {'range': 'Nodes!A1',        'values': rows_nodes},
            {'range': 'Options!A1',      'values': rows_options},
            {'range': 'CriticalPath!A1', 'values': rows_cp},
        ]}
    ).execute()

    # Header formatting
    header_fmt = {
        'backgroundColor': {'red': 0.102, 'green': 0.106, 'blue': 0.180},
        'textFormat': {'foregroundColor': {'red':1,'green':1,'blue':1}, 'bold': True},
    }
    requests = []
    for name, ncols in [('Branches',3),('Nodes',4),('Options',6),('CriticalPath',4)]:
        requests += [
            {'repeatCell': {
                'range': {'sheetId': sid(name), 'startRowIndex':0, 'endRowIndex':1,
                          'startColumnIndex':0, 'endColumnIndex':ncols},
                'cell': {'userEnteredFormat': header_fmt},
                'fields': 'userEnteredFormat(backgroundColor,textFormat)'
            }},
            {'updateSheetProperties': {
                'properties': {'sheetId': sid(name), 'gridProperties': {'frozenRowCount':1}},
                'fields': 'gridProperties.frozenRowCount'
            }},
        ]
    services['sheets'].spreadsheets().batchUpdate(
        spreadsheetId=ss_id, body={'requests': requests}
    ).execute()

    print(f'    Spreadsheet ID: {ss_id}')
    return ss_id

# ── document ─────────────────────────────────────────────────────────────────

def create_doc(services):
    print('  Creating Google Document...')
    doc = services['docs'].documents().create(
        body={'title': 'Sovereign AI Consortium — Decision Tree'}
    ).execute()
    doc_id = doc['documentId']
    populate_doc(services, doc_id)
    print(f'    Document ID: {doc_id}')
    return doc_id

def populate_doc(services, doc_id):
    """Write formatted content to the Google Doc."""
    requests = []
    idx = [1]  # mutable insertion index

    def insert(text, style=None, bold=False, size=None, color=None, link=None):
        req = {'insertText': {'location': {'index': idx[0]}, 'text': text}}
        requests.append(req)
        fmt = {}
        if bold:   fmt['bold'] = True
        if size:   fmt['fontSize'] = {'magnitude': size, 'unit': 'PT'}
        if color:  fmt['foregroundColor'] = {'color': {'rgbColor': color}}
        if link:   fmt['link'] = {'url': link}
        if style:
            requests.append({'updateParagraphStyle': {
                'range': {'startIndex': idx[0], 'endIndex': idx[0] + len(text)},
                'paragraphStyle': {'namedStyleType': style},
                'fields': 'namedStyleType'
            }})
        if fmt:
            requests.append({'updateTextStyle': {
                'range': {'startIndex': idx[0], 'endIndex': idx[0] + len(text)},
                'textStyle': fmt,
                'fields': ','.join(fmt.keys())
            }})
        idx[0] += len(text)

    insert('Building a Sovereign AI Consortium\n', 'TITLE', bold=True)
    insert('A Decision Tree for Founders, Governments, and Member Institutions\n', 'SUBTITLE')
    insert('\n')
    insert('How to Use This Decision Tree\n', 'HEADING_1', bold=True)
    insert(
        'This document maps the major choices involved in standing up a sovereign AI consortium. '
        'The choices are grouped into eight branches. Each branch contains decision nodes. '
        'Each node poses one question, lists the realistic options, and points to the next decision it unlocks.\n'
    )
    insert('\n')

    for branch_id, branch_name, branch_desc in BRANCHES:
        insert(f'Branch {branch_id}. {branch_name}\n', 'HEADING_1', bold=True)
        insert(f'{branch_desc}\n')
        insert('\n')
        branch_nodes = [(nid, bid, q, d) for nid, bid, q, d in NODES if bid == branch_id]
        for node_id, _, question, desc in branch_nodes:
            insert(f'{node_id}. {question}\n', 'HEADING_2', bold=True)
            insert(f'Decision: {desc}\n')
            insert('\n')
            node_opts = [(oid, nid, lbl, wim, kt, lt) for oid, nid, lbl, wim, kt, lt in OPTIONS if nid == node_id]
            for _, _, label, wim, kt, leads_to in node_opts:
                insert(f'• {label}: ', bold=True)
                insert(f'{wim} ')
                insert(f'[Tradeoffs: {kt}] ')
                insert(f'[Leads to: {leads_to}]\n')
            insert('\n')

    insert('Critical Path Summary\n', 'HEADING_1', bold=True)
    insert('Resolve these in order. Each one gates the choices after it.\n\n')
    for step, node_id, title, desc in CRITICAL_PATH:
        insert(f'{step}. {title} ({node_id}): ', bold=True)
        insert(f'{desc}\n')
    insert('\n')
    insert(
        'A starting point, not a finished blueprint. The value of the tree is forcing the order: '
        'control before product, product before funding, and trust woven through all of it.\n'
    )

    services['docs'].documents().batchUpdate(
        documentId=doc_id, body={'requests': requests}
    ).execute()

# ── drive sharing ─────────────────────────────────────────────────────────────

def configure_file(services, file_id, folder_id, user_email):
    drive = services['drive']
    meta = drive.files().get(fileId=file_id, fields='parents').execute()
    current_parents = ','.join(meta.get('parents', []))
    try:
        drive.files().update(
            fileId=file_id, addParents=folder_id,
            removeParents=current_parents, fields='id,parents'
        ).execute()
    except Exception as e:
        print(f'    Warning moving file: {e}')
    # Anyone with link can view
    drive.permissions().create(
        fileId=file_id,
        body={'type': 'anyone', 'role': 'reader'},
        fields='id'
    ).execute()
    # User gets editor access
    try:
        drive.permissions().create(
            fileId=file_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': user_email},
            fields='id', sendNotificationEmail=False
        ).execute()
    except Exception as e:
        print(f'    Warning granting editor access: {e}')

# ── static HTML generator ─────────────────────────────────────────────────────

def build_html(ss_id, doc_id, sheet_url, doc_url):
    """Generate the full standalone HTML decision tree explorer."""

    branches_json = json.dumps([
        {'id': b[0], 'name': b[1], 'description': b[2]} for b in BRANCHES
    ])
    nodes_json = json.dumps([
        {'id': n[0], 'branch_id': n[1], 'question': n[2], 'description': n[3]} for n in NODES
    ])
    options_json = json.dumps([
        {'id': o[0], 'node_id': o[1], 'label': o[2],
         'what_it_means': o[3], 'key_tradeoffs': o[4], 'leads_to': o[5]} for o in OPTIONS
    ])
    cp_json = json.dumps([
        {'step': c[0], 'node_id': c[1], 'title': c[2], 'description': c[3]} for c in CRITICAL_PATH
    ])

    branch_colors = {
        'A': '#1a3a5c', 'B': '#1b5e20', 'C': '#e65100',
        'D': '#4a148c', 'E': '#006064', 'F': '#b71c1c',
        'G': '#004d40', 'H': '#37474f',
    }
    branch_colors_js = json.dumps(branch_colors)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sovereign AI Consortium — Decision Tree</title>
<script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --navy:#0d1b2a;--accent:#2d7dd2;--border:#e5e7eb;--bg:#f8f9fa;
  --white:#fff;--text:#1a1a1a;--muted:#6b7280;--radius:6px;
  --shadow:0 2px 8px rgba(0,0,0,.1);
}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:14px;color:var(--text);background:var(--bg);height:100vh;
  display:flex;flex-direction:column;overflow:hidden}}
/* ── header ── */
#header{{background:var(--navy);color:#fff;padding:0 20px;height:52px;
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
  box-shadow:0 2px 6px rgba(0,0,0,.3)}}
.logo{{font-weight:800;font-size:11px;letter-spacing:1px;background:var(--accent);
  padding:3px 7px;border-radius:3px;margin-right:10px}}
#header h1{{font-size:15px;font-weight:600}}
#header .sub{{font-size:11px;color:#94a3b8;margin-left:8px}}
.hdr-links a{{color:#94a3b8;font-size:12px;padding:4px 8px;border-radius:4px;
  text-decoration:none;transition:background .15s}}
.hdr-links a:hover{{background:rgba(255,255,255,.1);color:#fff}}
/* ── toolbar ── */
#toolbar{{background:var(--white);border-bottom:1px solid var(--border);
  padding:8px 20px;display:flex;align-items:center;gap:8px;flex-shrink:0;
  flex-wrap:wrap}}
.pill{{padding:4px 12px;border-radius:16px;font-size:12px;font-weight:500;
  cursor:pointer;border:1.5px solid transparent;transition:all .15s;background:transparent;
  color:var(--muted)}}
.pill:hover{{background:var(--bg)}}
.pill.active{{color:#fff;border-color:transparent}}
.sep{{width:1px;height:20px;background:var(--border)}}
#search-input{{border:1.5px solid var(--border);border-radius:20px;padding:4px 12px;
  font-size:12px;width:200px;outline:none;transition:border-color .15s}}
#search-input:focus{{border-color:var(--accent)}}
.view-btn{{background:transparent;border:1.5px solid var(--border);border-radius:4px;
  padding:4px 10px;font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s}}
.view-btn.active,.view-btn:hover{{border-color:var(--accent);color:var(--accent)}}
/* ── main area ── */
#main{{flex:1;display:flex;overflow:hidden}}
/* Graph panel */
#graph-panel{{flex:1;position:relative}}
#network{{width:100%;height:100%}}
/* Detail panel */
#detail-panel{{width:380px;border-left:1px solid var(--border);background:var(--white);
  overflow-y:auto;flex-shrink:0;transition:transform .2s}}
#detail-panel.hidden{{transform:translateX(100%);width:0;border:none}}
#detail-close{{position:absolute;top:12px;right:12px;background:none;border:none;
  font-size:20px;color:var(--muted);cursor:pointer;z-index:10}}
#detail-content{{padding:20px}}
.detail-branch-id{{font-size:10px;font-weight:700;letter-spacing:1px;
  text-transform:uppercase;color:var(--accent);margin-bottom:4px}}
.detail-question{{font-size:17px;font-weight:700;color:var(--navy);
  line-height:1.4;margin-bottom:6px}}
.detail-desc{{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px}}
.detail-section-title{{font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.5px;color:var(--muted);margin-bottom:8px}}
.option-card{{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);
  padding:12px;margin-bottom:8px}}
.option-label{{font-weight:700;color:var(--navy);font-size:13px;margin-bottom:4px}}
.option-means{{font-size:12px;color:var(--text);line-height:1.5;margin-bottom:4px}}
.option-trades{{font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:6px;
  font-style:italic}}
.leads-wrap{{display:flex;flex-wrap:wrap;gap:4px}}
.node-chip{{background:#e8f0fe;color:#1a56db;font-size:11px;font-weight:600;
  padding:2px 8px;border-radius:12px;cursor:pointer;transition:background .15s}}
.node-chip:hover{{background:#c7d7fc}}
/* List view */
#list-panel{{flex:1;overflow-y:auto;padding:20px;display:none}}
#list-panel.active{{display:block}}
.branch-block{{background:var(--white);border:1px solid var(--border);
  border-radius:var(--radius);margin-bottom:20px;box-shadow:var(--shadow);overflow:hidden}}
.branch-hdr{{padding:14px 18px;display:flex;align-items:center;gap:10px;cursor:pointer}}
.branch-hdr-id{{font-size:11px;font-weight:700;letter-spacing:1px;
  text-transform:uppercase;color:#fff;padding:2px 8px;border-radius:3px}}
.branch-hdr-name{{font-size:15px;font-weight:600;color:var(--navy)}}
.branch-hdr-arrow{{margin-left:auto;color:var(--muted);font-size:16px;transition:transform .2s}}
.branch-hdr.open .branch-hdr-arrow{{transform:rotate(90deg)}}
.branch-body{{display:none;padding:0 18px 16px}}
.branch-body.open{{display:block}}
.branch-desc{{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px}}
.node-row{{border-top:1px solid var(--border);padding:12px 0}}
.node-row-q{{font-size:14px;font-weight:600;color:var(--navy);margin-bottom:3px}}
.node-row-d{{font-size:12px;color:var(--muted);margin-bottom:8px}}
table.opt-tbl{{width:100%;border-collapse:collapse;font-size:12px}}
.opt-tbl th{{background:var(--navy);color:#fff;padding:6px 10px;text-align:left;font-size:11px}}
.opt-tbl td{{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}}
.opt-tbl tr:last-child td{{border-bottom:none}}
.opt-tbl tr:hover td{{background:#f0f4f8}}
.cp-section{{background:var(--white);border:1px solid var(--border);
  border-left:4px solid var(--accent);border-radius:var(--radius);
  padding:20px;margin-bottom:20px;box-shadow:var(--shadow)}}
.cp-section h2{{font-size:17px;font-weight:700;color:var(--navy);margin-bottom:6px}}
.cp-section p{{font-size:13px;color:var(--muted);margin-bottom:14px}}
.cp-item{{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}}
.cp-item:last-child{{border-bottom:none}}
.cp-num{{background:var(--accent);color:#fff;font-size:11px;font-weight:700;
  width:22px;height:22px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;margin-top:1px}}
.cp-nid{{font-weight:700;color:var(--navy);margin-right:4px}}
.cp-title{{font-weight:600}}
.cp-desc{{font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5}}
/* Legend */
#legend{{position:absolute;bottom:16px;left:16px;background:rgba(255,255,255,.95);
  border:1px solid var(--border);border-radius:6px;padding:10px 14px;
  font-size:11px;box-shadow:var(--shadow);z-index:5}}
#legend h4{{font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.5px;color:var(--muted);margin-bottom:8px}}
.legend-item{{display:flex;align-items:center;gap:6px;margin-bottom:4px}}
.legend-dot{{width:10px;height:10px;border-radius:50%;flex-shrink:0}}
/* Tooltip */
#tooltip{{position:absolute;background:rgba(13,27,42,.9);color:#fff;
  padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;
  max-width:260px;line-height:1.5;z-index:50;display:none}}
</style>
</head>
<body>
<div id="header">
  <div style="display:flex;align-items:center">
    <span class="logo">SAI</span>
    <h1>Sovereign AI Consortium</h1>
    <span class="sub">Decision Tree Explorer</span>
  </div>
  <div class="hdr-links">
    <a href="{sheet_url}" target="_blank">Spreadsheet</a>
    <a href="{doc_url}" target="_blank">Document</a>
    <a href="https://substack.com/@antonleicht/p-167289866" target="_blank">The Moonshot</a>
  </div>
</div>

<div id="toolbar">
  <div id="branch-pills"></div>
  <div class="sep"></div>
  <input id="search-input" placeholder="Search nodes..." oninput="searchNodes(this.value)">
  <div class="sep"></div>
  <button class="view-btn active" id="btn-graph" onclick="setView('graph')">Graph</button>
  <button class="view-btn" id="btn-list" onclick="setView('list')">List</button>
</div>

<div id="main">
  <div id="graph-panel">
    <div id="network"></div>
    <div id="legend">
      <h4>Branches</h4>
      <div id="legend-items"></div>
    </div>
    <div id="tooltip"></div>
  </div>

  <div id="detail-panel" class="hidden">
    <button id="detail-close" onclick="closeDetail()">×</button>
    <div id="detail-content"></div>
  </div>

  <div id="list-panel"></div>
</div>

<script>
// ── data ──────────────────────────────────────────────────────────────────
const BRANCHES    = {branches_json};
const NODES       = {nodes_json};
const OPTIONS     = {options_json};
const CRIT_PATH   = {cp_json};
const BCOLORS     = {branch_colors_js};

// ── state ─────────────────────────────────────────────────────────────────
let network, allNodes, allEdges;
let activeBranch = null;

// ── init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {{
  buildBranchPills();
  buildLegend();
  buildGraph();
  buildListView();
}});

// ── branch pills ──────────────────────────────────────────────────────────
function buildBranchPills() {{
  const c = document.getElementById('branch-pills');
  // All pill
  const all = pill('All', null, true);
  c.appendChild(all);
  BRANCHES.forEach(b => c.appendChild(pill(b.id + ' — ' + b.name, b.id)));
  c.appendChild(pill('Critical Path', '__cp__'));
}}

function pill(label, id, active) {{
  const btn = document.createElement('button');
  btn.className = 'pill' + (active ? ' active' : '');
  btn.textContent = label;
  if (id !== '__cp__') {{
    btn.style.setProperty('--pc', BCOLORS[id] || '#555');
    if (active) {{ btn.style.background = '#334155'; }}
  }}
  btn.onclick = () => filterBranch(id);
  return btn;
}}

function filterBranch(id) {{
  activeBranch = id;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pill').forEach(p => {{
    const matches =
      (id === null && p.textContent === 'All') ||
      (id !== null && p.textContent.startsWith(id + ' ')) ||
      (id === '__cp__' && p.textContent === 'Critical Path');
    if (matches) {{
      p.classList.add('active');
      if (id && id !== '__cp__' && BCOLORS[id]) p.style.background = BCOLORS[id];
      else p.style.background = '#334155';
    }}
  }});
  if (id === '__cp__') {{ showCriticalPathDetail(); return; }}
  applyFilter();
}}

// ── graph ─────────────────────────────────────────────────────────────────
function buildGraph() {{
  const nodes = [], edges = [];

  NODES.forEach(n => {{
    const col = BCOLORS[n.branch_id] || '#555';
    const opts = OPTIONS.filter(o => o.node_id === n.id);
    nodes.push({{
      id: n.id,
      label: n.id + '\\n' + wrapText(n.question, 22),
      title: '<b>' + n.id + '</b>: ' + n.question,
      color: {{ background: col, border: col,
                highlight: {{ background: lighten(col), border: '#fff' }},
                hover: {{ background: lighten(col), border: col }} }},
      font: {{ color: '#fff', size: 12, face: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }},
      shape: 'box',
      margin: 10,
      widthConstraint: {{ minimum: 120, maximum: 160 }},
      shadow: true,
      borderWidth: 2,
      borderWidthSelected: 3,
    }});

    // Edges from leads_to
    opts.forEach(opt => {{
      opt.leads_to.split(/[,;]/).forEach(raw => {{
        const target = raw.trim();
        if (!target) return;
        const exists = NODES.find(x => x.id === target);
        if (!exists) return;
        edges.push({{
          from: n.id,
          to: target,
          label: opt.label.length > 18 ? opt.label.slice(0,16)+'…' : opt.label,
          font: {{ size: 10, color: '#555', align: 'middle' }},
          color: {{ color: '#cbd5e1', highlight: '#2d7dd2', hover: '#2d7dd2' }},
          arrows: {{ to: {{ enabled: true, scaleFactor: 0.7 }} }},
          smooth: {{ type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }},
          width: 1.5,
        }});
      }});
    }});
  }});

  allNodes = new vis.DataSet(nodes);
  allEdges = new vis.DataSet(edges);

  network = new vis.Network(
    document.getElementById('network'),
    {{ nodes: allNodes, edges: allEdges }},
    {{
      layout: {{
        hierarchical: {{
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 220,
          nodeSpacing: 90,
          treeSpacing: 160,
        }}
      }},
      physics: {{ enabled: false }},
      interaction: {{
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true,
        zoomView: true,
        dragView: true,
      }},
      nodes: {{
        borderWidth: 2,
        shadow: true,
      }},
    }}
  );

  network.on('click', params => {{
    if (params.nodes.length > 0) showNodeDetail(params.nodes[0]);
  }});
}}

function applyFilter() {{
  if (!allNodes) return;
  const branch = activeBranch;
  if (branch === null) {{
    allNodes.forEach(n => allNodes.update({{ id: n.id, hidden: false }}));
    allEdges.forEach(e => allEdges.update({{ id: e.id, hidden: false }}));
  }} else {{
    const visible = new Set(NODES.filter(n => n.branch_id === branch).map(n => n.id));
    // also show immediate neighbors
    allEdges.forEach(e => {{
      if (visible.has(e.from)) visible.add(e.to);
    }});
    allNodes.forEach(n => allNodes.update({{ id: n.id, hidden: !visible.has(n.id) }}));
    allEdges.forEach(e => allEdges.update({{ id: e.id, hidden: !(visible.has(e.from) && visible.has(e.to)) }}));
    network.fit({{ nodes: [...visible], animation: true }});
  }}
}}

// ── detail panel ──────────────────────────────────────────────────────────
function showNodeDetail(nodeId) {{
  const node = NODES.find(n => n.id === nodeId);
  if (!node) return;
  const opts = OPTIONS.filter(o => o.node_id === nodeId);
  const col  = BCOLORS[node.branch_id] || '#555';
  const b    = BRANCHES.find(x => x.id === node.branch_id);

  let html = `
    <div style="border-bottom:3px solid ${{col}};padding-bottom:14px;margin-bottom:16px">
      <div class="detail-branch-id" style="color:${{col}}">Branch ${{node.branch_id}} — ${{b ? b.name : ''}}</div>
      <div class="detail-question">${{node.question}}</div>
      <div class="detail-desc">${{node.description}}</div>
    </div>
    <div class="detail-section-title">Options</div>
  `;
  opts.forEach(o => {{
    const chips = o.leads_to.split(/[,;]/).map(t => t.trim()).filter(Boolean)
      .map(t => `<span class="node-chip" onclick="highlightAndGo('${{t}}')">${{t}}</span>`).join('');
    html += `
      <div class="option-card">
        <div class="option-label">${{o.label}}</div>
        <div class="option-means">${{o.what_it_means}}</div>
        <div class="option-trades">${{o.key_tradeoffs}}</div>
        ${{chips ? '<div class="leads-wrap">' + chips + '</div>' : ''}}
      </div>
    `;
  }});

  document.getElementById('detail-content').innerHTML = html;
  document.getElementById('detail-panel').classList.remove('hidden');
  document.getElementById('graph-panel').style.flex = '1';
}}

function showCriticalPathDetail() {{
  let html = `<div class="detail-branch-id" style="color:var(--accent)">Critical Path</div>
    <div class="detail-question">Resolve these decisions first</div>
    <div class="detail-desc">Each one gates the choices after it. Reversing them later is expensive.</div>
    <div style="margin-top:16px">`;
  CRIT_PATH.forEach(cp => {{
    html += `<div class="cp-item">
      <div class="cp-num">${{cp.step}}</div>
      <div>
        <div><span class="cp-nid" style="cursor:pointer" onclick="highlightAndGo('${{cp.node_id.split(',')[0].trim()}}')">${{cp.node_id}}</span>
        <span class="cp-title">${{cp.title}}</span></div>
        <div class="cp-desc">${{cp.description}}</div>
      </div>
    </div>`;
  }});
  html += '</div>';
  document.getElementById('detail-content').innerHTML = html;
  document.getElementById('detail-panel').classList.remove('hidden');
  document.getElementById('graph-panel').style.flex = '1';
}}

function closeDetail() {{
  document.getElementById('detail-panel').classList.add('hidden');
  network && network.unselectAll();
}}

function highlightAndGo(nodeId) {{
  if (!network) return;
  const node = NODES.find(n => n.id === nodeId);
  if (node && activeBranch !== node.branch_id) {{
    filterBranch(node.branch_id);
  }}
  setTimeout(() => {{
    network.focus(nodeId, {{ scale: 1.2, animation: true }});
    network.selectNodes([nodeId]);
    showNodeDetail(nodeId);
  }}, 200);
}}

// ── search ────────────────────────────────────────────────────────────────
function searchNodes(query) {{
  if (!allNodes || !query) {{
    applyFilter();
    return;
  }}
  const q = query.toLowerCase();
  const matched = new Set(
    NODES.filter(n =>
      n.id.toLowerCase().includes(q) ||
      n.question.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      OPTIONS.filter(o => o.node_id === n.id).some(o =>
        o.label.toLowerCase().includes(q) || o.what_it_means.toLowerCase().includes(q)
      )
    ).map(n => n.id)
  );
  allNodes.forEach(n => allNodes.update({{ id: n.id, hidden: !matched.has(n.id) }}));
  allEdges.forEach(e => allEdges.update({{ id: e.id, hidden: !(matched.has(e.from) && matched.has(e.to)) }}));
  if (matched.size > 0) network.fit({{ nodes: [...matched], animation: true }});
}}

// ── list view ─────────────────────────────────────────────────────────────
function buildListView() {{
  const panel = document.getElementById('list-panel');

  // Critical path card
  let cpHtml = `<div class="cp-section"><h2>Critical Path Summary</h2>
    <p>Resolve these in order. Each one gates the choices after it.</p>`;
  CRIT_PATH.forEach(cp => {{
    cpHtml += `<div class="cp-item">
      <div class="cp-num">${{cp.step}}</div>
      <div><div><span class="cp-nid">${{cp.node_id}}</span><span class="cp-title">${{cp.title}}</span></div>
      <div class="cp-desc">${{cp.description}}</div></div>
    </div>`;
  }});
  cpHtml += '</div>';
  panel.innerHTML = cpHtml;

  BRANCHES.forEach(branch => {{
    const col = BCOLORS[branch.id] || '#555';
    const branchNodes = NODES.filter(n => n.branch_id === branch.id);
    let nodeHtml = '';
    branchNodes.forEach(node => {{
      const opts = OPTIONS.filter(o => o.node_id === node.id);
      let rows = opts.map(o => `<tr>
        <td><b>${{o.label}}</b></td>
        <td>${{o.what_it_means}}</td>
        <td style="color:var(--muted);font-style:italic">${{o.key_tradeoffs}}</td>
        <td>${{o.leads_to.split(/[,;]/).map(t => t.trim()).filter(Boolean)
          .map(t => `<span style="background:#e8f0fe;color:#1a56db;font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px;margin-right:4px">${{t}}</span>`).join('')}}</td>
      </tr>`).join('');
      nodeHtml += `<div class="node-row">
        <div class="node-row-q">${{node.id}}. ${{node.question}}</div>
        <div class="node-row-d">${{node.description}}</div>
        ${{opts.length ? `<table class="opt-tbl">
          <thead><tr><th>Option</th><th>What it means</th><th>Key tradeoffs</th><th>Leads to</th></tr></thead>
          <tbody>${{rows}}</tbody></table>` : ''}}
      </div>`;
    }});

    const div = document.createElement('div');
    div.className = 'branch-block';
    div.innerHTML = `
      <div class="branch-hdr" onclick="toggleBranch(this)">
        <span class="branch-hdr-id" style="background:${{col}}">${{branch.id}}</span>
        <span class="branch-hdr-name">${{branch.name}}</span>
        <span class="branch-hdr-arrow">›</span>
      </div>
      <div class="branch-body">
        <div class="branch-desc">${{branch.description}}</div>
        ${{nodeHtml}}
      </div>
    `;
    panel.appendChild(div);
  }});
}}

function toggleBranch(hdr) {{
  hdr.classList.toggle('open');
  hdr.nextElementSibling.classList.toggle('open');
}}

// ── view toggle ───────────────────────────────────────────────────────────
function setView(v) {{
  const gp = document.getElementById('graph-panel');
  const lp = document.getElementById('list-panel');
  document.getElementById('btn-graph').classList.toggle('active', v === 'graph');
  document.getElementById('btn-list').classList.toggle('active', v === 'list');
  if (v === 'graph') {{
    gp.style.display = '';
    lp.classList.remove('active');
  }} else {{
    gp.style.display = 'none';
    lp.classList.add('active');
    document.getElementById('detail-panel').classList.add('hidden');
  }}
}}

// ── legend ────────────────────────────────────────────────────────────────
function buildLegend() {{
  const c = document.getElementById('legend-items');
  BRANCHES.forEach(b => {{
    const col = BCOLORS[b.id] || '#555';
    c.innerHTML += `<div class="legend-item">
      <div class="legend-dot" style="background:${{col}}"></div>
      <span style="color:#334155"><b>${{b.id}}</b> ${{b.name}}</span>
    </div>`;
  }});
}}

// ── utilities ─────────────────────────────────────────────────────────────
function wrapText(text, maxLen) {{
  if (text.length <= maxLen) return text;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {{
    if ((line + ' ' + w).trim().length <= maxLen) {{
      line = (line + ' ' + w).trim();
    }} else {{
      if (line) lines.push(line);
      line = w;
    }}
  }});
  if (line) lines.push(line);
  return lines.slice(0,3).join('\\n') + (lines.length > 3 ? '…' : '');
}}

function lighten(hex) {{
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const lf = 0.25;
  const lr = Math.round(r + (255-r)*lf), lg = Math.round(g + (255-g)*lf), lb = Math.round(b + (255-b)*lf);
  return '#' + [lr,lg,lb].map(v => v.toString(16).padStart(2,'0')).join('');
}}
</script>
</body>
</html>'''

# ── main ─────────────────────────────────────────────────────────────────────

def main():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    print('\nSovereign AI Consortium — Service Account Deployment')
    print('='*52)

    print('\n[1/5] Authenticating...')
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    services = {
        'sheets': build('sheets', 'v4', credentials=creds),
        'docs':   build('docs',   'v1', credentials=creds),
        'drive':  build('drive',  'v3', credentials=creds),
    }
    print(f'  Service account: {creds.service_account_email}')

    print('\n[2/5] Creating Spreadsheet...')
    ss_id = create_spreadsheet(services)
    sheet_url = f'https://docs.google.com/spreadsheets/d/{ss_id}/edit'

    print('\n[3/5] Creating Document...')
    doc_id = create_doc(services)
    doc_url = f'https://docs.google.com/document/d/{doc_id}/edit'

    print('\n[4/5] Sharing files...')
    configure_file(services, ss_id,  FOLDER_ID, USER_EMAIL)
    configure_file(services, doc_id, FOLDER_ID, USER_EMAIL)
    print('  Both files shared to Drive folder and to', USER_EMAIL)

    print('\n[5/5] Building static web app and pushing to GitHub Pages...')
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    html = build_html(ss_id, doc_id, sheet_url, doc_url)
    index_path = OUTPUT_DIR / 'index.html'
    index_path.write_text(html, encoding='utf-8')
    print(f'  HTML written to {index_path}')

    # Save metadata
    meta = {
        'ss_id': ss_id, 'doc_id': doc_id,
        'sheet_url': sheet_url, 'doc_url': doc_url,
        'web_app_url': 'https://www.artificialnouveau.com/publicai/sovereign-ai-decision-tree/',
    }
    (SCRIPT_DIR / 'deployment_info.json').write_text(json.dumps(meta, indent=2))

    # Git commit and push
    os.chdir(REPO_ROOT)
    subprocess.run(['git', 'add',
                    'sovereign-ai-decision-tree/index.html',
                    'sovereign-ai-consortium/deployment_info.json'], check=True)
    subprocess.run(['git', 'commit', '-m',
                    'add sovereign AI decision tree web app with visual graph explorer'], check=True)
    subprocess.run(['git', 'push', 'origin', 'main'], check=True)
    print('  Pushed to GitHub.')

    print('\n' + '='*52)
    print('DEPLOYMENT COMPLETE')
    print('='*52)
    print(f'\nWeb App:      https://www.artificialnouveau.com/publicai/sovereign-ai-decision-tree/')
    print(f'Spreadsheet:  {sheet_url}')
    print(f'Document:     {doc_url}')
    print()
    print('NOTE: GitHub Pages may take 1-2 minutes to serve the new page.')
    print('If the page shows a 404, enable Pages in the repo settings:')
    print('  Settings > Pages > Source: Deploy from branch > main /docs')

if __name__ == '__main__':
    main()
