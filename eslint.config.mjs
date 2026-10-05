import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['src/app/page.tsx', 'src/components/auth-gate.tsx'],
    rules: {
      // This client UI intentionally synchronizes external sessions and mutable
      // decorative slot maps; React Compiler is not enabled for this project.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
  { files: ['tests/**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts']),
]);
