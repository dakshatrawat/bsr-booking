import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagebookingsComponent } from './managebookings.component';

describe('ManagebookingsComponent', () => {
  let component: ManagebookingsComponent;
  let fixture: ComponentFixture<ManagebookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagebookingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagebookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
