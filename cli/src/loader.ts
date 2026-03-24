import * as fs from 'fs';
import * as yaml from 'js-yaml';

export function loadPolicy(filePath: string): any {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('File does not contain a valid YAML object');
    }
    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse YAML: ${err.message}`);
  }
}
