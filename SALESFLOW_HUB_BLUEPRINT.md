# SALESFLOW HUB
## Complete CRM Functional & Role-Based Blueprint
### Super Admin → Company Owner → Sales Head → Team Leader → Sales Executive

---

## 1. Overall CRM Flow
```
SUPER ADMIN
     ↓
COMPANIES / USERS / PLANS / LICENSES / BILLING / SUPPORT
     ↓
COMPANY OWNER
     ↓
SALES HEAD / TEAM LEADER
     ↓
SALES EXECUTIVE
     ↓
LEAD → ASSIGNMENT → FOLLOW-UP → CALL / MEETING → DEMO
     ↓
PROPOSAL → NEGOTIATION → PAYMENT FOLLOW-UP
     ↓
WON / LOST
     ↓
PAYMENT / CUSTOMER / RENEWAL
```
A CRM should manage the complete sales journey, not only display a lead list.

---

## 2. Authentication, Company and Tenant Scope
* After login, the CRM must know the authenticated user's User ID, Name, Email, Role and Company/Tenant ID.
* Users can access only the company/tenant data allowed by their role.
* Company A users must never see Company B business data.
* Tenant scoping must be enforced by the backend/API and database rules, not only by hiding frontend elements.
* Browser Local Storage/sessionStorage must not be the source of truth for CRM business data.
* Supabase/API should remain authoritative for persistent business records.

---

## 3. Role Structure
| Role | Primary Responsibility |
|---|---|
| **Super Admin** | Operate and administer the SalesFlow HUB platform. |
| **Company Owner** | Complete control over the company's CRM, users, sales and settings. |
| **Sales Head** | Sales performance, pipeline, forecasting, targets and team management. |
| **Team Leader** | Manage a specific sales team, assignments, follow-ups and scorecards. |
| **Sales Executive** | Work assigned leads, activities, follow-ups, meetings and payments. |

---

## 4. SUPER ADMIN
Super Admin manages the platform rather than acting as a normal company salesperson.

### 4.1 Sidebar
1. Command Center
2. Companies
3. Users
4. Subscriptions
5. Plans
6. Deal Packages
7. Client Licenses
8. Lead Management
9. Support Tickets
10. Reports & Analytics
11. CRM Overview
12. Billing
13. Notifications
14. Audit Logs
15. Integrations
16. System Settings

### 4.2 Command Center
* **KPIs:** Total Companies, Active Companies, Trial Companies, Expired Companies, Total Users, Active Users, Total Leads, Total Revenue.
* **Date filters:** Today, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Range.
* **Charts:** company growth, user growth, lead growth, revenue and subscriptions.
* **View Details** opens the relevant detail/analytics view.
* **Refresh** fetches fresh backend/database data.
* Values must be real calculated data, not hardcoded numbers.

### 4.3 Companies
* **Table:** Company, Owner, Users, Plan, Status, Trial Ends, Subscription, Created, Actions.
* **View:** company details, users, leads, subscription, payments, activity and audit.
* **Edit:** updates company information.
* **Suspend:** blocks company access after confirmation.
* **Activate:** restores access.
* **Delete:** is a controlled destructive action with confirmation and audit logging.
* Optional impersonation must be tightly controlled and audited.

### 4.4 Users
* **Table:** Name, Email, Company, Role, Status, Last Login, Created, Actions.
* **Add User:** Name, Email, Phone, Company, Role, Status.
* **Edit User:** updates permitted profile/role/status fields.
* **Disable:** prevents login.
* **Reset Password:** triggers password reset.
* **View User:** shows profile, company, role, activity and login history.

### 4.5 Plans, Subscriptions, Deal Packages and Client Licenses
* **Plans:** define price, duration, user/lead limits and features.
* **Subscriptions:** track company, plan, dates, amount and status.
* **Subscription statuses:** Trial, Active, Expired, Suspended, Cancelled.
* **Actions:** Activate, Extend, Change Plan and View History.
* **Deal Packages:** define package, features, price, duration and status.
* **Client Licenses:** track company, allowed users, start, expiry and status.

### 4.6 Lead Management
* Platform-wide monitoring can be filtered by company, owner, sales executive, stage, source and date.
* Super Admin should normally monitor/administer rather than alter normal sales activity unless explicitly permitted.

### 4.7 Support Tickets
* **Fields:** Ticket ID, Company, Subject, Priority, Status, Created, Assigned.
* **Statuses:** Open, In Progress, Waiting, Resolved, Closed.
* **Details:** conversation, attachments, internal notes, status, priority and assignee.
* **Actions:** Reply, Assign, Resolve and Reopen.

