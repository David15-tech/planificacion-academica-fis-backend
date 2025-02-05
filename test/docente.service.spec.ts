import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocenteService } from '../src/docente/services/docente.service';
import { DocenteEntity } from '../src/docente/entities/docente.entity';

// IMPORTS Mocks (servicios externos)
import { MailService } from '../src/mail/services/mail.service';
import { UsuarioService } from '../src/usuarios/services/usuario.service';
import { RolService } from '../src/auth/services/rol.service';
import RolUsuarioService from '../src/auth/services/rol-usuario.service';

// DTO
import { DocenteDto } from '../src/docente/dto/docente.dto';

// Creamos mocks básicos para los otros servicios
const mockMailService = {
  envioClaveDocente: jest.fn(), // no hace nada, solo se simula
};

const mockUsuarioService = {
  obtenerUsuarioPorSuCorreo: jest.fn(),
  crearUsuario: jest.fn(),
  eliminarUsuarioPorID: jest.fn(),
};

const mockRolService = {
  obtenerRolPorNombre: jest.fn(),
};

const mockRolUsuarioService = {
  crearRolUsuario: jest.fn(),
  eliminarRolUsuario: jest.fn(),
  obtenerRolUsuarioSegunIdUsuario: jest.fn(),
};

describe('DocenteService (Integration)', () => {
  let docenteService: DocenteService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [DocenteEntity],
          synchronize: true,
          keepConnectionAlive: true,
        }),
        TypeOrmModule.forFeature([DocenteEntity]),
      ],
      providers: [
        DocenteService,
        { provide: MailService, useValue: mockMailService },
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: RolService, useValue: mockRolService },
        { provide: RolUsuarioService, useValue: mockRolUsuarioService },
      ],
    }).compile();

    docenteService = module.get<DocenteService>(DocenteService);
  });

  afterEach(async () => {
    // Limpia la tabla de docentes para cada test
    const allDocentes = await docenteService.obtenerDocentes();
    for (const doc of allDocentes) {
      await docenteService.eliminarDocentePorID(doc.id);
    }

    // Resetea los mocks
    jest.clearAllMocks();
  });

  it('debe crear un docente cuando no existe previamente', async () => {
    // Configuramos los mocks para que "no encuentre" el docente, "sí encuentre" el rol
    mockRolService.obtenerRolPorNombre.mockResolvedValue({ id: 'ROL_DOCENTE_ID' });
    mockUsuarioService.obtenerUsuarioPorSuCorreo.mockResolvedValue(null);

    const docenteDto: DocenteDto = {
      nombreCompleto: 'John Doe',
      correoElectronico: 'john.doe@example.com',
    };

    const response = await docenteService.crearDocente(docenteDto, 'clave123');

    expect(response).toBeDefined();
    expect(response.mensaje).toContain('Se creó el docente John Doe exitosamente');
    // Verificamos que se haya guardado en la BD
    const docentesBD = await docenteService.obtenerDocentes();
    expect(docentesBD.length).toBe(1);
    expect(docentesBD[0].nombreCompleto).toBe('John Doe');
  });

  it('debe retornar mensaje de "ya registrado" si el docente existe', async () => {
    // 1) Creamos un docente en BD manualmente
    const docenteCreado = await docenteService['docenteRepository'].save({
      nombreCompleto: 'Jane Doe',
      correoElectronico: 'jane@example.com',
    });
    // 2) Configuramos el mock para que, si se busca ese correo, se retorne la entidad (no NotFound)
    mockRolService.obtenerRolPorNombre.mockResolvedValue({ id: 'ROL_DOCENTE_ID' });
    mockUsuarioService.obtenerUsuarioPorSuCorreo.mockResolvedValue(null);
    mockUsuarioService.crearUsuario.mockResolvedValue(null);

    // 3) Llamamos a crearDocente con el mismo correo
    const response = await docenteService.crearDocente(
      { nombreCompleto: 'Jane Doe', correoElectronico: 'jane@example.com' },
      'clave123',
    );

    // Debería retornar el mensaje de "ya se encuentra registrado"
    expect(response.mensaje).toContain('ya se encuentra registrado');
    // Verificamos que no se haya duplicado en la BD
    const docentesBD = await docenteService.obtenerDocentes();
    expect(docentesBD.length).toBe(1);
  });

  it('debe listar a los docentes existentes', async () => {
    // Inserta un par de docentes manualmente
    await docenteService['docenteRepository'].save([
      { nombreCompleto: 'Docente 1', correoElectronico: 'doc1@example.com' },
      { nombreCompleto: 'Docente 2', correoElectronico: 'doc2@example.com' },
    ]);

    const docentes = await docenteService.obtenerDocentes();
    expect(docentes.length).toBe(2);
  });
});
