import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminregisterComponent } from './adminregister.component';

describe('AdminregisterComponent', () => {
  let component: AdminregisterComponent;
  let fixture: ComponentFixture<AdminregisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminregisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminregisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
