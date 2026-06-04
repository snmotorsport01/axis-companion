# Hardware roadmap — AXIS custom PCB

Track the path from "we use a Waveshare devboard" to "we manufacture
our own PCB". Files here are read-only references — actual designs,
gerbers, and BOMs land in their own folders per revision.

## Status

| File | Purpose | Status |
|---|---|---|
| `pcb-spec-v1.md` | Spec sheet for ODM design service | Ready to send |
| `pcbway-quote-email.md` | Email template for quote request | Ready to send |
| (future) `v1.0/` | Schematic, layout, gerbers, BOM, CPL | Awaiting first prototype |
| (future) `v2.0/` | AMOLED + ESP32-S3-WROOM-2 upgrade | Phase 3, after v1.0 validates |

## Phase plan

| Phase | What | When | Output |
|---|---|---|---|
| **1: Validate market** | Sell Waveshare boards in the SN AXIS enclosure, gather 100+ customer reviews | Now → 6 mo | Proof of demand |
| **2: Custom PCB v1.0** | Same LCD, **N16R8 memory upgrade**, custom layout + branding | 6 → 9 mo | Own IP, lower BOM |
| **3: Premium AMOLED v2.0** | 1.43" SH8601 AMOLED, optional 16 MB true-QSPI PSRAM | 12 → 18 mo | Premium SKU |
| **4: Brand licensing** | Reference design + firmware SDK offered to mid-tier sim brands | 18 → 24 mo | Royalty revenue |
| **5: AXIS Ecosystem** | Multi-node — knob + AMOLED gauge + CAN module + GPS | 24+ mo | Platform play |

## How the design pipeline works (for software-first founders)

You don't design the PCB yourself. You hire an ODM (Original Design
Manufacturer) like **PCBway**, **JLCPCB**, or **Seeed Fusion** to do
both the design AND the manufacturing as a package deal. You provide:

1. **A spec sheet** — what the board does, what parts it uses,
   what changes from the reference (see `pcb-spec-v1.md`)
2. **A reference board** — link or photo of an existing product that
   does what you want
3. **Your branding** — logo artwork for silkscreen, when ready

They provide:

1. **Schematic** — wiring diagram (read-only file you'll review)
2. **Layout / Gerbers** — physical PCB design (manufacturing files)
3. **DFM report** — flags any manufacturing risks (review before approving)
4. **BOM** — part list with sources and alternates
5. **Prototype** — usually 5 units, hand-assembled, shipped to you
6. **Production batch** — after you validate the prototype

Cost split roughly: **NRE (one-time design)** ~$1,500–4,000, **unit cost
at 100 qty** ~$30–40, **unit cost at 500 qty** ~$20–28.

## Cost ballpark (custom PCB v1.0 — based on user's WROOM-1-N16R8 spec)

| Qty | Unit cost | Total | + NRE | Time to delivery |
|---|---|---|---|---|
| 5 prototypes | ~$80 ea | $400 | $2,500 | 4–5 weeks |
| 100 production | $35–45 | $3,500–4,500 | (NRE already paid) | 4–6 weeks |
| 500 production | $22–28 | $11,000–14,000 | — | 6–8 weeks |

So a realistic first commitment: **~$6,000–7,000** to land 100 units
in your hands, ready to box and ship. Same ODM relationship handles
the 500-batch follow-up at marginal cost.

## What to do NEXT (operational, in order)

1. **Send the quote-request email** to 3 vendors in parallel
   (PCBway, JLCPCB, Seeed Fusion) — see `pcbway-quote-email.md`
2. **Compare quotes** when they land (5–7 business days)
3. **Pick one vendor** based on: total cost, lead time, IP terms,
   communication quality
4. **Sign NDA + send firmware repo** so they can do bring-up testing
5. **Pay 30–50% deposit** to start design work
6. **Review schematic + layout + DFM** when delivered (claude can
   help spot issues — paste the schematic PDF / gerber preview here)
7. **Approve prototype** → run 100-unit batch

Total: ~10 weeks from email to 100 boxed units.
