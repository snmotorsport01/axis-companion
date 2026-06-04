# PCBway quote-request email — ready to send

Paste this into PCBway's design-service contact form (or send directly
to sales@pcbway.com). Attach `pcb-spec-v1.md` as a PDF.

You can do the same approach for **JLCPCB** (sales@jlcpcb.com) and
**Seeed Fusion** (fusion@seeedstudio.com) in parallel — getting three
quotes lets you compare cost + lead time.

---

## Subject

```
Custom PCB design + manufacture quote — ESP32-S3 IoT product, 100 & 500 qty
```

## Body

```
Hi PCBway design team,

We're SN Motorsports, an electronics product company in Thailand. We
currently ship a Bluetooth IoT device that runs on an off-the-shelf
Waveshare ESP32-S3 development board, and we're ready to move to a
custom PCB with our own layout + memory upgrade.

Looking for a quote on the full design + manufacture pipeline:
schematic, layout, gerbers, BOM, and SMT-assembled boards at two
quantities.

Quick details:

  • Reference board: Waveshare ESP32-S3-Touch-LCD-1.28 (we know it
    works — firmware + companion iPhone app already live, App Store
    listing "SN AXIS")
  • Key change vs reference: MCU module upgrade to
    ESP32-S3-WROOM-1-N16R8 (16 MB flash + 8 MB PSRAM) — larger
    memory for caching album art and future features
  • Other parts (display, touch, IMU, charger): keep the same
    standard parts so our existing firmware works 1:1
  • Form factor: 4-layer round PCB, ~40 mm diameter, top-side SMT
  • Quantities to quote: 100 units + 500 units (separately, both
    fully assembled and tested)

I've attached our full spec sheet as a PDF — it has the exact part
list, pin map, and assembly requirements. Please reply with:

  1. Unit cost at 100 qty and 500 qty (USD)
  2. NRE / engineering cost for the design work itself
  3. Lead time for prototype + each production batch
  4. Cost for 5 hand-built prototypes before we approve the batch
  5. Payment terms and MOQ for any custom-spec items
  6. Confirmation that the WROOM-1 module's existing FCC/CE/IC modular
     cert carries through (so we don't need separate RF testing)

We don't need firmware, mechanical / enclosure, app, or branding work
from your side — only PCB design + manufacture.

NDA available on request before sharing the firmware repo for
hardware-bring-up validation.

Thanks — we'd like a quote within ~5 business days so we can compare
with two other vendors and select the partner for our Q1 production
ramp.

Best regards,
Siprach Charoensiri
SN Motorsports
snmotorsport01@gmail.com
+66-XX-XXX-XXXX
```

---

## What happens after you send

| Day | What |
|---|---|
| Day 0 | You send email + spec PDF |
| Day 1–3 | PCBway sales rep responds, possibly with a follow-up question on antenna placement, certification scope, or BOM substitutes |
| Day 3–7 | PCBway returns quote with: unit cost @ each qty, NRE fee, lead time, prototype fee, payment terms |
| Day 7–14 | You negotiate (NRE is usually negotiable; unit cost less so), confirm spec, sign NDA |
| Day 14 | You wire 30–50% deposit, design work starts |
| Day 14–35 | Design phase: schematic review → layout review → DFM check → gerber sign-off |
| Day 35 | First 5 prototypes manufactured + shipped to Bangkok |
| Day 35–50 | You verify firmware boots, all peripherals respond, BLE pairs |
| Day 50 | Approve batch — wire balance — 100-unit production starts |
| Day 70 | 100-unit batch in your hands |

Total: roughly **10 weeks** from first email to first 100 units in
hand. Plan accordingly.

---

## Tips for the back-and-forth

- **NRE is negotiable**, especially if you commit to the 500-unit
  follow-on batch upfront. Ask for "NRE waived against minimum 500-unit
  production commitment" — they often agree.
- **Don't approve the layout** without a DFM (Design for Manufacturing)
  review from their side. A good DFM report flags trace impedances,
  thermal pads, fiducials, panelisation issues — saves a respin.
- **Ask for the schematic file** in their native tool format (Altium or
  KiCad). You'll want it when you do v2.0 or move to a second vendor.
  Most reputable houses include it; some hold it hostage as IP — that's
  a red flag, walk away.
- **Insist on a written IP-transfer clause** in the quote / contract.
  "All design files (schematic, layout, gerbers, BOM, CPL, fabrication
  drawing, 3D model) become property of SN Motorsports upon final
  payment." Standard but say it explicitly.
- **Check their portfolio** before commit. PCBway, Seeed, and JLCPCB
  all have hundreds of customer-case-study pages. Look for "ESP32" or
  "wearable" projects in their portfolio — gives you a sense of what
  they're good at.
