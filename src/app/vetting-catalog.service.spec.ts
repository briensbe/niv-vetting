import { inferVettingFileMetadata, readPropertiesFile } from './vetting-catalog.service';
import { parseJavaProperties } from './vetting-catalog';

describe('Vetting catalog file handling', () => {
  it('extracts adherent and offer from the expected XML filename convention', () => {
    expect(inferVettingFileMetadata('crca_initial_vetting_rules.xml')).toEqual({
      adherent: 'crca',
      offer: 'initial',
    });
    expect(inferVettingFileMetadata('lcl_expert_vetting_rules.xml')).toEqual({
      adherent: 'lcl',
      offer: 'expert',
    });
  });

  it('leaves unmatched names ready for manual metadata entry', () => {
    expect(inferVettingFileMetadata('custom-rules.xml')).toEqual({
      adherent: '',
      offer: '',
    });
  });

  it('decodes a Windows-1252 properties file without replacing French accents', async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('O101=compte esp'),
      0xe8,
      ...new TextEncoder().encode('ces'),
    ]);
    const file = new File([bytes], 'Vetting_fr_FR.properties');

    const properties = parseJavaProperties(await readPropertiesFile(file));

    expect(properties.get('O101')).toBe('compte espèces');
  });

  it('keeps UTF-8 files with a byte-order mark intact', async () => {
    const bytes = new TextEncoder().encode('\uFEFFO101=Régler les espèces');
    const file = new File([bytes], 'Vetting_fr_FR.properties');

    const properties = parseJavaProperties(await readPropertiesFile(file));

    expect(properties.get('O101')).toBe('Régler les espèces');
  });

  it('decodes the current UTF-8 French labels without changing accents', async () => {
    const file = new File(
      ['module.DOUBLE_VALIDATION=Double validation des opérations espèces (validation)'],
      'Vetting_fr_FR.properties',
    );

    const properties = parseJavaProperties(await readPropertiesFile(file));

    expect(properties.get('module.DOUBLE_VALIDATION')).toBe(
      'Double validation des opérations espèces (validation)',
    );
  });

  it('rejects a properties file that already contains replacement characters', async () => {
    const file = new File(['O101=R�gler les esp�ces'], 'Vetting_fr_FR.properties');

    await expect(readPropertiesFile(file)).rejects.toThrow(
      /contient déjà des caractères de remplacement/,
    );
  });
});
