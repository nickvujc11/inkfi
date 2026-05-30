# Requirements Document

## Introduction

InkFi v1 shipped the core writer-side primitives: soulbound article NFTs, per-article staking vaults with accumulator-style rewards, a 70/25/5 tipping splitter, and per-second streaming. Those primitives are live on OPN Chain testnet and verified end-to-end (a 0.5 OPN stake plus 0.2 OPN tip produces exactly 0.05 OPN staker reward, as designed).

v2 closes three gaps that the current product still has, all in one cohesive release:

1. **Discovery is invisible.** Readers landing on the app have no way to tell which articles are getting capital, which writers are trending, or where the streaming activity is concentrated. Every article looks the same in the feed.
2. **Readers have no home.** The dashboard answers "what did I write" and "who staked on me", but nothing answers "where did I put my money", "what am I earning across articles", or "which streams am I funding". The reader is a first-class user with no first-class surface.
3. **There is no social or collaboration layer.** Articles are written by exactly one wallet. Tips come only from organic readers. There is no mechanism for the protocol or community to amplify good content beyond raw individual capital.

v2 ships three discovery surfaces (Explore Feed, Writer Profile, Streams Live) and three new on-chain primitives (Reading Portfolio, Tip Matching, Co-authorship). The discovery surfaces are pure frontend and event indexing; they ship first because they have zero contract risk and the highest visual impact for the IOPn Builders Programme Season 1 review. The three primitives ship second because they require new contracts.

The release explicitly does **not** ship: Ink Wars governance, Writer Leagues tier system as a smart contract, Article Futures, Writer Bonds, Annotation Layer. Those stay on the public roadmap to demonstrate continuity beyond the hackathon window without expanding the audit surface.

### Success criteria

- Every existing v1 user flow keeps working unchanged. No contract migration.
- A new visitor can answer "where is the activity?" in under five seconds on the landing experience.
- A reader who has staked or tipped can see a complete, accurate picture of their own positions and accrued yield in a single page.
- Tip Matching, Reading Portfolio, and Co-authorship contracts each have explicit, on-chain-verifiable behaviour with full Hardhat coverage before they ship to mainnet.
- Anything that is not yet truly real-time on-chain (heat scoring, projected yield, tier badges) is labeled honestly so reviewers cannot mistake it for a guarantee.

### Out of scope

- IPFS / Arweave content storage (still local-first, hash anchored on-chain).
- A custom indexer or subgraph. Event reads happen client-side with sane block-range bounds; if it gets slow we add caching, not infrastructure.
- Mobile native apps. The PWA path remains roadmap.
- Writer Leagues as on-chain tiers. v2 surfaces tier as a client-side computed badge based on observable on-chain stats, with a `roadmap` flag in the UI.

## Glossary

- **ArticleNFT** — existing v1 ERC-721 contract, soulbound, one token per published article.
- **ArticleVaultPool** — existing v1 staking contract, one logical pool per `articleId`, accumulator-style rewards.
- **TippingRouter** — existing v1 entrypoint splitting tips 70 / 25 / 5 between writer, stakers, treasury.
- **InkStream** — existing v1 per-second streaming contract.
- **WOPN** — existing v1 wrapper for native OPN; staking and matching use WOPN as the asset.
- **Heat** — client-side classification of an article based on tipping and staking activity over a recent window.
- **Projected yield** — extrapolated annualised yield computed from the last thirty days of staker rewards on a vault, labeled honestly so it is not mistaken for a contract-guaranteed APY.
- **Tier badge** — client-side reputation label (Apprentice → Sage) computed from observable on-chain stats; v1 is heuristic, on-chain enforcement is roadmap.
- **TipMatcher** — new v2 contract that doubles tips on curated articles using treasury-funded WOPN.
- **CoAuthorRegistry** — new v2 contract storing accepted co-author and revenue split per `articleId`.
- **Phase 1** — frontend and event-indexing-only release. No new contracts.
- **Phase 2** — new contracts (TipMatcher, CoAuthorRegistry) plus the surfaces that depend on them.

## Requirements

### Requirement 1: Explore Feed with on-chain heat ranking

**User Story:** As a reader, I want a feed that ranks articles by real on-chain activity, so that I can spot which articles are getting capital before I read or stake.

#### Acceptance Criteria

