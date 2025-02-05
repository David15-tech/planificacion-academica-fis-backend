// test/horario.service.integration.spec.ts
// O en: src/horario/tests/horario.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorarioService } from '../src/horario/services/horario.service';
import { HorarioEntity } from '../src/horario/entities/horario.entity';
import { HorarioDto } from '../src/horario/dto/horario.dto';

// Servicios a mockear
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

// Creamos mocks básicos para cada servicio externo
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

describe('HorarioService (Integration)', () => {
  let horarioService: HorarioService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Configuramos la BD SQLite en memoria
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [HorarioEntity],
          synchronize: true,
          keepConnectionAlive: true,
        }),
        // Registramos la entidad Horario
        TypeOrmModule.forFeature([HorarioEntity]),
      ],
      providers: [
        HorarioService,
        // Inyectamos los mocks
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
  });

  afterEach(async () => {
    // Limpia la tabla "horario" después de cada prueba
    const horarios = await horarioService.obtenerHorarios();
    for (const h of horarios) {
      await horarioService['repositorioHorario'].delete(h.id);
    }
    // Resetea los mocks
    jest.clearAllMocks();
  });

  it('debe crear un horario', async () => {
    // Configuramos el mock del usuarioService para que retorne un objeto (no null)
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue({ id: 'USER_123' });

    const dto: HorarioDto = {
      idUsuario: 'USER_123',
      descripcion: 'Horario de prueba',
      horarioJson: JSON.stringify({ ejemplo: true }),
    };

    const horarioCreado = await horarioService.crearHorario(dto);

    expect(horarioCreado).toBeDefined();
    expect(horarioCreado.id).toBeDefined();
    expect(horarioCreado.descripcion).toBe('Horario de prueba');

    // Verificamos que se guardó en la BD
    const lista = await horarioService.obtenerHorarios();
    expect(lista.length).toBe(1);
    expect(lista[0].descripcion).toBe('Horario de prueba');
  });

  it('debe fallar al crear un horario si el usuario no existe', async () => {
    // Mock: que retorne "undefined" => no se encontró usuario
    mockUsuarioService.obtenerUsuarioCompletoPorSuID.mockResolvedValue(undefined);

    const dto: HorarioDto = {
      idUsuario: 'INEXISTENTE',
      descripcion: 'Horario X',
      horarioJson: '{}',
    };

    
  });

  it('debe obtener el listado (vacío) de horarios al inicio', async () => {
    const lista = await horarioService.obtenerHorarios();
    expect(lista).toBeInstanceOf(Array);
    expect(lista.length).toBe(0);
  });

  // Agrega más pruebas, como:
  // - actualizarHorarioPorID (y su respectivo mock)
  // - eliminarHorarioPorID (no está implementado en tu servicio, pero podrías crear uno)
  // - obtenerHorarioPorID
  // - generarHorario (mockeando los servicios y comprobando no lance error)
});
