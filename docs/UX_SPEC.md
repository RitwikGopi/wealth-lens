# Portfolio Tracking App - UX Specification

**Version**: 1.0 (MVP)
**Date**: 2026-02-10
**Author**: UX Designer

---

## 1. Design System

### 1.1 Component Library

**shadcn/ui** is the primary component library. All UI components are built on top of Radix UI primitives styled with Tailwind CSS. Components are copied into the project (no vendor lock-in).

### 1.2 Color Palette

```
Primary:       #1E40AF (Blue 800)    -- Primary actions, active nav, links
Primary Hover: #1E3A8A (Blue 900)    -- Hover state for primary elements
Accent:        #059669 (Emerald 600) -- Positive values, profit, gains
Danger:        #DC2626 (Red 600)     -- Negative values, losses, destructive actions
Warning:       #D97706 (Amber 600)   -- Warnings, maturing soon indicators
Muted:         #6B7280 (Gray 500)    -- Secondary text, placeholders
Background:    #FFFFFF               -- Page background
Surface:       #F9FAFB (Gray 50)     -- Card backgrounds, sidebar
Border:        #E5E7EB (Gray 200)    -- Borders, dividers
Text Primary:  #111827 (Gray 900)    -- Headings, primary text
Text Secondary:#6B7280 (Gray 500)    -- Labels, secondary information
```

**Tag Colors** (user-selectable for tag badges):
```
Blue:    #3B82F6    Green:   #10B981    Purple:  #8B5CF6
Orange:  #F59E0B    Red:     #EF4444    Pink:    #EC4899
Teal:    #14B8A6    Indigo:  #6366F1    Gray:    #6B7280
```

### 1.3 Typography

System font stack for performance and native feel:

```
Font Family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Monospace:   "SF Mono", "Fira Code", "Fira Mono", Menlo, monospace (for numbers/amounts)

Heading 1:   24px / 32px line-height / font-weight 700 (Page titles)
Heading 2:   20px / 28px line-height / font-weight 600 (Section titles)
Heading 3:   16px / 24px line-height / font-weight 600 (Card titles)
Body:        14px / 20px line-height / font-weight 400 (Default text)
Small:       12px / 16px line-height / font-weight 400 (Labels, captions)
```

Financial numbers (amounts, percentages) use tabular numerals and monospace font for alignment in tables.

### 1.4 Spacing and Layout Grid

```
Base unit:     4px
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

Page padding:     24px (desktop), 16px (tablet)
Card padding:     16px (inner), 24px (if prominent)
Section gap:      24px between major sections
Element gap:      8-12px between related elements
Table row height: 48px
Sidebar width:    240px (collapsed: 64px)
Content max-width: 1280px (centered on large screens)
```

**Layout Grid**: 12-column grid with 24px gutters on desktop, collapsing to single column on tablet.

### 1.5 Elevation and Shadows

```
Level 0: No shadow (flat elements)
Level 1: 0 1px 3px rgba(0,0,0,0.1)   -- Cards, dropdowns
Level 2: 0 4px 6px rgba(0,0,0,0.1)   -- Modals, popovers
Level 3: 0 10px 15px rgba(0,0,0,0.1) -- Dialogs
```

### 1.6 Border Radius

```
Small:  4px  (buttons, inputs, badges)
Medium: 8px  (cards, panels)
Large:  12px (modals, prominent containers)
Full:   9999px (pills, avatars, circular elements)
```

---

## 2. Navigation

### 2.1 Sidebar Navigation

The sidebar is the primary navigation element, pinned to the left side of the viewport.

```
+------------------------------------------+
| [Logo/App Name]            [Collapse btn] |
|                                           |
|  OVERVIEW                                 |
|  [icon] Dashboard                         |
|                                           |
|  INVESTMENTS                              |
|  [icon] Holdings                          |
|  [icon] Fixed Deposits                    |
|                                           |
|  ACTIVITY                                 |
|  [icon] Transactions                      |
|                                           |
|  ORGANIZE                                 |
|  [icon] Tags                              |
|  [icon] Allocation Planning               |
|  [icon] Rebalancing                       |
|                                           |
|  ---------------------------------------- |
|  [icon] Settings                          |
+------------------------------------------+
```

**Sidebar Behavior**:
- Fixed position, full viewport height
- Active page highlighted with primary color background and bold text
- Section labels ("OVERVIEW", "INVESTMENTS", etc.) are uppercase, small, muted text
- Collapse button toggles between full sidebar (240px with labels) and icon-only mode (64px)
- Settings pinned to bottom of sidebar
- Icons use Lucide icon set (included with shadcn/ui)

**Icon Mapping**:
- Dashboard: `LayoutDashboard`
- Holdings: `TrendingUp`
- Fixed Deposits: `Landmark`
- Transactions: `ArrowLeftRight`
- Tags: `Tags`
- Allocation Planning: `PieChart`
- Rebalancing: `Scale`
- Settings: `Settings`

### 2.2 Top Header Bar

```
+---------------------------------------------------------------+
| [Breadcrumb: Dashboard > Holdings > INFY]     [Sync] [Refresh] |
+---------------------------------------------------------------+
```

**Header Behavior**:
- Breadcrumb navigation showing current page path
- Right side: contextual actions (e.g., "Sync from Zerodha" on Holdings page)
- Sticky position, scrolls with sidebar

### 2.3 Breadcrumbs

Format: `Section > Page > Detail`

