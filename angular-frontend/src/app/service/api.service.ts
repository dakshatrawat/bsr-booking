import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  public static BASE_URL = environment.apiUrl;
  private static ENCRYPTION_KEY = 'dennis-encryp-key';

  constructor(private http: HttpClient) {}

  //Encrypt and save token or role to localstorage
  encryptAndSaveToStorage(key: string, value: string): void {
    const encryptedValue = CryptoJS.AES.encrypt(
      value,
      ApiService.ENCRYPTION_KEY
    ).toString();
    localStorage.setItem(key, encryptedValue);
  }

  // Retrieve from localStorage and decrypt
  private getFromStorageAndDecrypt(key: string): string | null {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      return CryptoJS.AES.decrypt(
        encryptedValue,
        ApiService.ENCRYPTION_KEY
      ).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return null;
    }
  }

  
  //clear authentication data
  private clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }

  private getHeader(): HttpHeaders {
    const token = this.getFromStorageAndDecrypt('token');
    if (!token) {
      console.warn('No authentication token found in storage');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`,
    });
  }

  private getHeaderForFileUpload(): HttpHeaders {
    // For file uploads, only set Authorization, let browser set Content-Type
    const token = this.getFromStorageAndDecrypt('token');
    if (!token) {
      console.warn('No authentication token found in storage for file upload');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`,
    });
  }




  // AUTH API METHODS
  registerUser(body: any): Observable<any> {
    return this.http.post(`${ApiService.BASE_URL}/auth/register`, body);
  }

  loginUser(body: any): Observable<any> {
    return this.http.post(`${ApiService.BASE_URL}/auth/login`, body);
  }




  // USERS API METHODS
  myProfile(): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/users/account`, {
      headers: this.getHeader(),
    });
  }

  myBookings(): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/users/bookings`, {
      headers: this.getHeader(),
    });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${ApiService.BASE_URL}/users/delete`, {
      headers: this.getHeader(),
    });
  }





  // ROOMS API METHODS
  addRoom(formData: any): Observable<any> {
    // For FormData, use header without Content-Type - browser will set it with boundary
    return this.http.post(`${ApiService.BASE_URL}/rooms/add`, formData, {
      headers: this.getHeaderForFileUpload(),
    });
  }

  updateRoom(formData: any): Observable<any> {
    // For FormData, use header without Content-Type - browser will set it with boundary
    return this.http.put(`${ApiService.BASE_URL}/rooms/update`, formData, {
      headers: this.getHeaderForFileUpload(),
    });
  }

  getAvailableRooms(
    checkInDate: string,
    checkOutDate: string,
    roomType: string
  ): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/rooms/available`, {
      params: { checkInDate, checkOutDate, roomType },
    });
  }

  getRoomTypes(): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/rooms/types`);
  }

  getAllRooms(): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/rooms/all`);
  }

  getRoomById(roomId: string): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/rooms/${roomId}`);
  }

  getBookedDates(roomId: string): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/rooms/${roomId}/booked-dates`);
  }

  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`${ApiService.BASE_URL}/rooms/delete/${roomId}`, {
      headers: this.getHeader(),
    });
  }




  // BOOKINGS API METHODS
  bookRoom(booking: any): Observable<any> {
    return this.http.post(`${ApiService.BASE_URL}/bookings`, booking, {
      headers: this.getHeader(),
    });
  }

  getAllBookings(): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/bookings/all`, {
      headers: this.getHeader(),
    });
  }

  updateBooking(booking: any): Observable<any> {
    return this.http.put(`${ApiService.BASE_URL}/bookings/update`, booking, {
      headers: this.getHeader(),
    });
  }

  getBookingByReference(bookingCode: string): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/bookings/${bookingCode}`);
  }





  // PAYMENT API METHODS
  proceedForPayment(body: any): Observable<any> {
    console.log('Sending payment request:', body);
    return this.http.post(`${ApiService.BASE_URL}/payments/pay`, body, {
      headers: this.getHeader(),
      responseType: 'text' // Razorpay returns plain string order ID
    });
  }

  updateBookingPayment(body: any): Observable<any> {
    return this.http.put(`${ApiService.BASE_URL}/payments/update`, body, {
      headers: this.getHeader(),
    });
  }



  
  

  // AUTHENTICATION CHECKER
  logout(): void {
    this.clearAuth();
  }

  isAuthenticated(): boolean {
    const token = this.getFromStorageAndDecrypt('token');
    return !!token;
  }

  isAdmin(): boolean {
    const role = this.getFromStorageAndDecrypt('role');
    return role === 'ADMIN';
  }

  isCustomer(): boolean {
    const role = this.getFromStorageAndDecrypt('role');
    return role === 'CUSTOMER';
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    if (!imagePath) {
      console.warn('getImageUrl: imagePath is empty or null');
      return '/assets/placeholder-room.jpg'; // Fallback placeholder
    }
    // If already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Prepend base URL for relative paths
    const baseUrl = ApiService.BASE_URL.replace('/api', '');
    const fullUrl = `${baseUrl}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
    console.log('getImageUrl:', { imagePath, baseUrl, fullUrl });
    return fullUrl;
  }

  // HOTEL IMAGES API METHODS
  addMultipleHotelImages(formData: FormData): Observable<any> {
    const headers = this.getHeaderForFileUpload();
    console.log('Upload request URL:', `${ApiService.BASE_URL}/hotel-images/add-multiple`);
    console.log('Upload headers:', headers.keys());
    return this.http.post<any>(`${ApiService.BASE_URL}/hotel-images/add-multiple`, formData, {
      headers: headers,
      observe: 'body',
      responseType: 'json'
    });
  }

  getAllHotelImages(): Observable<any> {
    // Try with auth first, but endpoint is now public so it should work
    const headers = this.getHeader();
    console.log('Fetch request URL:', `${ApiService.BASE_URL}/hotel-images/all`);
    console.log('Fetch headers:', headers.keys());
    return this.http.get<any>(`${ApiService.BASE_URL}/hotel-images/all`, {
      headers: headers,
      observe: 'body',
      responseType: 'json'
    });
  }

  // Public method to get hotel images without authentication (for public pages)
  getAllHotelImagesPublic(): Observable<any> {
    console.log('Fetching hotel images (public):', `${ApiService.BASE_URL}/hotel-images/all`);
    return this.http.get<any>(`${ApiService.BASE_URL}/hotel-images/all`, {
      observe: 'body',
      responseType: 'json'
    });
  }

  getHotelImageById(id: string): Observable<any> {
    return this.http.get(`${ApiService.BASE_URL}/hotel-images/${id}`, {
      headers: this.getHeader(),
    });
  }

  getHotelImageUrl(id: number | string): string {
    // Keep /api in the URL since the endpoint is /api/hotel-images/{id}/image
    return `${ApiService.BASE_URL}/hotel-images/${id}/image`;
  }

  updateHotelImage(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${ApiService.BASE_URL}/hotel-images/update/${id}`, formData, {
      headers: this.getHeaderForFileUpload(),
    });
  }

  deleteHotelImage(id: string): Observable<any> {
    return this.http.delete(`${ApiService.BASE_URL}/hotel-images/delete/${id}`, {
      headers: this.getHeader(),
    });
  }

}
