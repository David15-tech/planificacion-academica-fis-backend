jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

// Servicio a probar
import { HorarioService } from '../src/horario/services/horario.service';

// Entidades
import { HorarioEntity } from '../src/horario/entities/horario.entity';
import { UsuarioEntity } from '../src/usuarios/entities/usuario.entity';
import { RolEntity } from '../src/auth/entities/rol.entity';
import { RolUsuarioEntity } from '../src/auth/entities/rol-usuario.entity';
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
import { NivelEntity } from '../src/niveles/entities/nivel.entity';

// Servicios reales o mockeados que inyecta tu HorarioService:
import { UsuarioService } from '../src/usuarios/services/usuario.service';
import { JornadaLaboralService } from '../src/parametros-iniciales/services/jornada-laboral.service';
import { SemestreService } from '../src/parametros-iniciales/services/semestre.service';
import { AsignaturaService } from '../src/asignatura/services/asignatura.service';
import { TipoAulaService } from '../src/parametros-iniciales/services/tipo-aula.service';
import { DocenteService } from '../src/docente/services/docente.service';
import { HorasNoDisponiblesService } from '../src/horas_no_disponibles/services/horas_no_disponibles.service';
import { ActividadesService } from '../src/actividades/services/actividades.service';
import { NivelService } from '../src/niveles/services/nivel.service';
import { FacultadService } from '../src/parametros-iniciales/services/facultad.service';
import { EspaciosFisicosService } from '../src/espacios_fisicos/services/espacios_fisicos.service';

// Mocks
const mockUsuarioService = {
  obtenerUsuarioCompletoPorSuID: jest.fn(),
  obtenerUsuarioPorSuCorreo: jest.fn(),
};
const mockJornadaLaboralService = {
  obtenerJornadaLaboralPorSemestre: jest.fn(),
  obtenerIntervalos: jest.fn(),
};
const mockSemestreService = {
  obtenerSemestreConPlanificacionEnProgreso: jest.fn(),
};
const mockAsignaturaService = {
  obtenerAsignatura: jest.fn(),
};
const mockTipoAulaService = {
  obtenerTipoAulaPorId: jest.fn(),
  obtenerTipoAulas: jest.fn(),
};
const mockDocenteService = {
  obtenerDocentes: jest.fn(),
};
const mockHorasNoDisponiblesService = {
  getEtiquetasHorarios: jest.fn(),
};
const mockActividadesService = {
  obtenerActividades: jest.fn(),
  obtenerAsignaturasPorDocente: jest.fn(),
  obtenerConstraintActivityPreferredStartingTime: jest.fn(),
  obtenerConstraintActivityPreferredRoom: jest.fn(),
};
const mockNivelService = {
  obtenerTodosLosNivelesYGrupos: jest.fn(),
};
const mockFacultadService = {
  obtenerFacultades: jest.fn(),
};
const mockEspaciosFisicosService = {
  obtenerEspaciosFisicos: jest.fn(),
};

// DTO
import { HorarioDto } from '../src/horario/dto/horario.dto';

