import { AsignaturaEntity } from '../../asignatura/entities/asignatura.entity';
import { DocenteEntity } from '../../../src/docente/entities/docente.entity';
import { GrupoEntity } from '../../../src/niveles/entities/grupo.entity';
import { TipoAulaEntity } from '../../../src/parametros-iniciales/entities/tipo-aula.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  VersionColumn,
} from 'typeorm';
import { RestriccionActividadEntity } from './restriccion-actividad.entity';

@Entity('actividad')
export class ActividadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'boolean',
    default: true,
  })
  estado: boolean; // true para "activa"

  @Column()
  duracion: number;

  @Column()
  numeroEstudiantes: number;

  @ManyToOne(() => DocenteEntity, (docente) => docente.actividades)
  @JoinColumn({ name: 'idDocente' })
  docente: DocenteEntity;

  @ManyToOne(() => TipoAulaEntity, (tipo) => tipo.actividades)
  @JoinColumn({ name: 'idTipoAula' })
  tipoAula: TipoAulaEntity;

  @ManyToOne(() => AsignaturaEntity, (asignatura) => asignatura.actividades)
  @JoinColumn({ name: 'idAsignatura' })
  asignatura: AsignaturaEntity;

  @ManyToOne(() => GrupoEntity, (grupo) => grupo.actividades)
  @JoinColumn({ name: 'idGrupo' })
  grupo: GrupoEntity;

  @OneToMany(
    () => RestriccionActividadEntity,
    (restriccion) => restriccion.actividad,
  )
  restricciones: RestriccionActividadEntity[];

  /**
   * Columna para el "optimistic locking" de TypeORM.
   * Cada vez que se hace un "save()", se incrementa.
   * Si la versión aquí no coincide con la de la base de datos,
   * TypeORM lanza un OptimisticLockVersionMismatchError.
   */
  @VersionColumn()
  version: number;
}