### 4.8 Reports, CRM Overview and Billing
* **Reports:** company growth, user growth, lead growth, revenue, subscriptions, trial conversion and churn.
* **CRM Overview:** platform-wide leads, won, lost, open pipeline, follow-ups, payments and activities.
* **Billing:** invoices, company, amount, tax, date, status; actions such as View, Download and Mark Paid must use real records. Unique collision-safe Invoice IDs.

### 4.9 Notifications, Audit Logs, Integrations and Settings
* **Notifications:** All, Unread and Read; clicking should open the relevant record.
* **Audit Logs:** date, user, company, module and action filters.
* **Audit actions:** Created, Updated, Deleted, Login, Logout, Role Changed and Subscription Changed.
* **Integrations:** Email, WhatsApp, Payment Gateway, Webhooks, Analytics and Support; show connection/test states.
* **System Settings:** General, Email, Notifications, Security, Roles, Lead Stages, Currency and System Preferences.

---

## 5. COMPANY OWNER
### Sidebar:
* Command Center
* AI Insights
* Leads
  * All Leads
  * Pipeline 360
  * Active Deals
  * Visual Pipeline
  * Unassigned Queue
* Follow-ups & Tasks
* Meetings & Schedule
* Analytics & Reports
* Team & RBAC
  * Team Members
  * Scorecard
  * Lead Assignment
* Payments
* Notifications
* Settings

* **Command Center:** pipeline, won revenue, win rate, targets, follow-ups, overdue items, hot deals, expected revenue, ready-to-close deals and renewals.
* **All Leads:** full company lead list with search, filters, assignment, stage, value, priority and activity.
* **Pipeline 360 & Visual Pipeline:** stage changes must persist through API/database.
* **Unassigned Queue:** leads without an owner.
* **Team Members:** employees, roles, teams, targets and status.
* **Scorecard:** target, achievement, won, lost, conversion and activities.
* **Lead Assignment:** individual or bulk assignment.
* **Payments:** company payment records and pending payments.
* **Settings:** company-level configuration.

---

## 6. SALES HEAD
* Command Center
* AI Insights
* Leads (All Leads, Pipeline 360, Active Deals, Visual Pipeline)
* Follow-ups & Tasks
* Meetings & Schedule
* Analytics & Reports
* Team Performance
* Lead Assignment
* Payments
* Notifications
* **Dashboard:** team pipeline, revenue, win rate, target achievement, forecast and overdue follow-ups.
* **Team Performance:** calls, meetings, follow-ups, demos, proposals, won, revenue and target achievement.
* **Lead Assignment:** manual or controlled bulk assignment.

---

## 7. TEAM LEADER
* Command Center
* My Team
* Team Leads
* Pipeline
* Follow-ups & Tasks
* Meetings
* Scorecard
* Lead Assignment
* Notifications
* Scope is limited to the Team Leader's permitted team.
* **My Team:** team members, lead counts, won deals and revenue.
* **Team Leads:** filter by member, stage, priority and overdue status.
* **Scorecard:** calls, meetings, follow-ups, demos, proposals, won and revenue.
* **Lead Reassignment:** move a lead between permitted team members with recorded reason and full audit logging.

---

## 8. SALES EXECUTIVE
* Command Center
* My Leads
* Pipeline
* Follow-ups & Tasks
* Meetings & Schedule
* Payments
* Notifications
* Profile
* Strictly assigned/permitted leads visible.
* **Lead actions:** View, Call, Add Note, Follow-up, Update Stage and Record Payment.
* **Delete Lead:** NOT available unless explicitly granted.
* **Follow-ups:** Today, Upcoming, Overdue, Completed.
* **Meetings:** Today, Week, Month.
* **Payments:** permitted payment history and pending amounts.

---

## 9. Lead Lifecycle
```
New
  ↓
Contacted
  ↓
Qualified
  ↓
Demo Scheduled
  ↓
Demo Done
  ↓
Proposal Sent
  ↓
Negotiation
  ↓
Payment Follow-up
  ↓
Full Payment Received
  ↓
Won
Alternative exits: Lost / Junk
```
* **Stage changes must persist through API/database.**
* **Lost Reasons:** Price, Competitor, No Requirement, Not Responding, Timing, Other.
* **Junk Reasons:** Spam, Duplicate, Wrong Number, Test Lead, Irrelevant. Excluded from normal pipeline revenue.

