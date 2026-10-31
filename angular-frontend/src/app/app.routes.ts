import { Routes } from '@angular/router';
import { GuardService } from './service/guard.service';
import { HomeComponent } from './home/home.component';

// Home is the landing page and ships in the main bundle; every other page is
// loaded on first visit to keep the initial download small.
export const routes: Routes = [
    {path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)},
    {path: 'register', loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent)},
    {path: 'home', component: HomeComponent},
    {path: 'about', loadComponent: () => import('./about/about.component').then(m => m.AboutComponent)},

    {path: 'rooms', loadComponent: () => import('./rooms/rooms.component').then(m => m.RoomsComponent)},
    {path: 'room-details/:id', loadComponent: () => import('./roomdetails/roomdetails.component').then(m => m.RoomdetailsComponent), canActivate: [GuardService]},
    {path: 'find-booking', loadComponent: () => import('./findbooking/findbooking.component').then(m => m.FindbookingComponent)},


    {path: 'profile', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent), canActivate: [GuardService]},
    {path: 'edit-profile', loadComponent: () => import('./editprofile/editprofile.component').then(m => m.EditprofileComponent), canActivate: [GuardService]},

    //PAYMENTS ROUTES
    {path: 'payment/:bookingReference/:amount', loadComponent: () => import('./payment/paymentpage/paymentpage.component').then(m => m.PaymentpageComponent), canActivate: [GuardService]},
    {path: 'payment-success/:bookingReference', loadComponent: () => import('./payment/paymentsuccess/paymentsuccess.component').then(m => m.PaymentsuccessComponent), canActivate: [GuardService]},
    {path: 'payment-failue/:bookingReference', loadComponent: () => import('./payment/paymentfailure/paymentfailure.component').then(m => m.PaymentfailureComponent), canActivate: [GuardService]},

    //ADMIN ROUTES OR PAGES

    {path: 'admin', loadComponent: () => import('./admin/adminhome/adminhome.component').then(m => m.AdminhomeComponent), canActivate: [GuardService], data: {requiresAdmin: true}},
    {path: 'admin/manage-rooms', loadComponent: () => import('./admin/managerooms/managerooms.component').then(m => m.ManageroomsComponent), canActivate: [GuardService], data: {requiresAdmin: true}},
    {path: 'admin/add-room', loadComponent: () => import('./admin/addroom/addroom.component').then(m => m.AddroomComponent), canActivate: [GuardService], data: {requiresAdmin: true}},
    {path: 'admin/edit-room/:id', loadComponent: () => import('./admin/editroom/editroom.component').then(m => m.EditroomComponent), canActivate: [GuardService], data: {requiresAdmin: true}},

    {path: 'admin/manage-bookings', loadComponent: () => import('./admin/managebookings/managebookings.component').then(m => m.ManagebookingsComponent), canActivate: [GuardService], data: {requiresAdmin: true}},
    {path: 'admin/edit-booking/:bookingCode', loadComponent: () => import('./admin/updatebooking/updatebooking.component').then(m => m.UpdatebookingComponent), canActivate: [GuardService], data: {requiresAdmin: true}},

    {path: 'admin/manage-hotel-images', loadComponent: () => import('./admin/managehotelimages/managehotelimages.component').then(m => m.ManagehotelimagesComponent), canActivate: [GuardService], data: {requiresAdmin: true}},

    {path: 'admin/admin-register', loadComponent: () => import('./admin/adminregister/adminregister.component').then(m => m.AdminregisterComponent), canActivate: [GuardService], data: {requiresAdmin: true} },

    {path: '**', redirectTo: 'home'}
];
