import chunkIndex from './generated/chunk-index.json';
import { JsonChunkSource } from '../../JsonChunkSource';

type JsonModule = { default: unknown };
const modules = import.meta.glob<JsonModule>('./generated/chunks/*.json');

export class CheonggyecheonChunkSource extends JsonChunkSource {
  constructor() {
    super(chunkIndex, modules, './generated/chunks', '청계천');
  }
}
