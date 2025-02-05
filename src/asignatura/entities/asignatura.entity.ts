import { ActividadEntity } from '../../actividades/entities/actividad.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, VersionColumn, Unique } from 'typeorm';

@Entity('asignatura')
export class AsignaturaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nombre: string;

  @Column()
  creditos?: number;

  @OneToMany(() => ActividadEntity, (actividades) => actividades.asignatura)
  actividades?: ActividadEntity[];

  @VersionColumn()
  version: number;

}
