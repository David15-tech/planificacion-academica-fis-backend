import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  VersionColumn,
  Unique,
} from 'typeorm';

@Entity('carrera')
@Unique(['codigo'])  // Para que el campo "codigo" sea único
export class CarreraEntity {
  @PrimaryGeneratedColumn('uuid') // Usamos UUID
  id: string;

  @Column()
  nombre: string;

  @Column()
  codigo: string;

  @VersionColumn()
  version: number; // Para el bloqueo optimista
}
