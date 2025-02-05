import { RestriccionActividadEntity } from 'src/actividades/entities/restriccion-actividad.entity';
import { TipoAulaEntity } from '../../../src/parametros-iniciales/entities/tipo-aula.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  VersionColumn,
} from 'typeorm';

@Entity('espacioFisico')
export class EspacioFisicoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, unique: true })
  nombre: string;

  @ManyToOne(() => TipoAulaEntity, (tipo) => tipo.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_id' })
  tipo: TipoAulaEntity;

  @Column()
  aforo: number;

  @OneToMany(
    () => RestriccionActividadEntity,
    (restriccionActividad) => restriccionActividad.espacioFisico,
  )
  restricciones?: RestriccionActividadEntity[];

  @VersionColumn()
  version: number;
}
