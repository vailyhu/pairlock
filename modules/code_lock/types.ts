export interface CodeLockOptions {
  kind: 'digits' | 'letters' | 'text';
  n?: number;
  answer?: string;
  hash?: string;
  placeholder?: string;
  button: string;
  okText: string;
  badText: string;
}
export interface CodeLockView {
  kind: CodeLockOptions['kind'];
  n?: number;
  placeholder?: string;
  button: string;
}
export interface CodeLockMove {
  guess: string;
}