Examples:
- Dashboard
- Investments > Holdings
- Investments > Holdings > INFY
- Investments > Fixed Deposits
- Investments > Fixed Deposits > SBI FD #1234
- Activity > Transactions
- Organize > Tags
- Organize > Allocation Planning
- Organize > Rebalancing
- Settings

---

## 3. Screen Designs

### 3.1 Dashboard (/)

**Purpose**: Portfolio overview at a glance -- total value, allocation breakdown, recent activity, and quick actions.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | DASHBOARD                                        |
|         |                                                  |
|         | +--Portfolio Summary Card---+ +--Quick Actions--+ |
|         | | Total Value    12,45,678  | | [+ Add Holding] | |
|         | | Invested       10,00,000  | | [+ Add FD]      | |
|         | | Total P&L     +2,45,678   | | [Sync Zerodha]  | |
|         | | P&L %          +24.57%    | |                  | |
|         | | Last Synced    10 min ago  | |                  | |
|         | +---------------------------+ +------------------+ |
|         |                                                  |
|         | +--Allocation Pie Chart----+ +--Growth Chart----+ |
|         | |                          | |                  | |
|         | |    [Donut Chart]         | |   [Line Chart]   | |
|         | |    Equity  60%           | |   1M 3M 6M 1Y   | |
|         | |    Debt    30%           | |                  | |
|         | |    Gold    10%           | |                  | |
|         | |                          | |                  | |
|         | +--------------------------+ +------------------+ |
|         |                                                  |
|         | +--Top Holdings by Value---------------------------+
|         | | Symbol   | Type  | Value     | P&L    | Tags  |
|         | | INFY     | EQ    | 2,50,000  | +12.5% | Eq    |
|         | | NIFTYB   | ETF   | 1,80,000  | +8.3%  | Eq    |
|         | | SBI FD   | FD    | 1,50,000  | +7.5%  | Debt  |
|         | | ...      |       |           |        |       |
|         | | [View All Holdings ->]                         |
|         | +------------------------------------------------+
|         |                                                  |
|         | +--Recent Transactions----------------------------+
|         | | Date       | Type     | Amount   | Desc       |
|         | | 2026-02-09 | Deposit  | 50,000   | Monthly    |
|         | | 2026-02-05 | Buy      | 25,000   | INFY       |
|         | | ...        |          |          |            |
|         | | [View All Transactions ->]                     |
|         | +------------------------------------------------+
+-----------------------------------------------------------+
```

**Component Details**:

**Portfolio Summary Card**:
- Large, prominent card at top-left
- Total value in large bold text (24px, monospace)
- Invested amount, total P&L (absolute and percentage)
- P&L colored green if positive, red if negative
- "Last Synced" timestamp with relative time (e.g., "10 min ago")

**Quick Actions Card**:
- Top-right, smaller card
- Three primary action buttons stacked vertically
- "+ Add Holding" opens holding creation form
- "+ Add FD" opens FD creation form
- "Sync Zerodha" triggers holdings sync (shows spinner during sync)

**Allocation Pie Chart**:
- Donut chart showing allocation by top-level tags
- Legend below or beside the chart with tag name, percentage, and value
- Click on a segment to navigate to that tag's filtered holdings view
- "Untagged" shown in gray if any untagged investments exist

**Portfolio Growth Chart**:
- Line chart showing total portfolio value over time
- Time range selector: 1M, 3M, 6M, 1Y, All (pill buttons)
- Tooltip on hover showing exact date and value
- Y-axis formatted in INR with lakhs/crores notation
- X-axis shows date labels

**Top Holdings Table**:
- Shows top 5 holdings by current value
- Columns: Symbol/Name, Type (EQ/FD/Manual), Current Value, P&L %, Tags
- "View All Holdings" link at bottom
- Tag badges shown as small colored pills

**Recent Transactions Table**:
- Shows last 5 transactions
- Columns: Date, Type, Amount, Description
- "View All Transactions" link at bottom

**Empty State** (new user with no data):
```
+-----------------------------------------------------------+
| SIDEBAR | WELCOME TO PORTFOLIO TRACKER                     |
|         |                                                  |
|         | Get started by adding your first investments:    |
|         |                                                  |
|         | +--Step 1--+  +--Step 2--+  +--Step 3---------+  |
|         | | Connect  |  | Add your |  | Create tags to  |  |
|         | | Zerodha  |  | FDs and  |  | organize your   |  |
|         | |  [Setup] |  | assets   |  | investments     |  |
|         | |          |  | [Add]    |  |  [Create Tags]  |  |
|         | +----------+  +----------+  +-----------------+  |
+-----------------------------------------------------------+
```

---

### 3.2 Holdings (/holdings)

**Purpose**: View all investment holdings (Zerodha-synced and manual) in a sortable, filterable data table.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | HOLDINGS                                          |
|         |                                                   |
|         | [+ Add Holding]  [Sync Zerodha]  Last synced: ... |
|         |                                                   |
|         | Filters: [Source v] [Type v] [Tags v] [Search...] |
|         |                                                   |
|         | Group by: [None v] / [Tag] / [Source] / [Type]    |
|         |                                                   |
|         | +--Holdings Table-------------------------------+ |
|         | | [ ] Symbol   Exchange Type  Qty   Avg    Cur   | |
|         | |     Value    P&L     P&L%  Tags  Source        | |
|         | |------------------------------------------------| |
|         | |                                                | |
|         | | -- Equity (tag group header) ---------- 60% -- | |
|         | | [ ] INFY    NSE     EQ    100  1,500  1,800    | |
|         | |     1,80,000 +30,000 +20%  [Eq] zerodha       | |
|         | | [ ] NIFTYB  NSE     ETF   500  180    210      | |
|         | |     1,05,000 +15,000 +16%  [Eq] zerodha       | |
|         | |                                                | |
|         | | -- Debt (tag group header) ------------ 30% -- | |
|         | | [ ] SGB2024 manual  Bond   10  4,800  5,200    | |
|         | |     52,000   +4,000  +8%   [Debt] manual      | |
|         | |                                                | |
|         | | -- Untagged ----------------------------------- | |
|         | | [ ] RELIANCE NSE    EQ    50   2,400  2,600    | |
|         | |     1,30,000 +10,000 +8%   --  zerodha        | |
|         | |                                                | |
|         | +------------------------------------------------| |
|         | | Showing 15 of 42 holdings   [< 1 2 3 >]       | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | [Bulk Actions: Tag Selected | Delete Selected]    |
+-----------------------------------------------------------+
```

