# Monthly Budgeting

## Overview

Student Budget Tracker V2 organizes financial activity by calendar month. A month is represented in the interface as `YYYY-MM` and selected through the monthly budget and history views.

## Budget

A monthly budget can be set for the selected month. Category allocations can be maintained for supported spending categories. The dashboard compares the configured budget with recorded spending for the selected period.

## Income

Income entries include an amount, source, received date, optional notes, and timestamps. Monthly summaries include entries whose received dates fall within the selected month.

## Expenses

Expenses include an amount, category, expense date, description or reason, optional notes, and timestamps. The application resolves category names to user-owned category records before saving an expense.

## Savings Goals

Savings goals contain a target amount, saved amount, and optional target date. Savings contributions and goal summaries are presented with the selected financial data.

## Month History

The application can load the user's available months and calculate monthly summaries. Changing the selected month reloads the relevant budget, income, expenses, and savings information from the active data layer.

## Data Storage

Active financial records are stored in Supabase tables associated with the authenticated user. Temporary onboarding drafts and selected preferences may use browser `localStorage`; financial data is not maintained there as an authoritative backup.

## Limitations

Monthly financial actions require an authenticated session and network access to Supabase. Cached application files may load offline, but the current implementation does not guarantee that offline financial changes will be queued or synchronized later.
