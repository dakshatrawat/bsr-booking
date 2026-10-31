import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentfailureComponent } from './paymentfailure.component';

describe('PaymentfailureComponent', () => {
  let component: PaymentfailureComponent;
  let fixture: ComponentFixture<PaymentfailureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentfailureComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentfailureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
