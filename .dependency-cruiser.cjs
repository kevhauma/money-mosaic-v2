/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    doNotFollow: {
      path: ['node_modules'],
    },
    exclude: {
      path: ['\\.spec\\.ts$'],
    },
    includeOnly: {
      path: ['^src/app/(core|shared|feature-)'],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
