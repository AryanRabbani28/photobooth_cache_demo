# 4. Complete Workflow Specification

## 4.1 Why We Avoid a Manually Typed Session Key

The original idea was to generate a session key (e.g., `X7K29P`) that would be given to the customer. The customer would then enter this key at the photobooth.

Although this system could work, it introduces unnecessary friction:

- Customer types the key incorrectly
- Customer forgets the key
- The key expires too early
- The operator needs to generate another key
- The customer experience becomes less smooth

Since an operator is already physically present near the photobooth, a simpler solution is:

```
Customer pays → Operator starts the session → Photobooth unlocks
```

No key is necessary. No login is necessary. No typing is necessary.

## 4.2 Complete Customer Flow

```
CUSTOMER ARRIVES
        │
        ▼
PHOTOBOOTH IS IN IDLE MODE
        │
        ▼
CUSTOMER PAYS OPERATOR MANUALLY
        │
        ▼
OPERATOR SELECTS PACKAGE
        │
        ▼
OPERATOR CLICKS "START SESSION"
        │
        ▼
SPECIFIC PHOTOBOOTH UNLOCKS
        │
        ▼
CUSTOMER ENTERS PHOTOBOOTH
        │
        ▼
CUSTOMER SELECTS TEMPLATE
        │
        ▼
CUSTOMER CLICKS "BEGIN PHOTO SESSION"
        │
        ▼
SESSION TIMER STARTS  ← (Timer starts HERE, not at payment)
        │
        ▼
LIVE DSLR PREVIEW APPEARS
        │
        ▼
CUSTOMER SELECTS FILTER (optional)
        │
        ▼
CUSTOMER PRESSES "CAPTURE"
        │
        ▼
3-2-1 COUNTDOWN
        │
        ▼
DSLR CAPTURES PHOTO
        │
        ▼
KEEP OR RETAKE?
        │
        ├── KEEP → Proceed to next photo
        └── RETAKE → Re-capture (within retake limits)
        │
        ▼
REPEAT UNTIL ALL REQUIRED PHOTOS ARE COMPLETE
        │
        ▼
FINAL TEMPLATE IS GENERATED
        │
        ▼
CUSTOMER REVIEWS FINAL RESULT
        │
        ▼
CUSTOMER CLICKS "PRINT"
        │
        ▼
PHOTO IS SENT TO PRINTER
        │
        ▼
SESSION AND PHOTOS ARE SAVED LOCALLY
        │
        ▼
DATA IS SYNCHRONIZED TO CENTRAL SERVER (if online)
        │
        ▼
THANK YOU SCREEN
        │
        ▼
PHOTOBOOTH RETURNS TO IDLE MODE
```

### 4.2.1 Detailed Step Breakdown

**Step 1: Customer Arrives — Idle State**

The photobooth is initially in an idle state. The screen displays:

```
Welcome to XYZ Photobooth
Please contact our staff to start your session.
```

The idle screen can also show:

- Sample templates
- Example photos
- Promotional content
- Instructions
- Prices or packages

**Step 2: Manual Payment**

The customer pays the operator manually. The project does not need to automate payment at this stage. The operator can receive payment through whatever method the business currently uses (cash, mobile banking, other).

**Step 3: Operator Starts a New Session**

The operator dashboard contains a "START NEW SESSION" button. The operator selects:

```
Customer Name: __________________  (optional)
Package:
  ○ Standard
  ○ Premium
  ○ Custom
Session Duration:    3 Minutes
Number of Prints:    2
[ START SESSION ]
```

After clicking START SESSION, the specific photobooth becomes unlocked and ready.

**Step 4: Photobooth Unlocks — Ready State**

The photobooth screen changes to:

```
Welcome! Your photo session is ready.
```

> **Important:** The session timer should NOT start yet. The customer may need time to enter the booth, bring friends inside, adjust their position, and look at the available templates. The booth enters a **Ready State** first.

**Step 5: Template Selection**

The customer chooses a photo template. Examples:

- Classic (4 photos vertical strip)
- Friends (6 small photos grid)
- Couple (2 photos side by side)
- Birthday, Graduation, Seasonal, Festival, Custom branded

Each template determines how many photos are required:

```
Template A → 4 Photos
Template B → 3 Photos
Template C → 6 Small Photos
```

The required photo count is determined **automatically** by the selected template.

**Step 6: Customer Begins — Timer Starts**

After selecting the template, the customer presses "BEGIN PHOTO SESSION." This is the point where the actual countdown starts:

```
Time Remaining: 03:00
```

This is better than starting the countdown immediately after payment because the customer should not lose time while walking to the booth or selecting a template.

**Step 7: Main Camera Interface**

The interface includes:

- Live DSLR camera preview (full screen or large area)
- Filter options (sidebar)
- Current photo number (e.g., "PHOTO 2/4")
- Session timer
- Capture button (large, touch-friendly)
- Retake button (when applicable)

```
──────────────────────────────────────────────────
FILTERS              LIVE CAMERA PREVIEW

[ Normal    ]
[ B&W       ]
[ Vintage   ]                  Time Remaining
[ Warm      ]                      02:34
[ Cool      ]
[ Custom    ]         [ 🔴 CAPTURE PHOTO ]
──────────────────────────────────────────────────
                       PHOTO 2 / 4
```

**Step 8: Capturing a Photo**

When the customer presses CAPTURE:

```
3
2
1
📸
```

After the countdown, the DSLR captures the photo. The system saves the original captured image.

**Step 9: Keep or Retake**

After each photo is captured, the customer reviews it:

```
Do you like this photo?

[ 🔄 RETAKE ]       [ ✅ KEEP ]
```

- **KEEP** → system proceeds to the next required photo
- **RETAKE** → current photo is discarded, customer can capture again

Retake limits are controlled by the package (configurable business rule).

**Step 10: Completing All Photos**

Once all required photos for the selected template are captured:

```
PHOTO 1/4 ✓
PHOTO 2/4 ✓
PHOTO 3/4 ✓
PHOTO 4/4 ✓
```

The system generates the final photo composition using the template engine.

**Step 11: Final Preview**

The customer sees the completed final image before printing:

```
YOUR PHOTO IS READY!

┌──────────────────────┐
│      TEMPLATE        │
│                      │
│      PHOTO 1         │
│      PHOTO 2         │
│      PHOTO 3         │
│      PHOTO 4         │
│                      │
└──────────────────────┘

[ 🖨️ PRINT ]    [ 🔄 RETAKE ]
```

Retake behavior options (to be decided):

- Retake the last photo only
- Retake any individual photo
- Restart the entire photo session

**Step 12: Printing**

When the customer presses PRINT:

1. Save the session information locally
2. Save the original captured photos
3. Save the processed photos (with filters applied)
4. Generate the final template image
5. Send the final image to the connected printer
6. Record the printing event
7. Update the session status to `PRINTED`

The booth then displays:

```
Thank you for using our photobooth!
```

After a configurable delay (e.g., 10 seconds), it automatically returns to the idle screen.

**Session Expiry Handling**

If the timer reaches `00:00` before all photos are captured:

- Option A: Automatically use whatever photos have been captured
- Option B: Give a limited grace time (e.g., 30 seconds)
- Option C: Notify the operator for a decision
- The exact behavior should be configured per package

## 4.3 Complete Operator Flow

```
OPERATOR LOGS IN
        │
        ▼
SEES ASSIGNED PHOTOBOOTH + STATUS
        │
        ▼
CUSTOMER MAKES PAYMENT
        │
        ▼
OPERATOR SELECTS PACKAGE
        │
        ▼
OPERATOR CLICKS "START SESSION"
        │
        ▼
MONITORS ACTIVE SESSION
        │
        ├── PAUSE SESSION
        ├── RESUME SESSION
        ├── ADD TIME (+30s, +1m, +2m)
        ├── CANCEL SESSION (with confirmation)
        ├── RESTART SESSION
        └── REPRINT LAST PHOTO
```

## 4.4 Operator Controls During Active Session

While a customer is using the booth, the operator sees:

```
CURRENT SESSION
Customer: Rahim
Template: Classic 4 Photo
Package: Standard
Time Remaining: 01:42
Photos Captured: 2/4
Status: ACTIVE

[ ⏸️ PAUSE ]
[ ➕ ADD 1 MINUTE ]
[ ❌ CANCEL SESSION ]
[ 🔄 RESTART SESSION ]
[ 🖨️ REPRINT LAST PHOTO ]
```

### Pause Session

Stops the timer temporarily. Useful when:

- Customer needs assistance
- Technical issues occur
- Camera temporarily disconnects

### Resume Session

Continues a paused session from where it left off.

### Add Time

The operator can add additional time: +30 seconds, +1 minute, or +2 minutes. Useful if:

- There was a technical problem
- The operator wants to give extra courtesy time
- The customer purchased additional time

### Cancel Session

Stops the session completely. This **requires confirmation** to prevent accidental cancellation.

### Restart Session

Restarts the customer's session from the beginning. Useful if:

- The application crashes
- The wrong template was selected
- The customer encounters a major problem

### Reprint Last Photo

Reprints the most recent completed photo. Extremely useful if:

- The printer jams
- The paper runs out
- The print is damaged
- The customer accidentally receives a faulty print

The operator should **never** need to repeat the entire photo session just to print the same photo again.

---