---

## 10. Lead Details Workspace
* **Basic:** company/contact name, phone, email, city, source and assigned user.
* **Sales:** stage, deal value, probability, expected closing date and priority.
* **Activity:** calls, notes, emails, meetings and follow-ups.
* **Payments:** amount, date, mode, reference and recorded by.
* **Timeline:** chronological record of important changes and activities.

---

## 11. Follow-ups, Tasks and Meetings
* **Follow-up:** lead, assigned user, date, time, type, notes and status.
* Due follow-ups appear in Today's Follow-ups.
* Past incomplete follow-ups become Overdue.
* **Tasks:** Call Customer, Send Quotation, Send Proposal, Collect Payment.
* **Meetings:** customer, date, time, type, participants/notes and outcome.

---

## 12. Payments
* **Payment record:** Payment ID, Lead ID, Amount, Date, Time, Payment Method, Reference and Recorded By.
* Payment recording updates outstanding/collected figures without corrupting lead stage.
* Payment amount and lead stage are separate business fields.

---

## 13. Dashboard Rules
* Dashboard KPIs must be calculated from real records.
* Total Pipeline = sum of eligible open deal values.
* Win Rate = eligible Won / eligible Closed Leads × 100.
* Overdue Follow-ups = follow-up date before today and not completed.

---

## 14. Notifications & AI Insights
* Triggers: new lead assignment, follow-up due, overdue follow-up, payment received, lead reassignment, meeting reminder, target achievement, won deal, ticket update, subscription event.
* Clicking opens the relevant record.

---

## 15. Duplicate Leads & Merge
* Detect possible duplicates using phone, email, and company.
* Offer View Existing, Create Anyway, or Merge.
* Merge must preserve activities, payments, and history.

---

## 16. Audit Trail
* Important mutations create audit entries: stage changes, assignments, deal value changes, payments, roles, subscriptions, settings.
* Includes actor, company, module, action, affected record, timestamp, before/after.

---

## 17. Production Data Architecture
* React Frontend → Vercel API / Backend → Supabase PostgreSQL.
* React state is temporary UI state.
* Do not persist CRM business data in localStorage, sessionStorage, or IndexedDB.
* Authoritative server/database truth.

---

## 18. Role & Permission Matrix
| Feature | Super Admin | Owner | Sales Head | Team Leader | Sales Executive |
|---|---|---|---|---|---|
| Platform Companies | Yes | No | No | No | No |
| Platform Users | Yes | No | No | No | No |
| Subscription | Yes | Company scope | No | No | No |
| All Company Leads | Platform scope | Yes | Yes | Team scope | Own/assigned |
| Create Lead | Admin policy | Yes | Yes | Yes | Yes |
| Assign Leads | Admin policy | Yes | Yes | Yes | No |
| Delete Lead | Admin policy | Policy | Policy | Policy | No by default |
| Team Members | Platform | Company | Management | Team | No |
| Targets | Platform | Company | Team | Team | Own |
| Reports | Platform | Company | Team/company | Team | Own/limited |
| Payments | Platform | Company | Team/company | Policy | Own/assigned |
| Audit Logs | Platform | Company | Permitted scope | Permitted scope | Limited |

---

## 19. Universal Button Behavior
* **View:** opens the correct record/detail view.
* **Edit:** opens form with current database values.
* **Save:** validates, sends API request, persists to database, then refreshes UI.
* **Cancel:** closes without modifying data.
* **Delete:** requires confirmation and permission; audited.
* **Assign:** validates target user/team and persists new owner.
* **Stage Change:** validates permitted transition, persists stage and creates activity/audit record.
* **Refresh:** retrieves current server data; never restores stale browser data.
* **Export:** exports only data current user is allowed to access.

---

## 20. Critical Data-Persistence Rule
* A UI/theme/font change must NEVER revert business data.
* Stage changes (e.g. Payment Follow-up → Won) must survive browser refresh, logout/login, backend restart, and frontend rebuild.

---

## 21. CRITICAL BUSINESS RULE — PAYMENT & WON (FULL PAYMENT ONLY)
* **Partial payment is NOT supported as a condition for Won.** The CRM will not mark a lead/deal Won when only part of the deal value has been received.
* A lead/deal remains in **Payment Follow-up** while payment is pending.
* The lead/deal can move to **Won** only after the required full payment has been received and recorded.
* Payment Follow-up is used to track promised/expected payment activity. A promise to pay is not a Payment record.
* A Payment record is created only when money has actually been received.
  * **Required fields:** Payment ID, Lead ID, Amount, Payment Date, Payment Time, Payment Method, Reference and Recorded By.
