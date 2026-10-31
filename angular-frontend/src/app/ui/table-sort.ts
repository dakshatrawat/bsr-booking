export type SortDirection = 'ascending' | 'descending';

// Client-side sort state for a data table. Values are compared as numbers
// when both sides are numeric, otherwise as locale-aware strings.
export class TableSort<T> {
  constructor(public key: keyof T | null = null, public direction: SortDirection = 'ascending') {}

  toggle(key: keyof T): void {
    if (this.key === key) {
      this.direction = this.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
      this.key = key;
      this.direction = 'ascending';
    }
  }

  ariaSort(key: keyof T): SortDirection | 'none' {
    return this.key === key ? this.direction : 'none';
  }

  icon(key: keyof T): string {
    if (this.key !== key) return 'fa-sort';
    return this.direction === 'ascending' ? 'fa-sort-up' : 'fa-sort-down';
  }

  apply(rows: T[]): T[] {
    if (!this.key) return rows;
    const key = this.key;
    const factor = this.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[key] as unknown;
      const y = b[key] as unknown;
      if (x == null) return 1;
      if (y == null) return -1;
      const nx = Number(x);
      const ny = Number(y);
      if (!isNaN(nx) && !isNaN(ny)) return (nx - ny) * factor;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * factor;
    });
  }
}
