import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminhomeComponent } from './adminhome.component';

describe('AdminhomeComponent', () => {
  let component: AdminhomeComponent;
  let fixture: ComponentFixture<AdminhomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminhomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminhomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