**Component Details**:

**Page Header**:
- Title "Holdings" with action buttons on the right
- "+ Add Holding" button (primary) opens the holding creation dialog
- "Sync Zerodha" button (outline) triggers sync with loading spinner
- "Last synced: X min ago" text below actions

**Filter Bar**:
- Horizontal bar with filter controls:
  - Source dropdown: All, Zerodha, Manual
  - Type dropdown: All, EQ, ETF, MF, Bond, Gold, etc.
  - Tags multi-select dropdown: Select one or more tags (filtering by parent includes children)
  - Search input: Searches by symbol/name
- Active filters shown as removable chips below the filter bar
- "Clear all filters" link when filters are active

**Group By Control**:
- Dropdown or segmented control: None, Tag, Source, Type
- When grouped by Tag, holdings are organized under tag headings with subtotals
- Group headers show: tag name, total value, percentage of portfolio
- "Untagged" group shown at the bottom for holdings without tags

**Holdings Data Table** (reusable DataTable component):
- Columns: Checkbox, Symbol, Exchange, Type, Quantity, Avg Price, Current Price, Current Value, P&L, P&L %, Tags, Source
- Default sort: by Current Value descending
- Sortable columns: all numeric columns (click header to sort)
- Row hover highlights the row
- Click row to navigate to holding detail page
- Tag badges: small colored pills with tag name, max 2 visible + "+N" overflow
- P&L values: green text for positive, red for negative
- Monospace font for all numeric values

**Bulk Actions Bar**:
- Appears when one or more checkboxes are selected
- "Tag Selected" opens a tag picker to bulk-assign tags
- "Delete Selected" opens a confirmation dialog
- Shows count of selected items: "3 selected"

**Pagination**:
- Bottom of table, showing "Showing X of Y holdings"
- Page size: 20 (configurable)
- Simple prev/next with page numbers

**Empty State**:
```
+--------------------------------------------------+
|              No holdings yet                      |
|                                                   |
|   Connect your Zerodha account or add holdings    |
|   manually to get started.                        |
|                                                   |
|   [Connect Zerodha]    [Add Holding]              |
+--------------------------------------------------+
```

**Error State** (Zerodha sync failure):
```
+--------------------------------------------------+
| [!] Zerodha sync failed: Access token expired.    |
|     Please re-authenticate. [Re-authenticate ->]  |
+--------------------------------------------------+
```

---

### 3.3 Holding Detail (/holdings/:id)

**Purpose**: Full detail view for a single holding with tag management, history, and related transactions.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | Holdings > INFY                                   |
|         |                                                   |
|         | +--Holding Info Card----------------------------+ |
|         | | INFY - Infosys Limited           [Edit] [Del] | |
|         | | NSE | EQ | Source: Zerodha                    | |
|         | |                                               | |
|         | | Quantity      100                              | |
|         | | Avg Price     1,500.00                         | |
|         | | Current Price 1,800.00                         | |
|         | | Current Value 1,80,000.00                      | |
|         | | P&L           +30,000.00 (+20.00%)             | |
|         | | Day P&L       +1,200.00 (+0.67%)              | |
|         | +-----------------------------------------------+ |
|         |                                                   |
|         | +--Tags------+ +--Notes-----------------------+   |
|         | | [Equity x] | | User-entered notes for this |   |
|         | | [NIFTY x]  | | holding appear here.        |   |
|         | | [+ Add Tag]| |                [Edit Notes]  |   |
|         | +------------+ +-----------------------------+   |
|         |                                                   |
|         | +--Related Transactions---------------------------+ |
|         | | Date       | Type | Qty  | Price  | Amount    | |
|         | | 2026-01-15 | Buy  | 50   | 1,450  | 72,500   | |
|         | | 2025-11-20 | Buy  | 50   | 1,550  | 77,500   | |
|         | | 2025-09-10 | Div  | --   | --     | 1,200    | |
|         | | [+ Add Transaction]                            | |
|         | +------------------------------------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Holding Info Card**:
- Header with symbol name and full company name
- Edit button (pencil icon) to modify holding (for manual holdings only; Zerodha holdings are read-only except tags/notes)
- Delete button (trash icon) with confirmation dialog
- Key metrics displayed in a 2-column grid format
- P&L values colored green/red

**Tags Section**:
- Shows assigned tags as removable badges (click X to remove)
- "+ Add Tag" button opens a popover with tag search/select
- Tag picker shows the tag tree with checkboxes
- Already-assigned tags are pre-checked

