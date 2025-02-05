import { UsuarioEntity } from '../../../src/usuarios/entities/usuario.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  VersionColumn,
} from 'typeorm';
import { ActividadEntity } from '../../actividades/entities/actividad.entity';
import { HoraNoDisponibleEntity } from 'src/horas_no_disponibles/entities/hora_no_disponible.entity';

@Entity('docente')
export class DocenteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  nombreCompleto: string;

  @Column({ length: 60, unique: true })
  correoElectronico: string;

  @OneToOne(() => UsuarioEntity)
  @JoinColumn()
  usuario?: UsuarioEntity;

  @OneToMany(() => ActividadEntity, (actividades) => actividades.docente)
  actividades?: ActividadEntity[];

  @OneToMany(
    () => HoraNoDisponibleEntity,
    (horasNoDisponibles) => horasNoDisponibles.docente,
  )
  horasNoDisponibles?: HoraNoDisponibleEntity[];
  
  @VersionColumn()
  version: number;
}
