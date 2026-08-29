import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
import { users, details } from '../../api/fixtures';
import { ReqUser, CrDetail } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	// Changed from the earlier version `fixture.componentInstance.id = id;` because of the change from ngOnInit to ngOnChanges
	fixture.componentRef.setInput('id', id);
	fixture.detectChanges(); // ngOnChanges -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('shows the loading state while loading the change request', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 1000;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__loading')).not.toBeNull();
	});

	it('shows the error state when loading the change request fails', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = true;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		const error = fixture.nativeElement.querySelector('.cr-detail__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
	});

	it('retries loading after an error', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = true;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__error')).not.toBeNull();
		const retryButton: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-detail__error button');
		retryButton.click();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('renders a changed row and an unchanged row for CR-1', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.cr-diff__row'));
		expect(rows.length).toBe(2);

		expect(rows[0].getAttribute('data-kind')).toBe('changed');
		expect(rows[0].textContent).toContain('SKU-A');
		expect(rows[0].textContent).toContain('10 × USD 500.00');
		expect(rows[0].textContent).toContain('11 × USD 500.00');

		expect(rows[1].getAttribute('data-kind')).toBe('unchanged');
		expect(rows[1].textContent).toContain('SKU-B');
		expect(rows[1].textContent).toContain('30 × USD 100.00');
	});

	it('orders audit entries chronologically, oldest first', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const actions: string[] = Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__action')).map((el: Element) =>
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			el.textContent!.trim(),
		);
		expect(actions).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('shows enabled actions for an approver on a pending CR', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn).not.toBeNull();
		expect(approveBtn.disabled).toBe(false);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn')).not.toBeNull();
	});

	it('disables Approve and hides the reject section for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		fixture.detectChanges();

		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);

		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('disables Approve and hides the reject section for an approver on a non-pending CR', async () => {
		const fixture = await render(users.approver, 'CR-2'); // CR-2 is APPLIED

		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn).not.toBeNull();
		expect(approveBtn.disabled).toBe(true);

		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('calls the API with the current user, id, and a timestamp', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'approve').mockResolvedValue({ ...details['CR-1'], status: 'APPROVED' } as CrDetail);

		fixture.nativeElement.querySelector('.cr-actions__approve').click();
		await flush();
		fixture.detectChanges();

		expect(api.approve).toHaveBeenCalledWith(users.approver, 'CR-1', expect.any(String));
	});

	it('updates the UI on approve success', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'approve').mockResolvedValue({ ...details['CR-1'], status: 'APPROVED' } as CrDetail);

		fixture.nativeElement.querySelector('.cr-actions__approve').click();
		await flush();
		fixture.detectChanges();

		const status: HTMLElement = fixture.nativeElement.querySelector('.cr-status');
		expect(status.textContent).toContain('APPROVED');
		expect(status.getAttribute('data-status')).toBe('APPROVED');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn).not.toBeNull();
		expect(approveBtn.disabled).toBe(true);
	});

	it('shows an error and re-enables the action on approve failure', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest
			.spyOn(api, 'approve')
			.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Approve failed')), 0)));

		fixture.nativeElement.querySelector('.cr-actions__approve').click();
		await flush();
		fixture.detectChanges();

		const error = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Approve failed');

		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(false); // not stuck in "submitting"
	});

	it('shows a validation message when the reject reason is empty', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).not.toBeNull();
	});

	it('does not call the API when the reject reason is empty', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'reject');

		fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(api.reject).not.toHaveBeenCalled();
	});

	it('calls the API with the entered reason when valid', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'reject').mockResolvedValue({ ...details['CR-1'], status: 'REJECTED' } as CrDetail);

		fixture.componentInstance.rejectControl.setValue('Not needed this quarter');
		fixture.detectChanges();
		fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
		await flush();
		fixture.detectChanges();

		expect(api.reject).toHaveBeenCalledWith(users.approver, 'CR-1', expect.any(String), 'Not needed this quarter');
	});

	it('updates the UI on reject success', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'reject').mockResolvedValue({ ...details['CR-1'], status: 'REJECTED' } as CrDetail);

		fixture.componentInstance.rejectControl.setValue('Not needed this quarter');
		fixture.detectChanges();
		fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
		await flush();
		fixture.detectChanges();

		const status: HTMLElement = fixture.nativeElement.querySelector('.cr-status');
		expect(status.textContent).toContain('REJECTED');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('shows an error and re-enables the action on reject failure', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }, CrApiService],
		});
		await TestBed.compileComponents();
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 0;
		api.failNext = false;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		jest.spyOn(api, 'reject').mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Reject failed')), 0)));

		fixture.componentInstance.rejectControl.setValue('Not needed this quarter');
		fixture.detectChanges();
		fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
		await flush();
		fixture.detectChanges();

		const error = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Reject failed');

		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');
		expect(rejectBtn.disabled).toBe(false);
	});
});