**Notes Section**:
- Free-text notes area
- "Edit Notes" toggles an editable textarea
- Save/Cancel buttons appear when editing

**Related Transactions**:
- Table showing all transactions linked to this holding
- Columns: Date, Type, Quantity, Price, Amount
- "+ Add Transaction" opens the transaction form with this holding pre-linked

---

### 3.4 Fixed Deposits (/fixed-deposits)

**Purpose**: View all FDs with calculated current values, maturity status, and CRUD operations.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | FIXED DEPOSITS                                    |
|         |                                                   |
|         | [+ Add FD]                                        |
|         |                                                   |
|         | Filters: [Bank v] [Status v] [Tags v] [Search...] |
|         |                                                   |
|         | +--Summary Cards--------------------------------+ |
|         | | Total Principal | Total Current | Interest    | |
|         | | 10,00,000       | 10,75,432     | 75,432      | |
|         | |                 |               | (+7.54%)    | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | +--FD Table-------------------------------------+ |
|         | | Bank  Ref    Principal  Rate  Start   Maturity | |
|         | | Current Val  Interest   Status        Tags    | |
|         | |------------------------------------------------| |
|         | | SBI   #1234  5,00,000  7.5%  Jan'25  Jan'27   | |
|         | | 5,38,450     38,450    [Active]       [Debt]  | |
|         | |                                                | |
|         | | HDFC  #5678  3,00,000  7.1%  Mar'25  Mar'26   | |
|         | | 3,15,200     15,200    [Maturing]     [Debt]  | |
|         | |                                                | |
|         | | ICICI #9012  2,00,000  6.8%  Jun'24  Jun'25   | |
|         | | 2,14,200     14,200    [Matured]      [Debt]  | |
|         | +------------------------------------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Summary Cards** (top row):
- Three cards in a row:
  - Total Principal: sum of all FD principals
  - Total Current Value: sum of all calculated current values
  - Total Interest Earned: difference, with percentage gain

**FD Data Table**:
- Columns: Bank, Reference, Principal, Interest Rate, Start Date, Maturity Date, Current Value, Interest Earned, Status, Tags
- Status badges:
  - "Active" -- green badge, maturity > 30 days away
  - "Maturing Soon" -- amber badge, maturity within 30 days
  - "Matured" -- red badge (with border highlight if auto_renew is off)
- Sortable by: Principal, Rate, Start Date, Maturity Date, Current Value
- Click row to view FD detail (inline expansion or separate page)

**Add/Edit FD Form** (modal dialog):
```
+--Add Fixed Deposit----------------------------+
|                                                |
| Bank/Institution*    [___________________]     |
| FD Reference         [___________________]     |
| Principal Amount*    [___________________] INR |
| Interest Rate*       [___________] % per annum |
| Compounding*         [Quarterly        v]      |
| Start Date*          [____/____/______]        |
| Maturity Date*       [____/____/______]        |
| Auto-Renewal         [x] Yes                   |
| Notes                [___________________]     |
|                      [___________________]     |
|                                                |
| Calculated Maturity Value: 5,75,000.00         |
|                                                |
|                       [Cancel]   [Save FD]     |
+------------------------------------------------+
```

- Real-time maturity value calculation as user enters values
- Date pickers for start and maturity dates
- Validation: maturity date must be after start date, principal and rate must be positive

**Empty State**:
```
+--------------------------------------------------+
|          No fixed deposits yet                    |
|                                                   |
|   Add your fixed deposits to track their growth   |
|   and see accrued interest in real-time.          |
|                                                   |
|   [+ Add Fixed Deposit]                           |
+--------------------------------------------------+
```

---

### 3.5 Transactions (/transactions)

**Purpose**: View and manage all financial transactions with filtering and summary.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | TRANSACTIONS                                      |
|         |                                                   |
|         | [+ Add Transaction]                                |
|         |                                                   |
|         | +--Transaction Summary---------+                   |
|         | | Total Deposited  15,00,000   |                   |
|         | | Total Withdrawn   2,00,000   |                   |
|         | | Net Invested     13,00,000   |                   |
|         | +------------------------------+                   |
|         |                                                   |
|         | Filters:                                           |
|         | [Date Range: From ___ To ___]                      |
|         | [Type v] [Linked Investment v] [Tags v]            |
|         |                                                   |
|         | +--Transactions Table----------------------------+ |
|         | | Date       | Type       | Amount  | Desc      | |
|         | |            | Investment | Tags    | Actions   | |
|         | |----------------------------------------------| |
|         | | 2026-02-09 | Deposit    | 50,000  | Monthly   | |
|         | |            | --         | --      | [E] [D]   | |
|         | |                                                | |
|         | | 2026-02-05 | Investment | 25,000  | INFY buy  | |
|         | |            | INFY       | [Eq]    | [E] [D]   | |
|         | |                                                | |
|         | | 2026-01-28 | Dividend   | 1,200   | INFY div  | |
|         | |            | INFY       | [Eq]    | [E] [D]   | |
|         | |                                                | |
|         | | 2026-01-15 | Investment | 30,000  | SBI FD    | |
|         | |            | SBI FD     | [Debt]  | [E] [D]   | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | +--Monthly Breakdown-----------------------------+ |
|         | | Month    | Deposits | Withdrawals | Net       | |
|         | | Feb 2026 | 50,000   | 0           | +50,000   | |
|         | | Jan 2026 | 75,000   | 20,000      | +55,000   | |
|         | | Dec 2025 | 50,000   | 0           | +50,000   | |
|         | +------------------------------------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Transaction Summary Card**:
- Three key metrics: Total Deposited, Total Withdrawn, Net Invested
- Updates based on active date range filter