1. WHEN a visitor opens `/explore` THEN the system SHALL render every article minted on `ArticleNFT` in a card grid with at least three cards per row on desktop and one card per row on mobile.
2. WHEN the system computes heat for an article THEN it SHALL classify the article into one of: `HOT` (article tipped at least three times in the last twenty-four hours OR vault TVL increased by at least ten percent in the last twenty-four hours), `RISING` (any tip OR any new staker in the last twenty-four hours, but does not meet `HOT`), `NEW` (article created in the last twenty-four hours), or `STEADY` (none of the above).
3. WHEN the system displays a heat badge THEN it SHALL include a tooltip explaining the rule that produced the badge.
4. WHEN the system shows the seven-bar sparkline on a card THEN each bar SHALL represent OPN tipped to that article on one of the last seven days, and the system SHALL fall back to a flat zero sparkline if the article has no tips yet.
5. WHEN the system shows the per-card metrics THEN it SHALL show: cumulative `OPN Staked` (vault TVL), cumulative `Tips` count from the `Tipped` event log, and a yield indicator labeled `30d projected` (NOT "APY") computed as `(stakerShareTipped30d / averageTvl30d) * (365 / 30) * 100` and clamped to a sane upper bound.
6. WHEN the article has insufficient data for the projected yield THEN the system SHALL render an em-dash and SHALL NOT show a number.
7. WHEN a visitor clicks a heat filter THEN the grid SHALL filter to only matching articles and SHALL persist the choice in the URL query string.
8. WHEN a market ticker is shown above the grid THEN it SHALL display: protocol-wide TVL (sum of all vault `totalStaked`), aggregate streaming rate (sum of `ratePerSecond` for active streams), and twenty-four-hour tip volume.
9. WHEN the feed loads THEN initial paint SHALL not depend on event log scans, and event-derived values (sparkline, heat, ticker) SHALL hydrate progressively as scans complete.
10. WHEN the user is offline or the RPC is unreachable THEN the feed SHALL still render the last known cached state and SHALL display a small offline indicator.

### Requirement 2: Streams Live network graph

**User Story:** As a visitor, I want to see the live OPN flow across the protocol as a graph, so that I can understand the network at a glance and trust that the streaming layer is real.

#### Acceptance Criteria

1. WHEN a visitor opens `/streams/live` THEN the system SHALL render a force-directed-style SVG graph where every active stream is an edge from a reader node to a writer node.
2. WHEN the system computes node positions THEN it SHALL use a deterministic layout (hash of address mapped to polar coordinates with collision avoidance) so the same set of streams produces the same picture on reload.
3. WHEN the system renders an edge THEN edge thickness SHALL scale with the stream's `ratePerSecond` and edges with rate above the median SHALL animate with `dashFlow`.
4. WHEN a stream is cancelled THEN the corresponding edge SHALL animate to fade and disappear within one second.
5. WHEN a new stream is opened THEN the corresponding edge SHALL animate in within one second of the next event poll, and a new entry SHALL be prepended to the right-hand "New streams" feed.
6. WHEN the right-hand sidebar is rendered THEN it SHALL list every active stream with: sender avatar plus handle (or short address), recipient article title or short address, rate per second, and age in days.
7. WHEN the visitor toggles the "List" mode THEN the system SHALL hide the SVG and show a denser list view of every stream with sender, recipient, rate, deposited, withdrawn, and status.
8. WHEN no streams exist THEN the system SHALL show an empty-state with a CTA to open the first stream and SHALL NOT render an empty graph canvas with no nodes.
9. WHEN the live overlay is rendered THEN it SHALL show: total `OPN/second` across active streams, count of active streams, and total OPN staked across all article vaults.
10. WHEN any displayed metric is computed from event logs rather than a single contract call THEN the system SHALL note the block range used in a tooltip so reviewers can verify provenance.

### Requirement 3: Writer Profile page

**User Story:** As a reader who clicks a writer's address, I want a profile page that summarises that writer's published articles, accumulated earnings, and supporters, so that I can decide whether to stake on or stream to them.

#### Acceptance Criteria

