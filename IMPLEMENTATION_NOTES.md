# Implementation Notes


## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

### Bugs fixed

- In `components/diff.util.ts`, I changed the `computeDiff` change detection logic from checking only the unit price to also checking the quantity.
- In `components/cr-detail/cr-detail.component.ts`, I fixed the `canApprove` and `canReject` logic to check whether the current user has an approval policy by using the `canApprovePolicy` function from `common/permissions.ts`.

### Features implemented

- In `components/cr-list/cr-list.component.ts`, I implemented the status filtering for the change request list dropdown.
- In `components/cr-detail/cr-detail.component.ts`, I sorted the timeline from oldest to newest.
- In `components/cr-detail/cr-detail.component.ts`, I added the Approve and Reject API actions with submitting and error handling, and added required validation for the rejection reason.
- In `components/cr-detail/cr-detail.component.ts`, I added `ngOnChanges` so the detail view reloads when a different CR is selected from the list.
- In `components/cr-detail/cr-detail.component.html`, I made the Approve action permission-aware so read-only users cannot use it, and ensured the Approve/Reject actions are hidden once a CR is no longer pending approval after approval or rejection.
- I verified the loading, empty, and error states for both the list and detail views, including slow and failing API responses.

### Tests

- Added component/DOM and pure-function tests covering the implemented behavior, including the list, diff, timeline, permissions, action flows, unhappy paths, and validation.

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

### Screens and view-states

From what I see, there are 3 main UI screens/components:

- App: Container for the whole application with a dropdown to select the current user.
- CR List Component: Contains a summary of change requests displaying each CR ID, title, status, and delta change between baseline and proposed change. It also has a filter dropdown based on the CR status. The component has view states for idle, loading, loaded, empty, and error. This component also emits the selected CR ID to the App Component to switch the detailed CR information being displayed.
- CR Detail Component: Shows one detailed CR at a time, including a table of proposed changes, a timeline of changes, and approval/rejection actions for users with the approval policy. The component has view states for idle, loading, loaded, and error states, and also tracks action submission and rejection reason validation.

### Data flow

The components use the mock `CrApiService` to load and update change request data.

1. The current user is provided through `SessionService`.
2. The CR List Component requests the change request summaries from `CrApiService`.
3. The list applies the selected status filter locally and displays the resulting rows.
4. Selecting a row emits the CR ID to the App Component.
5. The App Component passes the selected CR ID to the CR Detail Component.
6. The CR Detail Component loads the corresponding CR from `CrApiService`.
7. The detail component computes the diff, sorts the timeline, and determines which actions are available based on the CR status and the current user's permissions.
8. Approve and Reject actions call the corresponding API methods and update the detail view based on the response or error state.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|
| Only CRs belonging to the current user's organization are displayed | `CrApiService` provides organization-scoped summaries, which are rendered by `CrListComponent` |
| Quantity-only changes are detected as changes | `components/diff.util.ts` compares both `quantity` and `unitPrice` |
| Timeline entries are displayed from oldest to newest | `components/cr-detail/cr-detail.component.ts` sorts audit entries chronologically |
| Read-only users cannot approve a CR | `components/cr-detail/cr-detail.component.ts` uses `canApprovePolicy` to determine whether the current user has approval permission |
| Approve and Reject cannot be used once a CR is no longer pending | `components/cr-detail/cr-detail.component.ts` checks the CR status before enabling or showing the actions |
| A rejection cannot be submitted without a reason | `rejectControl` uses required validation before the Reject API call is made |
| The API is not called when the rejection reason is invalid | `reject()` checks the form control validity before submitting |
| Approve and Reject actions do not remain stuck in the submitting state after an API error | Error handling resets the submitting state and displays the API error |
| Loading, empty, and error states are displayed appropriately | `cr-list.component.html` and `cr-detail.component.html` render the corresponding view states |
| The detail view corresponds to the CR selected in the list | `App` passes the selected CR ID to `CrDetailComponent`, which reloads the data through `ngOnChanges` |
| After a successful approval, the CR is no longer actionable | The returned `APPROVED` status updates the detail state and disables the Approve action |
| After a successful rejection, the CR is no longer actionable | The returned `REJECTED` status updates the detail state and hides the Reject section |
| Duplicate actions are prevented while an action is submitting | The submitting state disables the Approve/Reject action until the API request completes |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->


I focused the tests on the behavior requested in Task 5, prioritizing rendered behavior, edge cases, and unhappy paths rather than targeting a specific coverage percentage.

### Component/DOM tests

I used Angular component/DOM tests for the CR List and CR Detail components to verify user-visible behavior, including:

- List loading, empty, error, retry, and filtering states.
- CR selection and communication with the parent component.
- Detail loading, error, retry, diff, and timeline behavior.
- Permission-aware Approve/Reject actions.
- Successful and failed Approve/Reject flows.
- Rejection reason validation.

The tests use the mock API with configurable latency and failures to exercise both normal and error states.

### Pure-function tests

I tested `computeDiff` separately as a pure function. The tests cover added and removed SKUs, quantity-only changes, price-only changes, both changing together, and unchanged items.

### Scope

Given the assessment time budget, I focused on observable behavior and the functionality required by the assessment rather than testing internal implementation details or targeting exhaustive coverage.

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- **Approve button:** I wasn't always sure whether the Approve button should be hidden or disabled when the user doesn't have permission. I chose to keep it visible but disabled for read-only users, while hiding the Reject section.

- **Actions after approval/rejection:** I assumed that Approve and Reject should no longer be available once the CR is no longer `PENDING_APPROVAL`. After the API succeeds, I use the returned status to update the UI.

- **Switching between CRs:** The original detail component used `ngOnInit`, but that would only load the CR when the component was first created. Since selecting another CR changes the `id` input, I changed this to `ngOnChanges` so the detail reloads when a different CR is selected.

- **Description in the diff:** I wasn't sure whether changing only the line item description should count as a changed item. Since the description isn't shown in the diff UI, I treated `quantity` and `unitPrice` as the fields that determine whether the line item changed.

- **Timeline order:** I interpreted "chronologically" as oldest to newest, so the reviewer can follow the history from the first event to the latest one.

- **Status filter:** I treated the filter as a client-side filter on the CRs already loaded from the API instead of making another API request whenever the filter changes.

- **Reject reason:** I assumed an empty or whitespace-only reason should not call the API, since the requirement says a reason is required before rejecting.

## 6. Where I used AI

I used AI during the assessment mainly as a debugging, learning, and review aid. I used it to help understand Angular concepts and parts of the codebase that I was not familiar with, as well as Angular/Jest errors and possible implementation approaches. I also used it to review parts of my implementation and tests and help organize the implementation notes.

I reviewed, tested, and understood the changes before including them in the submission, and I can explain and modify the code independently.

## 7. What I'd improve with more time
- **Keep the list and detail views in sync after an action:** Currently, after approving or rejecting a CR, the detail view updates from the API response, but the list still shows its previously loaded status. I would add a way for the detail action to notify the list to refresh.

- **Improve the filtered empty state:** When a user has no CRs at all, the list shows the empty state. However, when CRs exist but none match the selected status filter, it does not currently show a separate "no matching CRs" message. I would add a filtered empty state to make this clearer.

- **Handle user switching with different CR lists:** When switching to a user whose organization has different CRs, the selected CR ID can remain from the previous user. This can cause the detail view to show an error until another CR is manually selected. I would reset the selected CR and automatically select the first available CR after switching users.

- **Reduce repeated test setup:** Some component tests repeat the same TestBed and API setup. I would extract more of this into reusable test helpers to make the tests easier to maintain.