describe('HorarioService (Integration)', () => {
  let module: TestingModule;
  let horarioService: HorarioService;
  let usuarioRepository: Repository<UsuarioEntity>;

  beforeAll(async () => {
    console.log('=== [beforeAll] Creando TestingModule (HorarioService) ===');

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            HorarioEntity,
            UsuarioEntity,
            RolEntity,
            RolUsuarioEntity,
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
            NivelEntity,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          HorarioEntity,
          UsuarioEntity,
        ]),
      ],
      providers: [
        // Servicio a probar
        HorarioService,
        // Mocks inyectados
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: JornadaLaboralService, useValue: mockJornadaLaboralService },
        { provide: SemestreService, useValue: mockSemestreService },
        { provide: AsignaturaService, useValue: mockAsignaturaService },
        { provide: TipoAulaService, useValue: mockTipoAulaService },
        { provide: DocenteService, useValue: mockDocenteService },
        { provide: HorasNoDisponiblesService, useValue: mockHorasNoDisponiblesService },
        { provide: ActividadesService, useValue: mockActividadesService },
        { provide: NivelService, useValue: mockNivelService },
        { provide: FacultadService, useValue: mockFacultadService },
        { provide: EspaciosFisicosService, useValue: mockEspaciosFisicosService },
      ],
    }).compile();

    horarioService = module.get<HorarioService>(HorarioService);
    usuarioRepository = module.get<Repository<UsuarioEntity>>(
      getRepositoryToken(UsuarioEntity),
    );

    console.log('=== [beforeAll] Módulo compilado, horarioService obtenido ===');
  });

  afterAll(async () => {
    console.log('=== [afterAll] Cerrando TestingModule ===');
    await module.close();
    console.log('=== [afterAll] Módulo cerrado ===');
  });

  afterEach(async () => {
    console.log('=== [afterEach] Limpiando tabla Horario ===');
    if (horarioService) {
      const horarios = await horarioService.obtenerHorarios();
      for (const h of horarios) {
        await horarioService['repositorioHorario'].delete(h.id);
      }
    }
    jest.clearAllMocks();
  });

  it('test mínimo (confirma que no se cuelga)', () => {
    console.log('=== [TEST] Mínimo ===');
    expect(true).toBe(true);
  });

  it('debe crear un horario', async () => {
    console.log('=== [TEST] "debe crear un horario" ===');
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue({ id: 'USER_123' });

    await usuarioRepository.save({
      id: '5ecc33d7-62d2-4bd5-a9d3-bc584bc08ae2',
      correo: 'example444@epn.edu.ec',
      clave: 'cualquierValor',
    });

    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue({
      id: '5ecc33d7-62d2-4bd5-a9d3-bc584bc08ae2',
    });

    const dto: HorarioDto = {
      idUsuario: '5ecc33d7-62d2-4bd5-a9d3-bc584bc08ae2',
      descripcion: 'Horario de prueba',
      horarioJson: JSON.stringify({ ejemplo: true }),
    };

    const horarioCreado = await horarioService.crearHorario(dto);
    expect(horarioCreado).toBeDefined();
    expect(horarioCreado.id).toBeDefined();
    expect(horarioCreado.descripcion).toBe('Horario de prueba');

    const lista = await horarioService.obtenerHorarios();
    expect(lista.length).toBe(1);
    expect(lista[0].descripcion).toBe('Horario de prueba');
  });

  it('debe fallar al crear un horario si el usuario no existe', async () => {
    console.log('=== [TEST] "debe fallar usuario no existe" ===');
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue(undefined);

    const dto: HorarioDto = {
      idUsuario: 'USUARIO_INEXISTENTE',
      descripcion: 'Horario X',
      horarioJson: '{}',
    };

    await expect(horarioService.crearHorario(dto)).rejects.toThrow('Usuario no encontrado.');
  });

  it('debe obtener el listado (vacío) de horarios al inicio', async () => {
    const lista = await horarioService.obtenerHorarios();
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBe(0);
  });

  it('debe demostrar concurrencia al crear varios horarios simultáneamente', async () => {
    console.log('=== [TEST] Concurrencia ===');
    
    // 1. Simula que el usuario existe en la BD
    const userId = 'concurrent-user-1';
    await usuarioRepository.save({
      id: userId,
      correo: 'concurrent@epn.edu.ec',
      clave: 'cualquierValor',
    });
    // Asegura que el mock devuelva un usuario válido
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockImplementation(async (idBuscado) => {
      return idBuscado === userId ? { id: userId } : undefined;
    });

    // 2. Preparar datos de prueba para crear horarios
    const horarioDtos: HorarioDto[] = Array.from({ length: 5 }, (_, index) => ({
      idUsuario: userId,
      descripcion: `Horario concurrente #${index}`,
      horarioJson: JSON.stringify({ data: index }),
    }));

    // 3. Lanza las creaciones en paralelo (Promise.all)
    await Promise.all(horarioDtos.map((dto) => horarioService.crearHorario(dto)));

    // 4. Verifica que se crearon todos
    const todosLosHorarios = await horarioService.obtenerHorarios();
    expect(todosLosHorarios).toHaveLength(5);

    // También puedes verificar la descripción de cada uno
    const descripciones = todosLosHorarios.map((h) => h.descripcion).sort();
    expect(descripciones).toEqual([
      'Horario concurrente #0',
      'Horario concurrente #1',
      'Horario concurrente #2',
      'Horario concurrente #3',
      'Horario concurrente #4',
    ]);
  });

  it('debe rechazar ediciones concurrentes del mismo Horario con optimistic locking', async () => {
    console.log('=== [TEST] Concurrencia (Optimistic Locking) ===');
  
    // 1. Crear un usuario en la BD
    const userId = 'user-opt-lock';
    await usuarioRepository.save({
      id: userId,
      correo: 'lock-user@epn.edu.ec',
      clave: 'cualquierValor',
    });
  
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue({ id: userId });
  
    // 2. Crear horario inicial
    const horarioCreado = await horarioService.crearHorario({
      idUsuario: userId,
      descripcion: 'Horario inicial',
      horarioJson: '{}',
    });
  
    // 3. Llamar a "obtenerHorarioPorID" para tener su estado actual y (en la vida real) su "version"
    const horarioLeido = await horarioService.obtenerHorarioPorID(horarioCreado.id);
  
    // 4. Preparar 2 actualizaciones en paralelo
    //    La 1ª simula un retraso con setTimeout para que la 2ª se ejecute antes (y cambie la versión).
    const promesa1 = (async () => {
      // Simular que un usuario tardó en procesar y conserva la "version" antigua
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return horarioService.actualizarHorarioPorID(horarioCreado.id, {
        idUsuario: userId,
        descripcion: 'Cambio #1 (tardío)',
        horarioJson: '{}',
      });
    })();
  
    const promesa2 = (async () => {
      // Se ejecuta más rápido, cambia la versión antes
      return horarioService.actualizarHorarioPorID(horarioCreado.id, {
        idUsuario: userId,
        descripcion: 'Cambio #2 (rápido)',
        horarioJson: '{}',
      });
    })();
  
    // 5. Esperamos que una falle por mismatch de versión
    await expect(Promise.all([promesa1, promesa2]))
      .rejects
      .toThrow('OptimisticLockVersionMismatchError');
    
    // O, si quieres capturar el error exacto, puedes hacer:
    // try {
    //   await Promise.all([promesa1, promesa2]);
    //   fail('Debería haber ocurrido un error de versión');
    // } catch (error) {
    //   expect(error.name).toBe('OptimisticLockVersionMismatchError');
    // }
  
    // 6. Verificamos en DB qué descripción quedó finalmente
    const horarioFinal = await horarioService.obtenerHorarioPorID(horarioCreado.id);
    // Depende del que llegó sin error. Usualmente "Cambio #2 (rápido)" quedará,
    // y el #1 fallará al hacer save porque la versión ya es distinta.
    expect(horarioFinal.descripcion).toBe('Cambio #2 (rápido)');
  });
  
});
