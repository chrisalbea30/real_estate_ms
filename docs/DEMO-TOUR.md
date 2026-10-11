# Sojourn Demo Tour: Presenter's Script

Links use http://localhost:3000. If you present from your live site, find-and-replace that with your site address.

This is one continuous presentation of the whole app, in story order. Each section tells you where to go, what to say and exactly what to click. Button and field names are in **bold** and are written as they appear on screen. To jump to one section only, use [DEMO-TOUR-CONTENTS.md](DEMO-TOUR-CONTENTS.md).

Full tour: about 97 minutes. Short version: 15 minutes (see below).

---

## Before you start

Do these before the audience arrives.

1. **Regenerate the demo data on the day**, so that "today" looks right (arrivals, departures, in-house guests, expiring fire extinguishers). Open a terminal in the project folder and run:

   `node scripts/seed-demo.mjs "Seaview Resort Co." --reset`

   It wipes and refills only that workspace's demo data. Team, roles, rooms and settings stay.
2. **Sign in** at [http://localhost:3000/login](http://localhost:3000/login) as **admin@seaview.com**. You are the Owner of "Seaview Resort Co.", property "Seaview Resort", with Room 1 to Room 5.
3. **Have a receipt photo ready** on the device you present from (a clear photo of any shop receipt, as a picture file, not a PDF). Try **Scan receipt** once before the demo. If it answers that receipt scanning "is not switched on for this service yet", the scanning service is not switched on; use the by-hand steps in section 11 instead and say so honestly.
4. **Check the Log-in vault** at [http://localhost:3000/app/logins](http://localhost:3000/app/logins): it should list 5 log-ins and show no "vault is locked" box.
5. **Decide the currency.** The figures are kept in THB. The switch at the bottom of the sidebar also offers **EUR** and **USD**. Pick the one your audience thinks in and tap the small dot next to the codes so it is green (fresh rates).
6. **Open the links in one browser window**, maximised, in the light theme. Allow pop-ups for the site (Print / PDF and invoices open new tabs). Keep one private (incognito) window ready for sections 2, 7 and 35.
7. **Know what the app does not do**, and never claim otherwise: it sends no email by itself, online payment is not connected, and password reset by email is not available. See [Appendix B](#appendix-b-if-they-ask).

**What is in the demo workspace:** 271 bookings from January to November, several guests in-house tonight, 12 invoices (INV-2026-0001 to INV-2026-0012), 136 expenses, 33 manual revenue lines, Bank and Cash accounts, 4 partners, a budget for this year, 18 tasks, 10 complaints, about 295 staff-hours entries, 11 documents and 5 vault log-ins. Guest names change every time the data is regenerated, so this script describes guests ("the in-house guest with a red balance") instead of naming them. Rooms have no photos. Attachments open a placeholder picture (the app logo).

**Records you add live** all start with the word "Demo" so they are easy to find and delete. Each section says when to clean up. If you forget, regenerating the data removes them.

**Short version (15 minutes):** sections 5, 7 (skip the email step), 10, 11 (scan only), 13 and 15 (first and fourth tab only).

---

## 1. Public landing page

**Time:** 3 min | **Go to:** [http://localhost:3000/](http://localhost:3000/)

**Say:** This is what a new customer sees first. It explains the product in one page and lets them start a free trial without talking to anyone.

**Do:**
1. Read the headline, then point at **Start free trial** and **See how it works**, and the line "14-day trial · No card required · Cancel anytime".
2. In the top menu click **Features**. Show the six cards (bookings and invoices, receipts scanned into expenses, one revenue table, legal review, budgets and partner reporting, day-to-day operations).
3. Click **How it works**. Read the four steps "Guest → Revenue → Legal → Partners". This is the idea of the whole demo: a booking is typed once.
4. Click **Mobile**. Point at "Installs like an app", "Camera-first receipts", "Exports anywhere" and "Nothing lost". Scroll a little to the dark "Built to be trusted" block (data isolation, roles, encrypted vault, audit log).
5. Click **Pricing**. Flip the **Monthly** / **Yearly** switch. Show **Starter**, **Growth** and **Enterprise** (**Talk to us**).
6. Click **FAQ** and open one question, for example "Is this a booking engine or channel manager?" (the honest answer is no; it is the back office).
7. Click the sun/moon icon in the top bar once to show the page also has a dark theme, then click it until it is light again.

## 2. Sign up and sign in

**Time:** 2 min | **Go to:** [http://localhost:3000/signup](http://localhost:3000/signup) (open in the private window, because you are already signed in)

**Say:** Creating an account takes three fields. You are signed in straight away; there is no confirmation email to wait for.

**Do:**
1. Show the form: **Your name**, **Work email**, **Password** (at least 8 characters, eye icon to see it) and **Create account**. Do not submit.
2. Click **Sign in** at the bottom, or go to [http://localhost:3000/login](http://localhost:3000/login). Show **Email**, **Password**, **Sign in** and the **Create an account** link.
3. Click **Forgot?**. Read the page out: password reset by email is not available yet; a signed-in user changes the password under Settings, Profile, otherwise the operator sets a new one. Click **Back to sign in**.
4. Close the private window and return to your signed-in window.

## 3. Setup wizard (optional)

**Time:** 2 min | **Go to:** [http://localhost:3000/onboarding](http://localhost:3000/onboarding)

**Say:** A new customer fills in one short form and gets a working workspace: rooms, two accounts and four payment methods are created for them.

**Do:**
1. Describe the form **Set up your workspace** without submitting it: **Organisation / company name**, **First property name**, **Property timezone**, **Base currency**, **VAT rate (%)**, **Rooms to create** and **Room name prefix**.
2. Explain what **Create workspace** produces: you become the **Owner**; rooms named "Room 1", "Room 2" and so on; the accounts **Bank** and **Cash**; the payment methods **Cash**, **Bank Transfer**, **Card** and **Other**.
3. Stress the two choices that matter: the base currency (all amounts are stored in it) and the timezone ("today" follows the property, not the phone).
4. Optional, only if the audience wants to see it live: type "Demo Hotel Co.", "Demo Hotel", 3 rooms, prefix "Room", and tap **Create workspace**. This creates a second, separate organisation that stays in your account. Switch back by tapping the property name at the top of the sidebar and choosing "Seaview Resort Co." under **Organisation**.
5. Go back to [http://localhost:3000/app](http://localhost:3000/app).

## 4. App shell and navigation

**Time:** 3 min | **Go to:** [http://localhost:3000/app](http://localhost:3000/app)

**Say:** Everything is one click away, and each person only sees the screens their role allows. The same app works on a computer and on a phone.

**Do:**
1. Point at the left sidebar and read the six groups: **Dashboards**, **Operations**, **Finance**, **Partners**, **Company**, **Admin**.
2. Point at the box at the top of the sidebar: property "Seaview Resort", organisation "Seaview Resort Co.". Explain that tapping it opens **Switch workspace** (lists under **Organisation** and **Property**, plus a **New organisation** link). It can only be tapped when there is more than one active property or organisation. It is shown live in section 29.
3. At the bottom of the sidebar, tap **EUR**, then **USD**, then **THB**. Every amount on the page changes at once. Say: this only changes what you see; records stay in the base currency, and converted figures are estimates at the latest rate.
4. Point at the small dot next to the currency codes. Green means the rates are less than a week old, amber means older or missing. Tap the dot to fetch new rates (daily European Central Bank rates).
5. Point at the theme icon next to it (shown in section 37), your name and role (**Owner**), the person icon (**Your profile**) and the **Sign out** icon.
6. Phone layout: make the browser window narrow until the sidebar disappears. Point at the bottom bar: **Home**, **Guests**, **Expenses**, **Revenue** and **More**. Tap **More** to open the **Menu** with every screen in the same six groups, plus **Profile** and **Sign out**. The top bar holds the property name, the currency switch and your initials. Widen the window again. (The full phone part is section 36.)

## 5. Overview

**Time:** 3 min | **Go to:** [http://localhost:3000/app](http://localhost:3000/app)

**Say:** One page tells the owner how the business stands: money in, money out, cash, who is staying now and who is arriving.

**Do:**
1. Read the four cards: **Total revenue**, **Total expenses**, **Capital funded**, **Net position**.
2. At the top right tap the year button **2026**, then **All**. Only the four cards and the chart follow the year.
3. Under **Revenue vs expenses**, point at a month to see its figures. Tap **Show table** (twelve months with a **Net** column), then **Show chart**.
4. Under **Cash position**, read **Total cash on hand**, the **Bank** and **Cash** cards, and **No invoice / receipt** (expenses with no file attached: paperwork still to collect).
5. Under **In-house now**, point at the guest marked "balance due" in red and the ones marked "settled" in green.
6. Show **Arriving in 7 days** and the **Tasks** counts (Pending, Ongoing, Complete, Blocked).
7. Show the shortcuts: tap **Guests** next to a section title, then use the browser Back button. Say the **No invoice / receipt** card opens Expenses and a task card opens Tasks.

## 6. Operations

**Time:** 4 min | **Go to:** [http://localhost:3000/app/operations](http://localhost:3000/app/operations)

**Say:** This is the manager's morning screen. It shows what needs attention today without opening five different lists.

**Do:**
1. Point at the five tabs and the numbers on them. Point at the **Tourism board portal** button at the top right: a shortcut link the owner saved in Settings.
2. Tab **Today's ops**: read **Check-ins today**, **Check-outs today**, **In-house**, **Available**. Below, show **Arriving today**, **Departing today** (amount still due or **Paid**), **TM30 pending** (in-house guests not yet registered with immigration) and **Fire safety** (Room 1 expired, Room 2 a few days left, Room 3 within the month).
3. Tab **Bookings**: show **Arriving in 14 days** and **Departing in 7 days** with the balance to collect before they leave.
4. Tab **Revenue & collection**: read **Revenue this month**, **Outstanding**, **Older than 90d**, **In-house receivables**. Show **By source this month** and the **Outstanding balances** list, biggest first. Tick **Include older** to add guests who left more than 90 days ago, then untick it.
5. Tab **Tasks & issues**: read **Overdue**, **Due today**, **Pending**, **Complete**, and the two lists.
6. Tab **Cash control**: read **Cash on hand**, **No invoice / receipt**, **Guest receivables**, **Revenue this month**. Show **Accounts** and **Latest expenses** (a **No invoice** label marks those without a file).
7. Say: nothing is edited here. The buttons **Guests**, **Tasks**, **Rooms**, **Accounts** and **Expenses** jump to where the work is done.

## 7. Guests

**Time:** 8 min | **Go to:** [http://localhost:3000/app/guests](http://localhost:3000/app/guests)

**Say:** This is the most important screen. You type a booking once, and the calendar, the revenue, the cash account and the guest invoice all follow from it.

**Do: look around**
1. Read the four cards: **In-house**, **Arriving 7d**, **Departing 7d**, **Outstanding**. Tap **In-house** to filter; find the guest with a red **Balance** and the **TM30 pending** label.
2. Tap the filter buttons **All**, **Upcoming**, **In-house**, **Checked out**. On an upcoming booking, point at the 30% deposit in **Paid**.
3. Type "Booking.com" in the search box, then clear it. Say the search also covers room, email, phone and passport number.
4. Click a column heading to sort, and click again to reverse.
5. At the bottom show "1–10 of 271", use the arrows, and change **10 / page** to 25.
6. Tap **Export** and show the four choices: **Excel (.xlsx)**, **CSV**, **JSON**, **Print / PDF**. Choose **Excel (.xlsx)**. Say: the file holds exactly what the filters show, on all pages. The same Export menu is on almost every list in the app.

**Do: add a booking live**
7. Tap **Add booking**. In **New booking**, under **Stay**: **Room** "Room 4 (No. 4)" (free tonight in fresh demo data), **Guest name** "Demo Guest", **Check-in** today, **Check-out** tomorrow, **Booking source** "Direct Booking", **Guests** 2.
8. Under **Pricing**: **Rate per night** 3500. **Total stay** fills in by itself.
9. Under **Payment**: **Payment method** "Cash", **Payment 1 date** today, **Payment 1 amount** 1000. Point out that **Amount paid** locks and shows the sum.
10. Under **Contact & immigration**: **Email** "demo.guest@example.com". Leave **TM30 immigration notification filed** unticked.
11. Under **Reporting**: leave **Add to revenue** ticked and tick **Show on legal page**. Explain the two tick boxes: one makes it income, the other shows it to the lawyer or accountant.
12. Point at the red **Balance** at the bottom (2,500), then tap **Save booking**. The message "Booking added" appears.

**Do: split payment, invoice, email**
13. Search "Demo Guest". Point at the labels **In-House**, **TM30 pending**, **Revenue**, **Legal**.
14. Tap the pencil icon (**Edit**). Fill **Payment 2 date** today and **Payment 2 amount** 2500, tick **TM30 immigration notification filed**, and tap **Save booking**. The balance is now zero.
15. Tap the document icon (**Create invoice**). The invoice opens in a new tab as INV-2026-0013: company details, **Bill to**, the room line, **Subtotal**, **VAT**, **Total**, **Deposit / paid**, **Balance due** and "Paid in full".
16. On the invoice tap **Print / Save PDF** and show the printer window ("Save as PDF"), then cancel it.
17. Copy the invoice address and paste it into the private window: it opens without signing in. Say: this is the link the guest receives, so send it only to the guest.
18. Back on Guests, tap the envelope icon (**Email invoice**). Your own email app opens with the address, the subject and the link already written. Say honestly: the app prepares the message; you press send. Close the draft.
19. Say: the invoice is a copy of the booking at the moment it was created, so record all payments first. Also: the app does not block two bookings in the same room on the same dates; the Occupancy calendar makes an overlap visible.

**Clean up:** keep "Demo Guest" for now. It is used in sections 8, 10 and 12 and deleted at the end of section 12. If you present this section alone, delete it now with the bin icon (**Delete**).

## 8. Occupancy

**Time:** 2 min | **Go to:** [http://localhost:3000/app/occupancy](http://localhost:3000/app/occupancy)

**Say:** One look shows which rooms are taken on which nights, and how well the property is filled this month.

**Do:**
1. Read the six cards: **Occupancy**, **Nights sold**, **Bookings**, **Room revenue**, **ADR** (average price of a sold night) and **RevPAR** (revenue per available room night).
2. On the calendar, point at today's column, one row per room, and the "Demo" bar in the Room 4 row. Say that overlapping bookings are drawn one above the other, so a double booking is easy to spot.
3. Tap a coloured bar. The pop-up shows check-in, check-out, **Stay total**, **Paid**, **Balance**, **Source** and TM30 status. Show **Open guests**, then tap **Close**.
4. Tap the right arrow (**Next month**) to see the bookings already taken, then **This month**. Mention the month box between the arrows for any month and year.
5. Point at **Guests this month** under the calendar.

## 9. Rooms and room detail

**Time:** 3 min | **Go to:** [http://localhost:3000/app/rooms](http://localhost:3000/app/rooms)

**Say:** Every room has its own record: who is in it, what is inside it, and when its fire extinguisher expires.

**Do:**
1. Show the five room cards with the labels **Occupied** (guest name and leaving day) or **Available**. Point at **Add room**, the pencil icon (**Edit**), the bin icon (**Delete**) and the **Show inactive** tick box. Say a closed room is switched off with **Active**, not deleted.
2. Tap the **Room 3** card. At the top right it says **Occupied** with the guest's name.
3. Under **Current guest**, show the dates and the balance owed. Under **Upcoming**, the next bookings for this room.
4. Under **Inventory**, show the items grouped by category (Furniture, Electronics, Bathroom and so on) and the **Add item** button.
5. Under **Fire safety**, show the amber label (about "21d left"). Tap **Add** to show the form (**Location**, **Serial number**, **Expiry date**, **Last inspected**, **Notes**), then close it.
6. Under **Photos**, say the demo rooms have none. Tap **Attach** and pick any picture to show it appear (up to 5 per room; the first one is used on the room card). Tap the photo to see it large.
7. Tap **Back**, open **Room 1** and show the red "Expired" label. This is the same alert the manager saw on Operations.

**Clean up:** the photo can stay, or remove it with the X on its corner and **Remove**.

## 10. Revenue

**Time:** 3 min | **Go to:** [http://localhost:3000/app/revenue](http://localhost:3000/app/revenue)

**Say:** There is one list of income, and every dashboard adds up this same list. That is why the numbers never disagree.

**Do:**
1. Read the four cards: **Total revenue**, **This month**, **Filtered total**, **Shown to legal**.
2. Under **By source**, tap **Booking.com**, then tap it again. Under **Monthly**, tap a month tile, then tap it again.
3. Search "Demo Guest". The line carries the **Booking** label with a lock; the pencil and bin are greyed out. Say: booking income can only be changed on the booking, so it cannot drift. It is dated on the check-out day and counts the **Total stay**.
4. Clear the search and choose "Other Income" in the **All sources** box. These are the **Manual** lines: "Restaurant & bar takings", "Island tours commission", "Laundry & airport transfers". Set the box back.
5. Tap **Add revenue**. In **New revenue**: **Date** today, **Type / source** "Other Income", **Description** "Demo: minibar sales", **Amount** 800, tick **Show to legal**. Tap **Save revenue**.
6. Tap **Legal: yes**, then **All**. Tap **Export** and say the file has an **Origin** column that reads "Booking" or "Manual".

**Clean up:** search "Demo: minibar", tap the bin icon (**Delete**) and confirm. Or keep it until section 13 to show it on the legal page, and delete it afterwards.

## 11. Expenses

**Time:** 6 min | **Go to:** [http://localhost:3000/app/expenses](http://localhost:3000/app/expenses)

**Say:** Photograph a receipt and the expense fills itself in. Every expense keeps its receipt, and you decide which ones your accountant sees.

**Do: look around**
1. Read the four cards: **Total expenses**, **Filtered total**, **Legal expenses**, **Records**.
2. In the list point at **Transaction #**, **Doc #**, the **Audit** label (**To check**, **Checked**, **YES**), the **Legal** label (**Pending**, **Accepted**, **Clarification Needed**, **Rejected**) and the paperclip. No paperclip means no receipt.
3. Choose "Maintenance" in **All categories** and find "Santos Construction" (Room 5 bathroom renovation, type CAPEX). Set the box back. Tap **Legal only**, then tap it again. Tap a year button, then **All years**.

**Do: scan a receipt live**
4. Tap **Add expense**. At the top of **New expense** tap **Scan receipt** and choose your receipt photo (on a phone, **Camera** takes it on the spot).
5. Wait a few seconds. The filled fields are outlined: **Supplier**, **Document #**, **Payment date**, **Amount**, **Currency**, **Description**, **Category**. Say: always check the amount and the date against the paper.
6. Tap **Attach this image**. The label changes to **Attached**. Say: scanning only reads; this button keeps the photo with the expense.
7. Type "Demo" at the start of **Description**. Choose **Payment method** "Cash" and a **Category** if it is empty. Tick **Share with legal**. Tap **Save expense**. The message gives the automatic number.
8. If scanning is not switched on (the message says it "is not configured"): say so, then type it by hand: **Category** "Maintenance", **Supplier** "Demo Hardware Store", **Amount** 1250, **Payment method** "Cash", **Paid by** "General Manager", **Description** "Demo: light bulbs", tick **Share with legal**, attach the photo under **Receipt or invoice** with **Choose file**, wait for "File uploaded", and tap **Save expense**.

**Do: foreign currency**
9. Tap **Add expense**. Set **Currency** to "EUR" and type **Amount** 100. Point at the note under the amount showing roughly what it is worth in THB. Tap **Cancel**.
10. Search "Channel Manager" (paid in EUR), then "Meta Ads" (paid in USD). Each line shows the original amount and the THB value. Say: the value is fixed once, with the rate on the day it was saved.
11. Tap **Export** and say the file has both the original amount and **Amount (base)**.

**Clean up:** keep the "Demo" expense. It is reviewed and then deleted in section 13.

## 12. Accounts

**Time:** 3 min | **Go to:** [http://localhost:3000/app/accounts](http://localhost:3000/app/accounts)

**Say:** The cash position keeps itself up to date. Record a guest payment or an expense and the right account moves without anyone doing a second entry.

**Do:**
1. Read the four cards: **Total cash on hand**, **Accounts**, **Inflows**, **Outflows**. Under **Balances**, show the **Bank** and **Cash** cards.
2. Under **Movements**, find today's lines: two **Guest payment** lines for "Demo Guest" (1,000 and 2,500, green) and one **Expense** line for the demo expense (red). The **Actions** column says **auto**: the app created them.
3. Choose "Cash" in **All accounts**. Search "deposited" to show the monthly "Cash takings deposited to the bank" adjustments. Clear the search and tap **Clear**.
4. On the **Cash** card tap **Adjust balance**. **Direction** **Remove money (−)**, **Amount** 100, **Description** "Demo: cash count short". Point at **New balance**, then tap **Post adjustment**.
5. Show **Add account** (types **Bank account**, **Cash**, **E-wallet**, **Other**; **Opening balance**) and close the form. Mention **Show inactive** and the **Export** menu.

**Clean up:**
1. In **Movements**, tap the bin icon (**Delete adjustment**) on "Demo: cash count short" and confirm.
2. Go to [http://localhost:3000/app/guests](http://localhost:3000/app/guests), search "Demo Guest", tap the bin icon (**Delete**) and confirm. Its revenue line and its two account movements disappear with it. The invoice already created is kept for the record.

## 13. Legal and accounting

**Time:** 4 min | **Go to:** [http://localhost:3000/app/legal](http://localhost:3000/app/legal)

**Say:** Your lawyer or accountant gets their own page. They see only what you chose to share, mark each expense, and take the month away as a report.

**Do:**
1. Show the **Year** and **Month** lists and the search box. Read the five cards: **Total**, **Pending**, **Accepted**, **Clarification**, **Rejected**.
2. Under **Shared expenses**, tap the tabs **All**, **Pending**, **Accepted**, **Clarification**, **Rejected**. Point at a reviewer's note shown in colour under a line and at each group's **Subtotal**.
3. In **Pending**, find the "Demo" expense. Tap the small arrow at its left to open the details (**Description**, **Method**, **Paid by**, **Type**, **Transaction**, **Audit**, **Legal notes**) and tap the paperclip (**Open attachment**) to see the receipt.
4. Point at the three icons on the right: tick (**Accept**), question mark (**Needs clarification**), cross (**Reject**). Tap the tick. In **Review expense**, check **Decision** and **Review date**, type "Receipt checked" in **Notes / reason**, and tap **Save review**. The expense moves to **Accepted** and the cards update.
5. Scroll to **Revenue shown to legal**: lines tagged **Booking** or **Manual**, with a page icon for the invoice and a paperclip for a file, and **Total (Legal)** underneath.
6. Choose a month in **Month**. Tap **CSV** (top right): a file named legal-report- with the period is saved and opens in Excel.
7. Tap **Print**: the **Legal / Accounting Report** opens with the printer window. Show "Save as PDF", then cancel. Set **Month** back to **All months**.
8. Say: nothing is added or deleted here. Items arrive through three tick boxes: **Share with legal** on an expense, **Show on legal page** on a booking, **Show to legal** on manual revenue.

**Clean up:** go to [http://localhost:3000/app/expenses](http://localhost:3000/app/expenses), search "Demo", tap the bin icon (**Delete**) and confirm. The money goes back to the Cash account. Delete "Demo: minibar sales" on Revenue if you kept it.

## 14. Budget

**Time:** 5 min | **Go to:** [http://localhost:3000/app/budget](http://localhost:3000/app/budget)

**Say:** Plan the year once, room by room and cost by cost. The app then compares the plan with what really happened, with no extra typing.

**Do:**
1. Point at the **Year** list (top right) and the three tabs **Setup**, **Input**, **Control**. The screen opens on **Input**.
2. Tab **Setup**: one line per room with **High season rate**, **Low season rate** and **Target occupancy %**. Tap the pencil icon (**Edit**) on Room 1 to show the form, then close it. Say these are reference figures only. (**Create rows for all rooms** appears when a room has no line yet.)
3. Tab **Input**, **Revenue matrix**: one line per room, one column per month, a **Total** column and a **Total** line. Tap the cell for Room 1 in Dec. Note the amount, type 150000 in **Amount**, show **Season**, tap **Save** and watch the totals change. Tap the cell again, type the old amount back and tap **Save**. Mention **Clear** empties a cell.
4. **Expense items**: show the bands **OPEX · operating** and **CAPEX · capital**, the bold category lines, and **Total OPEX**, **Total CAPEX**, **Total expenses**. Point at the three CAPEX items (Room 5 bathroom renovation, New air conditioners, Solar water heating).
5. Tap the Jan cell of "Internet". Type **Amount** 3000, tap **Copy this amount to all 12 months**, then **Copy**. (The item is already 3,000 in every month, so nothing changes.) Mention **Subcategory**, **Save** and **Delete** in the same form.
6. Tap **Add item** to show the form (**Item**, **Category**, **Type** **OPEX** or **CAPEX**, **Amount**, **Apply to**), then close it without adding.
7. **Rent schedule**: three lease years with **Year**, **Label**, **Annual rent**, **VAT**, **Monthly**. Show **Add year** and close it.
8. Tab **Control**: read the six cards (**Budget revenue**, **Actual revenue**, **Budget expenses**, **Actual expenses**, **Budget result**, **Actual result**). Tap **P&L** for the year table (**Line**, **Budget**, **Actual**, **Variance**), then **Monthly**. Green is good news, red is bad news.
9. Tap **Export** next to the P&L. Say each part of the budget exports on its own.
10. Honest note if asked: real expenses are matched to the budget by category and all count under OPEX, so CAPEX lines show a dash under **Actual**.

## 15. Partner dashboard

**Time:** 5 min | **Go to:** [http://localhost:3000/app/partner-dashboard](http://localhost:3000/app/partner-dashboard)

**Say:** Partners open one read-only page and find every answer they normally ask the manager for. It reads the same records the team works on.

**Do:**
1. **Financial overview**: read **Total revenue**, **Total expenses**, **Net position**, **Account total**. Show **Revenue by source**, **Accounts** and **Monthly revenue vs expenses**, and tap a year button.
2. **Funding & investment**: read **Total capital**, **Partners**, **Agreed capital**, **Funded**. On the partner cards show Elena Marquez and David Okonkwo fully paid in, Mika Sorensen at 80% and Lucia Ferreira at 60% of agreed.
3. **Shareholding**: read **Total allocated** (100%, "ownership adds up"), **Fully settled**, **Still owed**, **Total capital**. In the table explain **Ownership**, **Nominal**, **Paid in**, **Balance**, **Funded**. Click a column header to sort. Tap the pencil icon (**Edit ownership %**) on one partner to show it is the only thing editable here, then close without saving.
4. **Budget vs actual**: read **Revenue**, **Expenses**, **Net result**, **Variance**. Show the three tables: **Revenue**, **Operating expenses (OPEX)**, **Capital expenditure (CAPEX)**, and the box with **Net budget**, **Net actual**, **Variance**.
5. **Business KPIs**: read **Occupancy**, **ADR**, **RevPAR**, **Avg stay**. Change the month in the month box at the top right. Show **Last 12 months** (occupancy green from 70%, amber from 40%).
6. **Cost structure**: read **Total expenses**, **Categories**, **Largest**, **Share of largest**, and the list **Expenses by category**.
7. **Forecast**: read **Projected cash**, **Future bookings**, **Budget revenue left**, **Budget expenses left**. Show **Upcoming bookings** with **Total** and **Balance**, and page through it with the arrows.
8. **Partners**: one profile card per partner. Tap **Manage partners** to go to the next screen.

## 16. Partners

**Time:** 2 min | **Go to:** [http://localhost:3000/app/partners](http://localhost:3000/app/partners)

**Say:** Each partner has a profile with their share and what they agreed to pay in. The app checks that the shares add up to 100%.

**Do:**
1. Read the line under the title: "4 partners · 100.00% ownership recorded". Say a warning **Ownership ≠ 100%** appears when it does not add up.
2. On the cards show Elena Marquez 40%, David Okonkwo 25%, Mika Sorensen 20%, Lucia Ferreira 15%, with **Contributed** and the progress bar.
3. Tap Lucia Ferreira's card. The pop-up shows the bio, **Email**, **Phone**, **Nationality**, **Joined** and **Hour rate**. Tap **Close**.
4. Tap the pencil icon (**Edit**) on a card (move the mouse over the card to see it). Show the sections **Profile**, **Ownership & capital** (**Ownership %**, **Agreed capital**, **Hour rate**) and **Contact & access** (**Linked team member**), the **Photo** field and the **Active** tick box. Tap **Cancel**.
5. Point at **Add partner**.

## 17. Capital

**Time:** 2 min | **Go to:** [http://localhost:3000/app/founding](http://localhost:3000/app/founding)

**Say:** Every payment a partner puts into the company is on record, so nobody argues about who paid what and when.

**Do:**
1. Read the cards: **Total capital founded**, **Partners**, **Contributions**, **Latest**. Under **By partner**, show each partner's total and share of capital.
2. In the list show **Date**, **Partner**, **Method**, **Amount**, **EUR (as paid)**, **Notes** ("Initial capital call", "Second tranche", "Renovation top-up").
3. Type "Lucia" in the search box; the total under the list follows the search. Clear it. Click the **Amount** header to sort.
4. Tap **Add contribution**: **Date** today, **Partner** "Lucia Ferreira", **Amount** 50000, **Method** "Bank Transfer", **Notes** "Demo contribution". Tap **Save**. Her card and the totals go up.
5. Mention **Export**. Say: a contribution counts as partner capital only; it does not move an account.

**Clean up:** tap the bin icon (**Delete**) on "Demo contribution" and confirm.

## 18. Partner work

**Time:** 1 min | **Go to:** [http://localhost:3000/app/partner-work](http://localhost:3000/app/partner-work)

**Say:** Partners who work in the business log their hours, and the app shows what that work is worth.

**Do:**
1. Read **Total value**, **Total hours**, **Months**, **Partners** and the **By partner** cards.
2. Show the records grouped by month, newest first, each as hours × rate with its value.
3. Choose a partner in **All partners** and a year in **All years**; the cards follow. Set both back.
4. Tap **Add hours** to show **Month**, **Partner**, **Hours**, **Rate per hour** and the **Value** at the bottom, then close it. Mention **Export**. Say: for information only; it pays nobody and moves no account.

## 19. Meetings

**Time:** 2 min | **Go to:** [http://localhost:3000/app/meetings](http://localhost:3000/app/meetings)

**Say:** The minutes of every partner meeting are in one place: who was there, what was decided and who does what next.

**Do:**
1. Show the four meetings, newest first, with their labels (participants, files, **Decisions**, **Action items**).
2. Tap "Annual planning meeting". It opens out to show the participants, **Agenda**, **Decisions**, **Action items** and **Attachments**. Tap the icon at the end of "Budget summary.png" (**Open**); the placeholder picture opens in a new tab.
3. Point at **Edit** and **Delete** at the bottom of the opened meeting.
4. Type "capital" in the search box (it searches title, agenda and decisions), then clear it.
5. Tap **New meeting** to show **Date**, **Title**, **Participants** (tap names to tick them), **Other participant** with **Add**, the **Minutes** boxes and **Attach**. Tap **Cancel**.

## 20. Tasks

**Time:** 2 min | **Go to:** [http://localhost:3000/app/tasks](http://localhost:3000/app/tasks)

**Say:** A shared to-do list for the whole team, with a name and a date on every job, so overdue work is visible to everyone.

**Do:**
1. Read the line under the title (open and overdue tasks). Overdue tasks come first with a red **Overdue** label.
2. Tap **All**, **Overdue**, **Pending**, **Ongoing**, **Complete**, **Blocked**. Under **Blocked** show "Pool pump warranty claim". Tap **All**.
3. Choose "Finance" in **All departments**, then set it back. Tap **Assigned to me** and tap it again.
4. On "Staff fire drill", open the status box in the **Status** column and choose **Ongoing**. It is saved at once.
5. Tap **Add task** to show **Topic**, **Project**, **Department**, **Assign to team member**, **Responsible person**, **Target date**, **Status**, **Status notes** and **Visible to managers**. Tap **Cancel**. Mention search and **Export**.

**Clean up:** none needed; the status change can stay.

## 21. Complaints

**Time:** 2 min | **Go to:** [http://localhost:3000/app/complaints](http://localhost:3000/app/complaints)

**Say:** Guest complaints are written down and followed until they are solved, so nothing serious is forgotten.

**Do:**
1. Read the four cards: **Open**, **In progress**, **Critical**, **Resolved this month**.
2. Tap **Critical**. The list shows the loose balcony railing in Room 5 and a **Critical only ×** button appears.
3. Tap the pencil icon (**Edit**) on it. Change **Status** to **Resolved**, type "Railing fixed and checked" in **Resolution notes**, see **Resolved on** fill in with today, and tap **Save complaint**.
4. Tap **Critical only ×**. Tap the filters **All**, **Open**, **In Progress**, **Resolved**, **Closed**. Click **Severity** to sort.
5. Tap **Log complaint** to show **Date**, **Guest name**, **Room**, **Category**, **Description**, **Severity**, **Status** and **Filed by**, then close it. Mention **Export**.

**Clean up:** none needed; it can stay.

## 22. Staff hours

**Time:** 2 min | **Go to:** [http://localhost:3000/app/staff-hours](http://localhost:3000/app/staff-hours)

**Say:** Record who worked how many hours, and the pay per person per month is worked out for you.

**Do:**
1. Read the line under the title: the month, total hours and total pay. The screen opens on the current month.
2. Show the cards for the six staff members. Tap one to see only that person, tap again for everyone.
3. In the list show **Hours**, **Rate** and **Total**, and the totals line with **Hours** and **Pay**.
4. Change the month box to last month, then to **All months**, then back to this month. Mention the **All staff** box.
5. Tap **Add hours** to show **Staff member** (names are suggested), **Date**, **Hours**, **Hourly rate**, **Role**, **Department**, **Notes** and the **Pay** at the bottom, then close it. Mention **Export**.
6. Say: this records hours and works out pay. Paying wages is recorded as an expense.

## 23. Documents

**Time:** 2 min | **Go to:** [http://localhost:3000/app/documents](http://localhost:3000/app/documents)

**Say:** A filing cabinet for the company's papers. The lease, the licence and the insurance policy are found in seconds.

**Do:**
1. Show the 11 documents and the category buttons (**All**, Contracts, Permits, Legal and so on). Tap "Contracts", then **All**.
2. Type "lease" in the search box, then clear it. Click the **Date** header to sort.
3. Click the name "Fire safety inspection certificate". The file opens in a new tab (the placeholder picture in the demo).
4. Tap **Add document**. Under **File** tap **Choose file** and pick any file; wait for "File uploaded". Set **Name** "Demo licence", **Category** "Permits", **Document date** today. Tap **Save document**. Say: files up to 10 MB; on a phone most forms also have a **Camera** button.
5. Tap **Export** and say it lists the documents, not the files themselves.

**Clean up:** tap the bin icon (**Delete**) on "Demo licence" and confirm.

## 24. Log-in vault

**Time:** 2 min | **Go to:** [http://localhost:3000/app/logins](http://localhost:3000/app/logins)

**Say:** The passwords for the booking sites and the bank are no longer on a sticky note. They are stored scrambled, and only trusted roles can open this screen.

**Do:**
1. Show the five log-ins with **Service**, **Username**, **Password**, **Notes**, **Added by**.
2. On "Booking.com extranet" tap **Reveal**. The password is fetched but still shown as dots.
3. Tap the eye icon (**Show**): it reads demo-Booking-2026!. Tap the eye again (**Hide**).
4. Tap the copy icon (**Copy password**); "Password copied" appears. Tap the copy icon next to the user name (**Copy username**).
5. Tap the X icon (**Forget**) to put it away. Say a revealed password hides itself after 30 seconds.
6. Tap **Add log-in** to show **Service**, **URL**, **Username**, **Password** and **Notes**, then close it.
7. Tap **Export** and say passwords are never included. Say only Owner and Manager see this screen by default.

## 25. Settings: Profile

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/profile](http://localhost:3000/app/settings/profile)

**Say:** Settings has ten pages, listed on the left. The first one is personal and is open to everyone, whatever their role.

**Do:**
1. Point at the ten pages: **Profile**, **Organisation**, **Invoices**, **Categories**, **Properties**, **Payments**, **Team**, **Roles**, **Data**, **Billing**.
2. Show **Display name** (**Full name**) and the locked **Email**.
3. Show **Change password**: **Current password**, **New password**, **Confirm new password**, **Update password**. Do not change it.
4. Under **Appearance** show **Light**, **Dark**, **Auto**.
5. Show **Your organisations** (role and plan, the one in use marked **Current**), **New organisation** and **Sign out**.

## 26. Settings: Organisation

**Time:** 2 min | **Go to:** [http://localhost:3000/app/settings/organisation](http://localhost:3000/app/settings/organisation)

**Say:** The owner sets the rules of the business once: currency, VAT and how early the app should warn.

**Do:**
1. Show **Organisation name** at the top of the **General** form.
2. Under **Currencies**, show **Base currency** (THB) and **Display currencies** with **EUR** and **USD** selected. Say: never change the base currency on a running business; existing amounts are not converted.
3. Under **Tax and fiscal year**, show **VAT rate (%)**, the **Prices include VAT** switch and **Fiscal year starts in**.
4. Under **Alerts**, show **Fire extinguisher warning (days before expiry)**, **Arrivals window (days)** and **Departures window (days)**.
5. Under **Partners**, show **Partner hour rate**.
6. Under **External links**, show "Tourism board portal" (the button seen on Operations and Guests) and **Add link**.
7. Point at **Save changes**: it stays grey until something is changed. Change nothing.

## 27. Settings: Invoices

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/invoices](http://localhost:3000/app/settings/invoices)

**Say:** Your invoices carry your company details, your numbering and your logo.

**Do:**
1. Show **Number prefix**, **Company name**, **Address**, **Tax ID**, **Branch**, **Email**, **Phone**.
2. Under **Signature and footer**, type a few words in **Footer** and watch the **Preview** update as you type.
3. Under **Logo**, point at **Choose file**.
4. Leave the page without tapping **Save changes**. Say: changes apply to invoices created from then on.

## 28. Settings: Categories

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/categories](http://localhost:3000/app/settings/categories)

**Say:** Every drop-down list in the app is yours to change, so the app speaks your language.

**Do:**
1. Read the nine tabs: **Expense**, **Booking sources**, **Revenue sources**, **Task departments**, **Task projects**, **Staff departments**, **Complaint**, **Document**, **Inventory**.
2. On **Expense**, type "Demo Spa" in the box at the bottom and tap **Add**. Show the arrow icons (**Move up** / **Move down**).
3. Tap the bin icon (**Remove**) on "Demo Spa". Say: nothing is kept until **Save changes**, and one save covers all nine lists.

**Clean up:** none; nothing was saved.

## 29. Settings: Properties

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/properties](http://localhost:3000/app/settings/properties)

**Say:** One organisation can run several properties. Each has its own rooms, calendar and timezone, while the money is reported for the whole company.

**Do:**
1. Show the "Seaview Resort" card marked **Current**, its timezone and the **Manage rooms** button.
2. Tap **Add property** to show **Name**, **Timezone**, **Address** and **Active**. Tap **Cancel**.
3. Explain the switcher: with a second active property, the property name at the top of the sidebar opens **Switch workspace**.
4. Optional, live: add a property named "Demo Annex" and tap **Save**. Tap the property name at the top of the sidebar, show **Switch workspace**, choose "Demo Annex" (the app goes to Overview with no rooms or guests, while money totals still cover the company), then switch back to "Seaview Resort". Warning: a property cannot be deleted, only deactivated, so it stays in the list.

**Clean up (only if you did step 4):** tap the pencil icon (**Edit**) on "Demo Annex", untick **Active**, tap **Save**.

## 30. Settings: Payments

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/payments](http://localhost:3000/app/settings/payments)

**Say:** This small page is why the cash position stays right: each way of paying is linked to one of your accounts.

**Do:**
1. Under **Payment methods**, show Cash (linked to the Cash account), Bank Transfer and Card (both linked to Bank) and Other (no account).
2. Tap the pencil icon (**Edit**) on "Cash" to show **Name**, **Account**, **Order** and **Active**. Close it.
3. Point at **Add method**. Say: this is why "Cash" on the demo booking raised the Cash balance in section 12.

## 31. Settings: Team

**Time:** 2 min | **Go to:** [http://localhost:3000/app/settings/team](http://localhost:3000/app/settings/team)

**Say:** You decide who gets in and with which role. Inviting someone takes ten seconds.

**Do:**
1. Show the two boxes **Members** and **Invitations**. Your own row is marked **You**. Point at the **Role** drop-down, the **Active** switch (off means **Suspended**) and the bin icon (**Remove from organisation**).
2. Tap **Invite**. **Email** "reception@seaview.com", **Role** "Staff". Tap **Create invitation**.
3. In **Share the invitation**, point at the **Invitation link**. Tap **Copy**. Point at **Open in your email app**. Tap **Done**.
4. Say honestly: the app does not send the invitation. You paste the link into a message yourself. It works once and for 7 days.
5. Under **Invitations**, show the status, the **Expires** column, the copy icon (**Show link**), the circular arrow (**Resend (new link)**) and the stop icon (**Revoke**).

**Clean up:** keep the invitation; it is used in section 35. If you skip section 35, tap **Revoke** and confirm.

## 32. Settings: Roles

**Time:** 2 min | **Go to:** [http://localhost:3000/app/settings/roles](http://localhost:3000/app/settings/roles)

**Say:** Seven ready-made roles cover most teams. If they do not fit, you tick exactly what each role may see and do on each screen.

**Do:**
1. Read the role tabs: Owner, Manager, Finance, Legal, Partner, Staff, Viewer. **Owner** has a padlock and a **System** badge and cannot be changed.
2. Tap **Staff**. Show the grid: one row per screen, with tick boxes for **View**, **Add**, **Edit**, **Delete**. Staff see Operations, Guests, Occupancy, Rooms, Tasks and Complaints and nothing about money.
3. Tap **Legal**: only Revenue, Expenses, Legal & accounting and Documents. Tap **Finance**, then **Partner**, to show the difference.
4. Point at the shortcuts **all** / **none** under a column heading and in the **Row** column, and at **Save changes**. Change nothing.
5. Tap **Add role**. **Role name** "Demo Reception", **Start from** **Template: Staff**. Tap **Create role**. Show the new tab with **Rename** and **Delete**.

**Clean up:** on the "Demo Reception" tab tap **Delete**, then **Delete** in the pop-up.

## 33. Settings: Data

**Time:** 3 min | **Go to:** [http://localhost:3000/app/settings/data](http://localhost:3000/app/settings/data)

**Say:** Your data is yours. You can take all of it out at any time, and you can see who changed what.

**Do:**
1. In the **Export** box, show the file types **Excel**, **CSV**, **JSON**. Tap the single list **Expenses** to download one file.
2. Point at **Export everything** (every list, one file each; the browser may ask to allow multiple downloads). Read a few of the lists: Guests / bookings, Revenue, Tasks, Accounts, Invoices, Audit log. Say attached files are not part of the export.
3. Scroll to **Audit log**. Show today's entries from this demo: time, list, INSERT / UPDATE / DELETE and who did it. Tap a link in the **Changes** column (for example "3 fields") to see the old value struck through and the new one.
4. Use the **All tables** drop-down to choose "guests" and find the demo booking being added, changed and deleted. Say: list names appear in technical form here.
5. Scroll to the red **Reset data** box and read its description ("Danger zone"). Show the tick boxes, **Select all**, the box where the organisation name must be typed, and the grey **Delete selected data** button. **Do not tick anything and do not run it.** Say: it deletes permanently, only an Owner sees it, and it never touches settings, rooms, team or roles.

## 34. Settings: Billing

**Time:** 1 min | **Go to:** [http://localhost:3000/app/settings/billing](http://localhost:3000/app/settings/billing)

**Say:** You always see which plan you are on. Changing plan today is done by email with us.

**Do:**
1. Show the top box with the plan (**Trial**) and the days left or **Trial ended**. Show **Payment method** "None on file".
2. Under **Plans**, show Starter, Growth and Enterprise (**Custom**), the one marked **Current**, and the buttons **Ask to switch** / **Talk to us**.
3. Point at **Contact us to upgrade**. Say honestly: there is no card form, nothing is charged automatically, and the button opens an email.

## 35. Roles demo

**Time:** 3 min | **Go to:** the invitation link you copied in section 31, pasted into the private window (it starts with http://localhost:3000/invite/)

**Say:** Here is the same app through the eyes of a receptionist. They see their six screens and nothing about money, partners or settings.

**Do:**
1. The page says "You are invited", "Join Seaview Resort Co.", the role Staff, the email and the expiry.
2. Tap **Create account with reception@seaview.com**. Fill **Your name** "Demo Reception", **Work email** "reception@seaview.com", **Password** (8 characters or more), and tap **Create account**. If the account exists from an earlier demo, tap **I already have an account** and sign in.
3. Tap **Accept invitation**. The app opens in Seaview Resort Co.
4. Read the menu: only Operations, Guests, Occupancy, Rooms, Tasks and Complaints. No Overview, no Finance, no Partners, no Settings.
5. Open **Guests**: **Add booking** and the pencil are there, the bin icon is not (Staff may add and edit, not delete).
6. In this private window open [http://localhost:3000/app/expenses](http://localhost:3000/app/expenses). The app quietly goes to the first allowed screen instead.
7. Open the person icon (**Your profile**): the profile page is there, the other nine settings pages are not.
8. Back in your owner window on [http://localhost:3000/app/settings/team](http://localhost:3000/app/settings/team), change this person's **Role** to "Viewer". Reload the private window: more screens appear, with no add or edit buttons.

**Clean up:** in **Members**, tap the bin icon (**Remove from organisation**) on "Demo Reception" and tap **Remove**. Close the private window.

## 36. Phone and install

**Time:** 3 min | **Go to:** [http://localhost:3000/app](http://localhost:3000/app) on a phone (use your live site address; a phone cannot open localhost). Without a phone, make the browser window narrow.

**Say:** The manager is rarely at a desk. Everything you have just seen works on a phone with one thumb, and it sits on the home screen like any other app.

**Do:**
1. Show the bottom bar: **Home**, **Guests**, **Expenses**, **Revenue**, **More**.
2. Tap **More**. The **Menu** lists every screen by group, with the theme icon at the top and **Profile** and **Sign out** at the bottom. Open **Operations** from it.
3. Show the top bar: property and organisation name, the currency switch with its dot, and the round badge with your initials (it opens the same Menu).
4. Tap **Guests**. Lists show as cards, with the action icons at the bottom of each card. Tap **Add booking**: the form slides up from the bottom. Close it with the X.
5. Tap **Expenses**, **Add expense**, and point at **Scan receipt** and **Camera**: photograph the receipt on the spot. Close the form.
6. Open **More**, **Occupancy** and swipe the calendar sideways. Open **More**, **Partner dashboard** and swipe the row of tabs.
7. Install on Android (Chrome): browser menu (three dots), **Install app** (on some phones **Add to Home screen**), confirm.
8. Install on iPhone or iPad (Safari): **Share** button, **Add to Home Screen**, **Add**.
9. Open the app from the new home-screen icon: full screen, starting on Overview. Say honestly: it still needs an internet connection.

## 37. Dark theme

**Time:** 1 min | **Go to:** [http://localhost:3000/app](http://localhost:3000/app)

**Say:** For night shifts and personal taste: light, dark, or follow the device.

**Do:**
1. On a computer, click the sun, moon or screen icon at the bottom of the sidebar. Each click moves on: light, dark, automatic.
2. In dark, open [http://localhost:3000/app/guests](http://localhost:3000/app/guests) and [http://localhost:3000/app/partner-dashboard](http://localhost:3000/app/partner-dashboard) to show lists and charts.
3. Say: on a phone it is the same icon at the top of the **More** Menu, and also **Light** / **Dark** / **Auto** under Settings, Profile. The choice is remembered per device.
4. Click the icon until it is light again.

## 38. Closing

**Time:** 2 min | **Go to:** [http://localhost:3000/app](http://localhost:3000/app)

**Say:** You typed one booking and one receipt today. From those, the calendar, the invoice, the revenue, the cash position, the accountant's report, the budget comparison and the partner dashboard all updated by themselves. That is the product.

**Do:**
1. Stay on Overview while you recap the flow: Guest → Revenue → Legal → Partners.
2. Repeat the three honest limits before they ask: no automatic emails, no online payment, no email password reset yet.
3. Offer the next step: a free trial workspace with their own rooms at [http://localhost:3000/signup](http://localhost:3000/signup), set up in about a minute.
4. Take questions. Use Appendix B.
5. After the audience has left, check the clean-up list: no "Demo" booking, expense, revenue line, contribution, document, role or team member remains. Or simply regenerate the data.

---

## Appendix A. Coverage checklist

Every screen, tab and feature, and the section where it is shown.

| Feature, screen or tab | Section |
|---|---|
| **Public and account** | |
| Landing page: hero, Features, How it works, Mobile, security block, Pricing, FAQ | 1 |
| Create an account (sign up) | 2 |
| Sign in, sign out | 2, 4, 25 |
| Forgot password page (honest notice) | 2 |
| Set up your workspace (wizard) and what it creates | 3 |
| Join by invitation link (invitation page, Accept invitation) | 31, 35 |
| **Shell and things that work the same everywhere** | |
| Sidebar and its six groups | 4 |
| Currency switch and rate refresh dot | 4 |
| Theme switch (light, dark, automatic) | 1, 25, 37 |
| Workspace / property switcher, New organisation | 3, 4, 29 |
| Phone bottom bar, More menu, top bar | 4, 36 |
| Install on phone (Android, iPhone) | 36 |
| Search | 7 |
| Filters, chips and clickable number cards | 7 |
| Sort by column | 7 |
| Paging and rows per page | 7 |
| Export menu: Excel (.xlsx), CSV, JSON, Print / PDF | 7 |
| Add, edit, delete with confirmation | 7, 12 |
| File attachment (Choose file, Camera) | 11, 23 |
| **Dashboards** | |
| Overview: cards, year buttons, chart and table, cash position, in-house, arrivals, tasks, shortcuts | 5 |
| Operations: Today's ops tab | 6 |
| Operations: Bookings tab | 6 |
| Operations: Revenue & collection tab, Include older | 6 |
| Operations: Tasks & issues tab | 6 |
| Operations: Cash control tab | 6 |
| Operations: external link buttons | 6, 26 |
| Partner dashboard: Financial overview tab | 15 |
| Partner dashboard: Funding & investment tab | 15 |
| Partner dashboard: Shareholding tab, Edit ownership % | 15 |
| Partner dashboard: Budget vs actual tab | 15 |
| Partner dashboard: Business KPIs tab, month box | 15 |
| Partner dashboard: Cost structure tab | 15 |
| Partner dashboard: Forecast tab | 15 |
| Partner dashboard: Partners tab, Manage partners | 15 |
| **Operations group** | |
| Guests: cards, labels, list | 7 |
| Guests: Add booking | 7 |
| Guests: payments in several parts | 7 |
| Guests: check-in / check-out (status from dates, TM30 tick) | 7 |
| Guests: Create invoice | 7 |
| Guests: Email invoice | 7 |
| Public invoice page, Print / Save PDF, opens without sign-in | 7 |
| Guests: Add to revenue and Show on legal page tick boxes | 7 |
| Guests: delete a booking (revenue and movements follow) | 12 |
| Occupancy: six cards, calendar, booking pop-up, month navigation | 8 |
| Rooms: cards, Add room, Edit, Delete, Show inactive | 9 |
| Room detail: Current guest, Upcoming | 9 |
| Room detail: Photos | 9 |
| Room detail: Inventory | 9 |
| Room detail: Fire safety and expiry labels | 6, 9 |
| Tasks: filters, Assigned to me, quick status change, Add task | 20 |
| Complaints: cards, Critical filter, resolve, Log complaint | 21 |
| Staff hours: person cards, month and staff filters, Add hours | 22 |
| **Finance group** | |
| Revenue: cards, By source, Monthly, locked booking lines | 10 |
| Revenue: Add revenue (manual income), Show to legal | 10 |
| Expenses: cards, Audit and Legal labels, filters | 11 |
| Expenses: Add expense by hand | 11 |
| Expenses: Scan receipt and Attach this image | 11 |
| Expenses: foreign currency (EUR, USD) | 11 |
| Expenses: Share with legal | 11, 13 |
| Expenses without a receipt (No invoice / receipt) | 5, 6, 11 |
| Accounts: balances, movements, auto lines, filters | 12 |
| Accounts: Adjust balance, Delete adjustment | 12 |
| Accounts: Add account, Show inactive | 12 |
| Legal & accounting: period, cards, status tabs, details, attachment | 13 |
| Legal & accounting: review buttons (Accept, Needs clarification, Reject) | 13 |
| Legal & accounting: Revenue shown to legal | 13 |
| Legal & accounting: CSV and Print | 13 |
| Budget: Year list | 14 |
| Budget: Setup tab | 14 |
| Budget: Input tab, Revenue matrix, cell editing, Clear | 14 |
| Budget: Input tab, Expense items, Add item, OPEX and CAPEX | 14 |
| Budget: Copy this amount to all 12 months | 14 |
| Budget: Input tab, Rent schedule | 14 |
| Budget: Control tab, P&L view | 14 |
| Budget: Control tab, Monthly view | 14 |
| Budget: Export per part | 14 |
| **Partners group** | |
| Partners: cards, profile pop-up, edit form, Add partner | 16 |
| Capital: cards, By partner, Add contribution, search, sort, Export | 17 |
| Partner work: cards, filters, Add hours, Export | 18 |
| Meetings: open a meeting, attachment, search, New meeting | 19 |
| **Company group** | |
| Documents: category buttons, open, Add document, Export | 23 |
| Log-in vault: Reveal, Show, Copy password, Copy username, Forget, Add log-in | 24 |
| **Admin group (Settings)** | |
| Profile | 25 |
| Organisation: currencies, VAT, alerts, partner hour rate, external links | 26 |
| Invoices: details, logo, Preview | 27 |
| Categories: nine lists | 28 |
| Properties: Add property, Switch to this property, Manage rooms | 29 |
| Payments: methods linked to accounts | 30 |
| Team: Members, Invite, Invitation link, Resend, Revoke, role change, suspend, remove | 31, 35 |
| Roles: permission matrix (View, Add, Edit, Delete), Add role, Rename, Delete | 32 |
| Data: export tables, Export everything | 33 |
| Data: Audit log | 33 |
| Data: Reset data (shown, not run) | 33 |
| Billing: plan, trial, Contact us to upgrade | 34 |
| Roles and who can see what (live with a Staff account) | 32, 35 |

---

## Appendix B. If they ask

Short, honest answers.

**Does it send emails?**
No. The app sends no invoices, invitations, reminders or password resets by itself. For an invoice or an invitation it opens a ready-written message in your own email app, or gives you a link to copy, and you send it.

**Can guests pay online? Can I pay my subscription by card?**
Not today. Online payment is not connected. Guest payments are recorded by hand on the booking. The Billing page shows the plans and opens an email to us; nothing is charged automatically.

**What if someone forgets their password?**
Password reset by email is not available yet. Someone who is still signed in on another device changes it under Settings, Profile. Otherwise the person who runs the service sets a new password for them.

**Does it stop double bookings?**
No. The app does not block two bookings in the same room on the same dates. The Occupancy calendar draws overlapping bookings one above the other, so they are easy to spot.

**If I change a booking, does the invoice change?**
No. An invoice is a copy of the booking at the moment it was first created, and there is no button yet to make a fresh one. Record all payments first, then create the invoice.

**Does receipt scanning always work?**
It needs a paid reading service (an AI key) that the operator of the app switches on. Without it the screen says scanning "is not configured" and you add the expense by hand and attach the photo. When it is on, it reads photos, not PDFs, and it can make mistakes, so always check the amount and date. The limit is 60 scans per hour per person.

**What happens when the 14-day trial ends?**
At the moment nothing is locked or limited. The date is shown for information. Plans and prices are arranged by email.

**Can other customers see my data?**
No. Every record belongs to one organisation and the database itself keeps organisations apart. Files are private and opened through short-lived links. Stored log-ins are encrypted. Inside your organisation, roles decide who sees which screen.

**Does it work offline?**
No. It needs an internet connection to load and to save, also when installed on a phone.

**Is it a booking engine or channel manager?**
No. It is the back office. You record bookings that arrive from your channels or directly, and the app turns them into occupancy, revenue, invoices and reports.

**Can I get my data out?**
Yes. Every list has an Export menu, and Settings, Data downloads every list as Excel, CSV or JSON. Attached files stay in the app and are opened from each record.

**Can something deleted be brought back?**
No. Deleting cannot be undone. The Audit log shows what was changed and by whom, but the record has to be typed in again.
