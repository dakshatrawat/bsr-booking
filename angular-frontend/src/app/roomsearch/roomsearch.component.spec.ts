import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomsearchComponent } from './roomsearch.component';

describe('RoomsearchComponent', () => {
  let component: RoomsearchComponent;
  let fixture: ComponentFixture<RoomsearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomsearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomsearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
