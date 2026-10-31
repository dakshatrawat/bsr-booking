import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindbookingComponent } from './findbooking.component';

describe('FindbookingComponent', () => {
  let component: FindbookingComponent;
  let fixture: ComponentFixture<FindbookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindbookingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FindbookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
