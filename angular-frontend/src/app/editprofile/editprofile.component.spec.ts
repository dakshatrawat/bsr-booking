import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditprofileComponent } from './editprofile.component';

describe('EditprofileComponent', () => {
  let component: EditprofileComponent;
  let fixture: ComponentFixture<EditprofileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditprofileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditprofileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
