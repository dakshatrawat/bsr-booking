import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {

  @Input() roomPerPage: number = 10; // Number of items per page
  @Input() totalRooms: number = 0; // Total number of items
  @Input() currentPage: number = 1; // Current page
  @Output() paginate: EventEmitter<number> = new EventEmitter<number>(); // Emit page number

  get pageCount(): number {
    return Math.ceil(this.totalRooms / this.roomPerPage);
  }

  get firstItem(): number {
    return (this.currentPage - 1) * this.roomPerPage + 1;
  }

  get lastItem(): number {
    return Math.min(this.currentPage * this.roomPerPage, this.totalRooms);
  }

  // First, last, and a window around the current page; null marks a gap
  get pageItems(): (number | null)[] {
    const count = this.pageCount;
    if (count <= 7) {
      return Array.from({ length: count }, (_, i) => i + 1);
    }
    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(count - 1, this.currentPage + 1);
    const items: (number | null)[] = [1];
    if (start > 2) items.push(null);
    for (let page = start; page <= end; page++) items.push(page);
    if (end < count - 1) items.push(null);
    items.push(count);
    return items;
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.pageCount || pageNumber === this.currentPage) return;
    this.paginate.emit(pageNumber); // Emit the page number to parent component
  }

}
