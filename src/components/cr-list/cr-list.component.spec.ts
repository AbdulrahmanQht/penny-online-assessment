import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service'
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrListComponent);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty state
	return fixture;
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('shows the loading state while loading change requests', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [
				{ provide: SessionService, useValue: { user: users.approver } },
				CrApiService,
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(CrApiService);
		api.latencyMs = 1000;
		api.failNext = false;

		const fixture = TestBed.createComponent(CrListComponent);

		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__loading')
		).not.toBeNull();
	});

	it('shows the error state when loading change requests fails', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver }
				},
				CrApiService
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(CrApiService);
		api.failNext = true;
		api.latencyMs = 0;

		const fixture = TestBed.createComponent(CrListComponent);

		fixture.detectChanges();

		await flush();

		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__error')
		).not.toBeNull();
	});

	it('retries loading after an error', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver }
				},
				CrApiService
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(CrApiService);
		api.failNext = true;
		api.latencyMs = 0;

		const fixture = TestBed.createComponent(CrListComponent);

		// First request fails
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__error')
		).not.toBeNull();

		// Click Retry
		const retryButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-list__error button');

		retryButton.click();

		await flush();
		fixture.detectChanges();

		// Retry succeeds
		expect(
			fixture.nativeElement.querySelector('.cr-list__table')
		).not.toBeNull();

		expect(
			fixture.nativeElement.querySelectorAll('.cr-list__row').length
		).toBe(3);
	});

	it('shows all rows when filter status is ALL', async () => {
		const fixture = await render(users.approver);

		fixture.componentInstance.onFilterChange('ALL');
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(3);
	});

	it('shows only CRs matching the selected filter status', async () => {
		const fixture = await render(users.approver);

		fixture.componentInstance.onFilterChange('DRAFT'); // There is only 1 DRAFT CR in the api fixtures.
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(1);
	});

	it('updates rendered rows when the filter status changes', async () => {
		const fixture = await render(users.approver);

		let rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(3);

		fixture.componentInstance.onFilterChange('DRAFT');
		fixture.detectChanges();

		rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(1);
	});

	it('emits the selected CR id to parent', async () => {
		const fixture = await render(users.approver);

		const emittedIds: string[] = [];
		fixture.componentInstance.select.subscribe(id => {
			emittedIds.push(id);
		});

		const row = fixture.nativeElement.querySelector('.cr-list__row');

		row.click();

		expect(emittedIds).toEqual(['CR-1']);
	});
});