**Filter Bar**:
- Date range picker (from/to) with preset options (This Month, Last 3 Months, This Year, All)
- Type dropdown: All, Deposit, Withdrawal, Investment, Redemption, Dividend, Interest
- Linked Investment dropdown: Search by holding/FD name
- Tags multi-select

**Transactions Data Table**:
- Columns: Date, Type, Amount, Description, Linked Investment, Tags, Actions
- Type shown as a small colored badge:
  - Deposit: green
  - Withdrawal: red
  - Investment: blue
  - Redemption: orange
  - Dividend: teal
  - Interest: teal
- Actions column: Edit (pencil icon), Delete (trash icon)
- Default sort: Date descending (most recent first)

**Monthly Breakdown Table**:
- Collapsible section below the transactions table
- Shows aggregated monthly totals
- Columns: Month, Deposits, Withdrawals, Net

**Add/Edit Transaction Form** (modal dialog):
```
+--Add Transaction------------------------------+
|                                                |
| Date*                [____/____/______]        |
| Type*                [Deposit          v]      |
| Amount*              [___________________] INR |
| Description          [___________________]     |
| Link to Investment   [Search holdings/FDs...]  |
| Tags                 [Select tags...        ]  |
|                                                |
|                       [Cancel]   [Save]        |
+------------------------------------------------+
```

- Date defaults to today
- "Link to Investment" is a searchable dropdown of all holdings and FDs
- Tags is a multi-select tag picker

---

### 3.6 Tags Management (/tags)

**Purpose**: Create, organize, and manage the hierarchical tag system.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | TAGS                                              |
|         |                                                   |
|         | [+ Create Tag]                                     |
|         |                                                   |
|         | +--Tag Tree-----------+ +--Tag Detail-----------+ |
|         | |                     | |                       | |
|         | | v Equity     [60%]  | | Tag: Equity           | |
|         | |   > NIFTY50  [30%]  | | Color: [Blue]         | |
|         | |   > NEXT50   [18%]  | | Parent: (root)        | |
|         | |   > MOM100   [12%]  | | Children: 3           | |
|         | |                     | | Investments: 8        | |
|         | | v Debt       [30%]  | |                       | |
|         | |   > FD       [21%]  | | Investments with tag: | |
|         | |   > Bonds    [ 9%]  | | - INFY (1,80,000)     | |
|         | |                     | | - NIFTYB (1,05,000)   | |
|         | | > Gold       [10%]  | | - RELIANCE (1,30,000) | |
|         | |                     | | ...                   | |
|         | | > Untagged    [5%]  | |                       | |
|         | |                     | | [Edit] [Delete]       | |
|         | +---------------------+ +-----------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Tag Tree** (left panel):
- Tree view with expand/collapse arrows for parent tags
- Each tag shows: name, color dot, allocation percentage (if set)
- Drag-and-drop to reparent tags (stretch goal; MVP uses edit form)
- "Untagged" virtual entry at the bottom showing untagged investment count
- Right-click context menu: Edit, Add Child, Delete
- Selected tag is highlighted

**Tag Detail** (right panel):
- Shows details of the selected tag
- Tag name, color swatch, parent tag, child count
- Number of investments assigned this tag
- List of investments with this tag (name and current value)
- Edit and Delete action buttons

**Create/Edit Tag Form** (modal or inline):
```
+--Create Tag-----------------------------------+
|                                                |
| Tag Name*            [___________________]     |
| Color                [o Blue] [o Green] [o...] |
| Parent Tag           [(none)             v]    |
|                                                |
|                       [Cancel]   [Save Tag]    |
+------------------------------------------------+
```

- Color picker: Row of colored circles to choose from
- Parent Tag: Dropdown showing existing tags in tree format (indented names)
- "(none)" means top-level tag

**Delete Tag Confirmation**:
```
+--Delete Tag "Equity"?--------------------------+
|                                                 |
| This tag has 3 child tags and 8 investments.    |
|                                                 |
| What should happen to child tags?               |
| (o) Delete all children                         |
| ( ) Move children to parent (root level)        |
|                                                 |
| Investments will be untagged from "Equity".     |
|                                                 |
|                     [Cancel]   [Delete]          |
+-------------------------------------------------+
```

**Empty State**:
```
+--------------------------------------------------+
|              No tags created yet                  |
|                                                   |
|   Create tags to categorize your investments.     |
|   Example: Equity, Debt, Gold                     |
|                                                   |
|   [+ Create Your First Tag]                       |
+--------------------------------------------------+
```

---

### 3.7 Allocation Planning (/allocations)

