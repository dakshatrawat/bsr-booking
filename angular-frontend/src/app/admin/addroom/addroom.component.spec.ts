import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddroomComponent } from './addroom.component';

describe('AddroomComponent', () => {
  let component: AddroomComponent;
  let fixture: ComponentFixture<AddroomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddroomComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddroomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