1. WHEN a visitor opens `/writer/[address]` THEN the system SHALL render a hero with a deterministic gradient avatar derived from the address bytes, a short address handle, and the writer's tier badge.
2. WHEN the system computes the tier badge THEN it SHALL use the following client-side heuristic: `Apprentice` (no published articles), `Scribe` (one to three articles), `Chronicler` (four to nine articles or any single article above one hundred OPN staked), `Sage` (ten or more articles or any single article above five hundred OPN staked).
3. WHEN the tier badge is rendered THEN the page SHALL include a small visible note labeling the tier as a `v1 heuristic, on-chain tier in roadmap` so reviewers do not mistake it for a contract-enforced status.
4. WHEN the profile stats row is rendered THEN it SHALL show five cards: cumulative OPN earned by this writer (sum of `Tipped.toWriter` plus `StreamWithdrawn` to this address), total OPN currently staked across this writer's articles, current incoming streaming rate, average projected yield across this writer's articles, and unique supporter count (distinct addresses across `Staked` and `Tipped` events).
5. WHEN the earnings chart panel is rendered THEN it SHALL stack three series (Tips, Streams, Stake-yield-paid-out) over the last seven completed weeks and SHALL color them gold, stream-blue, and yield-green respectively.
6. WHEN the chart's `7D` / `1M` / `3M` / `All` time tabs are clicked THEN the chart SHALL re-bucket the same event series into the new range without re-fetching.
7. WHEN the top-stakers panel is rendered THEN it SHALL list at most ten distinct addresses ranked by current total stake across this writer's articles, with the top three flagged as `⭑ Top`.
8. WHEN the article portfolio grid is rendered THEN it SHALL show every article authored by this writer with status `Live · Earning` (vault TVL above zero AND any tip in the last fourteen days), `Staked · No Tips Yet` (vault TVL above zero AND no tips), or `Dormant` (vault TVL is zero).
9. WHEN the visitor is the writer themselves THEN the system SHALL show two CTAs: edit profile metadata (deferred to roadmap, button disabled with tooltip) and "view as reader".
10. WHEN the visitor is not the writer THEN the system SHALL show two CTAs: "stake on an article" (jumps to portfolio grid) and "open stream to this writer" (preselects the writer in the streams form).

### Requirement 4: Reading Portfolio (reader-side dashboard)

**User Story:** As a reader who has tipped, staked, or streamed, I want a single page that shows everywhere my OPN has gone, so that I can manage my positions and claim accumulated yield.

#### Acceptance Criteria

1. WHEN a connected user opens `/portfolio` THEN the system SHALL render four sections in this order: Active Stakes, Active Streams (as sender), Tips Sent, and Articles Authored.
2. WHEN the Active Stakes section is rendered THEN it SHALL list every article where the user has non-zero `userInfo.staked` and SHALL show: article title, current my-stake, share of pool, pending reward, and a per-article claim button.
3. WHEN the user clicks `Claim All` THEN the system SHALL submit one transaction per article with non-zero pending reward in sequence and SHALL show progress as `n of N claimed` with the option to cancel between transactions.
4. WHEN the Active Streams section is rendered THEN it SHALL list every stream where the user is `sender` AND `stoppedAt == 0` and SHALL show: recipient writer, rate per day, deposited, withdrawn-by-recipient, remaining, and a `cancel stream` button.
5. WHEN the Tips Sent section is rendered THEN it SHALL list the user's last fifty `Tipped` events as sender (most recent first) with article title, amount, memo, and a deep link to the article.
6. WHEN the Articles Authored section is rendered THEN it SHALL show a compact mirror of the writer-side dashboard so a reader who is also a writer does not need to switch contexts.
7. WHEN the user has no positions in any section THEN the system SHALL render a section-specific empty state with a CTA pointing to where to start (Explore Feed for stakes, Streams for streams, an article page for tips).
8. WHEN aggregate stats are shown above the sections THEN they SHALL include: cumulative OPN tipped (lifetime, from event scan), total OPN currently at work (active stakes plus active stream remainder), and total pending yield across all stakes.
9. WHEN any value depends on RPC reads THEN the page SHALL show a per-section last-updated timestamp.
10. WHEN the user is not connected THEN the page SHALL show a connect-wallet prompt and SHALL NOT pretend to load empty data.

### Requirement 5: Tip Matching contract

**User Story:** As the protocol, I want a treasury-funded matching layer that doubles tips on curated articles, so that high-quality writing gets economic amplification beyond raw organic tipping.

#### Acceptance Criteria

