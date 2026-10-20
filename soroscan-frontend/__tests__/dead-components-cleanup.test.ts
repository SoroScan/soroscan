import fs from 'fs';
import path from 'path';

describe('Dead components cleanup verification (Issue #1677)', () => {
  const componentsDir = path.resolve(__dirname, '../src/components');

  it('ensures EmptyEventState.tsx is permanently removed from src/components', () => {
    const emptyEventStatePath = path.join(componentsDir, 'EmptyEventState.tsx');
    expect(fs.existsSync(emptyEventStatePath)).toBe(false);
  });

  it('ensures NotificationDropdown.tsx is permanently removed from src/components', () => {
    const notificationDropdownPath = path.join(componentsDir, 'NotificationDropdown.tsx');
    expect(fs.existsSync(notificationDropdownPath)).toBe(false);
  });

  it('verifies that no source files in the project import the removed components', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const walkSync = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        if (
          file === 'node_modules' ||
          file === '.next' ||
          file === '.git' ||
          file === 'coverage' ||
          file === '__tests__'
        ) {
          continue;
        }
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walkSync(fullPath));
        } else if (/\.(tsx?|jsx?)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const sourceFiles = walkSync(projectRoot);
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toMatch(/from\s+['"][^'"]*EmptyEventState['"]/);
      expect(content).not.toMatch(/from\s+['"][^'"]*NotificationDropdown['"]/);
      expect(content).not.toMatch(/import\s+['"][^'"]*EmptyEventState['"]/);
      expect(content).not.toMatch(/import\s+['"][^'"]*NotificationDropdown['"]/);
    }
  });
});