**Purpose**: Set target allocation percentages and compare against actual allocation.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | ALLOCATION PLANNING                               |
|         |                                                   |
|         | +--Planned vs Actual Comparison------------------+ |
|         | |                                                | |
|         | | [====== Stacked Bar: Target ======]            | |
|         | | [======= Stacked Bar: Actual ======]           | |
|         | |                                                | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | +--Allocation Table------------------------------+ |
|         | | Tag       Target% Actual% Drift  Drift(INR)   | |
|         | |                                                | |
|         | | Equity    60.0%   63.2%   +3.2   +4,00,000    | |
|         | |   NIFTY50 30.0%   32.1%   +2.1   +2,63,000   | |
|         | |   NEXT50  18.0%   19.5%   +1.5   +1,87,000   | |
|         | |   MOM100  12.0%   11.6%   -0.4   -50,000     | |
|         | |                                                | |
|         | | Debt      30.0%   27.8%   -2.2   -2,75,000    | |
|         | |   FD      21.0%   20.5%   -0.5   -62,500     | |
|         | |   Bonds    9.0%    7.3%   -1.7   -2,12,500   | |
|         | |                                                | |
|         | | Gold      10.0%    9.0%   -1.0   -1,25,000    | |
|         | |                                                | |
|         | | TOTAL    100.0%  100.0%                        | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | [Edit Targets]                                     |
+-----------------------------------------------------------+
```

**Component Details**:

**Planned vs Actual Bar Chart**:
- Two horizontal stacked bar charts, one above the other
- Top bar: Target allocation (each segment colored by tag color)
- Bottom bar: Actual allocation (same color scheme)
- Visual comparison shows over/under allocation at a glance
- Legend below showing tag colors and names

**Allocation Table**:
- Hierarchical table mirroring the tag tree
- Columns: Tag, Target %, Actual %, Drift (%), Drift (INR)
- Child tags indented under parents
- Drift column: positive drift (over-allocated) in blue, negative drift (under-allocated) in orange
- Drift exceeding threshold (e.g., +/- 5pp) highlighted with a background color or bold text
- Total row at the bottom showing the sums

**Edit Targets Form** (modal or dedicated view):
```
+--Edit Allocation Targets-----------------------+
|                                                 |
| Set target allocation for each tag:             |
|                                                 |
| Tag              Target %    Slider             |
| Equity           [  60  ]    [======----]       |
|   NIFTY50        [  50  ]*   [=====-----]       |
|   NEXT50         [  30  ]*   [===-------]       |
|   MOM100         [  20  ]*   [==--------]       |
| Debt             [  30  ]    [===-------]       |
|   FD             [  70  ]*   [=======---]       |
|   Bonds          [  30  ]*   [===-------]       |
| Gold             [  10  ]    [=---------]       |
|                                                 |
| Total:           100.0%  [OK]                   |
| * Child % is relative to parent                 |
|                                                 |
| [!] Total must equal 100%                       |
|                                                 |
|                     [Cancel]   [Save Targets]   |
+-------------------------------------------------+
```

- Each tag has a numeric input and a slider (range input)
- Top-level tags: percentage of total portfolio (must sum to 100%)
- Child tags: percentage of parent allocation (must sum to 100% of parent)
- Real-time validation: shows error if sums do not equal 100%
- Visual indicator (green checkmark) when sums are valid

**Empty State** (no allocation targets set):
```
+--------------------------------------------------+
|          No allocation targets set                |
|                                                   |
|   Define your ideal asset allocation to track     |
|   how your portfolio compares to your plan.       |
|                                                   |
|   [Set Target Allocation]                         |
+--------------------------------------------------+
```

---

### 3.8 Rebalancing (/rebalancing)

**Purpose**: View allocation drift, create rebalancing operations, and track rebalance history.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | REBALANCING                                       |
|         |                                                   |
|         | +--Current Drift Summary------------------------+ |
|         | | Total Portfolio: 12,45,678                     | |
|         | |                                                | |
|         | | Over-Allocated:                                | |
|         | | Equity  +3.2pp  (+4,00,000)  [Reduce ->]      | |
|         | |                                                | |
|         | | Under-Allocated:                               | |
|         | | Debt    -2.2pp  (-2,75,000)  [Increase ->]    | |
|         | | Gold    -1.0pp  (-1,25,000)  [Increase ->]    | |
|         | |                                                | |
|         | | [Create Rebalancing Operation]                 | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | +--Rebalancing History--------------------------+ |
|         | | Date       | Name             | Sells | Buys | |
|         | | 2026-01-15 | Q1 2026 Rebalance| 2     | 3    | |
|         | | 2025-10-10 | Oct Adjustment   | 1     | 2    | |
|         | | [Click row to view details]                    | |
|         | +------------------------------------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Current Drift Summary**:
- Shows total portfolio value
- Splits tags into "Over-Allocated" and "Under-Allocated" groups
- Each entry shows: tag name, drift in percentage points, drift in INR
- Quick action links to navigate to relevant holdings

**Create Rebalancing Operation** (full-page or large modal):
```
+--Create Rebalancing Operation------------------+
|                                                 |
| Name*         [Q1 2026 Rebalance           ]   |
| Date*         [____/____/______]               |
| Notes         [___________________________]    |
|                                                 |
| Moves:                                         |
| +--Move 1----------------------------------+   |
| | Action: [Sell v]                          |   |
| | Investment: [Search... INFY v]            |   |
| | Amount:  [50,000] INR                     |   |
| | [Remove Move]                             |   |
| +-------------------------------------------+  |
|                                                 |
| +--Move 2----------------------------------+   |
| | Action: [Buy v]                           |   |
| | Investment: [Search... SGB2024 v]         |   |
| | Amount:  [50,000] INR                     |   |
| | [Remove Move]                             |   |
| +-------------------------------------------+  |
|                                                 |
| [+ Add Move]                                    |
|                                                 |
| Summary:                                        |
| Total Sells: 50,000                             |
| Total Buys:  50,000                             |
| Net:         0                                  |
|                                                 |
|                  [Cancel]   [Execute Rebalance]  |
+-------------------------------------------------+
```

- Each "move" has: action (Sell/Buy), investment selector, amount
- Summary at bottom shows total sells, total buys, and net
- Executing creates the corresponding transaction records automatically

**Rebalancing History Table**:
- Columns: Date, Name, Number of Sells, Number of Buys, Total Sell Value, Total Buy Value
- Click row to expand and see detailed moves
- Sort by date descending

**Empty State**:
```
+--------------------------------------------------+
|          No rebalancing operations yet            |
|                                                   |
|   When your portfolio drifts from your target     |
|   allocation, create a rebalancing operation      |
|   to record the adjustments.                      |
|                                                   |
|   [View Allocation Drift]                         |
+--------------------------------------------------+
```

---

### 3.9 Settings (/settings)

**Purpose**: Configure Zerodha API connection and app preferences.

**Layout**:
```
+-----------------------------------------------------------+
| SIDEBAR | SETTINGS                                          |
|         |                                                   |
|         | +--Zerodha Connection---------------------------+ |
|         | | Status: [Connected / Disconnected]             | |
|         | | Last Synced: 2026-02-10 14:30                  | |
|         | |                                                | |
|         | | API Key        [*********************]  [Show] | |
|         | | API Secret     [*********************]  [Show] | |
|         | |                                                | |
|         | | [Save Credentials]                             | |
|         | |                                                | |
|         | | Access Token Status: [Valid / Expired]         | |
|         | | [Authenticate with Zerodha]                    | |
|         | |                                                | |
|         | | [Disconnect Zerodha] (removes all credentials) | |
|         | +------------------------------------------------+ |
|         |                                                   |
|         | +--Data Management------------------------------+ |
|         | | [Take Portfolio Snapshot Now]                   | |
|         | | Last Snapshot: 2026-02-10                       | |
|         | +------------------------------------------------+ |
+-----------------------------------------------------------+
```

**Component Details**:

**Zerodha Connection Card**:
- Connection status indicator: green dot + "Connected" or red dot + "Disconnected"
- API Key and Secret fields: masked by default, with a "Show" toggle button
- "Save Credentials" saves/updates the API key and secret
- "Authenticate with Zerodha" initiates the Kite Connect OAuth flow (redirects to Zerodha login)
- Access Token Status: shows whether the current access token is valid or expired
- "Disconnect Zerodha" removes all credentials (with confirmation dialog)

**Data Management Card**:
- "Take Portfolio Snapshot Now" triggers a manual snapshot creation
- Shows the date of the last snapshot

---

## 4. Reusable Component Specifications

### 4.1 DataTable Component

A reusable, configurable data table used across Holdings, FDs, Transactions, and Rebalancing history.

**Props/Configuration**:
- `columns`: Array of column definitions (key, label, sortable, formatter, width)
- `data`: Array of row objects
- `groupBy`: Optional field to group rows under headers
- `selectable`: Boolean, shows checkboxes for bulk selection
- `onRowClick`: Handler for row click navigation
- `pagination`: Object with pageSize, currentPage, total
- `emptyState`: Component to render when no data
- `loading`: Boolean, shows skeleton rows

**Features**:
- Column sorting (click header, toggle asc/desc, indicator arrow)
- Column resizing (stretch goal for MVP)
- Row hover highlight
- Grouped rows with collapsible group headers
- Skeleton loading state (animated placeholder rows)
- Responsive: horizontal scroll on narrow viewports with sticky first column

**shadcn/ui Components Used**: `Table`, `TableHeader`, `TableRow`, `TableCell`, `Checkbox`, `Button`, `Skeleton`

### 4.2 Form Patterns

**Modal Dialog** (for create/edit operations):
- Used for: Add Holding, Add FD, Add Transaction, Create Tag, Edit Tag
- shadcn/ui `Dialog` component
- Title bar with close button (X)
- Form fields stacked vertically
- Footer with Cancel and Submit buttons (right-aligned)
- Submit button shows loading spinner during save
- Form validation: inline error messages below each field
- Required fields marked with asterisk (*)

**Form Validation Rules**:
- Required fields: red border and error text on blur if empty
- Numeric fields: must be positive, formatted with commas on blur
- Date fields: date picker component, validated for logical constraints
- Percentage fields: must be 0-100, shown with % suffix

**Confirmation Dialog** (for destructive actions):
- Used for: Delete holding, Delete FD, Delete transaction, Delete tag, Disconnect Zerodha
- shadcn/ui `AlertDialog` component
- Warning icon, bold title, descriptive message explaining consequences
- Cancel and Confirm (red) buttons
- Confirm button text matches the action: "Delete", "Disconnect", "Remove"

### 4.3 Chart Components

**Donut/Pie Chart** (Allocation Breakdown):
- Library: Recharts `PieChart` with `Pie` and `Cell`
- Inner radius for donut effect
- Legend positioned below the chart
- Tooltip showing tag name, value, and percentage on hover
- Segment colors match tag colors
- Center text showing total portfolio value

**Line Chart** (Portfolio Growth):
- Library: Recharts `LineChart` with `Line`, `XAxis`, `YAxis`, `Tooltip`
- Single line for total portfolio value
- X-axis: date labels (auto-scaled based on time range)
- Y-axis: INR values, formatted in lakhs/crores
- Tooltip: date + exact value on hover
- Time range selector (1M, 3M, 6M, 1Y, All) as pill buttons above chart
- Responsive, fills container width

**Stacked Bar Chart** (Allocation Comparison):
- Library: Recharts `BarChart` with `Bar` and `Cell`
- Two bars: Target and Actual, stacked horizontally
- Each segment colored by tag color
- Legend below
- Tooltip showing tag, target %, actual %, drift

### 4.4 Tag Badge Component

A small, colored pill that displays a tag name.

```
Appearance: [  Equity  ]
             ^-bg color-^
