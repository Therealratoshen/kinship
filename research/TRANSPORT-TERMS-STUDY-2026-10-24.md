# Transport terms study — what WhatsApp, Telegram and Discord actually permit (2026-10-24)

> **Date:** 2026-10-24 · **Status:** a fact-finding note, not a decision. The decisions this feeds
> are in `DECISIONS.md`; this file only says what the platforms' own terms permit.
>
> **Why this file exists.** The owner decided on 2026-10-24 that the project ships transports for
> **WhatsApp, Telegram and Discord** for local and self-hosted deployments (`DECISIONS.md`, the
> "production-ready, not shadow mode" decision). A governed fleet sends member-facing messages, so
> the platforms' rules decide what the software may do — not the other way round. Every claim below
> is quoted or linked to a first-party source.

## 1. The short answer

| platform | account type | agent operation permitted | the clause that decides it |
|---|---|---|---|
| **WhatsApp** | Business number (WABA) + Cloud API | **Yes, inside the 24-hour window**; outside it, **only Meta-approved templates** | Business Messaging Policy: *"You may use automation when responding during the 24-hour window, but must also have available prompt, clear, and direct escalation paths"* — and *"You may only initiate conversations using an approved Message Template"* |
| **Telegram** | Bot (Bot API) | **Yes** — bots exist to be automated | Bot Platform Developer ToS §5.2: *"Your TPA must not harass or spam users with unsolicited messages"*; §5.2(f): must not circumvent rate limits or moderation |
| **Discord** | **Bot only** | **Yes, as a bot** — **as a user account, never** | *"Automating normal user accounts (generally called \"self-bots\") outside of the OAuth2/bot API is forbidden, and can result in an account termination if found."* |

## 2. WhatsApp — the constraint is the template

**Sources:** [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/?department=customer+success) ·
[WhatsApp Business Terms of Service](https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform/revisions/20240216) ·
[Meta's compliance FAQ](https://faq.whatsapp.com/933578044281252)

- **Automation is explicitly permitted** inside the customer-service window — but the policy attaches a
  condition: *"...but must also have available prompt, clear, and direct escalation paths."* The list
  it gives includes *in-chat human agent transfer*, a phone number, web support, and a support form.
  **A governance layer whose whole point is a human in the loop already satisfies this** — the
  approval step *is* the escalation path.
- **Outside the 24-hour window, only approved templates.** A business-initiated message (a scheduled
  reminder) therefore cannot be free-form text. Templates are approved by Meta, who *"have the right
  to review, approve, pause and reject any Message Template at any time"*. Templates carry
  **variables**, so a template's approved structure can carry a drafted body — but Meta classifies a
  template that mixes utility and marketing content as **marketing**, which is the expensive and
  policy-sensitive category.
- **Opt-in is a precondition.** A business may contact someone only if the person *"has given the
  business their mobile phone number"* and *"agreed to be contacted by the business over WhatsApp"*.
  For Kinship this is a **member-side record**, not a runtime detail: the community's registry has to
  be able to say which members agreed to be contacted on which channel.
- **Non-template sends outside the window fail** with error code `62`.

**What this means for the project:** a scheduled community reminder on WhatsApp is a **template send**,
not a free-form send. The draft the fleet produces can fill a template variable; it cannot replace
the approved structure. Marketing-class action classes need a human to classify before a template is
submitted.

## 3. Telegram — the friendliest, and the one with the softest constraint

**Sources:** [Bot Platform Developer Terms of Service §5](https://telegram.org/tos/bot-developers) ·
[Bots FAQ — broadcasting limits](https://core.telegram.org/bots/faq) ·
[Spam FAQ](https://telegram.org/faq_spam)

- The bot is *designed* for automation: the Bot API exists for it. The rule is behavioural, not
  structural — **"must not harass or spam users with unsolicited messages"**, and it may not
  circumvent rate limits or moderation.
- **Limits a small community hits on day one:** one message per second per chat; **20 messages per
  minute in a group**; ~30 messages/second in bulk; `429` errors beyond that. Paid broadcasts
  (1000/s) require 10,000+ Stars and 100,000 monthly active users — irrelevant at this scale, and
  worth knowing *because* it is the line between a community and a spam operation.
- The clause that matters most is in the **user-facing** spam FAQ rather than the developer terms:
  *"Please only contact people if you're sure that they are expecting messages from you."* That is the
  same expectation the human-approval step exists to meet, stated by Telegram to users.

**What this means for the project:** Telegram is the cheapest first adapter, and the one where the
**group rate limit** (20/min) will bite before any policy question does.

## 4. Discord — a bot, never the operator's account

**Sources:** [Automated User Accounts (Self-Bots)](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots) ·
[Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy) ·
[OAuth2 — Bot Users](https://docs.discord.com/developers/topics/oauth2)

- **Self-bots are forbidden and carry account termination.** *"Automating normal user accounts
  (generally called 'self-bots') outside of the OAuth2/bot API is forbidden, and can result in an
  account termination if found."* So **the operator's own user account cannot be the sender** — the
  sender is **the community's bot**, authenticated with a bot token.
- Developer Policy **#2** is the one that lands on Kinship's design directly: *"Do not initiate
  processes on a user or server's behalf without first obtaining their permission. The manner of
  providing the option for permission must be clearly labeled and apparent."* **Kinship's approval
  step is that permission mechanism** — and "clearly labeled and apparent" is a requirement on how
  the approval is shown, not just that it exists.
- Developer Policy **#13**: *"You may not automate messages to be sent for the purpose of maintaining
  message activity in a Discord community."* A fleet sending a member-facing reminder is not that;
  a fleet keeping a channel alive with chatter is. The line is real and the design should stay
  clearly on the right side of it.
- Policy **#5** forbids unsolicited DMs and Policy **#7** forbids contacting users *outside* Discord
  with data obtained through the API — so a Discord adapter cannot be reused to message people on
  another platform.

## 5. What a self-hosted community can do on day one

| option | what the operator installs | ToS exposure |
|---|---|---|
| **Telegram bot** | a bot token; nothing else | lowest — bots are for automation; behavioural rules only |
| **Discord bot** | an application + bot token; invite the bot | low — but the sender is the **bot**, not the operator |
| **WhatsApp** | a WABA, a phone number, approved templates | medium — templates must be pre-approved by Meta; opt-in required |
| **Matrix (self-hosted Synapse)** | a server on their own machine | none — it is their own server |
| **Generic outbound webhook** | an endpoint they already run | none — no platform to violate |

The webhook is the escape hatch for every community whose channel is not on the list, and it is the
only transport with no terms of service at all.

## 6. What this study did not do

It did not choose a transport, write an adapter, or draft any template message. It did not assess
Meta's pricing per message, the cost of an SMS fallback, or what happens in a community whose members
are on a mix of channels. **Where a limit is reported here it is reported as the platform's own
published figure; the numbers move, and the links are the authority, not this file.**

