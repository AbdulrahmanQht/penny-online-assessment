# Implementation Notes


## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

- In `components/diff.util.ts`, I changed the computeDiff change detection logic from checking only the unit price to also checking the quantity.
- In `components/cr-detail/cr-detail.component.ts`, I fixed the `canApprove` and `canReject` logic to check whether the current user has an approval policy by using the `canApprovePolicy` function from `common/permissions.ts`.
- In `components/cr-list/cr-list.component.ts`, I implemented the status filtering for the change request list dropdown.
- In `components/cr-detail/cr-detail.component.ts`, I sorted the timeline from oldest to newest.
- In `components/cr-detail/cr-detail.component.ts`, I added the Approve and Reject API actions with submitting and error handling, and added required validation for the rejection reason.
- In `components/cr-detail/cr-detail.component.ts`, I added `ngOnChanges` so the detail view reloads when a different CR is selected from the list.

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

From what I see, there are 3 main UI screens/components:

- App: Container for the whole application with a dropdown to select the current user.
- CR List Component: Contains a summary of change requests displaying each CR ID, title, status, and delta change between baseline and proposed change. It also has a filter dropdown based on the CR status. From what I see, the filtering logic is not implemented yet. The component has view states for idle, loading, loaded, empty, and error. This component also emits the selected CR ID to the App Component to switch the detailed CR information being displayed.
- CR Detail Component: Shows one detailed CR at a time, including a table of proposed changes, a timeline of changes, and approval/rejection actions for users with the approval policy. The component has view states for idle, loading, loaded, and error states, and also tracks action submission and rejection reason validation.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

-

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
