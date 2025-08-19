
export interface Point {
    x: number;
    y: number;
}

export interface Pin {
  id: string;
  x: number;
  y: number;
  name: string;
  zone?: string;
  subzone?: string;
  url?: string;
}

export interface Area {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  pins: Pin[];
}

export type FileStatus = 'pending' | 'accessible' | 'inaccessible';

export interface FileState {
    name: string;
    status: FileStatus;
}
