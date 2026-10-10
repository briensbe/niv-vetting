import { buildVettingCatalog, parseJavaProperties, parseVettingXml } from './vetting-catalog';

const sampleXml = `<?xml version="1.0"?>
<vetting-configuration>
  <module id="PAYMENT">
    <rule-set id="common">
      <package>example.rules.Common</package>
      <rule-def id="R1" active="true">
        <profile id="USER">ERROR</profile>
        <profile id="ROOT">IGNORE</profile>
      </rule-def>
      <rule-def id="R2" active="false">
        <profile id="USER">WARNING</profile>
      </rule-def>
    </rule-set>
  </module>
</vetting-configuration>`;

describe('parseJavaProperties', () => {
  it('parses comments, separators, escapes and continued lines', () => {
    const properties = parseJavaProperties(
      '# comment\nlabel: Bonjour\\u0020le monde\ndescription = Ligne une\\\n  et deux\nkey\\=part: value\\:here',
    );

    expect(properties.get('label')).toBe('Bonjour le monde');
    expect(properties.get('description')).toBe('Ligne uneet deux');
    expect(properties.get('key=part')).toBe('value:here');
  });

  it('rejects malformed Unicode escapes', () => {
    expect(() => parseJavaProperties('bad=\\u12G4')).toThrow(/Échappement Unicode invalide/);
  });
});

describe('buildVettingCatalog', () => {
  it('retains profile and operation context and applies translated labels and descriptions', () => {
    const catalog = buildVettingCatalog(
      sampleXml,
      'module.PAYMENT=Paiements\nR1=Message par défaut\nR1.description=Une description\nR1.CRCA.INTERNET=Message CRCA\nR1.ADVISOR=Message conseiller\nR10=Autre règle\n',
    );

    expect(catalog.rules).toHaveLength(2);
    expect(catalog.operations[0]).toMatchObject({
      id: 'PAYMENT',
      label: 'Paiements',
      ruleCount: 2,
    });
    expect(catalog.rules[0]).toMatchObject({
      id: 'R1',
      label: 'Message par défaut',
      description: 'Une description',
      messageVariants: [
        { context: 'Libellé par défaut', message: 'Message par défaut' },
        { context: 'CRCA.INTERNET', message: 'Message CRCA' },
        { context: 'ADVISOR', message: 'Message conseiller' },
      ],
      active: true,
      profiles: { USER: 'ERROR', ROOT: 'IGNORE' },
    });
    expect(catalog.rules[1]).toMatchObject({
      id: 'R2',
      label: 'R2',
      description: null,
      active: false,
    });
    expect(catalog.profiles).toEqual(['ROOT', 'USER']);
    expect(catalog.behaviors).toEqual(['ERROR', 'IGNORE', 'WARNING']);
  });

  it('rejects invalid XML and unexpected roots', () => {
    expect(() => parseVettingXml('<bad')).toThrow(/XML est invalide/);
    expect(() => parseVettingXml('<wrong/>')).toThrow(/racine XML inattendu/);
  });

  it('rejects missing required rule attributes', () => {
    expect(() =>
      buildVettingCatalog(
        '<vetting-configuration><module id="M"><rule-set id="F"><package>x</package><rule-def active="true"/></rule-set></module></vetting-configuration>',
        'a=b',
      ),
    ).toThrow(/Attribut XML requis manquant : id/);
  });

  it('derives a readable family label from the package when the family id is absent', () => {
    const catalog = buildVettingCatalog(
      '<vetting-configuration><module id="M"><rule-set><package>com.netfinca.vetting.order.tv.rules.Rule</package><rule-def id="R1" active="true"/></rule-set></module></vetting-configuration>',
      'module.M=Ordres',
    );

    expect(catalog.operations[0].families[0]).toMatchObject({
      id: 'package-family-1',
      hasDeclaredId: false,
      label: 'order / tv',
      packageName: 'com.netfinca.vetting.order.tv.rules.Rule',
    });
    expect(catalog.rules[0].familyLabel).toBe('order / tv');
  });
});
