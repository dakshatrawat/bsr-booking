import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageroomsComponent } from './managerooms.component';

describe('ManageroomsComponent', () => {
  let component: ManageroomsComponent;
  let fixture: ComponentFixture<ManageroomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageroomsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageroomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
