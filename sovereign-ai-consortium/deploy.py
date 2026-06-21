#!/usr/bin/env python3
"""
One-shot deployment for the Sovereign AI Consortium Decision Tree.

Creates:
  - Google Spreadsheet (with all 7 branches, 22 nodes, 70+ options)
  - Google Document (formatted decision tree)
  - Google Apps Script web app (interactive UI, synced to Sheet + Doc)

All files are moved to the target Drive folder and set to
"anyone with the link can view."
"""

import json, os, sys, time, base64, webbrowser, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OAUTH_FILE       = '/Users/ahnjili_harmony/Documents/google_credentials_oauth.json'
FOLDER_ID        = '1qpCoDTH92V7amjDJTQk9tRsXtmudy6IG'
SCRIPT_DIR       = Path(__file__).parent
TOKEN_CACHE      = '/tmp/sovereign_ai_token.json'
USER_EMAIL       = 'artificialnouveau@gmail.com'

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.deployments',
    'https://www.googleapis.com/auth/script.external_request',
]

# ---------------------------------------------------------------------------
# OAuth helper — local server flow
# ---------------------------------------------------------------------------
def get_credentials():
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request

    creds = None
    if os.path.exists(TOKEN_CACHE):
        creds = Credentials.from_authorized_user_file(TOKEN_CACHE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(OAUTH_FILE, SCOPES)
            print('\n  Opening browser for Google sign-in...')
            creds = flow.run_local_server(port=8080, open_browser=True,
                                          prompt='consent', access_type='offline')
        with open(TOKEN_CACHE, 'w') as f:
            f.write(creds.to_json())
    return creds

# ---------------------------------------------------------------------------
# Build Google API service handles
# ---------------------------------------------------------------------------
def build_services(creds):
    from googleapiclient.discovery import build
    return {
        'sheets':  build('sheets',  'v4', credentials=creds),
        'docs':    build('docs',    'v1', credentials=creds),
        'drive':   build('drive',   'v3', credentials=creds),
        'script':  build('script',  'v1', credentials=creds),
    }

# ---------------------------------------------------------------------------
# Initial data
# ---------------------------------------------------------------------------
BRANCHES: list = [
    ('A', 'Political and Governance',
     'Who owns the consortium, who decides, and how it positions itself in the world. Every other branch inherits these answers.'),
    ('B', 'Product and Technology',
     'What you actually build, how open it is, and who it serves. Constrained by Branch A governance and Branch C compute reality.'),
    ('C', 'Compute and Infrastructure',
     'The physical foundation. Without resolved compute, energy, and chip access, the product branch cannot deliver. This is where sovereignty is most often won or lost.'),
    ('D', 'Funding and Economic Model',
     'Where the money comes from, how the consortium sustains itself, and who owns the value created. Funding choices follow control choices in Branch A.'),
    ('E', 'Talent and Research',
     'People are scarcer than chips. How the consortium attracts, organizes, and retains researchers shapes whether the build succeeds.'),
    ('F', 'Security, Safety, and Compliance',
     'How the consortium prevents misuse, secures its systems, and proves it is trustworthy to members and the public.'),
    ('G', 'Legal, Ethical, and Data Sovereignty',
     'Where data lives, whose rights govern it, and who is liable when things go wrong. These choices underpin public trust and legal durability.'),
]

NODES: list = [
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
]

OPTIONS: list = [
    # A1
    ('A1-1','A1','Single nation','One government owns and directs the consortium.',
     'Fast decisions and clear accountability, but limited scale and harder regional buy in.','A2, D1'),
    ('A1-2','A1','Regional bloc','A group of allied states co own under a treaty or charter.',
     'Pooled compute, capital, and talent, but slower governance and alignment costs.','A2, A3'),
    ('A1-3','A1','Public institution group','National labs, universities, and agencies form the core.',
     'Strong research base and neutrality, but weaker commercial muscle.','B3, E2'),
    ('A1-4','A1','Public and private mix','States anchor it with industry as co investors.',
     'Capital and speed, but tension over control and profit.','D1, D3'),
    # A2
    ('A2-1','A2','Consensus','Every member must agree on major moves.',
     'Maximum legitimacy, but vulnerable to gridlock and one member stalling.','A4'),
    ('A2-2','A2','Weighted voting','Votes scale with contribution of money, compute, or data.',
     'Rewards investment, but can entrench the largest member.','D1, D3'),
    ('A2-3','A2','Lead member plus board','One member steers, advised by the others.',
     'Speed and clarity, but risk of smaller members feeling captured.','A3'),
    ('A2-4','A2','Rotating chair','Leadership rotates on a fixed schedule.',
     'Shared ownership feeling, but strategy can lurch between terms.','A4'),
    # A3
    ('A3-1','A3','Aligned with a bloc','Tie supply, standards, and security to one camp.',
     'Access to chips and partners, but dependence and reduced autonomy.','C2, F2'),
    ('A3-2','A3','Nonaligned','Stay neutral and trade with multiple sides.',
     'Maximum independence, but harder access to leading hardware.','C2'),
    ('A3-3','A3','Selective bilateral','Cut issue by issue deals with several partners.',
     'Flexibility, but constant negotiation and exposure to pressure.','A4, F2'),
    # A4
    ('A4-1','A4','Strictest member standard','Adopt the toughest existing rule among members.',
     'High trust and export friendliness, but slower and costlier to ship.','G2'),
    ('A4-2','A4','New common standard','Write a fresh shared framework from scratch.',
     'Coherence and ownership, but long to negotiate and ratify.','G2, G3'),
    ('A4-3','A4','Sector by sector','Different rules for health, defense, public services.',
     'Pragmatic and fast in low risk areas, but fragmented to manage.','B3, F1'),
    # B1
    ('B1-1','B1','Train from scratch','Build your own frontier model end to end.',
     'Full sovereignty and IP, but enormous cost, talent, and compute demands.','C1, D1, E1'),
    ('B1-2','B1','Adapt open weights','Start from strong open models and specialize them.',
     'Faster and cheaper, but dependent on upstream releases and licenses.','B2, G1'),
    ('B1-3','B1','License a closed model','Run a vendor model inside sovereign infrastructure.',
     'Fast capability, but limited control and ongoing vendor dependence.','F2, G3'),
    # B2
    ('B2-1','B2','Fully open','Release weights publicly for any member or citizen use.',
     'Trust, ecosystem growth, and scrutiny, but weaker control over misuse.','F2, F3'),
    ('B2-2','B2','Open with limits','Release under a license that restricts certain uses.',
     'Balance of openness and guardrails, but enforcement is hard.','F2, G2'),
    ('B2-3','B2','Closed','Keep weights internal to members and approved partners.',
     'Maximum control, but less ecosystem and slower external trust.','F2'),
    # B3
    ('B3-1','B3','General platform','A broad model and API for many uses.',
     'Wide impact, but competes directly with global incumbents.','B4, D2'),
    ('B3-2','B3','Public sector services','Tools for government, courts, health, education.',
     'Clear mandate and funding, but procurement and trust hurdles.','G1, F1'),
    ('B3-3','B3','Strategic sectors','Focus on defense, energy, or critical infrastructure.',
     'High value and political backing, but heavy security burden.','F1, F2'),
    ('B3-4','B3','Industry tooling','Horizontal tools for member country firms.',
     'Economic returns and adoption, but needs commercial polish.','D2, E1'),
    # B4
    ('B4-1','B4','Member languages first','Prioritize the languages of member populations.',
     'Strong local relevance and legitimacy, but smaller data pools.','G1, E1'),
    ('B4-2','B4','Multilingual from the start','Serve many languages at launch.',
     'Broad usefulness, but spreads scarce data and evaluation effort.','C1, D2'),
    ('B4-3','B4','Single common language','Build mainly in one shared working language.',
     'Simplicity and speed, but weaker on the sovereignty promise.','B3'),
    # C1
    ('C1-1','C1','Sovereign datacenters','Build and operate facilities on member soil.',
     'Full control and data residency, but high capital and long lead times.','C3, D1'),
    ('C1-2','C1','Trusted regional cloud','Use vetted providers within the region or bloc.',
     'Faster start and lower upfront cost, but reliance on the provider.','G1, F2'),
    ('C1-3','C1','Hybrid','Own core training, rent burst and serving capacity.',
     'Balances control and flexibility, but complex to secure and govern.','C2, F2'),
    # C2
    ('C2-1','C2','Import under agreements','Buy hardware through trade and licensing deals.',
     'Quick access to leading chips, but exposed to export controls.','A3, F2'),
    ('C2-2','C2','Domestic fabrication','Invest in local manufacturing and packaging.',
     'Long term independence, but very costly and slow to mature.','D1, E1'),
    ('C2-3','C2','Mixed with reserves','Import now while stockpiling and seeding local capacity.',
     'Resilience against shocks, but ties up capital in inventory.','D1, C3'),
    # C3
    ('C3-1','C3','Dedicated generation','Build or contract power directly for the clusters.',
     'Reliable and controllable, but adds a major project to manage.','D1'),
    ('C3-2','C3','Priority grid access','Secure guaranteed capacity from the public grid.',
     'Lower build burden, but exposed to grid stress and policy shifts.','D1'),
    ('C3-3','C3','Locate near power','Site clusters where energy is cheap and abundant.',
     'Low cost and clean options, but may sit far from members or data.','C1, G1'),
    # D1
    ('D1-1','D1','Government appropriations','Member treasuries fund the program directly.',
     'Stable and mission aligned, but exposed to budget and election cycles.','D2'),
    ('D1-2','D1','Sovereign and development funds','Wealth funds or development banks invest.',
     'Patient large capital, but expects governance and return discipline.','D3'),
    ('D1-3','D1','Private investment with states','Industry invests alongside member governments.',
     'Speed and scale, but pressure for commercial returns and control.','A1, D3'),
    ('D1-4','D1','Mixed','Blend public anchor funding with private and grants.',
     'Diversified and resilient, but complex to align incentives.','D2, D3'),
    # D2
    ('D2-1','D2','Public good','Funded by states, free at the point of use.',
     'Maximum access and trust, but permanently dependent on budgets.','G3'),
    ('D2-2','D2','Commercial licensing','Charge firms and partners for access.',
     'Self sustaining over time, but pulls focus toward paying customers.','B3, D3'),
    ('D2-3','D2','Tiered','Free public tier, paid commercial tier.',
     'Balances mission and revenue, but needs careful boundary setting.','B3, G2'),
    # D3
    ('D3-1','D3','Held by the consortium','A central legal entity owns the IP.',
     'Coherent and easy to license, but members may resist pooling.','G3'),
    ('D3-2','D3','Shared by members','Members co own with agreed usage rights.',
     'Fair and politically palatable, but slow and litigious to manage.','A2, G3'),
    ('D3-3','D3','Open licensed','Release IP under open terms by default.',
     'Trust and ecosystem, but forgoes a major revenue lever.','B2, D2'),
    # E1
    ('E1-1','E1','Repatriate diaspora','Recruit nationals working abroad to return.',
     'Aligned and loyal talent, but a limited and contested pool.','E2'),
    ('E1-2','E1','Recruit globally','Hire the best regardless of nationality.',
     'Top capability quickly, but visa, security, and trust questions.','F2, F3'),
    ('E1-3','E1','Train domestically','Invest in universities and fellowships at home.',
     'Durable long term pipeline, but slow to produce frontier talent.','E2, D1'),
    # E2
    ('E2-1','E2','Central lab','One flagship lab concentrates the work.',
     'Focus and speed, but other members may feel sidelined.','C1'),
    ('E2-2','E2','Federated labs','Each member runs a node in a shared program.',
     'Broad buy in and local capacity, but coordination overhead.','A2, F3'),
    ('E2-3','E2','University partnerships','Anchor research in academic institutions.',
     'Talent pipeline and openness, but slower translation to product.','B3'),
    # F1
    ('F1-1','F1','Independent body','An arm length safety authority oversees the work.',
     'Credibility and trust, but can slow shipping and create friction.','F3, A4'),
    ('F1-2','F1','Internal team','Safety sits inside the build organization.',
     'Fast and informed, but vulnerable to pressure to ship.','F3'),
    ('F1-3','F1','Shared with regulators','Co govern with member country regulators.',
     'Strong legitimacy, but exposed to differing national rules.','G2, A4'),
    # F2
    ('F2-1','F2','Members only','Access limited to member states and vetted users.',
     'Tight control, but limits reach and economic return.','B2, D2'),
    ('F2-2','F2','Tiered access','Different capability levels for different users.',
     'Flexible and risk aware, but complex to define and police.','G2'),
    ('F2-3','F2','Open with monitoring','Broad access with usage logging and review.',
     'Reach and openness, but heavy monitoring burden and privacy tension.','G1, G2'),
    # F3
    ('F3-1','F3','Centralized response','One team owns detection and response.',
     'Consistent and fast, but a single point of overload.','F1'),
    ('F3-2','F3','Member level response','Each member handles incidents locally.',
     'Local context and speed, but uneven standards and gaps.','A2'),
    ('F3-3','F3','Shared protocol','Common playbook executed by all members.',
     'Coordinated and scalable, but requires constant joint drilling.','F1, A2'),
    # G1
    ('G1-1','G1','Strictly in region','All data stays within member borders.',
     'Strong sovereignty claim, but limits cloud and partner options.','C1, C3'),
    ('G1-2','G1','Federated with localization','Data stays local but is queried across nodes.',
     'Balance of sovereignty and scale, but complex to engineer.','C1, F2'),
    ('G1-3','G1','Cross border under treaty','Data moves under agreed legal protections.',
     'Flexibility and scale, but depends on durable agreements.','A3, G2'),
    # G2
    ('G2-1','G2','Strictest member law','Apply the toughest member standard everywhere.',
     'High trust and portability, but the most restrictive on data use.','B1, A4'),
    ('G2-2','G2','New common framework','Draft a shared rights regime for the consortium.',
     'Coherence and clarity, but slow and politically heavy.','A4, G3'),
    ('G2-3','G2','Sector specific','Tailor consent rules to each domain.',
     'Practical and proportionate, but fragmented and harder to audit.','B3, F1'),
    # G3
    ('G3-1','G3','Consortium bears','The central entity is liable.',
     'Clear for users and partners, but concentrates risk and cost.','D3'),
    ('G3-2','G3','Members bear','Each member is liable for its own use.',
     'Aligns risk with control, but creates uneven exposure.','A2'),
    ('G3-3','G3','Shared','Liability is apportioned by an agreed formula.',
     'Fair in principle, but disputes are likely and slow to settle.','A2, D3'),
]

BRANCHES += [
    ('H', 'Outcomes and Real-World Players',
     'What consortium model does each path actually produce, and who are the real entities shaping this landscape now? Context drawn from current geopolitics, European AI industry, and the "Moonshot" scenario.'),
]

NODES += [
    ('H1','H','What consortium model does this path produce?',
     'Different combinations of Branch A-G choices converge on recognizable institutional archetypes. Identifying your target model early clarifies which trade-offs are load-bearing.'),
    ('H2','H','Which existing European and allied AI players are in scope?',
     'The coalition does not start from zero. Existing labs, research groups, and industrial champions can be absorbed, partnered, or used as templates — but their track record matters.'),
    ('H3','H','What chip and infrastructure players must be negotiated with?',
     'Compute sovereignty depends on relationships with a small number of critical hardware suppliers, cloud providers, and semiconductor tool makers. Each has its own leverage and agenda.'),
    ('H4','H','What U.S. model providers are negotiating partners or risks?',
     'Before a sovereign model exists, the consortium will rely on or resist U.S. frontier models. The terms of that relationship shape the urgency and scope of the sovereign project.'),
    ('H5','H','What geopolitical triggers accelerate or kill the project?',
     'The "Fable scenario" — a U.S. export control that cuts allied access to frontier AI — is the clearest trigger. Other scenarios shift the urgency and feasibility calculus.'),
]

OPTIONS += [
    # H1 — Consortium outcome models
    ('H1-1','H1','Airbus Model',
     'State-backed consortium with shared public ownership, built to reach commercial viability. Parallels the EU aircraft project: governments absorb early risk, eventual partial privatization returns capital. The Moonshot essay\'s preferred model: ~$500B over four years, EU+Canada+Australia core.',
     'Best chance at frontier parity and commercial sustainability. Requires extraordinary political will, strong defection-prevention mechanisms, and a coercion shield against U.S. chip export controls.',
     'A1, D1, E1'),
    ('H1-2','H1','CERN Model',
     'Pure public-good research consortium with no commercial products. Members fund in proportion to GDP; outputs are open to all. CERN-style governance with rotating scientific leadership.',
     'High legitimacy and easy to defend politically. Does not produce a deployable product competitive with U.S. or Chinese frontier models — fails the sovereignty test under a "Fable scenario."',
     'B2, D2'),
    ('H1-3','H1','National Champion',
     'One country leads; others participate as junior partners. France + Mistral is the current archetype attempt. The lead nation absorbs political and financial risk; smaller partners get preferential access.',
     'Faster to launch and easier to govern. Structural dependency on the lead nation — if it defects or its policy changes, the project collapses. UK and France are the only realistic leads today.',
     'A1-1, D1'),
    ('H1-4','H1','Fast-Follower Alliance',
     'No attempt at the frontier. The consortium standardizes on a second-tier open-weight model (e.g., a next-generation Mistral or DeepSeek-class system), deploys it across member governments, and negotiates sovereign terms with U.S. labs for the tasks where frontier matters.',
     'Far cheaper and faster to implement. Does not solve the access problem under a Fable scenario. Works as a hedge, not a sovereign strategy. Increasingly unviable as the gap between frontier and second-best widens.',
     'B1-2, F2'),
    ('H1-5','H1','Managed Dependency',
     'No autonomous model. The consortium instead negotiates legally binding access agreements with U.S. providers (Anthropic, OpenAI, Google DeepMind), possibly backed by infrastructure investment or equity co-ownership that creates mutual dependence.',
     'Lowest cost. The Moonshot argues this fails under the specific scenario it targets: a "maximally volatile U.S. executive" that ignores interdependence. Works only if the worst-case U.S. scenario does not materialize.',
     'A3, F2'),

    # H2 — European and allied AI players
    ('H2-1','H2','Mistral (France)',
     'Europe\'s highest-profile frontier-adjacent lab. Produces open-weight models competitive below the frontier. Has EU institutional backing, French government support, and commercial traction. The Moonshot argues Mistral\'s brand is partly exhausted as a sovereignty vehicle — researchers see it as a failed attempt at frontier parity.',
     'Real talent, real models, real infrastructure relationships. Not at the frontier and unlikely to reach it alone. Most useful as a talent pool and base layer to absorb into a larger project, not as the organizing entity.',
     'E1, B1'),
    ('H2-2','H2','Cohere / Aleph Alpha',
     'Canadian and German enterprise AI labs with government ties. Cohere focuses on enterprise APIs; Aleph Alpha has German federal contracts. Both are below the frontier but have done original research and have credibility with policymakers.',
     'Valuable for government deployment relationships and multilingual capabilities. The Moonshot flags them as structurally insufficient models for the sovereign project — they have not achieved frontier parity and their brand signals this.',
     'B3, E1'),
    ('H2-3','H2','CuspAI (UK)',
     'UK-based AI compute and infrastructure company focused on sovereign AI capability. Positioned at the intersection of government security requirements and frontier AI deployment — relevant to both compute and safety branches.',
     'Strong alignment with the consortium\'s security and sovereignty goals. UK political uncertainty about joining a non-U.S.-aligned project is the main risk; bilateral UK-U.S. AI deals may compete for the same political bandwidth.',
     'C1, F1'),
    ('H2-4','H2','Black Forest Labs / ElevenLabs',
     'European narrow AI champions: image generation and voice synthesis respectively. High technical quality in specific domains, not general frontier labs.',
     'Talent reservoirs and proof points for European AI capability. The Moonshot recommends absorbing their teams at current valuations (~$25B across the sector) without preserving their structures or brands.',
     'E1, B3'),
    ('H2-5','H2','ASML and European semiconductor leverage',
     'ASML (Netherlands) produces the EUV lithography machines without which no one can manufacture leading-edge chips. This is Europe\'s most powerful AI leverage point — withheld EUV access breaks both U.S. and Chinese chip supply chains.',
     'The Moonshot\'s "coercion shield": if the U.S. attempts to block chip exports to the consortium, the coalition can threaten EUV access. This turns ASML from a passive asset into an active diplomatic instrument. Politically sensitive and a one-shot card.',
     'C2, A3'),

    # H3 — Chip and infrastructure players
    ('H3-1','H3','Nvidia',
     'Dominant supplier of AI accelerators (H100, B200, Blackwell series). The Moonshot estimates ~3M Blackwell-class chips needed (~$275-300B). Nvidia has strong incentives to sell to the consortium — it prefers diverse buyers over U.S. monopsony.',
     'Critical path dependency. U.S. export controls could restrict sales to the consortium. Nvidia\'s own commercial interests make it a potential internal U.S. advocate for allowing sales. The consortium should treat Nvidia as a partner to court, not just a supplier to pay.',
     'C2, A3'),
    ('H3-2','H3','AWS / Azure / Google Cloud',
     'U.S. hyperscalers currently provide most of the compute for non-frontier AI in middle powers. A trusted regional cloud option (C1-2) would likely route through one of these, with negotiated data residency and sovereignty terms.',
     'Fast to deploy, well-understood operationally. Politically and legally complex — data residency commitments can be reversed, companies are subject to U.S. jurisdiction, and access can be revoked. The Moonshot argues this fails under worst-case U.S. policy scenarios.',
     'C1, G1'),
    ('H3-3','H3','TSMC / Samsung Foundry',
     'Taiwan and South Korea produce the chips Nvidia designs. A domestic fabrication strategy (C2-2) would require either partnering with or competing against these foundries, or building a new fab (15+ year timeline).',
     'Long-term chip independence requires foundry access or ownership. TSMC\'s geopolitical position (Taiwan Strait risk) is itself a sovereignty concern. South Korea\'s potential consortium membership could unlock Samsung Foundry cooperation.',
     'C2, A1'),
    ('H3-4','H3','Sovereign datacenter operators',
     'Purpose-built compute infrastructure in Norway (hydroelectric), France (nuclear), Iberia (solar), and Germany (deindustrialized high-power zones). The Moonshot estimates 5-6 GW of total datacenter power needed.',
     'Genuine sovereignty requires owned infrastructure. Building at this scale requires the fastest-moving available host countries first, expanding to broader locations. Germany built LNG terminals in under 10 months in the 2022 gas crisis — precedent for crisis-speed infrastructure.',
     'C1, C3'),

    # H4 — U.S. model providers
    ('H4-1','H4','Anthropic',
     'Frontier lab with the strongest safety focus. Has limited access to its most capable models for frontier AI development (preventing the consortium from using Claude to build a competing model). The Fable scenario references Anthropic\'s Fable 5 being shut down by U.S. export controls.',
     'Potential partner on safety standards and governance. Active antagonist if the consortium\'s goal is to reach frontier parity — Anthropic has explicit policy against helping build competing frontier systems. Most relevant as a benchmark and a cautionary case.',
     'F1, A3'),
    ('H4-2','H4','OpenAI',
     'Dominant model provider with the broadest API access. The Moonshot suggests OpenAI may be willing to sell coding agent contracts to the consortium in early stages, positioning itself as less restrictive than Anthropic.',
     'Useful for bootstrapping the consortium\'s non-human workforce (AI coding agents) before a sovereign model exists. Long-term dependence on OpenAI reproduces the problem the consortium is trying to solve.',
     'E1, B1'),
    ('H4-3','H4','xAI / Grok',
     'Elon Musk\'s AI lab. The Moonshot notes xAI is now renting compute to Anthropic, suggesting financial stress at the second tier. Geopolitically complex given Musk\'s relationship with U.S. government.',
     'Potentially willing to sell compute access at favorable terms. Politically risky as an association for a European-led sovereign project; domestic politics in some member countries would make the relationship controversial.',
     'C1, A3'),
    ('H4-4','H4','Google DeepMind',
     'UK-headquartered but U.S.-controlled. Has the deepest scientific talent and longest research track record. Gemini models are a direct benchmark. UK government relationships may create a special channel.',
     'UK DeepMind staff represent a potential talent recruitment pool, especially given growing concerns in the research community about commercialization pressure. The parent company\'s U.S. jurisdiction remains the binding constraint.',
     'E1, F1'),

    # H5 — Geopolitical triggers
    ('H5-1','H5','The Fable Scenario',
     'A U.S. executive action shuts down or restricts a frontier AI model as domestic policy, with allied access cut as collateral damage. The Moonshot was written in this context. The consortium\'s entire rationale crystallizes when this happens.',
     'This scenario makes the case for the sovereign project more compelling than any policy paper could. It also creates the political window for rapid coalition formation. The risk: it may come too late to act, after the U.S. frontier has pulled so far ahead that catch-up is impossible.',
     'A1, A3, D1'),
    ('H5-2','H5','Gradual access tiering',
     'The U.S. moves more slowly: it establishes a country-tier system for AI inference access, giving Tier 1 status to a few close allies and rationing compute for the rest. Europe 2031 scenario: most of Europe lands in Tier 2 with compute allocations halved.',
     'Less politically dramatic but more economically damaging. Creates sustained pressure for the consortium without a single moment of crisis that could catalyze political action. The consortium\'s case is harder to make, but the underlying need is the same.',
     'A3, C2, D1'),
    ('H5-3','H5','Semiconductor coercion',
     'The U.S. pressures the Netherlands to cut ASML DUV exports to China (as described in Europe 2031), or extends similar pressure to consortium chip purchases. Middle powers receive nothing in return for compliance.',
     'The ASML leverage is a finite card. Once spent protecting one country\'s bilateral relationship, it is no longer available for the consortium. The Europe 2031 scenario shows the Netherlands caving without EU support — the consortium structure prevents this.',
     'C2, A3, A1'),
    ('H5-4','H5','Chinese competitive pressure',
     'China\'s AI development forces a security framing on middle powers even absent U.S. restrictions. Choosing not to build sovereign AI means choosing between U.S. and Chinese dependence — with DeepSeek/Kimi as the Chinese alternative to U.S. models.',
     'China\'s open-source releases (DeepSeek R1) temporarily cheapen fast-follower AI but also spread offensive capabilities that affect all middle powers equally. The consortium can leverage this to build the case for a non-Chinese, non-U.S. alternative.',
     'A3, B1, F2'),
]

CRITICAL_PATH = [
    (1,'A1','Control',
     'Decide who owns and directs the consortium before anything else, because it sets every downstream authority. The Airbus Model (H1-1) requires multi-government co-ownership; the National Champion (H1-3) requires one lead nation.'),
    (2,'A2','Decision rule',
     'Agree how members break ties, or the first hard choice will stall the whole program. The Moonshot flags defection risk — weighted voting with precommitted resources is the strongest defense against bilateral U.S. buyouts of individual members.'),
    (3,'A3','Geopolitical posture',
     'Your alignment determines whether you can buy the chips your product plans assume. A nonaligned stance paired with ASML leverage (H2-5, H3-1) is The Moonshot\'s coercion shield strategy.'),
    (4,'B1','Foundation model approach',
     'Build, adapt, or license drives your compute bill, timeline, and independence. The Moonshot is explicit: only training from scratch (with absorbed European talent from Mistral, Cohere, CuspAI) achieves genuine sovereignty. Fast-follower fails under the Fable scenario.'),
    (5,'C1, C2','Compute location and chips',
     'Without resolved hardware and hosting, the product branch cannot ship. The Moonshot estimate: ~3M Blackwell-class chips, 5-6 GW of datacenter power, ~$275-300B. Nvidia (H3-1) is the critical supplier; ASML (H2-5) is the coercion shield.'),
    (6,'D1','Capital source',
     'Confirm funding matches the compute and talent the earlier choices demand. The Moonshot total: ~$500B over four years across compute ($275-300B), talent ($65B), political insulation ($80B), and interim compute rental ($25B).'),
    (7,'G1, G2','Data residency and rights',
     'Lock these before training, because retrofitting compliance is painful. European member states bring existing GDPR frameworks; the common standard approach (G2-2) creates coherence but requires treaty-level negotiation.'),
    (8,'F1','Safety governance',
     'Stand up oversight early, since trust is hard to rebuild once lost. The Moonshot recommends a structure parallel to the UK AI Safety Institute — country-level czars with high-caliber policy teams as government liaisons to the technical organization.'),
]

# ---------------------------------------------------------------------------
# Spreadsheet creation
# ---------------------------------------------------------------------------
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

    # Build batch data
    rows_branches = [['id','name','description']] + list(BRANCHES)
    rows_nodes    = [['id','branch_id','question','description']] + [list(n) for n in NODES]
    rows_options  = [['id','node_id','label','what_it_means','key_tradeoffs','leads_to']] + [list(o) for o in OPTIONS]
    rows_cp       = [['step','node_id','title','description']] + [list(c) for c in CRITICAL_PATH]

    value_ranges = [
        {'range': 'Branches!A1',     'values': rows_branches},
        {'range': 'Nodes!A1',        'values': rows_nodes},
        {'range': 'Options!A1',      'values': rows_options},
        {'range': 'CriticalPath!A1', 'values': rows_cp},
    ]

    services['sheets'].spreadsheets().values().batchUpdate(
        spreadsheetId=ss_id,
        body={'valueInputOption': 'RAW', 'data': value_ranges}
    ).execute()

    # Header formatting
    header_fmt = {
        'backgroundColor': {'red': 0.102, 'green': 0.106, 'blue': 0.180},
        'textFormat': {'foregroundColor': {'red':1,'green':1,'blue':1}, 'bold': True},
        'horizontalAlignment': 'LEFT'
    }
    requests = []
    for name, ncols in [('Branches',3),('Nodes',4),('Options',6),('CriticalPath',4)]:
        requests.append({'repeatCell': {
            'range': {'sheetId': sid(name), 'startRowIndex': 0, 'endRowIndex': 1,
                      'startColumnIndex': 0, 'endColumnIndex': ncols},
            'cell': {'userEnteredFormat': header_fmt},
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }})
        requests.append({'updateSheetProperties': {
            'properties': {'sheetId': sid(name), 'gridProperties': {'frozenRowCount': 1}},
            'fields': 'gridProperties.frozenRowCount'
        }})

    services['sheets'].spreadsheets().batchUpdate(
        spreadsheetId=ss_id, body={'requests': requests}
    ).execute()

    print(f'    Spreadsheet ID: {ss_id}')
    return ss_id

# ---------------------------------------------------------------------------
# Document creation
# ---------------------------------------------------------------------------
def create_doc(services):
    print('  Creating Google Document...')
    doc = services['docs'].documents().create(
        body={'title': 'Sovereign AI Consortium — Decision Tree'}
    ).execute()
    doc_id = doc['documentId']
    print(f'    Document ID: {doc_id}')
    return doc_id

# ---------------------------------------------------------------------------
# Move files to target folder and share
# ---------------------------------------------------------------------------
def configure_file(services, file_id, folder_id):
    drive = services['drive']
    # Get current parents
    meta = drive.files().get(fileId=file_id, fields='parents').execute()
    current_parents = ','.join(meta.get('parents', []))
    # Move to target folder
    drive.files().update(
        fileId=file_id,
        addParents=folder_id,
        removeParents=current_parents,
        fields='id, parents'
    ).execute()
    # Share: anyone with link can view
    drive.permissions().create(
        fileId=file_id,
        body={'type': 'anyone', 'role': 'reader'},
        fields='id'
    ).execute()
    # Also share edit with user email
    try:
        drive.permissions().create(
            fileId=file_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': USER_EMAIL},
            fields='id',
            sendNotificationEmail=False
        ).execute()
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Apps Script project creation
# ---------------------------------------------------------------------------
def read_file(name):
    path = SCRIPT_DIR / name
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def create_apps_script(services, ss_id, doc_id):
    print('  Creating Apps Script project...')
    script = services['script']

    # Create project bound to the spreadsheet
    project = script.projects().create(body={
        'title': 'Sovereign AI Consortium — Decision Tree',
        'parentId': ss_id
    }).execute()
    script_id = project['scriptId']

    # Upload files
    files = [
        {'name': 'appsscript', 'type': 'JSON',           'source': read_file('appsscript.json')},
        {'name': 'Code',       'type': 'SERVER_JS',      'source': read_file('Code.gs')},
        {'name': 'Index',      'type': 'HTML',           'source': read_file('Index.html')},
        {'name': 'Stylesheet', 'type': 'HTML',           'source': read_file('Stylesheet.html')},
        {'name': 'JavaScript', 'type': 'HTML',           'source': read_file('JavaScript.html')},
    ]
    script.projects().updateContent(
        scriptId=script_id,
        body={'files': files, 'scriptId': script_id}
    ).execute()
    print(f'    Script ID: {script_id}')

    # Set script properties (SS ID + Doc ID)
    # Use the execution API to run a setup function
    # We'll set properties by including them in a setup call after deployment
    return script_id

def deploy_web_app(services, script_id):
    print('  Creating web app deployment...')
    script = services['script']

    # Create a version
    version = script.projects().versions().create(
        scriptId=script_id,
        body={'description': 'Initial deployment'}
    ).execute()
    ver_num = version['versionNumber']

    # Deploy as web app
    deployment = script.projects().deployments().create(
        scriptId=script_id,
        body={
            'versionNumber': ver_num,
            'manifestFileName': 'appsscript',
            'description': 'Sovereign AI Consortium Decision Tree',
        }
    ).execute()

    dep_id = deployment['deploymentId']
    config = deployment.get('entryPoints', [{}])[0].get('webApp', {})
    url = config.get('url', '')
    if not url:
        # Build URL manually
        url = f'https://script.google.com/macros/s/{dep_id}/exec'
    print(f'    Deployment ID: {dep_id}')
    print(f'    Web App URL: {url}')
    return dep_id, url

def set_script_properties(services, script_id, ss_id, doc_id):
    """Run a snippet via execution API to set script properties."""
    print('  Setting script properties...')
    try:
        services['script'].scripts().run(
            scriptId=script_id,
            body={
                'function': 'setProperties',
                'parameters': [ss_id, doc_id],
                'devMode': False
            }
        ).execute()
    except Exception as e:
        print(f'    Warning: could not run setProperties via API ({e})')
        print('    You may need to open the web app once and click "Initialize" if prompted.')

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print('\nSovereign AI Consortium — Decision Tree Deployment')
    print('='*52)

    print('\n[1/6] Authenticating with Google...')
    creds = get_credentials()
    services = build_services(creds)
    print('  Authenticated.')

    print('\n[2/6] Creating Spreadsheet...')
    ss_id = create_spreadsheet(services)

    print('\n[3/6] Creating Document...')
    doc_id = create_doc(services)

    print('\n[4/6] Moving files to Drive folder and setting permissions...')
    configure_file(services, ss_id,  FOLDER_ID)
    configure_file(services, doc_id, FOLDER_ID)
    print('  Done.')

    print('\n[5/6] Creating Apps Script project and deploying web app...')
    script_id = create_apps_script(services, ss_id, doc_id)
    dep_id, web_app_url = deploy_web_app(services, script_id)

    print('\n[6/6] Configuring script properties...')
    # Inject script properties by patching the Code.gs with hardcoded values
    # (more reliable than execution API for first deployment)
    props_injection = f"""
// Auto-injected by deploy.py
function getConfiguredProperties() {{
  return {{ ssId: '{ss_id}', docId: '{doc_id}' }};
}}

function setPropertiesFromConfig() {{
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SOVEREIGN_AI_SS_ID',  '{ss_id}');
  props.setProperty('SOVEREIGN_AI_DOC_ID', '{doc_id}');
}}
"""
    code_content = read_file('Code.gs') + props_injection

    services['script'].projects().updateContent(
        scriptId=script_id,
        body={'files': [
            {'name': 'appsscript', 'type': 'JSON',      'source': read_file('appsscript.json')},
            {'name': 'Code',       'type': 'SERVER_JS', 'source': code_content},
            {'name': 'Index',      'type': 'HTML',      'source': read_file('Index.html')},
            {'name': 'Stylesheet', 'type': 'HTML',      'source': read_file('Stylesheet.html')},
            {'name': 'JavaScript', 'type': 'HTML',      'source': read_file('JavaScript.html')},
        ], 'scriptId': script_id}
    ).execute()

    # Create a new version with the injected properties helper and redeploy
    version2 = services['script'].projects().versions().create(
        scriptId=script_id,
        body={'description': 'With config properties'}
    ).execute()
    ver2_num = version2['versionNumber']

    services['script'].projects().deployments().update(
        scriptId=script_id,
        deploymentId=dep_id,
        body={
            'deploymentConfig': {
                'versionNumber': ver2_num,
                'manifestFileName': 'appsscript',
                'description': 'Sovereign AI Consortium Decision Tree',
            }
        }
    ).execute()

    print('\n' + '='*52)
    print('DEPLOYMENT COMPLETE')
    print('='*52)
    print(f'\nWeb App URL:  {web_app_url}')
    print(f'Spreadsheet:  https://docs.google.com/spreadsheets/d/{ss_id}/edit')
    print(f'Document:     https://docs.google.com/document/d/{doc_id}/edit')
    print(f'Script:       https://script.google.com/d/{script_id}/edit')
    print('\nIMPORTANT: Open the web app URL once while logged in as the')
    print('deploying account to finalize script property initialization.')
    print('The "Sync Doc" button will populate the Google Document.')
    print()

    # Save IDs for reference
    with open(SCRIPT_DIR / 'deployment_info.json', 'w') as f:
        json.dump({
            'ss_id': ss_id,
            'doc_id': doc_id,
            'script_id': script_id,
            'deployment_id': dep_id,
            'web_app_url': web_app_url,
            'sheet_url': f'https://docs.google.com/spreadsheets/d/{ss_id}/edit',
            'doc_url': f'https://docs.google.com/document/d/{doc_id}/edit',
        }, f, indent=2)
    print(f'IDs saved to {SCRIPT_DIR}/deployment_info.json')

if __name__ == '__main__':
    main()
