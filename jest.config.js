// jest.config.js
module.exports = {
    // Para que Jest pueda resolver import 'src/...'
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/src/$1',
    },
    // Indica a Jest que use ts-jest para transformar archivos .ts
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
    testEnvironment: 'node',       // Recomendable en proyectos Nest
    // Opcional, si quieres ignorar ciertas carpetas:
    // testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  };
  