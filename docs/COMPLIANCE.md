# Labour, tax and worker protection

**This is our reading of the law, not legal advice.** We checked each point against the Act or an official source on 25 October 2026, and we'll have it reviewed by a labour lawyer before the pilot. Where the law and this page disagree, the law wins and this page is wrong.

The short version: calling it a "tryout" doesn't change anything in law. A tryout is a day of paid work, so the business is the young person's employer for that day, with every duty that brings. First Shift designs the product so those duties are met, or so the work stays in the narrow space where the law itself says they don't apply.

## Who is the employer

| Party | Role on a tryout day |
| --- | --- |
| The business | **The employer.** It agrees the work, supervises it on its own premises, and pays the young person directly |
| The young person | **The employee**, for that day |
| First Shift | **Neither.** It connects the two, records what happened (check-in, check-out, the amount, the payment confirmation, the reference) and never holds or moves wages |

**First Shift is not a labour broker.** The Labour Relations Act defines a temporary employment service as a person who, for reward, procures for or provides to a client other persons who perform work for the client and **are remunerated by the temporary employment service** ([LRA section 198](https://www.acts.co.za/labour/198__temporary_employment_services)). First Shift never pays the young person: the business pays them directly, by FNB eWallet, PayShap, a cash-send from its own bank, or cash (`docs/MONEY.md`). What a business pays First Shift is a tryout credit, a fee for the service of finding and recording, not wages. If we ever paid wages on a business's behalf, this would change, and we'd have to meet section 198 in full.

## Minimum wage: every hour, enforced in code

The national minimum wage is **R30.23 for each ordinary hour worked** from 1 March 2026 (Government Gazette No. 54075, 3 February 2026; reported by [Acts Online](https://acts.co.za/news/blog/2026/02/national-minimum-wage-adjustments-2026) and [Business Report](https://businessreport.co.za/economy/2026-02-04-south-africas-national-minimum-wage-to-rise-to-r3023-an-hour-from-march/)). There's no exception for a trial, a first day or a "tryout".

In code:

- A tryout can't be posted below R30.23 an hour (`RULES.minimumWageCentsPerHour`, `pay.ts`, checked again on the server at posting).
- Every hour is paid, with at least 4 hours paid even if less is worked (`RULES.minPaidHours`). The pay rules at check-out never go below the hours worked at the agreed rate (`docs/RULES.md`, Pay).
- The AI can't change any of this: a request to pay R5 an hour is in our AI evaluation set, and the floor is enforced in code whatever the model says (`SECURITY.md`).

When the rate changes each March, `RULES.minimumWageCentsPerHour` changes with it.

## UIF and the BCEA: the 24-hour line

"Casual" isn't a legal category in South African labour law. What matters is **hours a month with the same employer**:

| Law | Under 24 hours a month with one employer | 24 hours a month or more |
| --- | --- | --- |
| Unemployment Insurance Act | Doesn't apply: "This Act applies to all employers and employees, other than employees employed for less than 24 hours a month with a particular employer" ([UIA section 3(1)](https://source.acts.co.za/unemployment-insurance-act-2001/3__application_of_this_act.php); the same in the [Contributions Act, section 4(1)(a)](https://source.acts.co.za/unemployment-insurance-contributions-act-2002/4__application_of_act.php)) | Applies in full: the employer registers and contributes 1% plus 1% |
| BCEA, Chapter Two (working time) | Doesn't apply, except section 7, the duty to arrange working time with regard to health and safety ([BCEA section 6(1)](https://source.acts.co.za/basic-conditions-of-employment-act-1997/bcoe97_6__application_of_this_chapter.php)) | Applies in full |
| BCEA, Chapter Three (leave) | Doesn't apply ([BCEA section 19(1)](https://source.acts.co.za/basic-conditions-of-employment-act-1997/bcoe97_19__application_of_this_chapter.php)) | Applies in full |
| The rest of the BCEA, the minimum wage, COIDA, the LRA, the Employment Equity Act | Apply from the first hour | Apply |

So a tryout of up to 8 hours sits under the line. Two or three with the same business in a month could cross it, and at that point it's regular employment, with UIF and leave, whatever anyone calls it.

**Our rule** (`src/domain/regularEmployment.ts`, `RULES.regularEmploymentHoursPerMonth`): a booking that would bring the same business and young person to **24 hours or more in one calendar month (South African time)** is refused, with:

> Another tryout would make this regular employment, which brings UIF and leave rules. Offer them a job instead?

Booked and completed tryouts count; cancelled ones don't. It's wired in when booking is built (`docs/PHASES.md`, H). The point isn't to dodge UIF: it's that a business that wants someone that often should hire them properly, and First Shift's job is to get them there.

## COIDA: injury cover from the first hour

The Compensation for Occupational Injuries and Diseases Act defines an employee to include "a casual employee employed for the purpose of the employer's business" ([COIDA section 1, definitions](https://vula.uct.ac.za/access/content/group/9c29ba04-b1ee-49b9-8c85-9a468b556ce2/DOh/Variety/Legislation/COIDA-GRD/COIDA-1.htm)), and an employer carrying on business must register with the Compensation Fund ([COIDA section 80](https://vula.uct.ac.za/access/content/group/9c29ba04-b1ee-49b9-8c85-9a468b556ce2/DOh/Variety/Legislation/COIDA-GRD/COIDA-9.htm)). There's no hours threshold. A young person hurt during a tryout is covered by the business's registration, because **the business is the employer on the tryout day**.

**Our rule** (`src/domain/injuryCover.ts`): business onboarding asks "Are you registered with the Compensation Fund (COIDA)?", with "It covers anyone injured while working for you, a tryout included. Every employer must register." The answers are "Yes, we're registered", "No, not registered" and "I'm not sure". Every tryout shows one line:

- **Injury cover: confirmed by the business** when the owner answered yes, or
- **Injury cover: not confirmed** otherwise.

We don't check the answer with the Compensation Fund yet, and the line says so by naming who confirmed it. Checking registration numbers is a post-pilot step.

## Tax

- **PAYE.** An employer must register for PAYE once any employee's pay is above the income tax threshold. For 2026/27 (1 March 2026 to 28 February 2027) that threshold is **R99,000 a year** for people under 65 ([SARS rates of tax for individuals](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/); [Budget 2026 tax guide](https://www.treasury.gov.za/documents/national%20budget/2026/sars/Budget%202026%20Tax%20guide.pdf)). A full 8-hour tryout at the minimum wage pays R241.84, and the 24-hour line caps a young person at 23 hours a month with one business: R695.29 at the minimum wage, far below the threshold. A business with other staff above it will already be registered and handles tryout pay as it handles any other.
- **Employment Tax Incentive.** When a tryout leads to a job, a business registered for PAYE may be able to claim the Employment Tax Incentive for employees aged 18 to 29, subject to SARS's conditions (a valid ID, a minimum wage, not a connected person or domestic worker, and others) ([SARS guide for employers on the ETI](https://www.sars.gov.za/guide-for-employers-in-respect-of-employment-tax-incentive)). We mention it to businesses as a possible benefit of hiring, not as tax advice: they confirm eligibility with SARS or their accountant.
- **First Shift's own income** is the credit price (R25), taxed as our revenue. It isn't wages and carries no PAYE.

## What the young person is told about money

Everywhere payment appears, the product says:

> You send the payment yourself, from your FNB app, your bank or in cash. First Shift doesn't move money. It records the payment, and the young person confirms they received it.

The FNB eWallet is sent by the business from its own FNB app. First Shift has no access to it, and an eWallet API is a roadmap ask, not something we've built on (`AGENTS.md`, lesson 6).

## What we don't claim

- We don't verify COIDA or PAYE registration with the Fund or SARS yet.
- We don't give tax, labour or legal advice to businesses or young people.
- We haven't had this page reviewed by a lawyer yet. That's the first item in the pilot plan (`docs/PHASES.md`, Pilot).