1. WHEN the `TipMatcher` contract is deployed THEN it SHALL be `Ownable` with the deployer as the initial owner and SHALL hold a WOPN balance funded by the owner.
2. WHEN the owner calls `setCurated(articleId, bool)` THEN the system SHALL toggle a per-article curation flag and emit a `CurationUpdated(articleId, bool)` event.
3. WHEN the owner calls `setMatchBps(uint16)` THEN the system SHALL set a basis-points multiplier (default `10000` = 1x match, capped at `20000` = 2x), and SHALL emit `MatchBpsUpdated(bps)`.
4. WHEN the owner calls `setMatchCap(articleId, uint256)` THEN the system SHALL set a per-article cumulative cap on matched OPN, default zero meaning unlimited.
5. WHEN `TippingRouter` routes a tip on a curated article AND the `TipMatcher` has sufficient WOPN balance AND the article's matched-so-far is below its cap THEN the matcher SHALL transfer `min(matchAmount, balance, capRemaining)` of WOPN to the same vault path the staker share went to and SHALL emit `TipMatched(articleId, originalTip, matchAmount, remaining)`.
6. WHEN the article has no stakers AND the staker share got redirected to the writer THEN the matched amount SHALL also be redirected to the writer (matching the original split logic).
7. WHEN `TippingRouter` is upgraded to call `TipMatcher.tryMatch` THEN the call SHALL be wrapped in a try/catch so a failing matcher (insufficient balance, paused, etc.) SHALL NOT revert the original tip.
8. WHEN the contract is paused by the owner THEN no matching SHALL occur and `tryMatch` SHALL return false without reverting.
9. WHEN the owner calls `withdraw(amount)` THEN the system SHALL transfer the requested WOPN to the owner and SHALL emit `Withdrawn(amount)`.
10. WHEN Hardhat tests run THEN they SHALL cover at minimum: match on curated, no-op on uncurated, no-op on insufficient balance, cap enforcement, redirect-to-writer when no stakers, paused state, and end-to-end with the existing `TippingRouter` integration.

### Requirement 6: Co-authorship contract

**User Story:** As two writers collaborating on a single article, we want our co-authorship and revenue split encoded on-chain, so that earnings are divided automatically without trust.

#### Acceptance Criteria

1. WHEN `CoAuthorRegistry` is deployed THEN it SHALL store the mapping `articleId -> (coAuthor, bps, accepted)` in a separate contract so `ArticleNFT` storage layout is not modified.
2. WHEN the primary writer calls `proposeCoAuthor(articleId, coAuthor, bps)` THEN the system SHALL record the proposal pending acceptance and SHALL revert if the caller is not the primary writer of the article.
3. WHEN `bps` is set THEN it SHALL be in the range `[1, 9999]` and SHALL emit `CoAuthorProposed(articleId, primary, coAuthor, bps)`.
4. WHEN the proposed co-author calls `acceptCoAuthor(articleId)` THEN the system SHALL flip `accepted` to true and emit `CoAuthorAccepted(articleId, primary, coAuthor, bps)`. Until acceptance, no revenue is split.
5. WHEN `TippingRouter` computes the writer share of a tip THEN it SHALL call `CoAuthorRegistry.split(articleId, writerShare)` and route accordingly: if there is no accepted co-author the full writer share goes to the primary writer, otherwise it splits per the registered bps.
6. WHEN `InkStream` recipient is the primary writer of a co-authored article THEN the recipient address SHALL remain the primary writer; co-author splits SHALL happen lazily when the primary writer withdraws (out of scope for v2 contracts, documented as roadmap).
7. WHEN either party calls `dissolveCoAuthor(articleId)` THEN the registry SHALL clear the co-author for future earnings only and SHALL emit `CoAuthorDissolved(articleId)`. Earnings already routed are not retroactively rebalanced.
8. WHEN the registry is queried via `coAuthorOf(articleId)` THEN it SHALL return `(address coAuthor, uint16 bps, bool accepted)`. WHEN the article has no co-author OR the proposal is not yet accepted THEN `split()` SHALL return `(writerShare, 0)` so existing behaviour is preserved bit-for-bit.
9. WHEN Hardhat tests run THEN they SHALL cover at minimum: propose-then-accept happy path, accept rejected from non-coAuthor, split correctness at multiple bps values, dissolve, and end-to-end with `TippingRouter` for co-authored vs solo articles.
10. WHEN co-authorship is reflected in the UI THEN both writers SHALL appear on the article page byline and on each Writer Profile, and the article's earnings table SHALL show both addresses with their bps.

### Requirement 7: Honest synthetic metrics

**User Story:** As a reviewer, I want any number on the dashboard that is not strictly on-chain to be labeled clearly, so that I can trust what the protocol claims.

#### Acceptance Criteria

