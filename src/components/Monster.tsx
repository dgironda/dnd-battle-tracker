export interface Monster {
  id: number;
  name: string;
  hp: number;
  ac: number;
  hidden: boolean;
  conditions: string[];
}
