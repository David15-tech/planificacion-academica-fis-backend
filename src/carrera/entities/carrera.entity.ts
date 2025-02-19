import { NivelEntity } from '../../../src/niveles/entities/nivel.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  VersionColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

@Entity('carrera')
@Unique(['codigo'])  // Para que el campo "codigo" sea único
export class CarreraEntity {
  @PrimaryGeneratedColumn('uuid') // Usamos UUID
  id: string;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column()
  duracion: number;

  @Column({ length: 50 })
  modalidad: string;

  @VersionColumn({ default: 1 })
  version: number;

  @OneToMany(() => NivelEntity, (nivel) => nivel.carrera)
  niveles: NivelEntity[];
}
