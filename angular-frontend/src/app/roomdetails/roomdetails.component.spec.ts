import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomdetailsComponent } from './roomdetails.component';

describe('RoomdetailsComponent', () => {
  let component: RoomdetailsComponent;
  let fixture: ComponentFixture<RoomdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomdetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