* The system must validate the total valid recorded payment amount against the deal value before allowing the Won transition.
* If the recorded payment total is less than the deal value, the Mark Won action must be blocked with a clear validation message:
  > **'Full payment is required before this lead can be marked Won.'**
* When full payment is recorded, the system allows Mark Won. The Won action must persist stage change, Won/Closed date, activity/timeline entry, and audit log.
* Simple payment status: Pending or Paid in full.

---

## 22. UI/UX Design System Specification
* **Global Font:** Inter applied globally (Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif).
* **Type Scale:** 12px (metadata), 13px (dense), 14px (body), 16px (section heading), 20px (page heading), 24px (dashboard KPI), 28px (primary title).
* **Spacing Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48px tokens.
* **Layout:** Dark glassmorphism styling, orange/blue visual accents.
* **Buttons:** 40px primary target height (32-36px compact).
* **Inputs:** 32-36px height.
* **Icons:** Strictly Lucide React. No emoji icons or fake unicode buttons in product chrome.
* **Responsive Widths:** 1440px, 1366px, 1024px, 768px, 390px, 320px.
* **Loading/Empty/Error:** Skeletons, useful empty states, clear in-app alerts.

---

## 23. Complete Lead Creation & Duplicate Workflow
* **Add Lead Form:** Company/Name, Contact Person, Phone (format validation), Email, City, Source, Requirement, Product, Deal Value, Probability, Expected Close Date, Priority, Owner.
* **Duplicate Dialog:** Triggered on phone/email/company match.
  * Actions: View Existing, Create Anyway, Merge (preserves activities and payments).

---

## 24. Activity System
* **Log Call:** Call Date/Time, Call Type (Incoming/Outgoing), Outcome (Connected, No Answer, Busy, Callback Requested, Interested, Not Interested, Qualified, Other), Duration, Notes, Next Follow-up.
* **Add Note:** Note text, Category, Author, Immutable Timestamp.
* **Email / WhatsApp:** Send interface with lead contact, logs delivery event.

---

## 25. Qualification Workflow
* Qualification fields: Requirement, Product/Service, Budget/Deal Value, Purchase Timeline, Decision Maker, Need/Use Case, Competitor, Probability, Expected Close Date, Notes.
* Validates required qualification info before moving Contacted → Qualified.

---

## 26. Quotation / Proposal & Negotiation
* Products/services, quantity, price, discount, tax, total, validity.
* Proposal Sent stage transition upon successful proposal creation/send.
* Negotiation: deal value change audit trail with before/after comparison.

---

## 27. Lost & Junk Workflows
* **Mark Lost:** Mandatory reason: `Price`, `Competitor`, `No Requirement`, `Not Responding`, `Timing`, `Other`. Notes and actual lost date. Open follow-ups cancelled cleanly.
* **Mark Junk:** Mandatory reason: `Spam`, `Duplicate`, `Wrong Number`, `Test Lead`, `Irrelevant`. Excluded from pipeline revenue.

---

## 28. Customer Conversion & Renewal Workflows
* When lead becomes Won: automatic conversion/link to Customer profile.
* Customer profile retains deal history, activities, payments, and documents.
* Renewal engine: renewal date tracking, upcoming renewal dashboard alerts, automatic renewal tasks.

---

## 29. Developer Acceptance Scenarios
1. Create lead → refresh → lead exists with correct owner/stage.
2. Duplicate phone entered → duplicate modal appears.
3. Deal value ₹50,000 → attempt Mark Won with ₹0 paid → BLOCKED: 'Full payment is required before this lead can be marked Won.'
4. Record ₹20,000 partial payment → lead remains Payment Follow-up; Mark Won still BLOCKED.
5. Record remaining ₹30,000 (total ₹50,000 paid) → Mark Won unlocked.
6. Mark Won confirmed → stage Won, Won Date saved, timeline entry, audit entry, revenue update.
7. Mark Won converts lead to Customer profile.
8. Renewal task generated before renewal date.
9. Mark Lost requires reason; open follow-ups closed.
10. Mark Junk requires reason; excluded from pipeline.
11. Refresh, logout/login, server restart, frontend rebuild → business records intact.
12. Zero localStorage usage for business data.