1. WHEN a metric is computed from a window of past events rather than a single contract call THEN the UI SHALL include a tooltip stating the window and the formula (for example "30d projected from last 30d staker share / avg TVL").
2. WHEN a tier badge is shown THEN it SHALL include a "v1 heuristic" suffix or info icon explaining the client-side rule.
3. WHEN APY-style yield is shown anywhere THEN the label SHALL read `Recent yield`, `30d projected`, or similar, never `APY` without qualification.
4. WHEN the system shows a "Total Readers" or similar engagement metric THEN it SHALL be derived from on-chain unique-address counts (across `Tipped`, `Staked`, `StreamOpened`) and labeled as `Unique Supporters`. There SHALL NOT be a "view count".
5. WHEN any number is fetched or computed THEN the per-card or per-section last-updated timestamp SHALL be visible on hover or tap.

### Requirement 8: Event indexing utilities

**User Story:** As a developer extending InkFi, I want one shared utility that scans events with sane defaults, so that every page does not re-implement the same scan logic.

#### Acceptance Criteria

1. WHEN `web/src/lib/events.ts` is added THEN it SHALL export typed helpers: `getRecentTipped`, `getRecentStaked`, `getStreamOpenedSince`, each accepting `(fromBlock, toBlock?)`.
2. WHEN any helper runs THEN it SHALL chunk the requested range into at most twenty thousand blocks per `getLogs` call to avoid OPN RPC timeouts.
3. WHEN a helper completes THEN it SHALL persist the results to `localStorage` keyed by `(eventName, fromBlock, toBlock)` so reloads are fast.
4. WHEN a helper is called with `fromBlock=undefined` THEN it SHALL default to `currentBlock - approxBlocksFor(7d)` for tip and stake series, and to the article's deploy block for streams (so every active stream is captured on first load).
5. WHEN a chunk fails THEN the helper SHALL retry once with exponential backoff and SHALL bubble a typed error on second failure, and the calling page SHALL render whatever data it already has plus a non-blocking warning.

### Requirement 9: Routing and information architecture

**User Story:** As a user, I want predictable URLs for each major surface, so that I can share, bookmark, and deep-link.

#### Acceptance Criteria

1. WHEN the v2 release ships THEN the following routes SHALL be live: `/`, `/explore`, `/article/[id]`, `/writer/[address]`, `/streams`, `/streams/live`, `/portfolio`, `/dashboard` (existing writer dashboard), `/write`.
2. WHEN any old route is removed or renamed THEN the system SHALL respond with an HTTP 308 redirect to the new path so existing links are not broken. None are planned for removal in v2.
3. WHEN the navigation is rendered THEN it SHALL highlight the active surface and SHALL group entries into Reader (Explore, Streams Live, Portfolio), Writer (Write, Dashboard, Profile), and Tools (Streams).
4. WHEN a user clicks a writer's address anywhere in the app THEN the link SHALL go to `/writer/[address]`.
5. WHEN a user opens any route and is not connected THEN routes that need a connected wallet (`/portfolio`, `/dashboard`, `/write`) SHALL show a connect prompt instead of empty data, and read-only routes (`/`, `/explore`, `/article/[id]`, `/writer/[address]`, `/streams/live`) SHALL render fully.

### Requirement 10: Phasing and ship order

**User Story:** As the project team, I want a documented ship order so we do not block low-risk frontend work on slower contract work.

#### Acceptance Criteria

1. WHEN v2 is delivered THEN it SHALL ship in two phases.
2. WHEN Phase 1 ships THEN it SHALL include only frontend and event-indexing changes: Explore Feed, Streams Live, Writer Profile, Reading Portfolio, Honest Synthetic Metrics, Event Indexing Utilities, Routing. Phase 1 SHALL be deployable without redeploying any contract.
3. WHEN Phase 2 ships THEN it SHALL include the new contracts (`TipMatcher`, `CoAuthorRegistry`) plus the `TippingRouter` integration changes plus the UI surfaces that depend on them.
4. WHEN Phase 2 is deployed THEN existing v1 contracts SHALL NOT be redeployed; only the new contracts SHALL be deployed and the existing `TippingRouter` SHALL be replaced with a new deployment that wires in the matcher and registry, with a documented migration in `contracts/deployments/opnTestnet.json`.
5. WHEN either phase ships THEN the Hardhat test suite SHALL remain green and the existing eleven v1 tests SHALL continue to pass unchanged.

## Open questions to resolve before design

- Should Tip Matching be governance-curated (Snapshot-style) or owner-curated for v2? (Default: owner-curated, governance roadmap.)
- Should Co-authorship be primary-only-can-propose, or symmetric (either side can propose)? (Default: primary-only-can-propose, symmetric is roadmap.)
- Should `/explore` replace `/` or live alongside it? (Default: `/` stays as the brand landing, `/explore` is the data-rich grid.)