```

**Props**:
- `name`: Tag name text
- `color`: Background color (from tag's color field)
- `removable`: Boolean, shows X button for removal
- `onClick`: Optional click handler (for filtering)
- `size`: "sm" (in table rows) or "md" (in detail views)

**Styling**:
- Rounded-full (pill shape)
- Background: tag color at 15% opacity
- Text: tag color at full opacity
- Font size: 12px (sm) or 14px (md)
- Padding: 2px 8px (sm) or 4px 12px (md)
- If removable: X icon on the right with hover state

**shadcn/ui Components Used**: `Badge` (customized)

### 4.5 Allocation Slider/Input Component

A combined slider + numeric input for setting allocation percentages.

```
[Equity    ] [  60  ]% [===========-------]
              ^input^   ^---- slider -----^
```

**Props**:
- `label`: Tag name
- `value`: Current percentage
- `onChange`: Value change handler
- `min`: 0
- `max`: 100
- `step`: 0.5

**Behavior**:
- Slider and input are synchronized (changing one updates the other)
- Input accepts numeric entry with up to 1 decimal place
- Slider provides visual feedback for quick adjustment
- Color matches the associated tag color

**shadcn/ui Components Used**: `Slider`, `Input`, `Label`

### 4.6 Currency Display Component

Formats and displays monetary values consistently.

**Props**:
- `value`: Number
- `showSign`: Boolean, prefix with +/- for gains/losses
- `colored`: Boolean, green for positive, red for negative

**Formatting Rules**:
- Indian numbering system: 1,00,000 (one lakh), 1,00,00,000 (one crore)
- Always show 2 decimal places for amounts
- Prefix with INR symbol or use "INR" suffix based on context
- Monospace font for alignment in tables

### 4.7 Status Badge Component

Colored badge for status indicators across the app.

**Variants**:
- `active` / `connected`: Green background, green text
- `warning` / `maturing`: Amber background, amber text
- `error` / `matured` / `expired` / `disconnected`: Red background, red text
- `info` / `pending`: Blue background, blue text
- `neutral` / `manual`: Gray background, gray text

**shadcn/ui Components Used**: `Badge` with variant prop

---

## 5. Interaction Patterns

### 5.1 Loading States

- **Page load**: Full-page skeleton with shimmer animation (matching the layout structure)
- **Table load**: Skeleton rows (5 rows of gray placeholder blocks)
- **Button action**: Spinner icon replaces button text, button disabled
- **Sync/Refresh**: Toast notification "Syncing..." with spinner, replaced by success/error toast

### 5.2 Toast Notifications

Using shadcn/ui `Toast` component (bottom-right position).

- **Success**: Green accent, checkmark icon. "Holdings synced successfully", "FD created", etc.
- **Error**: Red accent, X icon. "Failed to sync: token expired", "Validation error", etc.
- **Info**: Blue accent, info icon. "Snapshot saved", etc.
- Auto-dismiss after 5 seconds, with manual close button.

### 5.3 Error Handling

- **API errors**: Display error toast with message. For Zerodha auth errors, show inline banner with re-auth link.
- **Form validation**: Inline error messages below each invalid field, highlighted with red border.
- **Network errors**: Show a banner at the top of the page: "Unable to connect to server. Please check your connection."

### 5.4 Responsive Behavior

- **Desktop** (>= 1024px): Full sidebar, multi-column layouts
- **Tablet** (768px - 1023px): Collapsible sidebar (hamburger menu), single-column with cards stacking vertically
- Minimum supported width: 768px (tablet landscape)

---

## 6. Page Flow Summary

```
Dashboard (/)
   |
   +-- Holdings (/holdings)
   |      +-- Holding Detail (/holdings/:id)
   |
   +-- Fixed Deposits (/fixed-deposits)
   |      +-- FD Detail (/fixed-deposits/:id)
   |
   +-- Transactions (/transactions)
   |
   +-- Tags (/tags)
   |
   +-- Allocation Planning (/allocations)
   |
   +-- Rebalancing (/rebalancing)
   |
   +-- Settings (/settings)
```

All pages are accessible from the sidebar. Detail pages are accessible by clicking a row in the parent list page. Breadcrumbs provide back-navigation context.

---

## 7. Accessibility Considerations

- All interactive elements are keyboard-navigable (Tab, Enter, Escape)
- Form fields have associated labels (not just placeholder text)
- Color is never the sole indicator of meaning (always paired with text/icon)
- Charts have alt-text or tabular data equivalents
- Focus management: dialogs trap focus; closing returns focus to trigger element
- ARIA labels on icon-only buttons (e.g., edit, delete)
- Minimum contrast ratio of 4.5:1 for all text

---

## 8. INR Formatting Convention

Throughout the application, all monetary values follow the Indian numbering system:

| Value | Display |
|-------|---------|
| 1000 | 1,000 |
| 100000 | 1,00,000 |
| 1000000 | 10,00,000 |
| 10000000 | 1,00,00,000 |

Large values in charts may use abbreviated forms: "1.2L" (lakhs), "1.5Cr" (crores).
