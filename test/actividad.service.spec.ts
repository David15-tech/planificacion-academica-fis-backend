import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesService } from '../src/actividades/services/actividades.service';

// Entidades
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import { RestriccionActividadEntity } from '../src/actividades/entities/restriccion-actividad.entity';
import { AsignaturaEntity } from '../src/asignatura/entities/asignatura.entity';
import { DocenteEntity } from '../src/docente/entities/docente.entity';
import { GrupoEntity } from '../src/niveles/entities/grupo.entity';
import { TipoAulaEntity } from '../src/parametros-iniciales/entities/tipo-aula.entity';
import { EspacioFisicoEntity } from '../src/espacios_fisicos/entities/espacio_fisico.entity';
import { HoraNoDisponibleEntity } from '../src/horas_no_disponibles/entities/hora_no_disponible.entity';
import { JornadaLaboralEntity } from '../src/parametros-iniciales/entities/jornada-laboral.entity';
import { SemestreEntity } from '../src/parametros-iniciales/entities/semestre.entity';
import { FacultadEntity } from '../src/parametros-iniciales/entities/facultad.entity';
import { CarreraEntity } from '../src/carrera/entities/carrera.entity';
import { UsuarioEntity } from '../src/usuarios/entities/usuario.entity';
import { RolUsuarioEntity } from '../src/auth/entities/rol-usuario.entity';
import { RolEntity } from '../src/auth/entities/rol.entity';
import { HorarioEntity } from '../src/horario/entities/horario.entity';

// Servicios
import { AsignaturaService } from '../src/asignatura/services/asignatura.service';
import { DocenteService } from '../src/docente/services/docente.service';
import { GrupoService } from '../src/niveles/services/grupo.service';
import { NumeroEstudiantesPorSemestreService } from '../src/numero_estudiantes/services/numeroEstudiantesPorSemestre.service';
import { TipoAulaService } from '../src/parametros-iniciales/services/tipo-aula.service';
import { EspaciosFisicosService } from '../src/espacios_fisicos/services/espacios_fisicos.service';
import { HorasNoDisponiblesService } from '../src/horas_no_disponibles/services/horas_no_disponibles.service';

// DTOs
import { CrearActividadDto } from '../src/actividades/dtos/crear-actividad.dto';
import { ActualizarActividadDto } from '../src/actividades/dtos/actualizar-actividad.dto';

describe('ActividadesService (Integration)', () => {
  let actividadesService: ActividadesService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            ActividadEntity,
            RestriccionActividadEntity,
            AsignaturaEntity,
            DocenteEntity,
            GrupoEntity,
            TipoAulaEntity,
            EspacioFisicoEntity,
            HoraNoDisponibleEntity,
            JornadaLaboralEntity,
            SemestreEntity,
            FacultadEntity,
            CarreraEntity,
            UsuarioEntity,
            RolUsuarioEntity,
            RolEntity,
            HorarioEntity,
          ],
          synchronize: true,
          keepConnectionAlive: true,
        }),
        TypeOrmModule.forFeature([
          ActividadEntity,
          RestriccionActividadEntity,
          AsignaturaEntity,
          DocenteEntity,
          GrupoEntity,
          TipoAulaEntity,
          EspacioFisicoEntity,
          HoraNoDisponibleEntity,
        ]),
      ],
      providers: [
        ActividadesService,
        AsignaturaService,
        DocenteService,
        GrupoService,
        NumeroEstudiantesPorSemestreService,
        TipoAulaService,
        EspaciosFisicosService,
        HorasNoDisponiblesService,
      ],
    }).compile();

    actividadesService = module.get<ActividadesService>(ActividadesService);
  });

  afterEach(async () => {
    // Limpia la tabla de actividades después de cada prueba
    const actividades = await actividadesService.obtenerActividades();
    for (const act of actividades) {
      await actividadesService.eliminarActividadPorId(act.id);
    }
  });

  it('debe crear y luego actualizar una actividad usando IDs de tipo string', async () => {
    // 1) Creamos la actividad (CREAR)
    const dtoCrear: CrearActividadDto = {
      // OJO: idAsignatura, idDocente, etc. son string
      idAsignatura: 'ASIG_STRING_ID',
      idDocente: 'DOC_STRING_ID',
      idTipoAula: 'TIPO_AULA_STRING_ID',
      idGrupo: 'GRUPO_STRING_ID',
      duracion: 4,
    };
    const actividadCreada = await actividadesService.crearActividad(dtoCrear);

    expect(actividadCreada).toBeDefined();
    expect(actividadCreada.id).toBeDefined();
    expect(actividadCreada.duracion).toBe(4);

    // 2) Actualizamos la actividad (UPDATE)
    //    Notar que "idAsignatura", "idDocente", etc. siguen siendo strings
    const dtoActualizar: ActualizarActividadDto = {
      idAsignatura: 'ASIG_STRING_ID',
      idDocente: 'DOC_STRING_ID',
      idTipoAula: 'TIPO_AULA_STRING_ID',
      idGrupo: 'GRUPO_STRING_ID',
      duracion: 6,
      version: actividadCreada.version, // <- Debe coincidir con la versión actual
    };

    const actividadActualizada = await actividadesService.actualizarActividadPorId(
      actividadCreada.id,
      dtoActualizar,
    );

    expect(actividadActualizada).toBeDefined();
    expect(actividadActualizada.duracion).toBe(6);
    // Verifica que la versión haya incrementado (si usas versionado con TypeORM)
    expect(actividadActualizada.version).toBe(actividadCreada.version + 1);
  });
});
